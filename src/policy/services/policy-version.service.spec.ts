import { Test, TestingModule } from '@nestjs/testing';
import { SecurityPolicy } from '../policy.types';
import { PolicyVersionService } from './policy-version.service';

describe('PolicyVersionService', () => {
  let service: PolicyVersionService;
  let mockPolicy: SecurityPolicy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PolicyVersionService],
    }).compile();

    service = module.get<PolicyVersionService>(PolicyVersionService);

    // 테스트용 모의 정책
    mockPolicy = {
      id: 'test-policy-1',
      name: 'Test Policy',
      description: 'Test policy for testing',
      enabled: true,
      priority: 'medium',
      rules: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user',
    };
  });

  afterEach(() => {
    // 각 테스트 후 버전 저장소 초기화
    service.deleteAllVersions(mockPolicy.id);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Version Creation', () => {
    it('should create initial version', () => {
      const version = service.createVersion(
        mockPolicy,
        'test-user',
        'Initial policy creation'
      );

      expect(version).toBeDefined();
      expect(version.version).toBe(1);
      expect(version.policyId).toBe(mockPolicy.id);
      expect(version.createdBy).toBe('test-user');
      expect(version.changeReason).toBe('Initial policy creation');
    });

    it('should increment version numbers', () => {
      // 첫 번째 버전
      const version1 = service.createVersion(mockPolicy, 'test-user', 'Initial');
      expect(version1.version).toBe(1);

      // 두 번째 버전
      const updatedPolicy = { ...mockPolicy, name: 'Updated Policy' };
      const version2 = service.createVersion(updatedPolicy, 'test-user', 'Update');
      expect(version2.version).toBe(2);
    });

    it('should store policy data as deep copy', () => {
      const version = service.createVersion(mockPolicy, 'test-user', 'Initial');
      
      // 원본 정책 수정
      mockPolicy.name = 'Modified Policy';
      
      // 버전에 저장된 정책은 변경되지 않아야 함
      expect(version.policy.name).toBe('Test Policy');
    });
  });

  describe('Version Retrieval', () => {
    it('should retrieve specific version', () => {
      const createdVersion = service.createVersion(mockPolicy, 'test-user', 'Initial');
      
      const retrievedVersion = service.getVersion(mockPolicy.id, 1);
      
      expect(retrievedVersion).toBeDefined();
      expect(retrievedVersion?.version).toBe(1);
      expect(retrievedVersion?.policy.id).toBe(mockPolicy.id);
    });

    it('should return null for non-existent version', () => {
      const retrievedVersion = service.getVersion(mockPolicy.id, 999);
      expect(retrievedVersion).toBeNull();
    });

    it('should retrieve latest version', () => {
      // 여러 버전 생성
      service.createVersion(mockPolicy, 'test-user', 'Initial');
      const updatedPolicy = { ...mockPolicy, name: 'Updated Policy' };
      service.createVersion(updatedPolicy, 'test-user', 'Update');
      
      const latestVersion = service.getLatestVersion(mockPolicy.id);
      
      expect(latestVersion).toBeDefined();
      expect(latestVersion?.version).toBe(2);
      expect(latestVersion?.policy.name).toBe('Updated Policy');
    });
  });

  describe('Version History', () => {
    it('should retrieve version history', () => {
      // 여러 버전 생성
      service.createVersion(mockPolicy, 'test-user', 'Initial');
      const updatedPolicy = { ...mockPolicy, name: 'Updated Policy' };
      service.createVersion(updatedPolicy, 'test-user', 'Update');
      
      const history = service.getVersionHistory(mockPolicy.id);
      
      expect(history).toBeDefined();
      expect(history?.policyId).toBe(mockPolicy.id);
      expect(history?.currentVersion).toBe(2);
      expect(history?.totalVersions).toBe(2);
      expect(history?.versions).toHaveLength(2);
    });

    it('should return null for non-existent policy history', () => {
      const history = service.getVersionHistory('non-existent');
      expect(history).toBeNull();
    });

    it('should sort versions chronologically', () => {
      // 여러 버전 생성
      service.createVersion(mockPolicy, 'test-user', 'Initial');
      const updatedPolicy = { ...mockPolicy, name: 'Updated Policy' };
      service.createVersion(updatedPolicy, 'test-user', 'Update');
      
      const history = service.getVersionHistory(mockPolicy.id);
      
      // 버전이 시간순으로 정렬되어야 함
      expect(history?.versions[0]?.version).toBe(1);
      expect(history?.versions[1]?.version).toBe(2);
    });
  });

  describe('Version Comparison', () => {
    it('should compare two versions', () => {
      // 첫 번째 버전
      service.createVersion(mockPolicy, 'test-user', 'Initial');
      
      // 두 번째 버전 (이름 변경)
      const updatedPolicy = { ...mockPolicy, name: 'Updated Policy' };
      service.createVersion(updatedPolicy, 'test-user', 'Update');
      
      const comparison = service.compareVersions(mockPolicy.id, 1, 2);
      
      expect(comparison).toBeDefined();
      expect(comparison?.modified).toContain('name');
      expect(comparison?.unchanged).toContain('description');
      expect(comparison?.unchanged).toContain('enabled');
    });

    it('should return null for invalid comparison', () => {
      const comparison = service.compareVersions('non-existent', 1, 2);
      expect(comparison).toBeNull();
    });
  });

  describe('Version Restoration', () => {
    it('should restore policy to specific version', () => {
      // 첫 번째 버전
      service.createVersion(mockPolicy, 'test-user', 'Initial');
      
      // 두 번째 버전 (이름 변경)
      const updatedPolicy = { ...mockPolicy, name: 'Updated Policy' };
      service.createVersion(updatedPolicy, 'test-user', 'Update');
      
      // 첫 번째 버전으로 복원
      const restoredPolicy = service.restoreVersion(mockPolicy.id, 1);
      
      expect(restoredPolicy).toBeDefined();
      expect(restoredPolicy?.name).toBe('Test Policy');
      
      // 복원된 정책이 새 버전으로 저장되었는지 확인
      const latestVersion = service.getLatestVersion(mockPolicy.id);
      expect(latestVersion?.version).toBe(3);
      expect(latestVersion?.policy.name).toBe('Test Policy');
    });

    it('should return null for non-existent version restoration', () => {
      const restoredPolicy = service.restoreVersion(mockPolicy.id, 999);
      expect(restoredPolicy).toBeNull();
    });
  });

  describe('Version Deletion', () => {
    it('should delete specific version', () => {
      // 여러 버전 생성
      service.createVersion(mockPolicy, 'test-user', 'Initial');
      const updatedPolicy = { ...mockPolicy, name: 'Updated Policy' };
      service.createVersion(updatedPolicy, 'test-user', 'Update');
      
      // 첫 번째 버전 삭제
      const deleted = service.deleteVersion(mockPolicy.id, 1);
      
      expect(deleted).toBe(true);
      
      // 삭제된 버전은 더 이상 조회되지 않아야 함
      const version1 = service.getVersion(mockPolicy.id, 1);
      expect(version1).toBeNull();
      
      // 두 번째 버전은 여전히 존재해야 함
      const version2 = service.getVersion(mockPolicy.id, 2);
      expect(version2).toBeDefined();
    });

    it('should not delete current version', () => {
      service.createVersion(mockPolicy, 'test-user', 'Initial');
      
      // 현재 버전 삭제 시도
      const deleted = service.deleteVersion(mockPolicy.id, 1);
      
      expect(deleted).toBe(false);
      
      // 현재 버전은 여전히 존재해야 함
      const version = service.getVersion(mockPolicy.id, 1);
      expect(version).toBeDefined();
    });

    it('should delete all versions', () => {
      // 여러 버전 생성
      service.createVersion(mockPolicy, 'test-user', 'Initial');
      const updatedPolicy = { ...mockPolicy, name: 'Updated Policy' };
      service.createVersion(updatedPolicy, 'test-user', 'Update');
      
      // 모든 버전 삭제
      const deleted = service.deleteAllVersions(mockPolicy.id);
      
      expect(deleted).toBe(true);
      
      // 모든 버전이 삭제되었는지 확인
      const history = service.getVersionHistory(mockPolicy.id);
      expect(history).toBeNull();
    });
  });

  describe('Version Statistics', () => {
    it('should provide version statistics', () => {
      // 여러 정책과 버전 생성
      service.createVersion(mockPolicy, 'test-user', 'Initial');
      
      const policy2 = { ...mockPolicy, id: 'test-policy-2' };
      service.createVersion(policy2, 'test-user', 'Initial');
      const updatedPolicy2 = { ...policy2, name: 'Updated Policy 2' };
      service.createVersion(updatedPolicy2, 'test-user', 'Update');
      
      const stats = service.getVersionStats();
      
      expect(stats.totalPolicies).toBe(2);
      expect(stats.totalVersions).toBe(3);
      expect(stats.averageVersionsPerPolicy).toBe(1.5);
      expect(stats.policiesWithMultipleVersions).toBe(1);
    });
  });

  describe('Version Limits', () => {
    it('should respect maximum versions per policy', () => {
      // 최대 버전 수보다 많은 버전 생성
      for (let i = 0; i < 55; i++) {
        const updatedPolicy = { ...mockPolicy, name: `Policy Version ${i}` };
        service.createVersion(updatedPolicy, 'test-user', `Update ${i}`);
      }
      
      const history = service.getVersionHistory(mockPolicy.id);
      
      // 최대 50개 버전만 유지되어야 함
      expect(history?.totalVersions).toBe(50);
      expect(history?.currentVersion).toBe(55);
      
      // 가장 오래된 버전은 삭제되어야 함
      const oldestVersion = service.getVersion(mockPolicy.id, 1);
      expect(oldestVersion).toBeNull();
      
      // 최신 버전은 존재해야 함
      const latestVersion = service.getVersion(mockPolicy.id, 55);
      expect(latestVersion).toBeDefined();
    });
  });

  describe('All Version Summaries', () => {
    it('should provide summaries for all policies', () => {
      // 여러 정책과 버전 생성
      service.createVersion(mockPolicy, 'test-user', 'Initial');
      
      const policy2 = { ...mockPolicy, id: 'test-policy-2' };
      service.createVersion(policy2, 'test-user', 'Initial');
      const updatedPolicy2 = { ...policy2, name: 'Updated Policy 2' };
      service.createVersion(updatedPolicy2, 'test-user', 'Update');
      
      const summaries = service.getAllVersionSummaries();
      
      expect(summaries).toHaveLength(2);
      
      // 정책 순서는 마지막 업데이트 시간순으로 정렬됨
      // test-policy-2가 더 최근에 업데이트되었으므로 첫 번째에 위치해야 함
      const policy2Summary = summaries.find(s => s.policyId === 'test-policy-2');
      const policy1Summary = summaries.find(s => s.policyId === 'test-policy-1');
      
      expect(policy2Summary).toBeDefined();
      expect(policy2Summary?.currentVersion).toBe(2);
      expect(policy2Summary?.totalVersions).toBe(2);
      
      expect(policy1Summary).toBeDefined();
      expect(policy1Summary?.currentVersion).toBe(1);
      expect(policy1Summary?.totalVersions).toBe(1);
    });
  });
});

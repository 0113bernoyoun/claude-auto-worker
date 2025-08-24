import { Injectable, Logger } from '@nestjs/common';
import { SecurityPolicy } from '../policy.types';

export interface PolicyVersion {
  id: string;
  policyId: string;
  version: number;
  policy: SecurityPolicy;
  createdAt: Date;
  createdBy: string;
  changeReason?: string;
  metadata?: Record<string, unknown>;
}

export interface VersionHistory {
  policyId: string;
  versions: PolicyVersion[];
  currentVersion: number;
  totalVersions: number;
}

@Injectable()
export class PolicyVersionService {
  private readonly logger = new Logger(PolicyVersionService.name);
  
  // 메모리 기반 버전 저장소 (실제 구현에서는 데이터베이스 사용)
  private readonly versionStore = new Map<string, PolicyVersion[]>();
  
  // 정책별 현재 버전 추적
  private readonly currentVersions = new Map<string, number>();
  
  // 최대 버전 보관 수
  private readonly maxVersionsPerPolicy = 50;

  /**
   * 정책 변경 시 새 버전 생성
   */
  createVersion(
    policy: SecurityPolicy, 
    createdBy: string, 
    changeReason?: string,
    metadata?: Record<string, unknown>
  ): PolicyVersion {
    const policyId = policy.id;
    const currentVersion = this.currentVersions.get(policyId) || 0;
    const newVersion = currentVersion + 1;
    
    const version: PolicyVersion = {
      id: `${policyId}_v${newVersion}`,
      policyId,
      version: newVersion,
      policy: { ...policy }, // 깊은 복사
      createdAt: new Date(),
      createdBy,
      changeReason,
      metadata,
    };

    // 버전 히스토리에 추가
    if (!this.versionStore.has(policyId)) {
      this.versionStore.set(policyId, []);
    }
    
    const versions = this.versionStore.get(policyId)!;
    versions.push(version);
    
    // 최대 버전 수 제한 확인
    if (versions.length > this.maxVersionsPerPolicy) {
      const removedVersion = versions.shift();
      this.logger.debug(`Removed old version: ${removedVersion?.id}`);
    }
    
    // 현재 버전 업데이트
    this.currentVersions.set(policyId, newVersion);
    
    this.logger.debug(`Created version ${newVersion} for policy ${policyId}`);
    return version;
  }

  /**
   * 특정 버전의 정책 조회
   */
  getVersion(policyId: string, version: number): PolicyVersion | null {
    const versions = this.versionStore.get(policyId);
    if (!versions) {
      return null;
    }
    
    return versions.find(v => v.version === version) || null;
  }

  /**
   * 정책의 최신 버전 조회
   */
  getLatestVersion(policyId: string): PolicyVersion | null {
    const versions = this.versionStore.get(policyId);
    if (!versions || versions.length === 0) {
      return null;
    }
    
    const lastVersion = versions[versions.length - 1];
    return lastVersion || null;
  }

  /**
   * 정책의 버전 히스토리 조회
   */
  getVersionHistory(policyId: string): VersionHistory | null {
    const versions = this.versionStore.get(policyId);
    if (!versions) {
      return null;
    }
    
    const currentVersion = this.currentVersions.get(policyId) || 0;
    
    return {
      policyId,
      versions: [...versions].sort((a, b) => a.version - b.version),
      currentVersion,
      totalVersions: versions.length,
    };
  }



  /**
   * 특정 버전으로 정책 복원
   */
  restoreVersion(policyId: string, version: number): SecurityPolicy | null {
    const targetVersion = this.getVersion(policyId, version);
    if (!targetVersion) {
      return null;
    }

    // 복원된 정책을 새 버전으로 생성
    const restoredPolicy = { ...targetVersion.policy };
    this.createVersion(
      restoredPolicy,
      'system',
      `Restored from version ${version}`,
      { restoredFromVersion: version }
    );

    this.logger.debug(`Restored policy ${policyId} to version ${version}`);
    return restoredPolicy;
  }

  /**
   * 특정 버전 삭제 (관리자 전용)
   */
  deleteVersion(policyId: string, version: number): boolean {
    const versions = this.versionStore.get(policyId);
    if (!versions) {
      return false;
    }

    const versionIndex = versions.findIndex(v => v.version === version);
    if (versionIndex === -1) {
      return false;
    }

    // 현재 버전은 삭제 불가
    const currentVersion = this.currentVersions.get(policyId);
    if (version === currentVersion) {
      this.logger.warn(`Cannot delete current version ${version} of policy ${policyId}`);
      return false;
    }

    versions.splice(versionIndex, 1);
    this.logger.debug(`Deleted version ${version} of policy ${policyId}`);
    return true;
  }

  /**
   * 정책의 모든 버전 삭제
   */
  deleteAllVersions(policyId: string): boolean {
    const deleted = this.versionStore.delete(policyId);
    this.currentVersions.delete(policyId);
    
    if (deleted) {
      this.logger.debug(`Deleted all versions of policy ${policyId}`);
    }
    
    return deleted;
  }

  /**
   * 버전 비교 (두 버전 간의 차이점 분석)
   */
  compareVersions(
    policyId: string, 
    version1: number, 
    version2: number
  ): {
    added: string[];
    removed: string[];
    modified: string[];
    unchanged: string[];
  } | null {
    const v1 = this.getVersion(policyId, version1);
    const v2 = this.getVersion(policyId, version2);
    
    if (!v1 || !v2) {
      return null;
    }

    const policy1 = v1.policy;
    const policy2 = v2.policy;
    
    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];
    const unchanged: string[] = [];

    // 정책 기본 정보 비교
    const basicFields = ['name', 'description', 'enabled', 'priority'] as const;
    for (const field of basicFields) {
      if (policy1[field] !== policy2[field]) {
        modified.push(field);
      } else {
        unchanged.push(field);
      }
    }

    // 규칙 비교
    const rules1 = new Map(policy1.rules.map(r => [r.id, r]));
    const rules2 = new Map(policy2.rules.map(r => [r.id, r]));

    for (const [ruleId, rule] of rules1) {
      if (!rules2.has(ruleId)) {
        removed.push(`rule:${ruleId}`);
      } else if (JSON.stringify(rule) !== JSON.stringify(rules2.get(ruleId))) {
        modified.push(`rule:${ruleId}`);
      } else {
        unchanged.push(`rule:${ruleId}`);
      }
    }

    for (const [ruleId] of rules2) {
      if (!rules1.has(ruleId)) {
        added.push(`rule:${ruleId}`);
      }
    }

    return { added, removed, modified, unchanged };
  }

  /**
   * 버전 통계 조회
   */
  getVersionStats(): {
    totalPolicies: number;
    totalVersions: number;
    averageVersionsPerPolicy: number;
    policiesWithMultipleVersions: number;
  } {
    let totalVersions = 0;
    let policiesWithMultipleVersions = 0;

    for (const versions of this.versionStore.values()) {
      totalVersions += versions.length;
      if (versions.length > 1) {
        policiesWithMultipleVersions++;
      }
    }

    const totalPolicies = this.versionStore.size;
    const averageVersionsPerPolicy = totalPolicies > 0 ? totalVersions / totalPolicies : 0;

    return {
      totalPolicies,
      totalVersions,
      averageVersionsPerPolicy: Math.round(averageVersionsPerPolicy * 100) / 100,
      policiesWithMultipleVersions,
    };
  }

  /**
   * 모든 정책의 버전 요약 조회 (마지막 업데이트 시간순 정렬)
   */
  getAllVersionSummaries(): Array<{
    policyId: string;
    currentVersion: number;
    totalVersions: number;
    lastUpdated: Date;
  }> {
    const summaries: Array<{
      policyId: string;
      currentVersion: number;
      totalVersions: number;
      lastUpdated: Date;
    }> = [];

    for (const [policyId, versions] of this.versionStore.entries()) {
      if (versions.length > 0) {
        const latestVersion = versions[versions.length - 1];
        if (latestVersion) {
          summaries.push({
            policyId,
            currentVersion: latestVersion.version,
            totalVersions: versions.length,
            lastUpdated: latestVersion.createdAt,
          });
        }
      }
    }

    // 마지막 업데이트 시간순으로 정렬 (최신순)
    summaries.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());

    return summaries;
  }
}


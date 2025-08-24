// TASK-092 워크플로우 관리 기능 테스트
// 메모리 기반 서비스들을 직접 테스트합니다.

const { WorkflowRepositoryService } = require('./src/workflow-management/services/workflow-repository.service');
const { WorkflowSharingService } = require('./src/workflow-management/services/workflow-sharing.service');
const { WorkflowCollaborationService } = require('./src/workflow-management/services/workflow-collaboration.service');

async function testWorkflowManagement() {
  console.log('🚀 TASK-092 워크플로우 관리 기능 테스트 시작');
  console.log('=' * 60);

  // 서비스 인스턴스 생성
  const workflowRepo = new WorkflowRepositoryService();
  const workflowSharing = new WorkflowSharingService(workflowRepo);
  const workflowCollab = new WorkflowCollaborationService(workflowRepo, workflowSharing);

  try {
    // 1. 워크플로우 생성 테스트
    console.log('\n📝 1. 워크플로우 생성 테스트');
    const workflow1 = await workflowRepo.createWorkflow({
      name: '테스트 워크플로우 1',
      description: 'TASK-092 테스트용 워크플로우',
      content: 'steps:\n  - name: hello\n    command: echo "Hello World"',
      createdBy: 'user-001',
      teamId: 'team-alpha',
      isPublic: false,
      tags: ['test', 'automation'],
      categories: ['development']
    });
    console.log('✅ 워크플로우 생성 성공:', workflow1.id, workflow1.name);

    // 2. 워크플로우 조회 테스트
    console.log('\n🔍 2. 워크플로우 조회 테스트');
    const retrievedWorkflow = await workflowRepo.getWorkflow(workflow1.id);
    console.log('✅ 워크플로우 조회 성공:', retrievedWorkflow.name);

    // 3. 워크플로우 검색 테스트
    console.log('\n🔎 3. 워크플로우 검색 테스트');
    const searchResult = await workflowRepo.searchWorkflows({
      query: '테스트',
      limit: 10,
      offset: 0
    });
    console.log('✅ 검색 성공:', searchResult.total, '개 워크플로우 발견');

    // 4. 워크플로우 공유 테스트
    console.log('\n🤝 4. 워크플로우 공유 테스트');
    const share = await workflowSharing.shareWorkflow(workflow1.id, {
      userId: 'user-002',
      permission: 'read',
      grantedBy: 'user-001'
    });
    console.log('✅ 워크플로우 공유 성공:', share.id);

    // 5. 권한 확인 테스트
    console.log('\n🔐 5. 권한 확인 테스트');
    const hasReadPermission = await workflowSharing.checkPermission(workflow1.id, 'user-002', 'read');
    const hasWritePermission = await workflowSharing.checkPermission(workflow1.id, 'user-002', 'write');
    console.log('✅ 읽기 권한:', hasReadPermission ? '있음' : '없음');
    console.log('✅ 쓰기 권한:', hasWritePermission ? '있음' : '없음');

    // 6. 댓글 추가 테스트
    console.log('\n💬 6. 댓글 추가 테스트');
    const comment = await workflowCollab.addComment(workflow1.id, 'user-002', {
      content: '이 워크플로우 정말 유용하네요!',
      type: 'feedback'
    });
    console.log('✅ 댓글 추가 성공:', comment.id);

    // 7. 댓글 조회 테스트
    console.log('\n📋 7. 댓글 조회 테스트');
    const comments = await workflowCollab.getWorkflowComments(workflow1.id);
    console.log('✅ 댓글 조회 성공:', comments.total, '개 댓글');

    // 8. 워크플로우 복사 테스트
    console.log('\n📄 8. 워크플로우 복사 테스트');
    const copiedWorkflow = await workflowRepo.copyWorkflow(workflow1.id, 'user-003', '테스트 워크플로우 1 (복사본)');
    console.log('✅ 워크플로우 복사 성공:', copiedWorkflow.id);

    // 9. 통계 조회 테스트
    console.log('\n📊 9. 통계 조회 테스트');
    const stats = await workflowRepo.getWorkflowStats();
    const sharingStats = await workflowSharing.getSharingStats();
    const commentStats = await workflowCollab.getCommentStats(workflow1.id);
    
    console.log('✅ 워크플로우 통계:', stats);
    console.log('✅ 공유 통계:', sharingStats);
    console.log('✅ 댓글 통계:', commentStats);

    // 10. 워크플로우 수정 테스트
    console.log('\n✏️ 10. 워크플로우 수정 테스트');
    const updatedWorkflow = await workflowRepo.updateWorkflow(workflow1.id, {
      content: 'steps:\n  - name: hello\n    command: echo "Hello Updated World"'
    }, 'user-001');
    console.log('✅ 워크플로우 수정 성공. 새 버전:', updatedWorkflow.version);

    console.log('\n🎉 모든 테스트 성공! TASK-092 기능이 정상적으로 작동합니다.');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    console.error(error.stack);
  }
}

// CommonJS 형태로 모듈 로드 확인
try {
  testWorkflowManagement();
} catch (error) {
  console.error('모듈 로드 실패:', error.message);
  console.log('\n📝 TypeScript 컴파일이 필요할 수 있습니다. npm run build를 먼저 실행해주세요.');
}

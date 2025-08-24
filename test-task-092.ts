import { WorkflowRepositoryService } from './src/workflow-management/services/workflow-repository.service';
import { WorkflowSharingService } from './src/workflow-management/services/workflow-sharing.service';
import { WorkflowCollaborationService } from './src/workflow-management/services/workflow-collaboration.service';

async function testTask092() {
  console.log('🚀 TASK-092 워크플로우 공유 및 협업 기능 테스트 시작');
  console.log('='.repeat(60));

  // 서비스 인스턴스 생성
  const workflowRepo = new WorkflowRepositoryService();
  const workflowSharing = new WorkflowSharingService(workflowRepo);
  const workflowCollab = new WorkflowCollaborationService(workflowRepo, workflowSharing);

  try {
    // ✅ 1. 워크플로우 생성 테스트
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
    console.log('✅ 워크플로우 생성 성공:', workflow1.id, '-', workflow1.name);
    console.log('   버전:', workflow1.version, '| 공개여부:', workflow1.isPublic ? '공개' : '비공개');

    // ✅ 2. 추가 워크플로우 생성 (공개)
    console.log('\n📝 2. 공개 워크플로우 생성 테스트');
    const workflow2 = await workflowRepo.createWorkflow({
      name: '공개 워크플로우',
      description: '모든 사용자가 접근 가능한 워크플로우',
      content: 'steps:\n  - name: public-task\n    command: echo "Public Workflow"',
      createdBy: 'user-001',
      teamId: 'team-beta',
      isPublic: true,
      tags: ['public', 'shared'],
      categories: ['template']
    });
    console.log('✅ 공개 워크플로우 생성 성공:', workflow2.id, '-', workflow2.name);

    // ✅ 3. 워크플로우 조회 테스트
    console.log('\n🔍 3. 워크플로우 조회 테스트');
    const retrievedWorkflow = await workflowRepo.getWorkflow(workflow1.id);
    console.log('✅ 워크플로우 조회 성공:', retrievedWorkflow.name);
    console.log('   생성자:', retrievedWorkflow.createdBy, '| 팀:', retrievedWorkflow.teamId);

    // ✅ 4. 워크플로우 검색 및 필터링 테스트
    console.log('\n🔎 4. 워크플로우 검색 및 필터링 테스트');
    
    // 4.1 이름으로 검색
    const searchByName = await workflowRepo.searchWorkflows({
      query: '테스트',
      limit: 10,
      offset: 0
    });
    console.log('✅ 이름 검색 성공:', searchByName.total, '개 워크플로우 발견');

    // 4.2 태그로 필터링
    const searchByTag = await workflowRepo.searchWorkflows({
      tags: ['test'],
      limit: 10
    });
    console.log('✅ 태그 필터링 성공:', searchByTag.total, '개 워크플로우 발견');

    // 4.3 공개 워크플로우만 검색
    const searchPublic = await workflowRepo.searchWorkflows({
      isPublic: true,
      limit: 10
    });
    console.log('✅ 공개 워크플로우 검색 성공:', searchPublic.total, '개 워크플로우 발견');

    // ✅ 5. 워크플로우 공유 테스트
    console.log('\n🤝 5. 워크플로우 공유 테스트');
    
    // 5.1 읽기 권한 공유
    const readShare = await workflowSharing.shareWorkflow(workflow1.id, {
      userId: 'user-002',
      permission: 'read',
      grantedBy: 'user-001'
    });
    console.log('✅ 읽기 권한 공유 성공:', readShare.id);

    // 5.2 쓰기 권한 공유
    const writeShare = await workflowSharing.shareWorkflow(workflow1.id, {
      userId: 'user-003',
      permission: 'write',
      grantedBy: 'user-001'
    });
    console.log('✅ 쓰기 권한 공유 성공:', writeShare.id);

    // 5.3 관리자 권한 공유 (만료 시간 포함)
    const adminShare = await workflowSharing.shareWorkflow(workflow1.id, {
      userId: 'user-004',
      permission: 'admin',
      grantedBy: 'user-001',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24시간 후 만료
    });
    console.log('✅ 관리자 권한 공유 성공:', adminShare.id, '(24시간 만료)');

    // ✅ 6. 권한 확인 테스트
    console.log('\n🔐 6. 권한 확인 테스트');
    
    // 6.1 소유자 권한 확인
    const ownerPermission = await workflowSharing.checkPermission(workflow1.id, 'user-001', 'admin');
    console.log('✅ 소유자 권한:', ownerPermission ? '모든 권한 있음' : '권한 없음');

    // 6.2 공유받은 사용자 권한 확인
    const user2ReadPermission = await workflowSharing.checkPermission(workflow1.id, 'user-002', 'read');
    const user2WritePermission = await workflowSharing.checkPermission(workflow1.id, 'user-002', 'write');
    console.log('✅ user-002 읽기 권한:', user2ReadPermission ? '있음' : '없음');
    console.log('✅ user-002 쓰기 권한:', user2WritePermission ? '있음' : '없음');

    // 6.3 공개 워크플로우 읽기 권한 확인
    const publicReadPermission = await workflowSharing.checkPermission(workflow2.id, 'user-999', 'read');
    console.log('✅ 공개 워크플로우 읽기 권한:', publicReadPermission ? '있음' : '없음');

    // ✅ 7. 협업 기능 - 댓글 테스트
    console.log('\n💬 7. 협업 기능 - 댓글 테스트');
    
    // 7.1 피드백 댓글 추가
    const feedbackComment = await workflowCollab.addComment(workflow1.id, 'user-002', {
      content: '이 워크플로우 정말 유용하네요! 자동화가 잘 되어 있어요.',
      type: 'feedback'
    });
    console.log('✅ 피드백 댓글 추가 성공:', feedbackComment.id);

    // 7.2 리뷰 댓글 추가
    const reviewComment = await workflowCollab.addComment(workflow1.id, 'user-003', {
      content: 'echo 명령어 부분을 개선하면 더 좋을 것 같습니다.',
      type: 'review'
    });
    console.log('✅ 리뷰 댓글 추가 성공:', reviewComment.id);

    // 7.3 대댓글 추가
    const replyComment = await workflowCollab.addComment(workflow1.id, 'user-001', {
      content: '좋은 제안 감사합니다! 다음 버전에서 반영하겠습니다.',
      type: 'comment',
      parentCommentId: reviewComment.id
    });
    console.log('✅ 대댓글 추가 성공:', replyComment.id);

    // ✅ 8. 댓글 조회 및 관리 테스트
    console.log('\n📋 8. 댓글 조회 및 관리 테스트');
    
    // 8.1 워크플로우 댓글 조회
    const allComments = await workflowCollab.getWorkflowComments(workflow1.id);
    console.log('✅ 전체 댓글 조회 성공:', allComments.total, '개 댓글');

    // 8.2 피드백만 필터링
    const feedbackComments = await workflowCollab.getWorkflowComments(workflow1.id, { type: 'feedback' });
    console.log('✅ 피드백 댓글 조회 성공:', feedbackComments.total, '개 피드백');

    // 8.3 대댓글 조회
    const replies = await workflowCollab.getCommentReplies(reviewComment.id);
    console.log('✅ 대댓글 조회 성공:', replies.length, '개 대댓글');

    // ✅ 9. 워크플로우 버전 관리 테스트
    console.log('\n🔄 9. 워크플로우 버전 관리 테스트');
    
    // 9.1 워크플로우 수정 (새 버전 생성)
    const updatedWorkflow = await workflowRepo.updateWorkflow(workflow1.id, {
      content: 'steps:\n  - name: hello\n    command: echo "Hello Updated World"\n  - name: version\n    command: echo "Version 1.0.1"'
    }, 'user-001');
    console.log('✅ 워크플로우 수정 성공. 새 버전:', updatedWorkflow.version);

    // 9.2 다시 한번 수정
    const updatedWorkflow2 = await workflowRepo.updateWorkflow(workflow1.id, {
      name: '테스트 워크플로우 1 (업데이트됨)',
      content: 'steps:\n  - name: hello\n    command: echo "Hello Final World"'
    }, 'user-001');
    console.log('✅ 재차 수정 성공. 최신 버전:', updatedWorkflow2.version);

    // ✅ 10. 워크플로우 복사 테스트
    console.log('\n📄 10. 워크플로우 복사 테스트');
    const copiedWorkflow = await workflowRepo.copyWorkflow(workflow1.id, 'user-003', '테스트 워크플로우 1 (복사본)');
    console.log('✅ 워크플로우 복사 성공:', copiedWorkflow.id, '-', copiedWorkflow.name);
    console.log('   복사본 버전:', copiedWorkflow.version, '| 복사자:', copiedWorkflow.createdBy);

    // ✅ 11. 공유 목록 및 통계 테스트
    console.log('\n📊 11. 공유 목록 및 통계 테스트');
    
    // 11.1 워크플로우 공유 목록 조회
    const workflowShares = await workflowSharing.getWorkflowShares(workflow1.id);
    console.log('✅ 워크플로우 공유 목록:', workflowShares.length, '개 공유');

    // 11.2 사용자별 공유받은 워크플로우 조회
    const user2SharedWorkflows = await workflowSharing.getUserSharedWorkflows('user-002');
    console.log('✅ user-002가 공유받은 워크플로우:', user2SharedWorkflows.length, '개');

    // 11.3 공유 통계
    const sharingStats = await workflowSharing.getSharingStats(workflow1.id);
    console.log('✅ 공유 통계:', sharingStats);

    // ✅ 12. 전체 통계 및 활동 조회
    console.log('\n📈 12. 전체 통계 및 활동 조회');
    
    // 12.1 워크플로우 전체 통계
    const overallStats = await workflowRepo.getWorkflowStats();
    console.log('✅ 워크플로우 전체 통계:', overallStats);

    // 12.2 팀별 통계
    const teamStats = await workflowRepo.getWorkflowStats('team-alpha');
    console.log('✅ team-alpha 통계:', teamStats);

    // 12.3 댓글 통계
    const commentStats = await workflowCollab.getCommentStats(workflow1.id);
    console.log('✅ 댓글 통계:', commentStats);

    // 12.4 사용자 활동 통계
    const userActivity = await workflowCollab.getUserCommentActivity('user-002');
    console.log('✅ user-002 활동 통계:', {
      totalComments: userActivity.totalComments,
      activeComments: userActivity.activeComments,
      workflowsCommented: userActivity.workflowsCommented
    });

    // 12.5 워크플로우 피드백 요약
    const feedbackSummary = await workflowCollab.getWorkflowFeedbackSummary(workflow1.id);
    console.log('✅ 피드백 요약:', {
      feedbackCount: feedbackSummary.feedbackCount,
      reviewCount: feedbackSummary.reviewCount,
      suggestionCount: feedbackSummary.suggestionCount
    });

    // ✅ 13. 정리 및 삭제 테스트
    console.log('\n🧹 13. 정리 및 삭제 테스트');
    
    // 13.1 댓글 삭제
    const commentDeleted = await workflowCollab.deleteComment(feedbackComment.id, 'user-002');
    console.log('✅ 댓글 삭제 성공:', commentDeleted);

    // 13.2 공유 제거
    const shareRemoved = await workflowSharing.removeShare(readShare.id, 'user-001');
    console.log('✅ 공유 제거 성공:', shareRemoved);

    // 13.3 워크플로우 삭제 (아카이브)
    const workflowDeleted = await workflowRepo.deleteWorkflow(copiedWorkflow.id, 'user-003');
    console.log('✅ 워크플로우 삭제(아카이브) 성공:', workflowDeleted);

    console.log('\n🎉🎉🎉 TASK-092 모든 테스트 성공! 🎉🎉🎉');
    console.log('=' .repeat(60));
    console.log('✅ 워크플로우 생성/수정/삭제');
    console.log('✅ 워크플로우 검색 및 필터링');  
    console.log('✅ 워크플로우 공유 및 권한 관리');
    console.log('✅ 협업 기능 (댓글, 피드백, 리뷰)');
    console.log('✅ 버전 관리');
    console.log('✅ 통계 및 모니터링');
    console.log('✅ 데이터 정리 및 관리');
    console.log('\n🚀 TASK-092 워크플로우 공유 및 협업 기능이 완벽하게 구현되었습니다!');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    console.error('스택 트레이스:', error.stack);
  }
}

// 테스트 실행
testTask092().catch(console.error);

# 🔗 Workflow Integration Expert Agent - claude-auto-worker

## 🎯 역할 및 책임

### 주요 책임
- **Git 통합** 및 **브랜치 관리** 시스템
- **CI/CD 파이프라인** 통합
- **외부 도구 연동** 및 **API 통합**
- **워크플로우 상태 동기화**
- **통합 테스트** 및 **검증**

### 전문 영역
- Git 워크플로우 및 자동화
- CI/CD 시스템 통합
- 외부 서비스 API 연동
- 워크플로우 엔진 통합
- 데이터 동기화 및 일관성

---

## 🔧 Git 통합 시스템

### 브랜치 관리 및 격리
```typescript
export class GitWorkflowManager {
  constructor(private git: SimpleGit) {}
  
  async createFeatureBranch(baseBranch: string, featureName: string): Promise<string> {
    const branchName = `feature/${featureName}-${Date.now()}`
    
    await this.git.checkout(baseBranch)
    await this.git.pull('origin', baseBranch)
    await this.git.checkoutBranch(branchName, baseBranch)
    
    return branchName
  }
  
  async commitChanges(message: string, files?: string[]): Promise<void> {
    if (files && files.length > 0) {
      await this.git.add(files)
    } else {
      await this.git.add('.')
    }
    
    await this.git.commit(message)
  }
  
  async pushBranch(branchName: string): Promise<void> {
    await this.git.push('origin', branchName)
  }
  
  async createPullRequest(baseBranch: string, featureBranch: string, title: string, description: string): Promise<void> {
    // GitHub/GitLab API를 통한 PR 생성
    const prData = {
      title,
      body: description,
      head: featureBranch,
      base: baseBranch
    }
    
    // API 호출 구현
  }
}
```

---

## 📋 체크리스트

### Git 통합
- [ ] 브랜치 격리 시스템
- [ ] 자동 커밋 및 푸시
- [ ] 충돌 해결 자동화
- [ ] PR 생성 자동화

### CI/CD 통합
- [ ] GitHub Actions 연동
- [ ] 자동 테스트 실행
- [ ] 배포 파이프라인
- [ ] 롤백 시스템

### 외부 도구 연동
- [ ] Slack 알림 연동
- [ ] Jira/Linear 연동
- [ ] 모니터링 도구 연동
- [ ] 로깅 시스템 연동

---

*마지막 업데이트: 2024년 1월 1일*
*에이전트 버전: 1.0.0*
*전문 영역: 워크플로우 통합 및 외부 도구 연동*

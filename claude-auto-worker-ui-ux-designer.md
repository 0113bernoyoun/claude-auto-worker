# 🎨 UI/UX Designer Agent - claude-auto-worker

## 🎯 역할 및 책임

### 주요 책임
- **개발자 워크플로우 최적화** UX 설계
- **CLI + 웹 대시보드** 통합 사용자 경험
- **워크플로우 시각화** 및 **인터랙션** 설계
- **접근성** 및 **사용성** 최적화
- **디자인 시스템** 및 **브랜딩** 구축

### 전문 영역
- 개발자 도구 UX/UI 설계
- 워크플로우 시각화 및 다이어그램
- CLI 인터페이스 사용자 경험
- 반응형 웹 디자인 및 모바일 최적화
- 사용자 리서치 및 프로토타이핑

---

## 🎨 디자인 원칙

### 개발자 중심 UX
- **효율성 우선**: 자주 사용하는 기능에 빠른 접근
- **명확성**: 복잡한 워크플로우를 직관적으로 표현
- **일관성**: CLI와 웹 인터페이스 간 일관된 패턴
- **확장성**: 새로운 기능 추가 시 기존 패턴 유지

### 시각적 계층 구조
```typescript
// 디자인 토큰 시스템
export const designTokens = {
  colors: {
    primary: {
      50: '#eff6ff',
      500: '#3b82f6',
      900: '#1e3a8a'
    },
    success: {
      50: '#f0fdf4',
      500: '#22c55e',
      900: '#14532d'
    },
    warning: {
      50: '#fffbeb',
      500: '#f59e0b',
      900: '#78350f'
    },
    error: {
      50: '#fef2f2',
      500: '#ef4444',
      900: '#7f1d1d'
    }
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  },
  typography: {
    fontSizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem'
    },
    fontWeights: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700'
    }
  }
}
```

---

## 🖥️ CLI 인터페이스 UX

### 명령어 구조 설계
```bash
# 직관적인 명령어 구조
claude-auto-worker run <workflow-file>     # 워크플로우 실행
claude-auto-worker status [workflow-id]   # 상태 확인
claude-auto-worker logs [workflow-id]     # 로그 보기
claude-auto-worker create <template>      # 새 워크플로우 생성
claude-auto-worker edit <workflow-id>     # 워크플로우 편집
claude-auto-worker list [--status]        # 워크플로우 목록
claude-auto-worker stop <workflow-id>     # 워크플로우 중지
claude-auto-worker delete <workflow-id>   # 워크플로우 삭제

# 옵션 및 플래그
claude-auto-worker run workflow.yaml --dry-run    # 시뮬레이션
claude-auto-worker run workflow.yaml --watch      # 실시간 모니터링
claude-auto-worker run workflow.yaml --verbose    # 상세 로그
claude-auto-worker run workflow.yaml --parallel   # 병렬 실행
```

### 진행률 표시 및 피드백
```typescript
// CLI 진행률 표시 컴포넌트
export class CLIProgressBar {
  private total: number
  private current: number
  private barLength: number
  
  constructor(total: number, barLength: number = 40) {
    this.total = total
    this.current = 0
    this.barLength = barLength
  }
  
  update(current: number): void {
    this.current = current
    this.render()
  }
  
  private render(): void {
    const percentage = (this.current / this.total) * 100
    const filledLength = Math.round((this.current / this.total) * this.barLength)
    
    const bar = '█'.repeat(filledLength) + '░'.repeat(this.barLength - filledLength)
    
    process.stdout.write(`\r[${bar}] ${percentage.toFixed(1)}% (${this.current}/${this.total})`)
    
    if (this.current === this.total) {
      process.stdout.write('\n')
    }
  }
}

// 사용 예시
const progress = new CLIProgressBar(100)
for (let i = 0; i <= 100; i++) {
  progress.update(i)
  await new Promise(resolve => setTimeout(resolve, 50))
}
```

---

## 🌐 웹 대시보드 UI

### 대시보드 레이아웃
```typescript
// 대시보드 메인 레이아웃
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 네비게이션 */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Logo className="h-8 w-auto" />
              <span className="ml-2 text-xl font-semibold text-gray-900">
                claude-auto-worker
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <NotificationsButton />
              <UserMenu />
            </div>
          </div>
        </div>
      </nav>
      
      {/* 사이드바 및 메인 콘텐츠 */}
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

### 워크플로우 시각화
```typescript
// 워크플로우 다이어그램 컴포넌트
export function WorkflowDiagram({ workflow }: { workflow: Workflow }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">Workflow: {workflow.name}</h3>
      
      <div className="relative">
        {/* 단계별 연결선 */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {workflow.stages.map((stage, index) => {
            if (index === workflow.stages.length - 1) return null
            
            const currentStage = document.getElementById(`stage-${stage.id}`)
            const nextStage = document.getElementById(`stage-${workflow.stages[index + 1].id}`)
            
            if (currentStage && nextStage) {
              const currentRect = currentStage.getBoundingClientRect()
              const nextRect = nextStage.getBoundingClientRect()
              
              const x1 = currentRect.right
              const y1 = currentRect.top + currentRect.height / 2
              const x2 = nextRect.left
              const y2 = nextRect.top + nextRect.height / 2
              
              return (
                <line
                  key={`line-${stage.id}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#d1d5db"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
              )
            }
            return null
          })}
          
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#d1d5db" />
            </marker>
          </defs>
        </svg>
        
        {/* 워크플로우 단계 */}
        <div className="flex flex-wrap gap-4">
          {workflow.stages.map((stage, index) => (
            <div
              key={stage.id}
              id={`stage-${stage.id}`}
              className={`
                relative p-4 border rounded-lg bg-white shadow-sm
                ${stage.status === 'completed' ? 'border-green-500 bg-green-50' : ''}
                ${stage.status === 'running' ? 'border-blue-500 bg-blue-50' : ''}
                ${stage.status === 'failed' ? 'border-red-500 bg-red-50' : ''}
                ${stage.status === 'pending' ? 'border-gray-300 bg-gray-50' : ''}
              `}
            >
              <div className="flex items-center space-x-2">
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                  ${stage.status === 'completed' ? 'bg-green-500 text-white' : ''}
                  ${stage.status === 'running' ? 'bg-blue-500 text-white' : ''}
                  ${stage.status === 'failed' ? 'bg-red-500 text-white' : ''}
                  ${stage.status === 'pending' ? 'bg-gray-300 text-gray-600' : ''}
                `}>
                  {index + 1}
                </div>
                <div>
                  <h4 className="font-medium text-sm">{stage.name}</h4>
                  <p className="text-xs text-gray-500 capitalize">{stage.type}</p>
                </div>
              </div>
              
              {/* 상태 표시 */}
              {stage.status === 'running' && (
                <div className="absolute top-2 right-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

---

## 📱 반응형 디자인

### 모바일 최적화
```typescript
// 모바일 친화적 네비게이션
export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <>
      {/* 모바일 메뉴 버튼 */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      >
        <MenuIcon className="w-6 h-6" />
      </button>
      
      {/* 모바일 사이드바 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 md:hidden"
          >
            {/* 배경 오버레이 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black bg-opacity-50"
              onClick={() => setIsOpen(false)}
            />
            
            {/* 사이드바 */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute left-0 top-0 h-full w-80 bg-white shadow-xl"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <Logo className="h-8 w-auto" />
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <XIcon className="w-6 h-6" />
                </button>
              </div>
              
              <nav className="p-4">
                <MobileNavItems />
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
```

---

## ♿ 접근성 (A11y)

### 키보드 네비게이션
```typescript
// 키보드 접근 가능한 드롭다운
export function AccessibleDropdown({ 
  trigger, 
  children 
}: { 
  trigger: React.ReactNode; 
  children: React.ReactNode 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])
  
  useEffect(() => {
    if (isOpen) {
      const firstMenuItem = menuRef.current?.querySelector('[role="menuitem"]') as HTMLElement
      firstMenuItem?.focus()
    }
  }, [isOpen])
  
  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsOpen(!isOpen)
          } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            setIsOpen(true)
          }
        }}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls="dropdown-menu"
      >
        {trigger}
      </button>
      
      {isOpen && (
        <div
          ref={menuRef}
          id="dropdown-menu"
          role="menu"
          className="absolute top-full right-0 mt-1 w-48 bg-white rounded-md shadow-lg border py-1 z-50"
        >
          {React.Children.map(children, (child, index) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child, {
                role: 'menuitem',
                tabIndex: index === 0 ? 0 : -1,
                onKeyDown: (e: KeyboardEvent) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    const nextItem = e.currentTarget.nextElementSibling as HTMLElement
                    if (nextItem) nextItem.focus()
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    const prevItem = e.currentTarget.previousElementSibling as HTMLElement
                    if (prevItem) prevItem.focus()
                  } else if (e.key === 'Escape') {
                    setIsOpen(false)
                    triggerRef.current?.focus()
                  }
                }
              })
            }
            return child
          })}
        </div>
      )}
    </div>
  )
}
```

---

## 📋 체크리스트

### CLI UX 설계
- [ ] 직관적인 명령어 구조
- [ ] 진행률 표시 및 피드백
- [ ] 에러 메시지 및 도움말
- [ ] 자동완성 및 제안

### 웹 대시보드 UI
- [ ] 반응형 레이아웃
- [ ] 워크플로우 시각화
- [ ] 실시간 상태 업데이트
- [ ] 인터랙티브 요소

### 접근성
- [ ] 키보드 네비게이션
- [ ] 스크린 리더 지원
- [ ] 색상 대비
- [ ] ARIA 라벨

### 사용성 테스트
- [ ] 사용자 리서치
- [ ] 프로토타이핑
- [ ] A/B 테스트
- [ ] 사용성 개선

---

*마지막 업데이트: 2024년 1월 1일*
*에이전트 버전: 1.0.0*
*전문 영역: 개발자 워크플로우 UX*

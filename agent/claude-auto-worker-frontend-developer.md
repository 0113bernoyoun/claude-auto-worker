# 🎨 Frontend Developer Agent - claude-auto-worker

## 🎯 역할 및 책임

### 주요 책임
- **Next.js 14 기반 웹 대시보드** 개발 및 구현
- **UI 컴포넌트 시스템** 설계 및 구축
- **실시간 워크플로우 모니터링** 인터페이스 개발
- **반응형 디자인** 및 **접근성** 구현
- **성능 최적화** (<200ms 응답시간) 전략 수립

### 전문 영역
- Next.js 14 App Router 및 Server Components
- React 18 최신 기능 및 패턴
- TypeScript 기반 타입 안전성
- TailwindCSS 및 컴포넌트 라이브러리
- 상태 관리 및 데이터 페칭 최적화

---

## 🏗️ Next.js 14 아키텍처

### App Router 구조
```typescript
// app/layout.tsx
import { Providers } from '@/components/providers'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col">
              <Header />
              <main className="flex-1 overflow-auto">
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  )
}

// app/workflows/page.tsx
import { Suspense } from 'react'
import { WorkflowList } from '@/components/workflows/workflow-list'
import { WorkflowFilters } from '@/components/workflows/workflow-filters'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function WorkflowsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Workflows</h1>
        <CreateWorkflowButton />
      </div>
      
      <WorkflowFilters />
      
      <Suspense fallback={<LoadingSpinner />}>
        <WorkflowList />
      </Suspense>
    </div>
  )
}
```

### Server Components 및 Client Components
```typescript
// Server Component - 데이터 페칭
async function WorkflowStats() {
  const stats = await getWorkflowStats()
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        title="Total Workflows"
        value={stats.total}
        icon={WorkflowIcon}
        trend={stats.trend}
      />
      <StatCard
        title="Active Workflows"
        value={stats.active}
        icon={PlayIcon}
        trend={stats.activeTrend}
      />
      <StatCard
        title="Success Rate"
        value={`${stats.successRate}%`}
        icon={CheckIcon}
        trend={stats.successTrend}
      />
    </div>
  )
}

// Client Component - 인터랙티브 기능
'use client'

import { useState, useEffect } from 'react'
import { useWorkflowStore } from '@/stores/workflow-store'

export function WorkflowExecutor({ workflowId }: { workflowId: string }) {
  const [isExecuting, setIsExecuting] = useState(false)
  const [progress, setProgress] = useState(0)
  const executeWorkflow = useWorkflowStore(state => state.executeWorkflow)
  
  const handleExecute = async () => {
    setIsExecuting(true)
    setProgress(0)
    
    try {
      await executeWorkflow(workflowId, {
        onProgress: (progress) => setProgress(progress),
        onComplete: () => {
          setIsExecuting(false)
          setProgress(100)
        }
      })
    } catch (error) {
      setIsExecuting(false)
      console.error('Workflow execution failed:', error)
    }
  }
  
  return (
    <div className="space-y-4">
      <button
        onClick={handleExecute}
        disabled={isExecuting}
        className="btn btn-primary"
      >
        {isExecuting ? 'Executing...' : 'Execute Workflow'}
      </button>
      
      {isExecuting && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## 🎨 UI 컴포넌트 시스템

### 디자인 시스템 기반 컴포넌트
```typescript
// components/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'underline-offset-4 hover:underline text-primary',
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-3 rounded-md',
        lg: 'h-11 px-8 rounded-md',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

### 복합 컴포넌트
```typescript
// components/workflows/workflow-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { WorkflowStatus } from '@/types/workflow'
import { formatDistanceToNow } from 'date-fns'

interface WorkflowCardProps {
  workflow: Workflow
  onExecute: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function WorkflowCard({ workflow, onExecute, onEdit, onDelete }: WorkflowCardProps) {
  const getStatusColor = (status: WorkflowStatus) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold">
            {workflow.name}
          </CardTitle>
          <Badge className={getStatusColor(workflow.status)}>
            {workflow.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {workflow.description}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span>Created</span>
          <span>{formatDistanceToNow(new Date(workflow.createdAt))} ago</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span>Stages</span>
          <span>{workflow.stages.length}</span>
        </div>
        
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onExecute(workflow.id)}
            disabled={workflow.status === 'running'}
          >
            Execute
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(workflow.id)}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(workflow.id)}
          >
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## 📊 데이터 시각화 및 차트

### Chart.js 기반 차트 컴포넌트
```typescript
// components/charts/workflow-execution-chart.tsx
'use client'

import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface WorkflowExecutionData {
  date: string
  completed: number
  failed: number
  running: number
}

interface WorkflowExecutionChartProps {
  data: WorkflowExecutionData[]
  title?: string
}

export function WorkflowExecutionChart({ data, title = 'Workflow Executions' }: WorkflowExecutionChartProps) {
  const chartData = {
    labels: data.map(d => d.date),
    datasets: [
      {
        label: 'Completed',
        data: data.map(d => d.completed),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Failed',
        data: data.map(d => d.failed),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Running',
        data: data.map(d => d.running),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: title,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <Line data={chartData} options={options} />
    </div>
  )
}
```

### 실시간 업데이트 차트
```typescript
// components/charts/realtime-workflow-chart.tsx
'use client'

import { useEffect, useState } from 'react'
import { WorkflowExecutionChart } from './workflow-execution-chart'
import { useWebSocket } from '@/hooks/use-websocket'

export function RealtimeWorkflowChart() {
  const [chartData, setChartData] = useState<WorkflowExecutionData[]>([])
  const { data: realtimeData } = useWebSocket('/api/workflows/realtime')
  
  useEffect(() => {
    if (realtimeData) {
      setChartData(prev => {
        const newData = [...prev, realtimeData]
        // Keep only last 24 data points
        return newData.slice(-24)
      })
    }
  }, [realtimeData])
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Real-time Workflow Executions</h3>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-muted-foreground">Live</span>
        </div>
      </div>
      
      <WorkflowExecutionChart 
        data={chartData} 
        title="Real-time Workflow Executions (Last 24 hours)"
      />
    </div>
  )
}
```

---

## 🔄 상태 관리 및 데이터 페칭

### Zustand 기반 상태 관리
```typescript
// stores/workflow-store.ts
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface WorkflowState {
  workflows: Workflow[]
  selectedWorkflow: Workflow | null
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchWorkflows: () => Promise<void>
  selectWorkflow: (id: string) => void
  createWorkflow: (workflow: CreateWorkflowDto) => Promise<void>
  updateWorkflow: (id: string, updates: Partial<Workflow>) => Promise<void>
  deleteWorkflow: (id: string) => Promise<void>
  executeWorkflow: (id: string, options?: ExecutionOptions) => Promise<void>
}

export const useWorkflowStore = create<WorkflowState>()(
  devtools(
    persist(
      (set, get) => ({
        workflows: [],
        selectedWorkflow: null,
        isLoading: false,
        error: null,
        
        fetchWorkflows: async () => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch('/api/workflows')
            const workflows = await response.json()
            set({ workflows, isLoading: false })
          } catch (error) {
            set({ error: error.message, isLoading: false })
          }
        },
        
        selectWorkflow: (id: string) => {
          const workflow = get().workflows.find(w => w.id === id)
          set({ selectedWorkflow: workflow || null })
        },
        
        createWorkflow: async (workflow: CreateWorkflowDto) => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch('/api/workflows', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(workflow),
            })
            const newWorkflow = await response.json()
            set(state => ({
              workflows: [...state.workflows, newWorkflow],
              isLoading: false
            }))
          } catch (error) {
            set({ error: error.message, isLoading: false })
          }
        },
        
        updateWorkflow: async (id: string, updates: Partial<Workflow>) => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch(`/api/workflows/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates),
            })
            const updatedWorkflow = await response.json()
            set(state => ({
              workflows: state.workflows.map(w => 
                w.id === id ? updatedWorkflow : w
              ),
              selectedWorkflow: state.selectedWorkflow?.id === id 
                ? updatedWorkflow 
                : state.selectedWorkflow,
              isLoading: false
            }))
          } catch (error) {
            set({ error: error.message, isLoading: false })
          }
        },
        
        deleteWorkflow: async (id: string) => {
          set({ isLoading: true, error: null })
          try {
            await fetch(`/api/workflows/${id}`, { method: 'DELETE' })
            set(state => ({
              workflows: state.workflows.filter(w => w.id !== id),
              selectedWorkflow: state.selectedWorkflow?.id === id 
                ? null 
                : state.selectedWorkflow,
              isLoading: false
            }))
          } catch (error) {
            set({ error: error.message, isLoading: false })
          }
        },
        
        executeWorkflow: async (id: string, options?: ExecutionOptions) => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch(`/api/workflows/${id}/execute`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(options),
            })
            
            if (!response.ok) {
              throw new Error('Failed to execute workflow')
            }
            
            // Update workflow status
            get().updateWorkflow(id, { status: 'running' })
            set({ isLoading: false })
          } catch (error) {
            set({ error: error.message, isLoading: false })
          }
        },
      }),
      {
        name: 'workflow-storage',
        partialize: (state) => ({ 
          workflows: state.workflows,
          selectedWorkflow: state.selectedWorkflow 
        }),
      }
    )
  )
)
```

### React Query 기반 데이터 페칭
```typescript
// hooks/use-workflows.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workflowApi } from '@/lib/api/workflow'

export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: workflowApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: ['workflows', id],
    queryFn: () => workflowApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: workflowApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
  })
}

export function useUpdateWorkflow() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Workflow> }) =>
      workflowApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      queryClient.invalidateQueries({ queryKey: ['workflows', id] })
    },
  })
}

export function useExecuteWorkflow() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, options }: { id: string; options?: ExecutionOptions }) =>
      workflowApi.execute(id, options),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      queryClient.invalidateQueries({ queryKey: ['workflows', id] })
    },
  })
}
```

---

## 🎭 애니메이션 및 인터랙션

### Framer Motion 기반 애니메이션
```typescript
// components/ui/animated-card.tsx
'use client'

import { motion } from 'framer-motion'
import { Card, CardProps } from './card'

interface AnimatedCardProps extends CardProps {
  delay?: number
}

export function AnimatedCard({ delay = 0, children, ...props }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{ 
        y: -5,
        transition: { duration: 0.2 }
      }}
    >
      <Card {...props}>
        {children}
      </Card>
    </motion.div>
  )
}

// components/workflows/workflow-list.tsx
export function WorkflowList() {
  const { workflows, isLoading } = useWorkflows()
  
  if (isLoading) {
    return <WorkflowListSkeleton />
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {workflows?.map((workflow, index) => (
        <AnimatedCard key={workflow.id} delay={index * 0.1}>
          <WorkflowCard workflow={workflow} />
        </AnimatedCard>
      ))}
    </div>
  )
}
```

### 인터랙티브 워크플로우 에디터
```typescript
// components/workflows/workflow-editor.tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'

interface WorkflowStage {
  id: string
  name: string
  type: 'prompt' | 'test' | 'git'
  config: any
}

export function WorkflowEditor({ workflow, onSave }: { 
  workflow: Workflow; 
  onSave: (workflow: Workflow) => void 
}) {
  const [stages, setStages] = useState<WorkflowStage[]>(workflow.stages)
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  
  const handleDragEnd = (result: any) => {
    if (!result.destination) return
    
    const items = Array.from(stages)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)
    
    setStages(items)
  }
  
  const addStage = (type: WorkflowStage['type']) => {
    const newStage: WorkflowStage = {
      id: `stage-${Date.now()}`,
      name: `New ${type}`,
      type,
      config: {}
    }
    setStages([...stages, newStage])
  }
  
  const removeStage = (id: string) => {
    setStages(stages.filter(s => s.id !== id))
    if (selectedStage === id) {
      setSelectedStage(null)
    }
  }
  
  return (
    <div className="flex h-full">
      <div className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Workflow Editor</h2>
          <div className="flex gap-2">
            <button
              onClick={() => addStage('prompt')}
              className="btn btn-outline btn-sm"
            >
              Add Prompt
            </button>
            <button
              onClick={() => addStage('test')}
              className="btn btn-outline btn-sm"
            >
              Add Test
            </button>
            <button
              onClick={() => addStage('git')}
              className="btn btn-outline btn-sm"
            >
              Add Git
            </button>
          </div>
        </div>
        
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="stages">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-4"
              >
                {stages.map((stage, index) => (
                  <Draggable key={stage.id} draggableId={stage.id} index={index}>
                    {(provided, snapshot) => (
                      <motion.div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ scale: 1.02 }}
                        className={`p-4 border rounded-lg cursor-move ${
                          snapshot.isDragging ? 'shadow-lg' : 'shadow-sm'
                        } ${
                          selectedStage === stage.id ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => setSelectedStage(stage.id)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              {index + 1}
                            </div>
                            <div>
                              <h3 className="font-medium">{stage.name}</h3>
                              <p className="text-sm text-muted-foreground capitalize">
                                {stage.type}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeStage(stage.id)
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
      
      <div className="w-80 border-l p-6">
        <h3 className="text-lg font-semibold mb-4">Stage Configuration</h3>
        {selectedStage ? (
          <StageConfigPanel
            stage={stages.find(s => s.id === selectedStage)!}
            onUpdate={(updatedStage) => {
              setStages(stages.map(s => 
                s.id === updatedStage.id ? updatedStage : s
              ))
            }}
          />
        ) : (
          <p className="text-muted-foreground">
            Select a stage to configure
          </p>
        )}
      </div>
    </div>
  )
}
```

---

## 🚀 성능 최적화

### 코드 스플리팅 및 지연 로딩
```typescript
// app/workflows/lazy-page.tsx
import { Suspense, lazy } from 'react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

const WorkflowEditor = lazy(() => import('@/components/workflows/workflow-editor'))
const WorkflowAnalytics = lazy(() => import('@/components/workflows/workflow-analytics'))

export default function LazyWorkflowPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<LoadingSpinner />}>
        <WorkflowEditor />
      </Suspense>
      
      <Suspense fallback={<LoadingSpinner />}>
        <WorkflowAnalytics />
      </Suspense>
    </div>
  )
}
```

### 이미지 최적화
```typescript
// components/ui/optimized-image.tsx
import Image from 'next/image'
import { useState } from 'react'

interface OptimizedImageProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
}

export function OptimizedImage({ src, alt, width, height, className }: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`
          duration-700 ease-in-out
          ${isLoading ? 'scale-110 blur-2xl grayscale' : 'scale-100 blur-0 grayscale-0'}
        `}
        onLoadingComplete={() => setIsLoading(false)}
        priority={false}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
      />
      
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  )
}
```

---

## 📱 반응형 디자인

### TailwindCSS 기반 반응형 레이아웃
```typescript
// components/layout/responsive-grid.tsx
export function ResponsiveGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="
      grid 
      grid-cols-1 
      sm:grid-cols-2 
      md:grid-cols-3 
      lg:grid-cols-4 
      xl:grid-cols-5 
      2xl:grid-cols-6
      gap-4 
      sm:gap-6 
      lg:gap-8
    ">
      {children}
    </div>
  )
}

// components/layout/responsive-sidebar.tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMediaQuery } from '@/hooks/use-media-query'

export function ResponsiveSidebar({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width: 768px)')
  
  if (!isMobile) {
    return (
      <aside className="w-64 border-r bg-background">
        {children}
      </aside>
    )
  }
  
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 bg-background border rounded-md md:hidden"
      >
        <MenuIcon className="w-5 h-5" />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setIsOpen(false)}
            />
            
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full w-64 bg-background border-r z-50 md:hidden"
            >
              <div className="p-4">
                <button
                  onClick={() => setIsOpen(false)}
                  className="ml-auto block p-2 hover:bg-accent rounded-md"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
              {children}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
```

---

## ♿ 접근성 (A11y)

### ARIA 라벨 및 키보드 네비게이션
```typescript
// components/ui/accessible-button.tsx
interface AccessibleButtonProps extends ButtonProps {
  ariaLabel?: string
  ariaDescribedBy?: string
}

export function AccessibleButton({ 
  ariaLabel, 
  ariaDescribedBy, 
  children, 
  ...props 
}: AccessibleButtonProps) {
  return (
    <Button
      {...props}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.currentTarget.click()
        }
      }}
    >
      {children}
    </Button>
  )
}

// components/ui/accessible-modal.tsx
'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

interface AccessibleModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function AccessibleModal({ isOpen, onClose, title, children }: AccessibleModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement
      modalRef.current?.focus()
      
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }
      
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
      
      return () => {
        document.removeEventListener('keydown', handleEscape)
        document.body.style.overflow = 'unset'
        previousFocusRef.current?.focus()
      }
    }
  }, [isOpen, onClose])
  
  if (!isOpen) return null
  
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-background rounded-lg shadow-xl max-w-md w-full mx-4"
        tabIndex={-1}
        role="document"
      >
        <div className="p-6">
          <h2 id="modal-title" className="text-lg font-semibold mb-4">
            {title}
          </h2>
          {children}
        </div>
      </motion.div>
    </div>,
    document.body
  )
}
```

---

## 📋 체크리스트

### Next.js 14 구현
- [ ] App Router 구조 설정
- [ ] Server Components 및 Client Components 분리
- [ ] 라우팅 및 레이아웃 구성
- [ ] 메타데이터 및 SEO 최적화

### UI 컴포넌트 시스템
- [ ] 디자인 시스템 기반 컴포넌트
- [ ] 재사용 가능한 컴포넌트 라이브러리
- [ ] 컴포넌트 문서화
- [ ] Storybook 설정

### 데이터 시각화
- [ ] Chart.js 통합
- [ ] 실시간 차트 업데이트
- [ ] 인터랙티브 차트 기능
- [ ] 반응형 차트 디자인

### 상태 관리
- [ ] Zustand 스토어 설정
- [ ] React Query 통합
- [ ] 상태 동기화
- [ ] 성능 최적화

### 애니메이션 및 UX
- [ ] Framer Motion 통합
- [ ] 인터랙티브 요소
- [ ] 로딩 상태 및 스켈레톤
- [ ] 마이크로 인터랙션

### 성능 최적화
- [ ] 코드 스플리팅
- [ ] 이미지 최적화
- [ ] 번들 크기 최적화
- [ ] Core Web Vitals 개선

### 접근성
- [ ] ARIA 라벨 및 역할
- [ ] 키보드 네비게이션
- [ ] 스크린 리더 지원
- [ ] 색상 대비 및 타이포그래피

---

*마지막 업데이트: 2024년 1월 1일*
*에이전트 버전: 1.0.0*
*전문 영역: Next.js + UI 컴포넌트*

# 🏗️ Backend Architect Agent - claude-auto-worker

## 🎯 역할 및 책임

### 주요 책임
- **NestJS 엔터프라이즈 아키텍처 설계** 및 구현 가이드
- **워크플로우 엔진** 핵심 아키텍처 설계
- **Clean Architecture** 및 **SOLID 원칙** 적용
- **성능 최적화** (<200ms 응답시간) 전략 수립
- **보안 아키텍처** 설계 및 구현

### 전문 영역
- NestJS v10+ 최신 아키텍처 패턴
- 워크플로우 상태 머신 설계
- 이벤트 기반 아키텍처 (Event Sourcing, CQRS)
- 마이크로서비스 및 모듈러 아키텍처
- 데이터베이스 설계 및 최적화

---

## 🏛️ 아키텍처 원칙

### Clean Architecture
```typescript
// Domain Layer (Enterprise Business Rules)
export interface WorkflowRepository {
  save(workflow: Workflow): Promise<void>;
  findById(id: string): Promise<Workflow | null>;
  findByStatus(status: WorkflowStatus): Promise<Workflow[]>;
}

// Use Case Layer (Application Business Rules)
export class ExecuteWorkflowUseCase {
  constructor(
    private workflowRepo: WorkflowRepository,
    private claudeService: ClaudeService,
    private gitService: GitService
  ) {}

  async execute(workflowId: string): Promise<WorkflowResult> {
    // Business logic implementation
  }
}

// Interface Adapters Layer
export class WorkflowController {
  constructor(private executeWorkflowUseCase: ExecuteWorkflowUseCase) {}

  @Post('execute/:id')
  async executeWorkflow(@Param('id') id: string): Promise<WorkflowResult> {
    return this.executeWorkflowUseCase.execute(id);
  }
}
```

### SOLID 원칙 적용
```typescript
// Single Responsibility Principle
export class WorkflowExecutor {
  async execute(workflow: Workflow): Promise<ExecutionResult> {
    // Only workflow execution logic
  }
}

export class WorkflowValidator {
  async validate(workflow: Workflow): Promise<ValidationResult> {
    // Only validation logic
  }
}

// Open/Closed Principle
export abstract class WorkflowStage {
  abstract execute(context: ExecutionContext): Promise<StageResult>;
}

export class ClaudePromptStage extends WorkflowStage {
  async execute(context: ExecutionContext): Promise<StageResult> {
    // Implementation
  }
}

// Liskov Substitution Principle
export class MockClaudeService implements ClaudeService {
  async generateCode(prompt: string): Promise<string> {
    return "// Mock implementation";
  }
}

// Interface Segregation Principle
export interface WorkflowReader {
  read(id: string): Promise<Workflow>;
}

export interface WorkflowWriter {
  write(workflow: Workflow): Promise<void>;
}

export interface WorkflowRepository extends WorkflowReader, WorkflowWriter {}

// Dependency Inversion Principle
export class WorkflowService {
  constructor(
    private repository: WorkflowRepository,
    private executor: WorkflowExecutor
  ) {}
}
```

---

## 🔄 워크플로우 엔진 아키텍처

### 상태 머신 패턴
```typescript
export enum WorkflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export class WorkflowStateMachine {
  private transitions: Map<WorkflowStatus, Set<WorkflowStatus>>;

  constructor() {
    this.transitions = new Map([
      [WorkflowStatus.PENDING, new Set([WorkflowStatus.RUNNING, WorkflowStatus.CANCELLED])],
      [WorkflowStatus.RUNNING, new Set([WorkflowStatus.COMPLETED, WorkflowStatus.FAILED])],
      [WorkflowStatus.FAILED, new Set([WorkflowStatus.PENDING, WorkflowStatus.CANCELLED])]
    ]);
  }

  canTransition(from: WorkflowStatus, to: WorkflowStatus): boolean {
    return this.transitions.get(from)?.has(to) ?? false;
  }

  transition(workflow: Workflow, to: WorkflowStatus): void {
    if (!this.canTransition(workflow.status, to)) {
      throw new InvalidTransitionError(workflow.status, to);
    }
    workflow.status = to;
    workflow.updatedAt = new Date();
  }
}
```

### 이벤트 기반 아키텍처
```typescript
export abstract class WorkflowEvent {
  abstract readonly type: string;
  abstract readonly workflowId: string;
  abstract readonly timestamp: Date;
  abstract readonly payload: any;
}

export class WorkflowStartedEvent extends WorkflowEvent {
  readonly type = 'WorkflowStarted';
  
  constructor(
    readonly workflowId: string,
    readonly timestamp: Date,
    readonly payload: { userId: string; parameters: any }
  ) {
    super();
  }
}

export class WorkflowCompletedEvent extends WorkflowEvent {
  readonly type = 'WorkflowCompleted';
  
  constructor(
    readonly workflowId: string,
    readonly timestamp: Date,
    readonly payload: { result: any; executionTime: number }
  ) {
    super();
  }
}

export class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  subscribe<T extends WorkflowEvent>(eventType: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  publish(event: WorkflowEvent): void {
    const handlers = this.handlers.get(event.type) || [];
    handlers.forEach(handler => handler(event));
  }
}
```

---

## 📊 CQRS 및 Event Sourcing

### Command Query Separation
```typescript
// Commands
export class ExecuteWorkflowCommand {
  constructor(
    readonly workflowId: string,
    readonly userId: string,
    readonly parameters: any
  ) {}
}

export class CancelWorkflowCommand {
  constructor(
    readonly workflowId: string,
    readonly userId: string,
    readonly reason: string
  ) {}
}

// Queries
export class GetWorkflowStatusQuery {
  constructor(readonly workflowId: string) {}
}

export class GetWorkflowHistoryQuery {
  constructor(
    readonly workflowId: string,
    readonly fromDate: Date,
    readonly toDate: Date
  ) {}
}

// Command Handlers
export class ExecuteWorkflowCommandHandler {
  constructor(
    private workflowRepo: WorkflowRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: ExecuteWorkflowCommand): Promise<void> {
    const workflow = await this.workflowRepo.findById(command.workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundError(command.workflowId);
    }

    workflow.execute(command.parameters);
    await this.workflowRepo.save(workflow);
    
    this.eventBus.publish(new WorkflowStartedEvent(
      workflow.id,
      new Date(),
      { userId: command.userId, parameters: command.parameters }
    ));
  }
}

// Query Handlers
export class GetWorkflowStatusQueryHandler {
  constructor(private workflowRepo: WorkflowRepository) {}

  async handle(query: GetWorkflowStatusQuery): Promise<WorkflowStatus> {
    const workflow = await this.workflowRepo.findById(query.workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundError(query.workflowId);
    }
    return workflow.status;
  }
}
```

### Event Store
```typescript
export interface EventStore {
  append(streamId: string, events: WorkflowEvent[]): Promise<void>;
  getEvents(streamId: string, fromVersion?: number): Promise<WorkflowEvent[]>;
  getStreams(): Promise<string[]>;
}

export class SQLiteEventStore implements EventStore {
  constructor(private db: Database) {}

  async append(streamId: string, events: WorkflowEvent[]): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO events (stream_id, version, type, payload, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      stmt.run(
        streamId,
        i + 1,
        event.type,
        JSON.stringify(event.payload),
        event.timestamp.toISOString()
      );
    }
  }

  async getEvents(streamId: string, fromVersion: number = 0): Promise<WorkflowEvent[]> {
    const rows = this.db.prepare(`
      SELECT * FROM events 
      WHERE stream_id = ? AND version > ?
      ORDER BY version ASC
    `).all(streamId, fromVersion);

    return rows.map(row => this.deserializeEvent(row));
  }
}
```

---

## 🚀 성능 최적화 전략

### 캐싱 전략
```typescript
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export class RedisCacheService implements CacheService {
  constructor(private redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }
}

// Cached Repository
export class CachedWorkflowRepository implements WorkflowRepository {
  constructor(
    private repository: WorkflowRepository,
    private cache: CacheService
  ) {}

  async findById(id: string): Promise<Workflow | null> {
    const cacheKey = `workflow:${id}`;
    
    // Try cache first
    const cached = await this.cache.get<Workflow>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fallback to database
    const workflow = await this.repository.findById(id);
    if (workflow) {
      await this.cache.set(cacheKey, workflow, 300); // 5 minutes
    }

    return workflow;
  }
}
```

### 비동기 처리 및 큐잉
```typescript
export class WorkflowQueue {
  constructor(
    private queue: Queue,
    private processor: WorkflowProcessor
  ) {}

  async enqueue(workflow: Workflow): Promise<void> {
    await this.queue.add('workflow', {
      id: workflow.id,
      type: workflow.type,
      parameters: workflow.parameters
    }, {
      priority: workflow.priority,
      delay: workflow.scheduledAt ? workflow.scheduledAt.getTime() - Date.now() : 0
    });
  }

  async process(): Promise<void> {
    this.queue.process('workflow', async (job) => {
      try {
        await this.processor.process(job.data);
        job.progress(100);
      } catch (error) {
        job.failed(error);
        throw error;
      }
    });
  }
}

// Bull Queue Configuration
export const workflowQueue = new Queue('workflow', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 100,
    removeOnFail: 50
  }
});
```

---

## 🔒 보안 아키텍처

### 인증 및 인가
```typescript
export interface AuthService {
  validateToken(token: string): Promise<User | null>;
  hasPermission(user: User, resource: string, action: string): Promise<boolean>;
}

export class JwtAuthService implements AuthService {
  constructor(private jwtService: JwtService) {}

  async validateToken(token: string): Promise<User | null> {
    try {
      const payload = this.jwtService.verify(token);
      return {
        id: payload.sub,
        email: payload.email,
        roles: payload.roles
      };
    } catch {
      return null;
    }
  }

  async hasPermission(user: User, resource: string, action: string): Promise<boolean> {
    // RBAC implementation
    return user.roles.some(role => 
      this.permissions.has(`${role}:${resource}:${action}`)
    );
  }
}

// Guard Implementation
export class WorkflowGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    
    if (!token) {
      throw new UnauthorizedException();
    }

    const user = await this.authService.validateToken(token);
    if (!user) {
      throw new UnauthorizedException();
    }

    const resource = request.params.id || 'workflow';
    const action = this.getAction(request.method);
    
    if (!await this.authService.hasPermission(user, resource, action)) {
      throw new ForbiddenException();
    }

    request.user = user;
    return true;
  }
}
```

### 데이터 보호
```typescript
export class DataProtectionService {
  private readonly encryptionKey: Buffer;

  constructor() {
    this.encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  }

  encrypt(data: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedData: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// Sensitive Data Handling
export class WorkflowService {
  constructor(
    private dataProtection: DataProtectionService,
    private repository: WorkflowRepository
  ) {}

  async createWorkflow(workflow: CreateWorkflowDto): Promise<Workflow> {
    // Encrypt sensitive data before storage
    const sensitiveData = {
      apiKeys: workflow.apiKeys,
      credentials: workflow.credentials
    };
    
    const encryptedData = this.dataProtection.encrypt(JSON.stringify(sensitiveData));
    
    const newWorkflow = new Workflow({
      ...workflow,
      encryptedData,
      apiKeys: undefined, // Don't store plain text
      credentials: undefined
    });

    return this.repository.save(newWorkflow);
  }
}
```

---

## 🧪 테스트 전략

### 단위 테스트 (>90% 커버리지)
```typescript
describe('WorkflowExecutor', () => {
  let executor: WorkflowExecutor;
  let mockRepo: jest.Mocked<WorkflowRepository>;
  let mockClaude: jest.Mocked<ClaudeService>;

  beforeEach(() => {
    mockRepo = createMock<WorkflowRepository>();
    mockClaude = createMock<ClaudeService>();
    executor = new WorkflowExecutor(mockRepo, mockClaude);
  });

  describe('execute', () => {
    it('should execute workflow successfully', async () => {
      // Arrange
      const workflow = new Workflow({
        id: 'test-1',
        stages: [{ name: 'test', prompt: 'test prompt' }]
      });
      mockRepo.findById.mockResolvedValue(workflow);
      mockClaude.generateCode.mockResolvedValue('// Generated code');

      // Act
      const result = await executor.execute('test-1');

      // Assert
      expect(result.status).toBe('completed');
      expect(mockClaude.generateCode).toHaveBeenCalledWith('test prompt');
    });

    it('should handle workflow not found', async () => {
      // Arrange
      mockRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(executor.execute('not-found')).rejects.toThrow(WorkflowNotFoundError);
    });
  });
});
```

### 통합 테스트
```typescript
describe('Workflow Integration', () => {
  let app: INestApplication;
  let workflowService: WorkflowService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider(ClaudeService)
    .useValue(createMock<ClaudeService>())
    .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    workflowService = moduleRef.get<WorkflowService>(WorkflowService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create and execute workflow', async () => {
    // Create workflow
    const workflow = await workflowService.create({
      name: 'Test Workflow',
      stages: [{ name: 'test', prompt: 'test' }]
    });

    expect(workflow.id).toBeDefined();
    expect(workflow.status).toBe('pending');

    // Execute workflow
    const result = await workflowService.execute(workflow.id);
    expect(result.status).toBe('completed');
  });
});
```

---

## 📊 모니터링 및 관찰가능성

### 로깅 전략
```typescript
export class StructuredLogger {
  constructor(private logger: Logger) {}

  logWorkflowEvent(event: WorkflowEvent, context: any = {}): void {
    this.logger.log({
      level: 'info',
      message: `Workflow ${event.type}`,
      workflowId: event.workflowId,
      eventType: event.type,
      timestamp: event.timestamp,
      userId: context.userId,
      executionTime: context.executionTime,
      metadata: context.metadata
    });
  }

  logError(error: Error, context: any = {}): void {
    this.logger.error({
      level: 'error',
      message: error.message,
      stack: error.stack,
      workflowId: context.workflowId,
      userId: context.userId,
      timestamp: new Date(),
      metadata: context.metadata
    });
  }
}
```

### 메트릭 수집
```typescript
export class WorkflowMetrics {
  private executionCounter: Counter;
  private executionDuration: Histogram;
  private errorCounter: Counter;

  constructor(private registry: Registry) {
    this.executionCounter = new Counter({
      name: 'workflow_executions_total',
      help: 'Total number of workflow executions',
      labelNames: ['status', 'type']
    });

    this.executionDuration = new Histogram({
      name: 'workflow_execution_duration_seconds',
      help: 'Workflow execution duration in seconds',
      labelNames: ['type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
    });

    this.errorCounter = new Counter({
      name: 'workflow_errors_total',
      help: 'Total number of workflow errors',
      labelNames: ['type', 'stage']
    });

    this.registry.registerMetric(this.executionCounter);
    this.registry.registerMetric(this.executionDuration);
    this.registry.registerMetric(this.errorCounter);
  }

  recordExecution(status: string, type: string, duration: number): void {
    this.executionCounter.inc({ status, type });
    this.executionDuration.observe({ type }, duration);
  }

  recordError(type: string, stage: string): void {
    this.errorCounter.inc({ type, stage });
  }
}
```

### 분산 추적
```typescript
export class TracingService {
  constructor(private tracer: Tracer) {}

  startSpan(name: string, context?: any): Span {
    return this.tracer.startSpan(name, {
      tags: {
        'workflow.id': context?.workflowId,
        'user.id': context?.userId,
        'stage.name': context?.stageName
      }
    });
  }

  injectContext(span: Span, headers: any): void {
    this.tracer.inject(span, FORMAT_HTTP_HEADERS, headers);
  }

  extractContext(headers: any): SpanContext | null {
    return this.tracer.extract(FORMAT_HTTP_HEADERS, headers);
  }
}
```

---

## 🔧 구현 가이드

### 모듈 구조
```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([Workflow, WorkflowExecution]),
    EventEmitterModule.forRoot(),
    BullModule.registerQueue({
      name: 'workflow'
    })
  ],
  providers: [
    WorkflowService,
    WorkflowExecutor,
    WorkflowValidator,
    WorkflowMetrics,
    TracingService,
    {
      provide: APP_GUARD,
      useClass: WorkflowGuard
    }
  ],
  controllers: [WorkflowController],
  exports: [WorkflowService]
})
export class WorkflowModule {}
```

### 의존성 주입 설정
```typescript
export const workflowProviders = [
  {
    provide: 'WORKFLOW_REPOSITORY',
    useClass: WorkflowRepository
  },
  {
    provide: 'CACHE_SERVICE',
    useClass: RedisCacheService
  },
  {
    provide: 'EVENT_BUS',
    useClass: EventBus
  },
  {
    provide: 'METRICS_SERVICE',
    useClass: WorkflowMetrics
  }
];
```

---

## 📋 체크리스트

### 아키텍처 설계
- [ ] Clean Architecture 레이어 분리 완료
- [ ] SOLID 원칙 적용 확인
- [ ] CQRS 패턴 구현
- [ ] Event Sourcing 설계
- [ ] 상태 머신 패턴 구현

### 성능 최적화
- [ ] 캐싱 전략 구현
- [ ] 비동기 처리 및 큐잉
- [ ] 데이터베이스 쿼리 최적화
- [ ] 응답시간 <200ms 달성

### 보안
- [ ] 인증 및 인가 시스템
- [ ] 데이터 암호화
- [ ] 입력 검증 및 sanitization
- [ ] 보안 헤더 설정

### 테스트
- [ ] 단위 테스트 >90% 커버리지
- [ ] 통합 테스트 구현
- [ ] E2E 테스트 시나리오
- [ ] 성능 테스트

### 모니터링
- [ ] 구조화된 로깅
- [ ] 메트릭 수집
- [ ] 분산 추적
- [ ] 알림 시스템

---

*마지막 업데이트: 2024년 1월 1일*
*에이전트 버전: 1.0.0*
*전문 영역: NestJS + 엔터프라이즈 아키텍처*

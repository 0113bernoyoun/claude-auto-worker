type HealthResponse = { status: string; timestamp: string };
type WorkflowState = {
  runId: string;
  workflowName: string;
  status: string;
  progress: number;
  startedAt?: string;
  updatedAt?: string;
  completedAt?: string;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  source: 'latest' | 'runId';
};

async function getHealth(): Promise<HealthResponse> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5849/api';
  const res = await fetch(`${apiBase}/health`, { cache: 'no-store' });
  if (!res.ok) {
    return { status: 'error', timestamp: new Date().toISOString() } as const;
  }
  return (await res.json()) as HealthResponse;
}

export default async function Page() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5849/api';
  const [health, status] = await Promise.all([
    getHealth(),
    (async () => {
      try {
        const res = await fetch(`${apiBase}/status`, { cache: 'no-store' });
        if (!res.ok) return null;
        return (await res.json()) as WorkflowState;
      } catch {
        return null;
      }
    })(),
  ]);
  return (
    <main className='mx-auto max-w-3xl p-6'>
      <h1 className='text-2xl font-semibold'>Claude Auto Worker</h1>
      <p className='mt-2 text-sm text-gray-600'>Web dashboard starter</p>

      <section className='mt-8 rounded-lg border bg-white p-4 shadow-sm'>
        <h2 className='text-lg font-medium'>Backend Health</h2>
        <div className='mt-2 text-sm'>
          <div><span className='font-semibold'>Status:</span> {String(health.status)}</div>
          <div><span className='font-semibold'>Timestamp:</span> {String(health.timestamp)}</div>
          <div className='mt-1 text-gray-500 text-xs'>
            API: {process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5849/api'}
          </div>
        </div>
      </section>

      <section className='mt-6 rounded-lg border bg-white p-4 shadow-sm'>
        <h2 className='text-lg font-medium'>Latest Run Status</h2>
        {!status ? (
          <div className='mt-2 text-sm text-gray-500'>No recent runs or status unavailable.</div>
        ) : (
          <div className='mt-2 text-sm grid grid-cols-2 gap-2'>
            <div><span className='font-semibold'>Source:</span> {status.source}</div>
            <div><span className='font-semibold'>Run ID:</span> {status.runId}</div>
            <div><span className='font-semibold'>Workflow:</span> {status.workflowName}</div>
            <div><span className='font-semibold'>Status:</span> {status.status}</div>
            <div><span className='font-semibold'>Progress:</span> {status.progress}%</div>
            <div><span className='font-semibold'>Steps:</span> {status.completedSteps}/{status.totalSteps} (failed {status.failedSteps})</div>
            <div><span className='font-semibold'>Updated:</span> {status.updatedAt || '-'}</div>
          </div>
        )}
      </section>
    </main>
  );
}

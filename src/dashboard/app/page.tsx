type HealthResponse = { status: string; timestamp: string };

async function getHealth(): Promise<HealthResponse> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5849/api';
  const res = await fetch(`${apiBase}/health`, { cache: 'no-store' });
  if (!res.ok) {
    return { status: 'error', timestamp: new Date().toISOString() } as const;
  }
  return (await res.json()) as HealthResponse;
}

export default async function Page() {
  const health = await getHealth();
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
    </main>
  );
}

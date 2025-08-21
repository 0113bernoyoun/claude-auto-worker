type LogEntry = {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  runId?: string;
  workflow?: string;
  stage?: string;
  step?: string;
};

async function getLogs(params: { runId?: string; lines?: number; level?: string } = {}): Promise<LogEntry[]> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5849/api';
  const query = new URLSearchParams();
  if (params.runId) query.set('runId', params.runId);
  if (params.lines) query.set('lines', String(params.lines));
  if (params.level) query.set('level', params.level);
  const url = `${apiBase}/logs?${query.toString()}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as LogEntry[];
  } catch {
    return [];
  }
}

export default async function LogPage() {
  const entries = await getLogs({ lines: 300 });
  return (
    <section className='rounded-lg border bg-white p-4 shadow-sm'>
      <h2 className='text-lg font-medium'>Logs</h2>
      <div className='mt-3 text-xs font-mono whitespace-pre-wrap'>
        {entries.length === 0 ? (
          <div className='text-gray-500'>No logs available.</div>
        ) : (
          <ul className='space-y-1'>
            {entries.map((e, i) => (
              <li key={i}>
                <span className='text-gray-500'>{e.timestamp}</span>
                {' '}
                <span
                  className={
                    e.level === 'error' ? 'text-red-600' : e.level === 'warn' ? 'text-yellow-700' : 'text-gray-800'
                  }
                >
                  [{e.level.toUpperCase()}]
                </span>
                {' '}
                <span className='text-gray-900'>{e.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}



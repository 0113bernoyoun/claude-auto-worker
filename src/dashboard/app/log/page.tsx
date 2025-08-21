type LogEntry = {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  runId?: string;
  workflow?: string;
  stage?: string;
  step?: string;
};

async function getLogs(params: { runId?: string; lines?: number; level?: string } = {}): Promise<{ meta: { count: number; limit: number }; entries: LogEntry[] }> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5849/api';
  const query = new URLSearchParams();
  if (params.runId) query.set('runId', params.runId);
  if (params.lines) query.set('lines', String(params.lines));
  if (params.level) query.set('level', params.level);
  const url = `${apiBase}/logs?${query.toString()}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return { meta: { count: 0, limit: params.lines || 0 }, entries: [] };
    return (await res.json()) as { meta: { count: number; limit: number }; entries: LogEntry[] };
  } catch {
    return { meta: { count: 0, limit: params.lines || 0 }, entries: [] };
  }
}

export default async function LogPage({ searchParams }: { searchParams?: { level?: string; runId?: string; lines?: string; refresh?: string } }) {
  const level = searchParams?.level;
  const runId = searchParams?.runId;
  const lines = searchParams?.lines ? Number(searchParams.lines) : 300;
  const refresh = searchParams?.refresh ? Number(searchParams.refresh) : 0; // seconds

  const { meta, entries } = await getLogs({ lines, level, runId });
  const nextUrl = (delta: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams({
      ...(level ? { level } : {}),
      ...(runId ? { runId } : {}),
      ...(lines ? { lines: String(lines) } : {}),
      ...(refresh ? { refresh: String(refresh) } : {}),
      ...Object.entries(delta).reduce((acc, [k, v]) => (v === undefined ? acc : { ...acc, [k]: String(v) }), {} as Record<string, string>),
    });
    return `/log?${u.toString()}`;
  };

  return (
    <section className='rounded-lg border bg-white p-4 shadow-sm'>
      <h2 className='text-lg font-medium'>Logs</h2>
      <form className='mt-3 flex flex-wrap gap-2 text-sm'>
        <input name='runId' defaultValue={runId} placeholder='runId' className='border px-2 py-1 rounded' />
        <select name='level' defaultValue={level} className='border px-2 py-1 rounded'>
          <option value=''>level: all</option>
          <option value='info'>info</option>
          <option value='warn'>warn</option>
          <option value='error'>error</option>
          <option value='debug'>debug</option>
        </select>
        <input name='lines' type='number' defaultValue={lines} min={10} max={5000} className='border px-2 py-1 rounded w-24' />
        <input name='refresh' type='number' defaultValue={refresh} min={0} max={120} className='border px-2 py-1 rounded w-24' />
        <button formAction={nextUrl({})} className='border px-3 py-1 rounded bg-gray-100 hover:bg-gray-200'>Apply</button>
        {refresh > 0 && (
          <meta httpEquiv='refresh' content={String(refresh)} />
        )}
      </form>
      <div className='mt-3 text-xs font-mono whitespace-pre-wrap'>
        <div className='mb-2 text-gray-600'>
          Showing {meta.count} line(s), limit {meta.limit}
        </div>
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



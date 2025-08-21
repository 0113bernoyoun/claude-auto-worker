import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Claude Auto Worker Dashboard',
  description: 'Monitoring and logs for claude-auto-worker',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <body className='min-h-screen bg-gray-50 text-gray-900 antialiased'>
        <div className='mx-auto max-w-5xl p-6'>
          <header className='flex items-center justify-between'>
            <h1 className='text-xl font-semibold'>Claude Auto Worker</h1>
            <nav className='text-sm text-gray-600 space-x-4'>
              <a href='/' className='hover:underline'>Home</a>
              <a href='/log' className='hover:underline'>Logs</a>
            </nav>
          </header>
          <main className='mt-6'>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

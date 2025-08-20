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
        {children}
      </body>
    </html>
  );
}

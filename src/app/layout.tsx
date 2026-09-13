import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Platform Flight Simulator | Digital Twin & Guided Sandbox',
  description: 'Interactive scenario-driven platform flight simulator for Kubernetes, CNI packet routing, off-heap OOM, CSI storage locks, and etcd finalizers.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#030712] text-slate-100 min-h-screen antialiased flex flex-col">
        {children}
      </body>
    </html>
  );
}

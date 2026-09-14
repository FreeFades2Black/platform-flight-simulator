import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tactical Edge Platform Flight Simulator | Multi-Domain Data Fabric',
  description: 'High-Fidelity Digital Twin for Stress-Testing Disconnected, Intermittent, and Edge-to-Core Ingestion Pipelines across Multi-Tenant Defense Clusters.',
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

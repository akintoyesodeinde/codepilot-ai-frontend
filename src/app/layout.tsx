import type { Metadata } from 'next';
import { AppProviders } from '@/components/providers/AppProviders';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'CodePilot AI — Intelligent Code Review Platform',
    template: '%s | CodePilot AI',
  },
  description:
    'Multi-tenant AI software engineering intelligence platform for automated pull request reviews, static security analysis, architecture exploration, and automated testing.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

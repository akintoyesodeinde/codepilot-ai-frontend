'use client';

import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { Skeleton } from '@/components/ui/feedback';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <Skeleton className="h-[460px] w-full" />,
});

function mapMonacoLanguage(language: string): string {
  switch (language) {
    case 'tsx':
    case 'typescript':
      return 'typescript';
    case 'jsx':
    case 'javascript':
      return 'javascript';
    case 'c_sharp':
      return 'csharp';
    case 'python':
    case 'go':
    case 'java':
    case 'rust':
    case 'sql':
    case 'json':
    case 'yaml':
    case 'markdown':
      return language;
    default:
      return 'plaintext';
  }
}

export function MonacoCodeViewer({
  value,
  language,
  height = '460px',
}: {
  value: string;
  language: string;
  height?: string;
}) {
  const { resolvedTheme } = useTheme();

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)]">
      <MonacoEditor
        height={height}
        language={mapMonacoLanguage(language)}
        value={value}
        theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 13,
          lineNumbers: 'on',
          automaticLayout: true,
          wordWrap: 'off',
        }}
      />
    </div>
  );
}

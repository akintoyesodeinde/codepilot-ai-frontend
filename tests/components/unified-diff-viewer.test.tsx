import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UnifiedDiffViewer } from '@/components/code/UnifiedDiffViewer';
import type { PullRequestDiffFile } from '@/lib/api-types';

describe('UnifiedDiffViewer', () => {
  it('renders an empty state when no diff files exist', () => {
    render(<UnifiedDiffViewer files={[]} />);
    expect(
      screen.getByText(/No diff patches recorded for this pull request head commit yet/i),
    ).toBeInTheDocument();
  });

  it('renders file headers, hunk line numbers, additions, and deletions', () => {
    const files: PullRequestDiffFile[] = [
      {
        id: 'file-1',
        filePath: 'src/payments/refund.ts',
        previousFilePath: null,
        status: 'MODIFIED',
        additions: 2,
        deletions: 1,
        patch: [
          '@@ -10,3 +10,4 @@ export function refund() {',
          '-  return db.query("SELECT * FROM payments WHERE id = " + id);',
          '+  return db.query("SELECT * FROM payments WHERE id = ?", [id]);',
          '+  // parameterized query',
          ' }',
        ].join('\n'),
      },
    ];

    render(<UnifiedDiffViewer files={files} />);

    expect(screen.getByText('src/payments/refund.ts')).toBeInTheDocument();
    expect(screen.getByText('MODIFIED')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByText('-1')).toBeInTheDocument();
    expect(screen.getByText(/parameterized query/i)).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
  });

  it('shows binary/omitted fallback when patch is null', () => {
    const files: PullRequestDiffFile[] = [
      {
        id: 'file-bin',
        filePath: 'assets/logo.png',
        previousFilePath: null,
        status: 'ADDED',
        additions: 0,
        deletions: 0,
        patch: null,
      },
    ];

    render(<UnifiedDiffViewer files={files} />);

    expect(screen.getByText('assets/logo.png')).toBeInTheDocument();
    expect(screen.getByText(/Binary or empty patch omitted/i)).toBeInTheDocument();
  });
});

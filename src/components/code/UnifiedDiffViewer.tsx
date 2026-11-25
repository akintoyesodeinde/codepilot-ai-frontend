'use client';

import { FileCode2 } from 'lucide-react';
import type { PullRequestDiffFile } from '@/lib/api-types';
import { Badge } from '@/components/ui/badge';

export function UnifiedDiffViewer({ files }: { files: PullRequestDiffFile[] }) {
  if (files.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted-foreground)]">
        No diff patches recorded for this pull request head commit yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {files.map((file) => {
        const lines = (file.patch ?? '').split(/\r?\n/);
        let rightLine = 0;

        return (
          <div
            key={file.id}
            className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--muted)]/50 px-4 py-2.5">
              <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                <FileCode2 className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
                <span>{file.filePath}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="secondary">{file.status}</Badge>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  +{file.additions}
                </span>
                <span className="font-mono text-red-600 dark:text-red-400">-{file.deletions}</span>
              </div>
            </div>

            {file.patch ? (
              <div className="overflow-x-auto font-mono text-xs">
                <table className="w-full border-collapse">
                  <tbody>
                    {lines.map((line, idx) => {
                      const hunk = /^@@\s+-\d+(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/.exec(line);
                      if (hunk?.[1]) {
                        rightLine = Number.parseInt(hunk[1], 10);
                        return (
                          <tr
                            key={idx}
                            className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                          >
                            <td className="w-12 select-none px-2 py-0.5 text-right opacity-60">
                              ...
                            </td>
                            <td className="whitespace-pre px-3 py-0.5">{line}</td>
                          </tr>
                        );
                      }

                      const isAdd = line.startsWith('+') && !line.startsWith('+++');
                      const isDel = line.startsWith('-') && !line.startsWith('---');
                      const displayLine = isDel ? '' : String(rightLine || '');
                      if (!isDel && rightLine > 0) {
                        rightLine += 1;
                      }

                      return (
                        <tr
                          key={idx}
                          className={
                            isAdd
                              ? 'bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                              : isDel
                                ? 'bg-red-500/10 text-red-900 dark:text-red-200'
                                : 'text-[var(--foreground)]'
                          }
                        >
                          <td className="w-12 select-none border-r border-[var(--border)] px-2 py-0.5 text-right text-[var(--muted-foreground)]">
                            {displayLine}
                          </td>
                          <td className="whitespace-pre px-3 py-0.5">{line || ' '}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-4 text-xs text-[var(--muted-foreground)]">
                Binary or empty patch omitted.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

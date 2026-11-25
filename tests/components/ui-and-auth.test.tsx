import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlannedModuleCard } from '@/components/layout/PlannedModuleCard';
import { EmptyState } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/badge';

describe('Core dashboard UI components', () => {
  it('clearly labels upcoming Phase 2/3 modules as unavailable in Phase 1', () => {
    render(
      <PlannedModuleCard
        title="Security Intelligence"
        phase={3}
        summary="Deterministic SAST and dependency scanning"
        capabilities={['Semgrep static analysis', 'Gitleaks redacted secret detection']}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Security Intelligence' })).toBeInTheDocument();
    expect(screen.getByText('Scheduled for Phase 3')).toBeInTheDocument();
    expect(screen.getByText('Module Status: Unavailable in Phase 1')).toBeInTheDocument();
    expect(screen.getByText('Semgrep static analysis')).toBeInTheDocument();
  });

  it('renders accessible empty states and status badges', () => {
    render(
      <div>
        <Badge variant="success">Verified</Badge>
        <EmptyState
          icon={<span data-testid="empty-icon">!</span>}
          title="No repositories"
          description="Connect a GitHub App installation to list repositories."
        />
      </div>,
    );

    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('No repositories')).toBeInTheDocument();
    expect(screen.getByTestId('empty-icon')).toBeInTheDocument();
  });
});

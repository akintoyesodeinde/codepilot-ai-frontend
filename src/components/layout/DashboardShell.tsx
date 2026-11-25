'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Activity,
  Bell,
  Bot,
  Check,
  ChevronDown,
  Code2,
  Cpu,
  FlaskConical,
  FolderGit2,
  GitBranch,
  GitPullRequest,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Network,
  Plus,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useLogout, useSession } from '@/hooks/useSession';
import { useWorkspaceStore } from '@/store/workspace-store';
import { apiRequest } from '@/lib/api-client';
import type { NotificationItem } from '@/lib/api-types';
import { cn, formatRoleLabel } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/feedback';
import { ThemeToggle } from '@/components/ThemeToggle';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  phaseBadge?: string;
  permission?: string;
}

const PRIMARY_NAV: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Repositories', href: '/repositories', icon: FolderGit2 },
  { label: 'Pull Request Reviews', href: '/pull-requests', icon: GitPullRequest },
  { label: 'GitHub Integrations', href: '/integrations', icon: GitBranch },
  { label: 'AI Usage & Spend', href: '/ai-usage', icon: Cpu },
  { label: 'Background Jobs', href: '/jobs', icon: ListChecks },
  { label: 'Team & Roles', href: '/team', icon: Users },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Audit Logs', href: '/audit-logs', icon: Activity, permission: 'audit:read' },
  { label: 'Workspace Settings', href: '/settings', icon: Settings },
];

const UPCOMING_NAV: NavItem[] = [
  { label: 'Security Intelligence', href: '/security', icon: ShieldAlert, phaseBadge: 'Phase 3' },
  { label: 'Architecture Explorer', href: '/architecture', icon: Network, phaseBadge: 'Phase 3' },
  { label: 'AI Coding Assistant', href: '/assistant', icon: Bot, phaseBadge: 'Phase 3' },
  { label: 'AI Test Studio', href: '/test-studio', icon: FlaskConical, phaseBadge: 'Phase 3' },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    user,
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    isLoading,
    isError,
    hasPermission,
  } = useSession();
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId);
  const mobileNavOpen = useWorkspaceStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useWorkspaceStore((s) => s.setMobileNavOpen);
  const logout = useLogout();

  useEffect(() => {
    if (!isLoading && (isError || !user)) {
      router.replace('/login');
    } else if (!isLoading && user && workspaces.length === 0) {
      router.replace('/onboarding');
    }
  }, [isLoading, isError, user, workspaces.length, router]);

  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'unread-badge', activeWorkspaceId],
    enabled: Boolean(activeWorkspaceId),
    queryFn: async () => {
      const res = await apiRequest<{ items: NotificationItem[]; unreadCount: number }>(
        '/api/v1/notifications?limit=1&unreadOnly=true',
        { workspaceId: activeWorkspaceId },
      );
      return res.data.unreadCount;
    },
  });

  const handleWorkspaceSwitch = (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    void queryClient.invalidateQueries({
      predicate: (q) => q.queryKey[0] !== 'auth',
    });
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (isLoading || !user || !activeWorkspace) {
    return (
      <div className="flex min-h-screen bg-[var(--background)]">
        <div className="hidden w-64 border-r bg-[var(--card)] p-4 lg:block">
          <Skeleton className="h-8 w-40" />
          <div className="mt-8 space-y-2">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton key={idx} className="h-9 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-12 w-full" />
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-28 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const unreadCount = notificationsQuery.data ?? 0;

  const renderNavLinks = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col justify-between">
      <div className="space-y-6">
        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Workspace
          </p>
          <nav aria-label="Workspace navigation" className="space-y-1">
            {PRIMARY_NAV.filter((item) => !item.permission || hasPermission(item.permission)).map(
              (item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                        : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]',
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {item.label}
                    </span>
                    {item.href === '/notifications' && unreadCount > 0 ? (
                      <Badge variant="default" className="px-1.5 py-0 text-[10px]">
                        {unreadCount}
                      </Badge>
                    ) : null}
                  </Link>
                );
              },
            )}
          </nav>
        </div>

        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Intelligence Roadmap
          </p>
          <nav aria-label="Upcoming intelligence modules" className="space-y-1">
            {UPCOMING_NAV.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                      : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]',
                  )}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon className="h-4 w-4 shrink-0 opacity-75" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.phaseBadge ? (
                    <Badge variant="secondary" className="ml-2 shrink-0 px-1.5 py-0 text-[10px]">
                      {item.phaseBadge}
                    </Badge>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--muted)]/50 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <ShieldCheck className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          Tenant Isolation Active
        </div>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          Role:{' '}
          <span className="font-medium text-[var(--foreground)]">
            {formatRoleLabel(activeWorkspace.roleKey)}
          </span>
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--primary)] focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>

      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-[var(--border)] bg-[var(--card)] lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-2.5 border-b border-[var(--border)] px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-white">
            <Code2 className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight">CodePilot AI</p>
            <p className="truncate text-[11px] text-[var(--muted-foreground)]">
              Engineering Intelligence
            </p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">{renderNavLinks()}</div>
      </aside>

      {/* Mobile Drawer */}
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 flex w-72 max-w-[85vw] flex-col bg-[var(--card)] shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-[var(--border)] px-4">
              <div className="flex items-center gap-2 font-bold">
                <Code2 className="h-5 w-5 text-[var(--primary)]" aria-hidden="true" />
                CodePilot AI
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close navigation menu"
                onClick={() => setMobileNavOpen(false)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {renderNavLinks(() => setMobileNavOpen(false))}
            </div>
          </aside>
        </div>
      ) : null}

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--card)]/90 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open navigation menu"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>

            {/* Workspace Selector */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button variant="outline" className="max-w-[240px] justify-between gap-2">
                  <span className="truncate font-medium">{activeWorkspace.name}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="start"
                  sideOffset={6}
                  className="z-50 w-64 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1.5 shadow-lg"
                >
                  <div className="px-2.5 py-1.5 text-xs font-semibold text-[var(--muted-foreground)]">
                    Switch Workspace
                  </div>
                  {workspaces.map((ws) => (
                    <DropdownMenu.Item
                      key={ws.id}
                      onSelect={() => handleWorkspaceSwitch(ws.id)}
                      className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-sm outline-none hover:bg-[var(--muted)] focus:bg-[var(--muted)]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{ws.name}</p>
                        <p className="truncate text-xs text-[var(--muted-foreground)]">
                          {formatRoleLabel(ws.roleKey)}
                        </p>
                      </div>
                      {ws.id === activeWorkspace.id ? (
                        <Check
                          className="h-4 w-4 shrink-0 text-[var(--primary)]"
                          aria-hidden="true"
                        />
                      ) : null}
                    </DropdownMenu.Item>
                  ))}
                  <DropdownMenu.Separator className="my-1.5 h-px bg-[var(--border)]" />
                  <DropdownMenu.Item
                    onSelect={() => router.push('/onboarding')}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-[var(--primary)] outline-none hover:bg-[var(--muted)] focus:bg-[var(--muted)]"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Create new workspace
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <Button variant="ghost" size="icon" asChild className="relative">
              <Link href="/notifications" aria-label={`Notifications (${unreadCount} unread)`}>
                <Bell className="h-4 w-4" aria-hidden="true" />
                {unreadCount > 0 ? (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--primary)]" />
                ) : null}
              </Link>
            </Button>

            {/* User Profile Menu */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button variant="outline" className="gap-2 pl-2 pr-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-semibold text-white">
                    {user.fullName.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden max-w-[140px] truncate text-sm sm:inline">
                    {user.fullName}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={6}
                  className="z-50 w-64 rounded-xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-lg"
                >
                  <div className="px-2 py-1.5">
                    <p className="truncate text-sm font-semibold">{user.fullName}</p>
                    <p className="truncate text-xs text-[var(--muted-foreground)]">{user.email}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="default">{formatRoleLabel(activeWorkspace.roleKey)}</Badge>
                      {user.isPlatformAdmin ? (
                        <Badge variant="warning">Platform Admin</Badge>
                      ) : null}
                    </div>
                  </div>
                  <DropdownMenu.Separator className="my-1.5 h-px bg-[var(--border)]" />
                  <DropdownMenu.Item
                    onSelect={() => router.push('/settings')}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none hover:bg-[var(--muted)]"
                  >
                    <Settings className="h-4 w-4" aria-hidden="true" />
                    Workspace settings
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => void handleLogout()}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-red-600 outline-none hover:bg-red-500/10 dark:text-red-400"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sign out
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </header>

        <main id="main-content" className="flex-1 p-4 lg:p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

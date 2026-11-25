export interface PaginationMeta {
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface ApiEnvelope<T> {
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
    pagination?: PaginationMeta;
  };
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: string;
  correlationId: string;
  errors?: Array<{ field: string; message: string }>;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  isPlatformAdmin: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  planTier: string;
  roleKey: 'WORKSPACE_OWNER' | 'DEVELOPER' | 'VIEWER';
  permissions: string[];
  memberCount?: number;
  repositoryCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponseData {
  user: UserProfile;
  workspaces: WorkspaceSummary[];
  csrfToken?: string;
}

export interface WorkspaceDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  planTier: string;
  roleKey: 'WORKSPACE_OWNER' | 'DEVELOPER' | 'VIEWER';
  permissions: string[];
  counts: {
    activeMembers: number;
    pendingInvitations: number;
    activeRepositories: number;
  };
  settings: {
    defaultAiProvider: 'mock' | 'openai' | 'anthropic' | 'bedrock';
    allowedAiProviders: Array<'mock' | 'openai' | 'anthropic' | 'bedrock'>;
    requireHumanApproval: boolean;
    autoReviewEnabled: boolean;
    dataRetentionDays: number;
  } | null;
  usageLimits: {
    monthlyAiBudgetUsd: number;
    maxMonthlyTokens: number;
    maxRepositories: number;
    maxMembers: number;
    currentMonthTokens: number;
    currentMonthSpendUsd: number;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMemberItem {
  id: string;
  workspaceId: string;
  userId: string;
  roleKey: 'WORKSPACE_OWNER' | 'DEVELOPER' | 'VIEWER';
  status: 'ACTIVE' | 'SUSPENDED' | 'REMOVED';
  joinedAt: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
    lastLoginAt: string | null;
  };
}

export interface PendingInvitationItem {
  id: string;
  email: string;
  roleKey: 'WORKSPACE_OWNER' | 'DEVELOPER' | 'VIEWER';
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
  invitedBy: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface RepositoryItem {
  id: string;
  workspaceId: string;
  githubRepoId: string;
  ownerLogin: string;
  name: string;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'INTERNAL';
  primaryLanguage: string | null;
  isActive: boolean;
  branchCount: number;
  commitCount: number;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RepositoryDetail extends Omit<RepositoryItem, 'branchCount' | 'commitCount'> {
  installation: {
    id: string;
    accountLogin: string;
    accountType: string;
    status: string;
  } | null;
  branches: Array<{
    id: string;
    name: string;
    headSha: string;
    isDefault: boolean;
    isProtected: boolean;
    lastCommitAt: string | null;
  }>;
  recentCommits: Array<{
    id: string;
    sha: string;
    messageHeadline: string;
    authorName: string;
    authorEmail: string | null;
    committedAt: string;
  }>;
}

export interface AnalyticsOverview {
  workspaceId: string;
  summary: {
    connectedRepositories: number;
    trackedBranches: number;
    trackedCommits: number;
    activeMembers: number;
    pendingInvitations: number;
    activeGithubInstallations: number;
    unreadNotifications: number;
    auditEventsLast7Days: number;
  };
  usage: {
    monthlyAiBudgetUsd: number;
    currentMonthSpendUsd: number;
    maxMonthlyTokens: number;
    currentMonthTokens: number;
    maxRepositories: number;
    maxMembers: number;
  } | null;
  repositoriesByLanguage: Array<{ language: string; count: number }>;
  repositoriesByVisibility: Array<{ visibility: string; count: number }>;
  recentCommits: Array<{
    id: string;
    sha: string;
    messageHeadline: string;
    authorName: string;
    committedAt: string;
    repository: { id: string; fullName: string };
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    resourceType: string;
    outcome: 'SUCCESS' | 'FAILURE' | 'DENIED';
    actorName: string;
    createdAt: string;
  }>;
  moduleReadiness: Record<string, { status: 'AVAILABLE' | 'PLANNED'; phase: number }>;
}

export interface NotificationItem {
  id: string;
  workspaceId: string;
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  body: string;
  linkPath: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  workspaceId: string | null;
  actorUserId: string | null;
  actor: { id: string; email: string; fullName: string } | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  outcome: 'SUCCESS' | 'FAILURE' | 'DENIED';
  correlationId: string;
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

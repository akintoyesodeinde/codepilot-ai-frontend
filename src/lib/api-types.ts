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
    openPullRequests?: number;
    completedReviews?: number;
    totalReviewFindings?: number;
    activeJobs?: number;
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

export interface GithubInstallationItem {
  id: string;
  workspaceId: string;
  githubInstallationId: string;
  accountLogin: string;
  accountType: string;
  targetType: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  permissions: Record<string, string> | null;
  repositoryCount: number;
  installedAt: string;
  revokedAt: string | null;
}

export interface IndexedFileItem {
  id: string;
  filePath: string;
  language: string;
  sizeBytes: number;
  lineCount: number;
  contentHash: string;
  contentPreview: string | null;
  updatedAt: string;
}

export interface CodeSymbolItem {
  id: string;
  filePath: string;
  name: string;
  kind: string;
  signature: string | null;
  startLine: number;
  endLine: number;
  exported: boolean;
}

export interface PullRequestListItem {
  id: string;
  workspaceId: string;
  repositoryId: string;
  repository: { id: string; fullName: string; name: string; ownerLogin: string };
  prNumber: number;
  title: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  authorLogin: string;
  baseBranch: string;
  headBranch: string;
  baseSha: string;
  headSha: string;
  isDraft: boolean;
  additions: number;
  deletions: number;
  changedFilesCount: number;
  htmlUrl: string | null;
  latestReview: {
    id: string;
    status: string;
    overallRisk: string | null;
    findingsCount: number;
    headSha: string;
    createdAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PullRequestDetail extends Omit<PullRequestListItem, 'latestReview'> {
  description: string | null;
  reviews: Array<{
    id: string;
    headSha: string;
    policyVersion: string;
    status: string;
    overallRisk: string | null;
    findingsCount: number;
    rejectedFindingsCount: number;
    requiresApproval: boolean;
    analysisJobId: string | null;
    approvedAt: string | null;
    rejectedAt: string | null;
    publishedAt: string | null;
    createdAt: string;
  }>;
}

export interface PullRequestDiffFile {
  id: string;
  filePath: string;
  previousFilePath: string | null;
  status: string;
  additions: number;
  deletions: number;
  patch: string | null;
}

export interface CodeReviewDetail {
  id: string;
  workspaceId: string;
  repository: { id: string; fullName: string };
  pullRequest: {
    id: string;
    prNumber: number;
    title: string;
    headSha: string;
    baseBranch: string;
    headBranch: string;
  };
  headSha: string;
  policyVersion: string;
  status: string;
  analysisJobId: string | null;
  summaryMarkdown: string | null;
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
  findingsCount: number;
  rejectedFindingsCount: number;
  requiresApproval: boolean;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  publishedAt: string | null;
  githubReviewId: string | null;
  publishedCommentsCount: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewFindingItem {
  id: string;
  fingerprint: string;
  source: 'DETERMINISTIC' | 'AI';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: string;
  title: string;
  description: string;
  suggestion: string | null;
  filePath: string;
  startLine: number;
  endLine: number;
  evidenceSnippet: string | null;
  confidence: number | null;
  isPublished: boolean;
  feedbackSummary: {
    helpful: number;
    notHelpful: number;
    falsePositive: number;
  };
  createdAt: string;
}

export interface AnalysisJobItem {
  id: string;
  workspaceId: string;
  repositoryId: string | null;
  jobType: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'DEAD_LETTERED';
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface AiUsageResponse {
  billingPeriod: string;
  budget: {
    monthlyAiBudgetUsd: number;
    currentMonthSpendUsd: number;
    maxMonthlyTokens: number;
    currentMonthTokens: number;
  } | null;
  periodTotals: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUsd: number;
  };
  breakdownByProvider: Array<{
    provider: string;
    model: string;
    requests: number;
    totalTokens: number;
    costUsd: number;
  }>;
  recentRequests: Array<{
    id: string;
    provider: string;
    model: string;
    purpose: string;
    status: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
    latencyMs: number;
    errorCode: string | null;
    createdAt: string;
  }>;
}

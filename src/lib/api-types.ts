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
    openVulnerabilities?: number;
    architectureViolations?: number;
    generatedTests?: number;
    aiConversations?: number;
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

// ============================================================================
// Phase 3 — Security Intelligence, Architecture, AI Assistant, Test Studio & Analytics
// ============================================================================

export interface SecurityScanItem {
  id: string;
  repositoryId: string;
  analysisJobId: string | null;
  commitSha: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  scannersRun: string[];
  findingsCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  dependenciesCount: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface VulnerabilityItem {
  id: string;
  workspaceId: string;
  repositoryId: string;
  repository: { id: string; fullName: string };
  securityScanId: string;
  scanner: 'SEMGREP' | 'GITLEAKS' | 'OSV_SCANNER' | 'ESLINT' | 'TRIVY' | 'AI_ADVISORY';
  source: 'DETERMINISTIC' | 'AI_ADVISORY';
  ruleId: string;
  cweId: string | null;
  cveId: string | null;
  owaspCategory: string | null;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  status: 'OPEN' | 'TRIAGED' | 'FALSE_POSITIVE' | 'RISK_ACCEPTED' | 'FIXED';
  title: string;
  description: string;
  remediation: string | null;
  filePath: string;
  startLine: number;
  endLine: number;
  redactedSnippet: string | null;
  fingerprint: string;
  activeRiskAcceptance: { id: string; reason: string; expiresAt: string } | null;
  triagedAt: string | null;
  createdAt: string;
}

export interface ArchitectureGraphNode {
  id: string;
  nodeKey: string;
  label: string;
  filePath: string;
  layer: string;
  moduleGroup: string;
  language: string;
  linesOfCode: number;
  fanIn: number;
  fanOut: number;
  instability: number;
  isOrphan: boolean;
  isHotspot: boolean;
}

export interface ArchitectureGraphEdge {
  id: string;
  source: string;
  target: string;
  edgeType: string;
  isCircular: boolean;
  isViolation: boolean;
}

export interface ArchitectureGraphResponse {
  repository: { id: string; fullName: string };
  scan: {
    id: string;
    commitSha: string;
    status: string;
    nodesCount: number;
    edgesCount: number;
    circularDepsCount: number;
    violationsCount: number;
    orphanModulesCount: number;
    metrics: Record<string, unknown> | null;
    completedAt: string | null;
    createdAt: string;
  } | null;
  nodes: ArchitectureGraphNode[];
  edges: ArchitectureGraphEdge[];
}

export interface ArchitectureViolationItem {
  id: string;
  violationType: 'CIRCULAR_DEPENDENCY' | 'LAYER_BOUNDARY' | 'HIGH_COUPLING' | 'ORPHAN_MODULE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  ruleName: string;
  message: string;
  sourcePath: string;
  targetPath: string | null;
  cyclePaths: string[] | null;
  createdAt: string;
}

export interface VerifiedCodeCitation {
  filePath: string;
  startLine: number;
  endLine: number;
  symbolName: string | null;
  commitSha: string;
  verified: boolean;
}

export interface AiConversationSummary {
  id: string;
  workspaceId: string;
  repositoryId: string | null;
  repository: { id: string; fullName: string } | null;
  commitSha: string | null;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AiConversationDetail {
  id: string;
  workspaceId: string;
  repositoryId: string | null;
  repository: { id: string; fullName: string } | null;
  commitSha: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    role: 'USER' | 'ASSISTANT' | 'SYSTEM';
    content: string;
    citations: VerifiedCodeCitation[];
    tokensUsed: number;
    createdAt: string;
  }>;
}

export interface TestGenerationJobSummary {
  id: string;
  repositoryId: string;
  repository: { id: string; fullName: string };
  analysisJobId: string | null;
  commitSha: string;
  targetFilePath: string;
  language: string;
  framework: string;
  testTypes: string[];
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  generatedTestsCount: number;
  syntaxValidCount: number;
  approvedCount: number;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface TestGenerationJobDetail {
  id: string;
  repositoryId: string;
  repository: { id: string; fullName: string };
  commitSha: string;
  targetFilePath: string;
  language: string;
  framework: string;
  testTypes: string[];
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  generatedTests: Array<{
    id: string;
    targetFilePath: string;
    suggestedTestPath: string;
    language: string;
    framework: string;
    testType: 'UNIT' | 'INTEGRATION' | 'REGRESSION' | 'SECURITY';
    title: string;
    testCode: string;
    boundaryConditions: string[];
    syntaxValid: boolean;
    syntaxErrors: Array<{ line: number; column: number; message: string }>;
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    approvedAt: string | null;
    validationResult: {
      validationEngine: string;
      syntaxPassed: boolean;
      sandboxExecuted: boolean;
      summary: string;
    } | null;
    createdAt: string;
  }>;
}

export interface CodeQualityAnalytics {
  workspaceId: string;
  summary: {
    indexedFilesCount: number;
    symbolsCount: number;
    scannedRepositories: number;
    totalModules: number;
    totalDependencyEdges: number;
    circularDependencies: number;
    orphanModules: number;
    averageInstability: number;
    codeHealthScore: number | null;
    generatedTestsTotal: number;
    syntaxValidTestsRate: number | null;
    approvedTestsCount: number;
  };
  violationsByType: Array<{ violationType: string; count: number }>;
  repositorySnapshots: Array<{
    repositoryId: string;
    repositoryName: string;
    commitSha: string;
    nodesCount: number;
    edgesCount: number;
    circularDepsCount: number;
    violationsCount: number;
    orphanModulesCount: number;
    completedAt: string | null;
  }>;
  methodology: {
    formula: string;
    caveats: string[];
  };
}

export interface SecurityAnalytics {
  workspaceId: string;
  summary: {
    completedSecurityScans: number;
    totalVulnerabilities: number;
    openVulnerabilities: number;
    triagedVulnerabilities: number;
    falsePositiveVulnerabilities: number;
    riskAcceptedVulnerabilities: number;
    fixedVulnerabilities: number;
    totalDependenciesAudited: number;
    vulnerableDependenciesCount: number;
    activeRiskAcceptances: number;
  };
  bySeverity: Array<{ severity: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  byScanner: Array<{ scanner: string; count: number }>;
  bySource: Array<{ source: string; count: number }>;
}

export interface ReviewPerformanceAnalytics {
  workspaceId: string;
  summary: {
    totalReviews: number;
    totalFindings: number;
    succeededAiRequests: number;
    averageAiLatencyMs: number;
    totalTokensConsumed: number;
    totalEstimatedCostUsd: number;
    feedbackTotal: number;
    helpfulPrecisionRate: number | null;
  };
  reviewsByStatus: Array<{ status: string; count: number }>;
  findingsBySource: Array<{ source: string; count: number }>;
  findingsBySeverity: Array<{ severity: string; count: number }>;
  feedbackByVote: Array<{ vote: string; count: number }>;
  aiUsageByPurpose: Array<{
    purpose: string;
    requests: number;
    totalTokens: number;
    costUsd: number;
  }>;
}

export interface PlatformAdminOverview {
  scope: string;
  tenantCodeAccessGranted: boolean;
  summary: {
    activeUsers: number;
    activeWorkspaces: number;
    connectedRepositories: number;
    totalAiRequests: number;
    totalPlatformTokens: number;
    totalPlatformAiSpendUsd: number;
    failedOrDeadLetteredJobs: number;
  };
  jobsByStatus: Array<{ status: string; count: number }>;
}

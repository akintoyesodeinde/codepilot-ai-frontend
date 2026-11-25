'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, CheckCircle2, Mail, Shield, UserPlus } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { ApiProblemError, apiRequest } from '@/lib/api-client';
import type { PendingInvitationItem, WorkspaceMemberItem } from '@/lib/api-types';
import { formatDateTime, formatRoleLabel } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/feedback';
import { Input, Label } from '@/components/ui/input';

const inviteSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  roleKey: z.enum(['WORKSPACE_OWNER', 'DEVELOPER', 'VIEWER']),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

export default function TeamManagementPage() {
  const { activeWorkspaceId, hasPermission, user } = useSession();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  const canInvite = hasPermission('member:invite');
  const canUpdateMembers = hasPermission('member:update');

  const membersQuery = useQuery({
    queryKey: ['workspace-members', activeWorkspaceId],
    enabled: Boolean(activeWorkspaceId),
    queryFn: async () => {
      const res = await apiRequest<{
        members: WorkspaceMemberItem[];
        pendingInvitations: PendingInvitationItem[];
      }>(`/api/v1/workspaces/${activeWorkspaceId}/members`);
      return res.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', roleKey: 'DEVELOPER' },
  });

  const inviteMutation = useMutation({
    mutationFn: async (values: InviteFormValues) => {
      return apiRequest(`/api/v1/workspaces/${activeWorkspaceId}/invitations`, {
        method: 'POST',
        body: values,
      });
    },
    onSuccess: () => {
      setFeedback({ type: 'success', text: 'Workspace invitation created and logged.' });
      reset();
      void queryClient.invalidateQueries({ queryKey: ['workspace-members', activeWorkspaceId] });
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        text: err instanceof ApiProblemError ? err.message : 'Unable to send invitation.',
      });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async (input: { memberId: string; roleKey?: string; status?: string }) => {
      return apiRequest(`/api/v1/workspaces/${activeWorkspaceId}/members/${input.memberId}`, {
        method: 'PATCH',
        body: {
          ...(input.roleKey ? { roleKey: input.roleKey } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
      });
    },
    onSuccess: () => {
      setFeedback({ type: 'success', text: 'Member role updated.' });
      void queryClient.invalidateQueries({ queryKey: ['workspace-members', activeWorkspaceId] });
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        text: err instanceof ApiProblemError ? err.message : 'Unable to update member.',
      });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team &amp; Role Management</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Manage workspace members, RBAC assignments, and pending invitations.
        </p>
      </div>

      {feedback ? (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={
            feedback.type === 'success'
              ? 'flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300'
              : 'flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300'
          }
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span>{feedback.text}</span>
        </div>
      ) : null}

      {/* Invite Form (Workspace Owners only) */}
      {canInvite ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
              Invite Team Member
            </CardTitle>
            <CardDescription>
              Create a signed 7-day workspace invitation with least-privilege role scope.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit((vals) => inviteMutation.mutate(vals))}
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              noValidate
            >
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="invite-email">Email address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="teammate@company.com"
                  {...register('email')}
                />
                {errors.email ? (
                  <p className="text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5 sm:w-48">
                <Label htmlFor="invite-role">Workspace Role</Label>
                <select
                  id="invite-role"
                  {...register('roleKey')}
                  className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
                >
                  <option value="DEVELOPER">Developer</option>
                  <option value="VIEWER">Viewer</option>
                  <option value="WORKSPACE_OWNER">Workspace Owner</option>
                </select>
              </div>

              <Button type="submit" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? 'Inviting...' : 'Send invitation'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-2.5 p-4 text-sm text-[var(--muted-foreground)]">
            <Shield className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
            Read-only view. Only Workspace Owners can invite members or modify workspace roles.
          </CardContent>
        </Card>
      )}

      {/* Active Members */}
      <Card>
        <CardHeader>
          <CardTitle>Active Members</CardTitle>
          <CardDescription>Users with verified access to this tenant workspace</CardDescription>
        </CardHeader>
        <CardContent>
          {membersQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted-foreground)]">
                    <th className="pb-3 pr-4 font-medium">Member</th>
                    <th className="pb-3 pr-4 font-medium">Role</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {membersQuery.data?.members.map((member) => (
                    <tr key={member.id}>
                      <td className="py-3 pr-4">
                        <p className="font-medium">
                          {member.user.fullName}{' '}
                          {member.userId === user?.id ? (
                            <span className="text-xs text-[var(--muted-foreground)]">(You)</span>
                          ) : null}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {member.user.email}
                        </p>
                      </td>
                      <td className="py-3 pr-4">
                        {canUpdateMembers ? (
                          <select
                            aria-label={`Role for ${member.user.fullName}`}
                            value={member.roleKey}
                            disabled={updateMemberMutation.isPending}
                            onChange={(e) =>
                              updateMemberMutation.mutate({
                                memberId: member.id,
                                roleKey: e.target.value,
                              })
                            }
                            className="h-8 rounded-md border border-[var(--border)] bg-[var(--card)] px-2 text-xs font-medium"
                          >
                            <option value="WORKSPACE_OWNER">Workspace Owner</option>
                            <option value="DEVELOPER">Developer</option>
                            <option value="VIEWER">Viewer</option>
                          </select>
                        ) : (
                          <Badge variant="default">{formatRoleLabel(member.roleKey)}</Badge>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={member.status === 'ACTIVE' ? 'success' : 'warning'}>
                          {member.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-xs text-[var(--muted-foreground)]">
                        {formatDateTime(member.joinedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
            Pending Invitations ({membersQuery.data?.pendingInvitations.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!membersQuery.data?.pendingInvitations.length ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              No pending invitations for this workspace.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {membersQuery.data.pendingInvitations.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">{inv.email}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Invited by {inv.invitedBy.fullName} &middot; Expires{' '}
                      {formatDateTime(inv.expiresAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{formatRoleLabel(inv.roleKey)}</Badge>
                    <Badge variant="warning">{inv.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

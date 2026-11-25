'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { AlertCircle, ArrowRight, Building2, Code2, Loader2 } from 'lucide-react';
import { ApiProblemError, apiRequest } from '@/lib/api-client';
import type { WorkspaceSummary } from '@/lib/api-types';
import { SESSION_QUERY_KEY, useSession } from '@/hooks/useSession';
import { useWorkspaceStore } from '@/store/workspace-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2, 'Workspace name must be at least 2 characters').max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens only')
    .min(2)
    .max(100),
  description: z.string().trim().max(500).optional(),
});

type CreateWorkspaceValues = z.infer<typeof createWorkspaceSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, workspaces, isLoading, isError } = useSession();
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && (isError || !user)) {
      router.replace('/login');
    }
  }, [isLoading, isError, user, router]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateWorkspaceValues>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: { name: '', slug: '', description: '' },
  });

  const handleNameChange = (value: string) => {
    const generated = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
    setValue('slug', generated, { shouldValidate: generated.length >= 2 });
  };

  const onSubmit = async (values: CreateWorkspaceValues) => {
    setServerError(null);
    try {
      const res = await apiRequest<WorkspaceSummary>('/api/v1/workspaces', {
        method: 'POST',
        body: {
          name: values.name,
          slug: values.slug,
          description: values.description || undefined,
        },
      });

      setActiveWorkspaceId(res.data.id);
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
      router.push('/dashboard');
    } catch (error) {
      if (error instanceof ApiProblemError) {
        setServerError(error.message);
      } else {
        setServerError('Failed to create workspace.');
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <div className="flex items-center justify-between p-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-white">
            <Code2 className="h-4 w-4" aria-hidden="true" />
          </span>
          CodePilot AI
        </Link>
        <div className="flex items-center gap-2">
          {workspaces.length > 0 ? (
            <Button variant="ghost" asChild>
              <Link href="/dashboard">Return to dashboard</Link>
            </Button>
          ) : null}
          <ThemeToggle />
        </div>
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)]">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <CardTitle className="text-xl">Create an engineering workspace</CardTitle>
            <CardDescription>
              Workspaces isolate repositories, team memberships, AI spend limits, and audit trails.
              You will be assigned as Workspace Owner.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {serverError ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{serverError}</span>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="name">Workspace name</Label>
                <Input
                  id="name"
                  placeholder="Acme Platform Engineering"
                  aria-invalid={Boolean(errors.name)}
                  {...register('name', {
                    onChange: (e) => handleNameChange(e.target.value),
                  })}
                />
                {errors.name ? (
                  <p className="text-xs text-red-600 dark:text-red-400">{errors.name.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="slug">Workspace slug</Label>
                <Input
                  id="slug"
                  placeholder="acme-platform-engineering"
                  aria-invalid={Boolean(errors.slug)}
                  {...register('slug')}
                />
                {errors.slug ? (
                  <p className="text-xs text-red-600 dark:text-red-400">{errors.slug.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  placeholder="Core backend services and developer platform repositories"
                  {...register('description')}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Provisioning workspace...
                  </>
                ) : (
                  <>
                    Create workspace
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

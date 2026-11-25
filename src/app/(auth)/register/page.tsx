'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { AlertCircle, Check, Code2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { ApiProblemError, apiRequest } from '@/lib/api-client';
import type { AuthResponseData } from '@/lib/api-types';
import { SESSION_QUERY_KEY } from '@/hooks/useSession';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';

const registerFormSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(150),
  email: z.string().trim().email('Enter a valid email address').max(255),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .refine((v) => /[A-Z]/.test(v), 'Include at least one uppercase letter')
    .refine((v) => /[a-z]/.test(v), 'Include at least one lowercase letter')
    .refine((v) => /[0-9]/.test(v), 'Include at least one number')
    .refine((v) => /[^A-Za-z0-9]/.test(v), 'Include at least one special character'),
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { fullName: '', email: '', password: '' },
  });

  const passwordValue = useWatch({ control, name: 'password' }) ?? '';
  const checks = [
    { label: 'At least 10 characters', ok: passwordValue.length >= 10 },
    {
      label: 'Uppercase & lowercase letter',
      ok: /[A-Z]/.test(passwordValue) && /[a-z]/.test(passwordValue),
    },
    {
      label: 'Number & special character',
      ok: /[0-9]/.test(passwordValue) && /[^A-Za-z0-9]/.test(passwordValue),
    },
  ];

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      const res = await apiRequest<AuthResponseData>('/api/v1/auth/register', {
        method: 'POST',
        body: values,
      });

      queryClient.setQueryData(SESSION_QUERY_KEY, {
        user: res.data.user,
        workspaces: res.data.workspaces,
      });

      router.push('/onboarding');
    } catch (error) {
      if (error instanceof ApiProblemError) {
        setServerError(error.message);
      } else {
        setServerError('Unable to reach the CodePilot AI backend API.');
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
        <ThemeToggle />
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl">Create your CodePilot AI account</CardTitle>
            <CardDescription>
              Passwords are protected using Argon2id and HttpOnly rotated sessions.
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
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="Adaeze Okonkwo"
                  aria-invalid={Boolean(errors.fullName)}
                  {...register('fullName')}
                />
                {errors.fullName ? (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {errors.fullName.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Work email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="engineer@company.com"
                  aria-invalid={Boolean(errors.email)}
                  {...register('email')}
                />
                {errors.email ? (
                  <p className="text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    aria-invalid={Boolean(errors.password)}
                    className="pr-10"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {errors.password ? (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {errors.password.message}
                  </p>
                ) : null}

                <ul className="mt-2 space-y-1 text-xs">
                  {checks.map((item) => (
                    <li
                      key={item.label}
                      className={
                        item.ok
                          ? 'flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400'
                          : 'flex items-center gap-1.5 text-[var(--muted-foreground)]'
                      }
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      {item.label}
                    </li>
                  ))}
                </ul>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-[var(--muted-foreground)]">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-[var(--primary)] hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthContext } from '@/lib/auth/AuthContext';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Loader2 } from 'lucide-react';
import { PandoraBoxIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { user, isLoading, login } = useAuthContext();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSettingSession, setIsSettingSession] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  // Handle setting session cookie after user is authenticated
  useEffect(() => {
    const setSession = async () => {
      if (user && !isSettingSession) {
        setIsSettingSession(true);
        try {
          const idToken = await user.getIdToken();
          const { handleLogin } = await import('@/app/auth/actions');
          await handleLogin(idToken);
        } catch (error: any) {
          console.error('Failed to set session cookie:', error);
          // Don't show error toast - user is already logged in client-side
        } finally {
          setIsSettingSession(false);
        }
      }
    };
    setSession();
  }, [user, isSettingSession]);

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      // Authenticate with Firebase Client SDK
      // The useEffect above will handle setting the session cookie
      await login(values.email, values.password);
      toast({
        title: 'Welcome back!',
        description: 'You have been successfully logged in.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message || 'An error occurred during login.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const authBg = PlaceHolderImages.find(img => img.id === 'auth-background');

  if (isLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <div className="flex w-full flex-col items-center justify-center bg-card p-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center">
            <PandoraBoxIcon className="mb-4 h-12 w-12 text-primary" />
            <h1 className="font-headline text-3xl font-bold tracking-tight text-foreground">
              Welcome Back
            </h1>
            <p className="mt-2 text-muted-foreground">
              Sign in to access your dashboard.
            </p>
          </div>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                {...form.register('email')}
                disabled={isSubmitting}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...form.register('password')}
                disabled={isSubmitting}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log In
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
      <div className="relative hidden w-1/2 lg:block">
        {authBg && (
          <Image
            src={authBg.imageUrl}
            alt={authBg.description}
            fill
            style={{objectFit: 'cover'}}
            data-ai-hint={authBg.imageHint}
          />
        )}
      </div>
    </div>
  );
}

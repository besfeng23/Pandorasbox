'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, Lock, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isLoading: loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const auth = getFirebaseAuth();
      await signInWithEmailAndPassword(auth, values.email, values.password);
      router.push('/');
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'An error occurred during login.';
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found': errorMessage = 'No account found with this email.'; break;
          case 'auth/wrong-password': errorMessage = 'Incorrect password.'; break;
          case 'auth/invalid-email': errorMessage = 'Invalid email address.'; break;
          case 'auth/user-disabled': errorMessage = 'Account disabled.'; break;
          case 'auth/too-many-requests': errorMessage = 'Too many attempts. Try again later.'; break;
          case 'auth/network-request-failed': errorMessage = 'Network error.'; break;
          default: errorMessage = error.message || 'Login failed.';
        }
      }
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-sm space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <header className="text-center space-y-4">
          <div className="flex justify-center mb-8">
            <span className="h-12 w-12 border border-primary/20 flex items-center justify-center">
              <LogIn className="h-5 w-5 text-primary stroke-[1.5]" />
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-foreground/30 block">Credential Verification</span>
          <h1 className="text-3xl font-light tracking-tight text-foreground/90">Identity Matrix</h1>
        </header>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {error && (
              <div className="text-[11px] font-mono text-red-400 bg-red-400/5 p-3 border-l-2 border-red-400 animate-in-fade">
                [SYSTEM_ERROR]: {error.toUpperCase()}
              </div>
            )}

            <div className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">Neural Descriptor (Email)</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <Mail className="absolute left-0 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/20 group-focus-within:text-primary transition-colors stroke-[1]" />
                        <Input
                          placeholder="name@fragment.io"
                          type="email"
                          {...field}
                          className="pl-7 rounded-none border-0 border-b border-foreground/10 bg-transparent focus-visible:ring-0 focus-visible:border-primary/50 text-[13px] h-10 transition-all"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[10px] text-red-400/60 font-mono" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">Cypher Sequence (Password)</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <Lock className="absolute left-0 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/20 group-focus-within:text-primary transition-colors stroke-[1]" />
                        <Input
                          placeholder="••••••••"
                          type="password"
                          {...field}
                          className="pl-7 rounded-none border-0 border-b border-foreground/10 bg-transparent focus-visible:ring-0 focus-visible:border-primary/50 text-[13px] h-10 transition-all"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[10px] text-red-400/60 font-mono" />
                  </FormItem>
                )}
              />
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                className="w-full h-12 rounded-none bg-primary text-white text-[11px] font-bold uppercase tracking-widest hover:bg-primary/90 transition-all disabled:bg-foreground/10"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin stroke-[1]" /> : "Initialize Session"}
              </Button>
            </div>
          </form>
        </Form>

        <footer className="text-center pt-8 border-t border-foreground/5">
          <p className="text-[11px] text-foreground/30 font-mono">
            NULL_SESSION?{' '}
            <Link href="/signup" className="text-primary hover:underline italic">
              GENERATE_IDENTITY
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}

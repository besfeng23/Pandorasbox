'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus } from 'lucide-react';
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

const signUpSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SignUpValues = z.infer<typeof signUpSchema>;

export default function SignUpPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isLoading: loading } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    mode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: SignUpValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const auth = getFirebaseAuth();
      await createUserWithEmailAndPassword(auth, values.email, values.password);
      router.push('/');
    } catch (error: any) {
      console.error('Signup error:', error);
      let errorMessage = 'An error occurred during registration.';
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use': errorMessage = 'An account with this email already exists.'; break;
          case 'auth/invalid-email': errorMessage = 'Invalid email address.'; break;
          case 'auth/operation-not-allowed': errorMessage = 'Email/password accounts are not enabled.'; break;
          case 'auth/weak-password': errorMessage = 'Password is too weak.'; break;
          case 'auth/network-request-failed': errorMessage = 'Network error. Please check your connection.'; break;
          default: errorMessage = error.message || 'Failed to create account.';
        }
      } else if (error.message) {
        errorMessage = error.message;
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
              <Plus className="h-5 w-5 text-primary stroke-[1.5]" />
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-foreground/30 block">Identity Construction</span>
          <h1 className="text-3xl font-light tracking-tight text-foreground/90">Genetic Marker</h1>
          <p className="text-[10px] uppercase tracking-widest text-primary/60 font-medium">Sovereign Encryption Enabled</p>
        </header>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" noValidate>
            {error && (
              <div className="text-[11px] font-mono text-red-400 bg-red-400/5 p-3 border-l-2 border-red-400 animate-in-fade">
                [REGISTRATION_VOID]: {error.toUpperCase()}
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
                      <Input
                        placeholder="name@fragment.io"
                        type="email"
                        {...field}
                        className="rounded-none border-0 border-b border-foreground/10 bg-transparent focus-visible:ring-0 focus-visible:border-primary/50 text-[13px] h-10 transition-all"
                      />
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
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">Cypher Sequence (6+ Chars)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="••••••••"
                        type="password"
                        {...field}
                        className="rounded-none border-0 border-b border-foreground/10 bg-transparent focus-visible:ring-0 focus-visible:border-primary/50 text-[13px] h-10 transition-all"
                      />
                    </FormControl>
                    <FormMessage className="text-[10px] text-red-400/60 font-mono" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">Verify Sequence</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="••••••••"
                        type="password"
                        {...field}
                        className="rounded-none border-0 border-b border-foreground/10 bg-transparent focus-visible:ring-0 focus-visible:border-primary/50 text-[13px] h-10 transition-all"
                      />
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
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin stroke-[1]" /> : "Construct Identity"}
              </Button>
            </div>
          </form>
        </Form>

        <footer className="text-center pt-8 border-t border-foreground/5">
          <p className="text-[11px] text-foreground/30 font-mono">
            EXISTING_USER?{' '}
            <Link href="/login" className="text-primary hover:underline italic">
              INITIALIZE_SESSION
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}

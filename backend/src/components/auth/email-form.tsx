'use client';

import React, { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters.' }),
});

type UserFormValue = z.infer<typeof formSchema>;

export function EmailForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, startResetTransition] = useTransition();
  const auth = useAuth();
  const { toast } = useToast();

  const form = useForm<UserFormValue>({
    resolver: zodResolver(formSchema),
    mode: 'onSubmit', // Only validate on submit, not while typing
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: UserFormValue) => {
    setIsLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, data.email, data.password);
      } else {
        await signInWithEmailAndPassword(auth, data.email, data.password);
      }
      // No need to set user, onAuthStateChanged will handle it
    } catch (firebaseError: any) {
      setError(firebaseError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = () => {
    const email = form.getValues('email');
    if (!email) {
      form.trigger('email');
      return;
    }

    startResetTransition(async () => {
      try {
        await sendPasswordResetEmail(auth, email);
        toast({
          title: 'Password Reset Email Sent',
          description: `An email has been sent to ${email} with instructions to reset your password.`,
        });
      } catch (firebaseError: any) {
        toast({
          variant: 'destructive',
          title: 'Error Sending Reset Email',
          description: firebaseError.message,
        });
      }
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert className="glass-panel border border-red-400/30 bg-red-400/10">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertTitle className="text-red-400">Authentication Error</AlertTitle>
          <AlertDescription className="text-white/80">{error}</AlertDescription>
        </Alert>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white/90">Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    className="input-glass text-white placeholder:text-white/40"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {!isSignUp && (
            <div className="flex justify-end -mb-2">
                <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-xs"
                    onClick={handlePasswordReset}
                    disabled={isResetting}
                >
                    {isResetting ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    ) : null}
                    Forgot password?
                </Button>
            </div>
          )}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white/90">Password</FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    className="input-glass text-white placeholder:text-white/40"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full bg-gradient-to-r from-cyan-400 to-purple-500 text-white hover:from-cyan-300 hover:to-purple-400 border-0 shadow-neon-cyan-sm relative" disabled={isLoading || isResetting}>
            {isLoading && (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="absolute inset-0 flex items-center justify-center glass-panel rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                </span>
              </>
            )}
            {!isLoading && (isSignUp ? 'Create Account' : 'Sign In')}
          </Button>
        </form>
      </Form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-void px-2 text-white/40">
            Or
          </span>
        </div>
      </div>
      <Button
        variant="outline"
        className="w-full glass-panel border-glow-purple hover:bg-neon-purple/10 text-white/90"
        onClick={() => {
          setIsSignUp(!isSignUp);
          setError(null);
          form.reset();
        }}
        disabled={isLoading || isResetting}
      >
        {isSignUp
          ? 'Already have an account? Sign In'
          : "Don't have an account? Sign Up"}
      </Button>
    </div>
  );
}

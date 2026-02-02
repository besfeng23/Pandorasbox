
'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/firebase';
import { updateProfile } from 'firebase/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
    const { user, loading } = useUser();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const [name, setName] = useState(user?.displayName || '');

    useEffect(() => {
        if (user) {
            setName(user.displayName || '');
        }
    }, [user]);

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast({
                variant: 'destructive',
                title: 'Not Authenticated',
                description: 'You must be logged in to update your profile.',
            });
            return;
        }

        setIsSubmitting(true);

        try {
            await updateProfile(user, { displayName: name });
            toast({
                title: "Profile Updated",
                description: "Your profile has been updated successfully.",
            });
            router.refresh();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error updating profile',
                description: error.message || "An unknown error occurred.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-12">
            <header>
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-foreground/40 mb-3 block">Identity Management</span>
                <h1 className="text-2xl font-light tracking-tight text-foreground/90">User Profile</h1>
            </header>

            <form onSubmit={handleSubmit} className="space-y-16">
                <div className="space-y-12">
                    <section className="space-y-6">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/20">Neural Identifier</p>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">Primary Endpoint (Email)</Label>
                            <Input
                                id="email"
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="rounded-none border-0 border-b border-foreground/5 bg-transparent text-foreground/40 text-[13px] h-10 cursor-not-allowed"
                            />
                        </div>
                    </section>

                    <section className="space-y-6">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/20">Identity Mapping</p>
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">Display Designation</Label>
                            <Input
                                id="name"
                                placeholder="Genetic Designation"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="rounded-none border-0 border-b border-foreground/10 bg-transparent focus-visible:ring-0 focus-visible:border-primary/50 text-[13px] h-10 transition-all font-medium"
                            />
                        </div>
                    </section>
                </div>

                <div className="pt-8 border-t border-border/5">
                    <Button
                        type="submit"
                        disabled={isSubmitting || name === (user?.displayName || '')}
                        className="h-12 px-10 rounded-none bg-primary text-white text-[11px] font-bold uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-20 disabled:grayscale shadow-none"
                    >
                        {isSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin stroke-[1]" />
                        ) : (
                            'Synchronize Identity'
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}

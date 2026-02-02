'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/dashboard/app-layout';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Bot, Sparkles, PlusCircle } from 'lucide-react';
import { createThread } from '@/app/actions';
import { AgentCard } from '@/components/dashboard/agent-card';
import { PandoraBoxIcon } from '@/components/icons';
import { motion } from 'framer-motion';

export default function DashboardPage() {
    const { user, isLoading: userLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!userLoading && !user) {
            router.push('/login');
        }
    }, [user, userLoading, router]);

    const handleCreateThread = async (agent: 'builder' | 'universe') => {
        if (user) {
            const result = await createThread(agent, user.uid);
            if (result?.id) {
                router.push(`/chat/${result.id}`);
            }
        }
    };

    if (userLoading || !user) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-black text-white">
                <Loader2 className="h-8 w-8 animate-spin text-[#007AFF]" />
            </div>
        );
    }

    return (
        <AppLayout>
            <div className="flex-1 max-w-6xl mx-auto w-full py-16 md:py-28 px-8">
                <header className="mb-20 space-y-4">
                    <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-foreground/40 block underline decoration-primary/30 underline-offset-8">Sovereign Core</span>
                    <h1 className="text-4xl md:text-5xl font-light tracking-tight text-foreground/90 leading-tight">
                        Pandora&apos;s Box <span className="text-foreground/20 font-mono text-xl ml-4">v1.2.4</span>
                    </h1>
                    <p className="text-[13px] text-foreground/40 max-w-xl leading-relaxed italic border-l border-foreground/10 pl-6 mt-8">
                        &quot;Everything that is made is made by the mind.&quot; &mdash; Local autonomy mode active. Neural pathways clear.
                    </p>
                </header>

                <section className="space-y-12">
                    <div className="flex items-center gap-4">
                        <PlusCircle className="h-4 w-4 text-primary stroke-[1.5]" />
                        <h2 className="text-[11px] font-bold uppercase tracking-[0.3em] text-foreground/30">Initialization Protocols</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-px bg-border/5">
                        <AgentCard
                            title="The Architect (Builder)"
                            description="Engineered for implementation, structural logic, and system synthesis. Use for recursive problem-solving and creation."
                            buttonText="Initialize Architect"
                            icon={Bot}
                            onClick={() => handleCreateThread('builder')}
                        />

                        <AgentCard
                            title="The All-Knowing (Universe)"
                            description="Deep semantic retrieval and cross-domain knowledge synthesis. Use for discovery, research, and philosophical exploration."
                            buttonText="Initialize Universe"
                            icon={Sparkles}
                            onClick={() => handleCreateThread('universe')}
                        />
                    </div>
                </section>

                <footer className="mt-24 pt-8 border-t border-foreground/5 flex items-center justify-between text-[10px] text-foreground/20 font-mono uppercase tracking-widest">
                    <span>Neural Network Status: Nominal</span>
                    <span>Qdrant Connection: Synchronized</span>
                </footer>
            </div>
        </AppLayout>
    );
}

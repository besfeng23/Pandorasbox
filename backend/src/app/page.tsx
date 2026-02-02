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
            <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-6 animate-in-fade">
                {/* Hero Section */}
                <header className="text-center space-y-6 mb-12 max-w-2xl">
                    <div className="flex justify-center mb-6">
                        {/* Optional Logo Animation if desired, or simplified as per screenshot which has no logo but top bar logo */}
                    </div>

                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl font-bold tracking-tight text-white"
                    >
                        Welcome to Pandora&apos;s Box
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-lg text-zinc-400 max-w-lg mx-auto leading-relaxed"
                    >
                        Your personal AI companion for building and exploring. Let&apos;s get you started.
                    </motion.p>
                </header>

                {/* Main Action Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="w-full max-w-3xl bg-[#121214] rounded-3xl p-8 md:p-12 border border-white/5 shadow-2xl shadow-black/40"
                    style={{ backgroundColor: '#121214' }} // Fallback/Force specific dark gray from screenshot
                >
                    <div className="text-center space-y-2 mb-10">
                        <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-3">
                            <PlusCircle className="h-6 w-6 text-zinc-400" />
                            Create your first thread
                        </h2>
                        <p className="text-zinc-500 text-sm">
                            Choose an agent to start a new conversation. Each agent has a unique purpose.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <AgentCard
                            title="Builder Agent"
                            description="The Builder agent helps you create and refine ideas. It's your collaborative partner for brainstorming, writing, and problem-solving."
                            buttonText="Start with Builder"
                            icon={Bot}
                            onClick={() => handleCreateThread('builder')}
                        />

                        <AgentCard
                            title="Universe Agent"
                            description="The Universe agent has access to a broad range of knowledge. Use it to learn new things, explore topics, and get answers to your questions."
                            buttonText="Start with Universe"
                            icon={Sparkles}
                            onClick={() => handleCreateThread('universe')}
                        />
                    </div>
                </motion.div>
            </div>
        </AppLayout>
    );
}

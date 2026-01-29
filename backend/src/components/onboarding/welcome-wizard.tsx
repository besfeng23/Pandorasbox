'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BrainCircuit, Book, MessageSquare, ArrowRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { completeOnboarding } from '@/app/actions';

interface WelcomeWizardProps {
    userId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const steps = [
    {
        id: 'chat',
        title: 'Step 1: Start a Chat',
        description: 'Begin a conversation with your AI Assistant. Ask questions, brainstorm ideas, or generate code.',
        icon: <MessageSquare className="h-12 w-12 text-primary" />,
        color: 'bg-primary/10 text-primary'
    },
    {
        id: 'knowledge',
        title: 'Step 2: Add Knowledge',
        description: 'Upload documents to your Knowledge Library. The AI will read and remember them for future context.',
        icon: <Book className="h-12 w-12 text-purple-500" />,
        color: 'bg-purple-500/10 text-purple-500'
    },
    {
        id: 'visualize',
        title: 'Step 3: Visualize Connections',
        description: 'See how your knowledge connects in the interactive Knowledge Graph. Discover hidden relationships.',
        icon: <BrainCircuit className="h-12 w-12 text-amber-500" />,
        color: 'bg-amber-500/10 text-amber-500'
    }
];

export function WelcomeWizard({ userId, open, onOpenChange }: WelcomeWizardProps) {
    const [currentStep, setCurrentStep] = useState(0);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleFinish();
        }
    };

    const handleFinish = async () => {
        // Optimistically close
        onOpenChange(false);
        try {
            await completeOnboarding(userId);
        } catch (e) {
            console.error('Failed to mark onboarding complete', e);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-white/10 shadow-2xl">
                <div className="relative h-[400px] flex flex-col">
                    {/* Progress Bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
                        <motion.div
                            className="h-full bg-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6"
                        >
                            <div className={cn("h-24 w-24 rounded-3xl flex items-center justify-center mb-4 transition-colors duration-500", steps[currentStep].color)}>
                                {steps[currentStep].icon}
                            </div>

                            <div className="space-y-2">
                                <DialogTitle className="text-2xl font-bold font-headline">{steps[currentStep].title}</DialogTitle>
                                <DialogDescription className="text-base text-muted-foreground max-w-sm mx-auto">
                                    {steps[currentStep].description}
                                </DialogDescription>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    <div className="p-6 bg-muted/20 border-t border-white/5 flex items-center justify-between">
                        <div className="flex gap-1">
                            {steps.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={cn("h-2 w-2 rounded-full transition-colors", idx === currentStep ? "bg-primary" : "bg-muted-foreground/30")}
                                />
                            ))}
                        </div>

                        <Button onClick={handleNext} className="gap-2 shadow-lg shadow-primary/20">
                            {currentStep === steps.length - 1 ? (
                                <>Get Started <Check className="h-4 w-4" /></>
                            ) : (
                                <>Next <ArrowRight className="h-4 w-4" /></>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

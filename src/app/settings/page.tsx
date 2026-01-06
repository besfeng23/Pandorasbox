'use client';

import React, { useEffect, useTransition, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updateSettings, clearMemory, generateUserApiKey, exportUserData } from '@/app/actions';
import { seedIdentityProfile, triggerReflection, triggerDeepResearch } from '@/app/actions/brain-actions';
import { useSettings } from '@/hooks/use-settings';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound, Copy, Check, Settings as SettingsIcon } from 'lucide-react';
import { AppSettings } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useUser } from '@/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MemoryTable } from '@/components/settings/memory-table';
import { KnowledgeUpload } from '@/components/settings/knowledge-upload';
import { ReindexMemoriesButton } from '@/components/settings/reindex-memories-button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { KeyboardShortcuts } from '@/components/keyboard-shortcuts';
import { Keyboard, Moon, Sun, Fingerprint, MoonStar, Microscope } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';

/**
 * Model Display Names Mapping
 * Maps internal model IDs to branded display names for the UI.
 * Update this object to rebrand model names without changing backend logic.
 */
const MODEL_NAMES: Record<string, string> = {
  'gpt-4o': 'Pandora Deep (Complex Reasoning)',
  'gpt-4o-mini': 'Pandora Spark (High Speed)',
  'gpt-4-turbo': 'Pandora Turbo (Balanced Performance)',
  'gpt-3.5-turbo': 'Pandora Classic (Fast & Efficient)',
};

/**
 * Get display name for a model ID, or return a default branded name for unknown models.
 */
function getModelDisplayName(modelId: string): string {
  return MODEL_NAMES[modelId] || 'Pandora Experimental';
}

const settingsSchema = z.object({
  active_model: z.enum(['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo']),
  reply_style: z.enum(['concise', 'detailed']),
  system_prompt_override: z.string().optional(),
  personal_api_key: z.string().optional(),
});

export default function SettingsPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const { settings, isLoading: isLoadingSettings } = useSettings(user?.uid);
  const { toast } = useToast();
  const { theme, setTheme, toggleTheme } = useTheme();
  const [isPending, startTransition] = useTransition();
  const [isKeyGenerating, startKeyGeneration] = useTransition();
  const [hasCopied, setHasCopied] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [fontSize, setFontSize] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fontSize') || 'medium';
    }
    return 'medium';
  });
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('reducedMotion') === 'true';
    }
    return false;
  });

  const form = useForm<AppSettings>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });

  useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
  }, [settings, form]);

  const onSubmit = (data: AppSettings) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && key !== 'personal_api_key') {
            formData.append(key, String(value));
        }
    });
    if (user) {
      formData.append('userId', user.uid);
    }

    startTransition(async () => {
      const result = await updateSettings(formData);
      if (result.success) {
        toast({ title: 'Success', description: result.message });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    });
  };
  
  const handleClearMemory = () => {
    if (!user) return;
    startTransition(async () => {
        const result = await clearMemory(user.uid);
        if (result.success) {
          toast({ title: "Success", description: result.message });
        } else {
          toast({ variant: "destructive", title: "Error", description: result.message });
        }
      });
  }

  const handleGenerateKey = () => {
    if (!user) return;
    startKeyGeneration(async () => {
      const result = await generateUserApiKey(user.uid);
      if (result.success && result.apiKey) {
        toast({ title: 'API Key Generated', description: 'Your new personal API key is ready.' });
        form.setValue('personal_api_key', result.apiKey);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    });
  }

  const handleCopyKey = () => {
    const apiKey = form.getValues('personal_api_key');
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    }
  };

  if (isLoadingSettings || isUserLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-black via-gray-900 to-black overflow-y-auto">
      {/* Glassmorphism Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-black/30 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SettingsIcon className="h-6 w-6 text-cyan-400" />
              <h1 className="text-2xl font-bold text-white">Settings</h1>
            </div>
            <Link href="/">
              <Button variant="ghost" className="text-white hover:bg-white/10">
                ← Back to Chat
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-1">
            <TabsTrigger value="general" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              General
            </TabsTrigger>
            <TabsTrigger value="memory" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              Memory
            </TabsTrigger>
            <TabsTrigger value="api" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              API
            </TabsTrigger>
            <TabsTrigger value="data" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              Data
            </TabsTrigger>
            <TabsTrigger value="brain" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              Brain Controls
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* AI Model Card */}
                <div className="glass-panel-strong rounded-xl p-6 shadow-xl">
                  <h3 className="text-lg font-semibold text-white mb-2">AI Model</h3>
                  <p className="text-sm text-gray-400 mb-4">Pandora Deep is recommended for coding and complex analysis. Spark is faster for quick chats.</p>
                  <FormField
                    control={form.control}
                    name="active_model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Active Model</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-black/40 border-white/10 text-white">
                              <SelectValue placeholder="Select a model">
                                {field.value ? getModelDisplayName(field.value) : 'Select a model'}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-gray-900 border-white/10">
                            <SelectItem value="gpt-4o" className="text-white">
                              {getModelDisplayName('gpt-4o')}
                            </SelectItem>
                            <SelectItem value="gpt-4-turbo" className="text-white">
                              {getModelDisplayName('gpt-4-turbo')}
                            </SelectItem>
                            <SelectItem value="gpt-3.5-turbo" className="text-white">
                              {getModelDisplayName('gpt-3.5-turbo')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Reply Style Card */}
                <div className="glass-panel-strong rounded-xl p-6 shadow-xl">
                  <h3 className="text-lg font-semibold text-white mb-2">Reply Style</h3>
                  <p className="text-sm text-gray-400 mb-4">Choose how verbose the AI's replies should be.</p>
                  <FormField
                    control={form.control}
                    name="reply_style"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col space-y-3"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="concise" className="border-cyan-400 text-cyan-400" />
                              </FormControl>
                              <FormLabel className="font-normal text-gray-300 cursor-pointer">Concise</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="detailed" className="border-cyan-400 text-cyan-400" />
                              </FormControl>
                              <FormLabel className="font-normal text-gray-300 cursor-pointer">Detailed</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* System Prompt Card */}
                <div className="glass-panel-strong rounded-xl p-6 shadow-xl">
                  <h3 className="text-lg font-semibold text-white mb-2">System Prompt</h3>
                  <p className="text-sm text-gray-400 mb-4">Override the default system prompt. Leave blank to use the default.</p>
                  <p className="text-xs text-yellow-400/80 mb-4">⚠️ Note: The default prompt includes persistent memory capabilities. If you override it, make sure to include memory instructions or the AI may say it doesn't have memory.</p>
                  <FormField
                    control={form.control}
                    name="system_prompt_override"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Prompt Override</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g., You are a pirate assistant who says 'Ahoy!' a lot."
                            className="resize-y min-h-[100px] bg-black/40 border-white/10 text-white placeholder:text-gray-500"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Appearance Card */}
                <div className="glass-panel-strong rounded-xl p-6 shadow-xl">
                  <h3 className="text-lg font-semibold text-white mb-4">Appearance</h3>
                  
                  <div className="space-y-4">
                    {/* Theme Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-300">Theme</label>
                        <p className="text-xs text-gray-400">Choose between dark and light mode</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={toggleTheme}
                        className="bg-black/40 border-white/10 text-white hover:bg-white/10"
                      >
                        {theme === 'dark' ? (
                          <>
                            <Moon className="h-4 w-4 mr-2" />
                            Dark
                          </>
                        ) : (
                          <>
                            <Sun className="h-4 w-4 mr-2" />
                            Light
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Font Size */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Font Size</label>
                      <Select value={fontSize} onValueChange={(value) => {
                        setFontSize(value);
                        localStorage.setItem('fontSize', value);
                        document.documentElement.style.setProperty('--font-size-scale', value === 'small' ? '0.875' : value === 'large' ? '1.125' : '1');
                      }}>
                        <SelectTrigger className="bg-black/40 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-white/10">
                          <SelectItem value="small" className="text-white">Small</SelectItem>
                          <SelectItem value="medium" className="text-white">Medium</SelectItem>
                          <SelectItem value="large" className="text-white">Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Reduced Motion */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-300">Reduced Motion</label>
                        <p className="text-xs text-gray-400">Disable animations for better accessibility</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const newValue = !reducedMotion;
                          setReducedMotion(newValue);
                          localStorage.setItem('reducedMotion', String(newValue));
                          if (newValue) {
                            document.documentElement.classList.add('reduce-motion');
                          } else {
                            document.documentElement.classList.remove('reduce-motion');
                          }
                        }}
                        className={`bg-black/40 border-white/10 text-white hover:bg-white/10 ${reducedMotion ? 'bg-cyan-500/20 border-cyan-400/30' : ''}`}
                      >
                        {reducedMotion ? 'On' : 'Off'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Keyboard Shortcuts Card */}
                <div className="glass-panel-strong rounded-xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Keyboard Shortcuts</h3>
                      <p className="text-sm text-gray-400">Speed up your workflow with keyboard shortcuts</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShortcutsOpen(true)}
                      className="bg-black/40 border-white/10 text-white hover:bg-white/10"
                    >
                      <Keyboard className="h-4 w-4 mr-2" />
                      View Shortcuts
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={isPending || !user}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white"
                  >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Settings
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

              <TabsContent value="memory" className="space-y-6">
                {user && <KnowledgeUpload userId={user.uid} />}
                {user && <MemoryTable userId={user.uid} />}
                {user && <ReindexMemoriesButton userId={user.uid} />}
                <div className="backdrop-blur-xl bg-red-500/10 border border-red-500/30 rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h3>
              <p className="text-sm text-gray-400 mb-4">
                These actions are permanent and cannot be undone.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" type="button" disabled={isPending || !user} className="bg-red-600 hover:bg-red-700">
                    Clear All Memory
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-gray-900 border-white/10">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-400">
                      This will permanently delete the entire chat history and learned memories. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-gray-800 text-white border-white/10">Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleClearMemory} 
                      disabled={isPending}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </TabsContent>

          <TabsContent value="api" className="space-y-6">
            <div className="glass-panel-strong rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-2">Personal API Key</h3>
              <p className="text-sm text-gray-400 mb-4">Connect Pandora to external services like a custom GPT.</p>
              {settings.personal_api_key ? (
                <div className="relative mb-4">
                  <Input
                    readOnly
                    type="password"
                    value={settings.personal_api_key}
                    className="pr-10 font-code bg-black/40 border-white/10 text-white"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-cyan-400 hover:bg-white/10"
                    onClick={handleCopyKey}
                  >
                    {hasCopied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-4 p-6 border border-white/10 rounded-lg bg-black/20">
                  <KeyRound className="h-8 w-8 text-cyan-400" />
                  <p className="text-gray-400">You have not generated an API key yet.</p>
                  <Button 
                    onClick={handleGenerateKey} 
                    disabled={isKeyGenerating}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white"
                  >
                    {isKeyGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generate Personal API Key
                  </Button>
                </div>
              )}
              <p className="text-xs text-gray-500">Use this key to allow external applications to access and interact with your Pandora memory.</p>
            </div>
          </TabsContent>

          <TabsContent value="brain" className="space-y-6">
            <div className="glass-panel-strong rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-2">Brain Management</h3>
              <p className="text-sm text-gray-400 mb-4">
                Manually control Pandora&apos;s long-term memory and offline learning systems.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Implant Core Identity */}
                <div className="bg-black/40 border border-cyan-500/30 rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-full bg-cyan-500/20 border border-cyan-400/40">
                      <Fingerprint className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Implant Core Identity</h4>
                      <p className="text-xs text-gray-400">
                        Force-write Joven&apos;s coding preferences into long-term memory.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    disabled={isPending || !user}
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
                    onClick={() => {
                      if (!user) return;
                      startTransition(async () => {
                        const result = await seedIdentityProfile(user.uid);
                        if (result.success) {
                          toast({
                            title: 'Core Identity Updated',
                            description: result.message,
                          });
                        } else {
                          toast({
                            variant: 'destructive',
                            title: 'Error',
                            description: result.message,
                          });
                        }
                      });
                    }}
                  >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Implant Core Identity
                  </Button>
                </div>

                {/* Force Reflection */}
                <div className="bg-black/40 border border-indigo-500/30 rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-full bg-indigo-500/20 border border-indigo-400/40">
                      <MoonStar className="h-5 w-5 text-indigo-300" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Force Reflection</h4>
                      <p className="text-xs text-gray-400">
                        Analyze recent history and generate insights immediately.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    disabled={isPending || !user}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white"
                    onClick={() => {
                      if (!user) return;
                      startTransition(async () => {
                        const result = await triggerReflection(user.uid);
                        if (result.success) {
                          toast({
                            title: 'Reflection Complete',
                            description: result.message,
                          });
                        } else {
                          toast({
                            variant: 'destructive',
                            title: 'Error',
                            description: result.message,
                          });
                        }
                      });
                    }}
                  >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Force Reflection
                  </Button>
                </div>

                {/* Run Deep Research */}
                <div className="bg-black/40 border border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-full bg-emerald-500/20 border border-emerald-400/40">
                      <Microscope className="h-5 w-5 text-emerald-300" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Run Deep Research</h4>
                      <p className="text-xs text-gray-400">
                        Process the pending learning queue and store acquired knowledge now.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    disabled={isPending || !user}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                    onClick={() => {
                      if (!user) return;
                      startTransition(async () => {
                        const result = await triggerDeepResearch(user.uid);
                        if (result.success) {
                          toast({
                            title: 'Deep Research Complete',
                            description: result.message,
                          });
                        } else {
                          toast({
                            variant: 'destructive',
                            title: 'Error',
                            description: result.message,
                          });
                        }
                      });
                    }}
                  >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Run Deep Research
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <div className="glass-panel-strong rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-2">Data Export</h3>
              <p className="text-sm text-gray-400 mb-4">Download all your data for backup or GDPR compliance.</p>
              <Button 
                onClick={async () => {
                  if (!user) return;
                  startTransition(async () => {
                    const result = await exportUserData(user.uid);
                    if (result.success && result.data) {
                      const dataStr = JSON.stringify(result.data, null, 2);
                      const dataBlob = new Blob([dataStr], { type: 'application/json' });
                      const url = URL.createObjectURL(dataBlob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `pandorasbox-export-${new Date().toISOString().split('T')[0]}.json`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                      toast({ title: 'Success', description: 'Your data has been exported.' });
                    } else {
                      toast({ variant: 'destructive', title: 'Error', description: result.message || 'Failed to export data.' });
                    }
                  });
                }}
                disabled={isPending || !user}
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Export All Data (JSON)
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                This will download all your threads, messages, memories, and artifacts as a JSON file.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <KeyboardShortcuts open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}

'use client';

import React, { useEffect, useTransition, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updateSettings, clearMemory, generateUserApiKey, exportUserData } from '@/app/actions';
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
import { Input } from '@/components/ui/input';
import Link from 'next/link';

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
  const [isPending, startTransition] = useTransition();
  const [isKeyGenerating, startKeyGeneration] = useTransition();
  const [hasCopied, setHasCopied] = useState(false);

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
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black overflow-y-auto">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* AI Model Card */}
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl">
                  <h3 className="text-lg font-semibold text-white mb-2">AI Model</h3>
                  <p className="text-sm text-gray-400 mb-4">Select the primary AI model for generating responses.</p>
                  <FormField
                    control={form.control}
                    name="active_model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Active Model</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-black/40 border-white/10 text-white">
                              <SelectValue placeholder="Select a model" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-gray-900 border-white/10">
                            <SelectItem value="gpt-4o" className="text-white">gpt-4o</SelectItem>
                            <SelectItem value="gpt-4-turbo" className="text-white">gpt-4-turbo</SelectItem>
                            <SelectItem value="gpt-3.5-turbo" className="text-white">gpt-3.5-turbo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Reply Style Card */}
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl">
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
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl">
                  <h3 className="text-lg font-semibold text-white mb-2">System Prompt</h3>
                  <p className="text-sm text-gray-400 mb-4">Override the default system prompt. Leave blank to use the default.</p>
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
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl">
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

          <TabsContent value="data" className="space-y-6">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl">
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
    </div>
  );
}

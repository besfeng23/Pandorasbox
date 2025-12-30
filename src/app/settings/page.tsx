'use client';

import React, { useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updateSettings, clearMemory } from '@/app/actions';
import { useSettings } from '@/hooks/use-settings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
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


const settingsSchema = z.object({
  active_model: z.enum(['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo']),
  reply_style: z.enum(['concise', 'detailed']),
  system_prompt_override: z.string().optional(),
});

export default function SettingsPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const { settings, isLoading: isLoadingSettings } = useSettings(user?.uid);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

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
        if (value !== undefined) {
            formData.append(key, value);
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

  if (isLoadingSettings || isUserLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        </div>

        <Tabs defaultValue="general">
            <TabsList className="mb-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="memory">Memory Database</TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="space-y-8">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>AI Model</CardTitle>
                                <CardDescription>Select the primary AI model for generating responses.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <FormField
                                    control={form.control}
                                    name="active_model"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Active Model</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a model" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                                                <SelectItem value="gpt-4-turbo">gpt-4-turbo</SelectItem>
                                                <SelectItem value="gpt-3.5-turbo">gpt-3.5-turbo</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Reply Style</CardTitle>
                                <CardDescription>Choose how verbose the AI's replies should be.</CardDescription>
                            </CardHeader>
                            <CardContent>
                            <FormField
                                control={form.control}
                                name="reply_style"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            className="flex flex-col space-y-1"
                                        >
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl>
                                            <RadioGroupItem value="concise" />
                                            </FormControl>
                                            <FormLabel className="font-normal">Concise</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl>
                                            <RadioGroupItem value="detailed" />
                                            </FormControl>
                                            <FormLabel className="font-normal">Detailed</FormLabel>
                                        </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle>System Prompt</CardTitle>
                                <CardDescription>Override the default system prompt. Leave blank to use the default.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <FormField
                                    control={form.control}
                                    name="system_prompt_override"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Prompt Override</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="e.g., You are a pirate assistant who says 'Ahoy!' a lot."
                                                className="resize-y min-h-[100px]"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>


                        <div className="flex justify-between items-start">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" type="button" disabled={isPending || !user}>Clear All Memory</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete the entire chat history and learned memories. This action cannot be undone.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleClearMemory} disabled={isPending}>
                                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Continue
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            <Button type="submit" disabled={isPending || !user}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Settings
                            </Button>
                        </div>
                    </form>
                </Form>
            </TabsContent>
            <TabsContent value="memory" className="space-y-4">
                {user && <KnowledgeUpload userId={user.uid} />}
                {user && <MemoryTable userId={user.uid} />}
            </TabsContent>
        </Tabs>
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppLayout } from '@/components/dashboard/app-layout';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Bot, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { useUser } from '@/firebase';
import type { CustomAgent } from '@/lib/types';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const agentSchema = z.object({
  agentName: z.string().min(3, { message: 'Agent name must be at least 3 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  systemPrompt: z.string().optional(),
  behaviorRules: z.string().optional(),
  domainConstraints: z.string().optional(),
});

type AgentFormValues = z.infer<typeof agentSchema>;

export default function AgentsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agents, setAgents] = useState<CustomAgent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<CustomAgent | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const { toast } = useToast();
  const { user } = useUser();

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      agentName: '',
      description: '',
      systemPrompt: '',
      behaviorRules: '',
      domainConstraints: '',
    },
  });

  useEffect(() => {
    if (!user) {
        setIsLoadingAgents(false);
        setAgents([]);
        return;
    }

    const getAgents = async () => {
        setIsLoadingAgents(true);
        try {
            const token = await user.getIdToken();
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to fetch agents.' }));
                throw new Error(errorData.message);
            };
            const data = await response.json();
            setAgents(data);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error fetching agents', description: error.message });
            setAgents([]);
        } finally {
            setIsLoadingAgents(false);
        }
    };

    getAgents();
  }, [user, toast, refreshCounter]);

useEffect(() => {
    if (selectedAgent) {
        form.reset({
            agentName: selectedAgent.agentName,
            description: selectedAgent.description,
            systemPrompt: selectedAgent.systemPrompt,
            behaviorRules: selectedAgent.behaviorRules,
            domainConstraints: selectedAgent.domainConstraints,
        });
    } else {
        form.reset({
            agentName: '',
            description: '',
            systemPrompt: '',
            behaviorRules: '',
            domainConstraints: '',
        });
    }
}, [selectedAgent, form]);


  const onSubmit = async (values: AgentFormValues) => {
    setIsSubmitting(true);
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Not Authenticated',
            description: 'You must be logged in.',
        });
        setIsSubmitting(false);
        return;
    }
    try {
        const token = await user.getIdToken();
        const url = selectedAgent
            ? `${process.env.NEXT_PUBLIC_API_URL}/api/agents/${selectedAgent.id}`
            : `${process.env.NEXT_PUBLIC_API_URL}/api/agents`;
        const method = selectedAgent ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ ...values, templateName: 'custom' }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred.' }));
            throw new Error(errorData.message);
        }

        const result = await response.json();

        toast({
            title: selectedAgent ? 'Agent Updated' : 'Agent Created',
            description: result.message || `"${values.agentName}" has been successfully saved.`,
        });
      
      setDialogOpen(false);
      setSelectedAgent(null);
      form.reset();
      setRefreshCounter(c => c + 1);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: selectedAgent ? 'Error Updating Agent' : 'Error Creating Agent',
        description: error.message || 'An unknown error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAgent || !user) return;
    setIsSubmitting(true);
    try {
        const token = await user.getIdToken();
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents/${selectedAgent.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred.' }));
            throw new Error(errorData.message);
        }

        toast({ title: 'Agent Deleted', description: `"${selectedAgent.agentName}" has been deleted.` });
        setDeleteAlertOpen(false);
        setSelectedAgent(null);
        setRefreshCounter(c => c + 1);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error Deleting Agent', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  }

  const openCreateDialog = () => {
    setSelectedAgent(null);
    form.reset();
    setDialogOpen(true);
  }

  const openEditDialog = (agent: CustomAgent) => {
    setSelectedAgent(agent);
    setDialogOpen(true);
  }
  
  const openDeleteDialog = (agent: CustomAgent) => {
    setSelectedAgent(agent);
    setDeleteAlertOpen(true);
  }

  return (
    <AppLayout>
      <div className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
              <Bot className="h-8 w-8" />
              Custom Agents
            </h1>
            <p className="text-muted-foreground">
              Create and manage your own specialized AI agents.
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </Button>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Your Agents</CardTitle>
                <CardDescription>
                    Here are the custom agents you've created.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingAgents ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : agents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 py-16 text-center">
                        <Bot className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-xl font-semibold tracking-tight">You haven't created any agents yet</h3>
                        <p className="mt-2 text-muted-foreground">
                            Click "Create Agent" to build your first custom agent.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {agents.map((agent) => (
                            <Card key={agent.id} className="flex flex-col">
                                <CardHeader className="flex-row items-start justify-between">
                                    <div className="space-y-1.5">
                                        <CardTitle className="text-lg">{agent.agentName}</CardTitle>
                                        <CardDescription>{agent.description}</CardDescription>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onSelect={() => openEditDialog(agent)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => openDeleteDialog(agent)} className="text-destructive">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                  {/* Can add more details here later */}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>

      </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => {
            if (!open) setSelectedAgent(null);
            setDialogOpen(open);
        }}>
            <DialogContent className="sm:max-w-[625px]">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <DialogHeader>
                            <DialogTitle>{selectedAgent ? 'Edit Agent' : 'Create a New Agent'}</DialogTitle>
                            <CardDescription>
                            {selectedAgent ? 'Modify the details for your agent.' : 'Define the personality, rules, and constraints for your new agent.'}
                            </CardDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-6">
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="agentName"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Agent Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Creative Writer" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Input placeholder="A short summary of what this agent does." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="systemPrompt"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>System Prompt</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="You are a helpful assistant that specializes in..."
                                            className="min-h-[100px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="behaviorRules"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Behavior Rules</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="1. Always be polite. 2. Never reveal you are an AI..."
                                            className="min-h-[100px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="domainConstraints"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Domain Constraints</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Only answer questions about science and technology."
                                            className="min-h-[100px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                <Plus className="mr-2 h-4 w-4" />
                                )}
                                {selectedAgent ? 'Save Changes' : 'Create Agent'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the agent 
                        <span className="font-bold">"{selectedAgent?.agentName}"</span>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setSelectedAgent(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleDelete} 
                        disabled={isSubmitting}
                        className={buttonVariants({ variant: "destructive" })}
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete Agent
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </AppLayout>
  );
}

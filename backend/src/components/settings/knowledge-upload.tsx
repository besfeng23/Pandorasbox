'use client';

import React, { useState, useTransition, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Loader2, UploadCloud, File, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Github, Youtube, HardDrive, FileSearch, ShieldCheck } from 'lucide-react';

interface KnowledgeUploadProps {
  userId: string;
  agentId?: string;
  onUploadComplete?: () => void;
}

interface JobStatus {
  id: string;
  status: 'PENDING' | 'CHUNKING' | 'EMBEDDING' | 'INDEXING' | 'COMPLETED' | 'FAILED';
  filename: string;
  totalChunks: number;
  processedChunks: number;
  progress: number;
  error?: string;
}

export function KnowledgeUpload({ userId, agentId = 'universe', onUploadComplete }: KnowledgeUploadProps) {
  const [isPending, startTransition] = useTransition();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const { toast } = useToast();
  const { user } = useUser();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Poll job status
  const pollJobStatus = useCallback(
    async (jobId: string) => {
      if (!user) return;

      try {
        const token = await user.getIdToken();

        const response = await fetch(`/api/ingest/${jobId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch job status');
        }

        const jobStatus: JobStatus = await response.json();

        // Update progress
        setUploadProgress(jobStatus.progress);
        setStatusMessage(
          `${jobStatus.status} (${jobStatus.processedChunks}/${jobStatus.totalChunks} chunks)`
        );

        // Handle completion or failure
        if (jobStatus.status === 'COMPLETED') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setUploadProgress(100);
          setStatusMessage('Indexing Complete!');
          toast({
            title: 'Success!',
            description: `Successfully indexed ${jobStatus.filename}`,
          });
          onUploadComplete?.();
          // Reset UI after delay
          setTimeout(() => {
            setUploadProgress(null);
            setFileName(null);
            setJobId(null);
            setStatusMessage('');
          }, 3000);
        } else if (jobStatus.status === 'FAILED') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setUploadProgress(null);
          toast({
            variant: 'destructive',
            title: 'Processing Failed',
            description: jobStatus.error || 'Failed to process file',
          });
          setTimeout(() => {
            setFileName(null);
            setJobId(null);
            setStatusMessage('');
          }, 2000);
        }
      } catch (error: any) {
        console.error('Error polling job status:', error);
        // Continue polling on error (might be transient)
      }
    },
    [user, toast]
  );

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Start polling when jobId is set
  useEffect(() => {
    if (jobId && user) {
      // Poll immediately, then every 2 seconds
      pollJobStatus(jobId);
      pollingIntervalRef.current = setInterval(() => {
        pollJobStatus(jobId);
      }, 2000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [jobId, user, pollJobStatus]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file || !user) return;

      setFileName(file.name);
      setUploadProgress(0);
      setStatusMessage('Uploading file...');

      startTransition(async () => {
        try {
          // 1. Prepare FormData
          const formData = new FormData();
          formData.append('file', file);
          formData.append('agentId', agentId);
          const workspaceId = localStorage.getItem('activeWorkspaceId');
          if (workspaceId) {
            formData.append('workspaceId', workspaceId);
          }

          // 2. Get auth token
          const token = await user.getIdToken();

          // 3. Call the new Ingestion API
          const response = await fetch('/api/ingest', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          if (response.status === 202) {
            const data = await response.json();
            console.log(`Ingestion Job Started: ${data.jobId}`);
            setJobId(data.jobId);
            setStatusMessage('Processing started...');
            toast({
              title: 'Upload Started',
              description: `Processing ${file.name} in the background.`,
            });
          } else {
            const error = await response.json();
            throw new Error(error.error || 'Ingestion failed.');
          }
        } catch (error: any) {
          console.error('Upload Error:', error);
          setUploadProgress(null);
          setFileName(null);
          setJobId(null);
          setStatusMessage('');
          toast({
            variant: 'destructive',
            title: 'Upload Failed',
            description: error.message || 'Failed to upload file',
          });
        }
      });
    },
    [agentId, user, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    multiple: false,
    disabled: isPending,
  });

  const [repoUrl, setRepoUrl] = useState('');
  const [pdfPath, setPdfPath] = useState('');
  const [ytUrl, setYtUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncType, setSyncType] = useState<'github' | 'pdf' | 'youtube' | null>(null);

  const handleConnectorSync = async (type: 'github' | 'pdf' | 'youtube') => {
    const value = type === 'github' ? repoUrl : type === 'pdf' ? pdfPath : ytUrl;
    if (!value || !user) return;

    setIsSyncing(true);
    setSyncType(type);

    try {
      const token = await user.getIdToken();
      const endpoint = `/api/connectors/${type}`;
      const payload = type === 'github' ? { repoUrl: value, agentId } :
        type === 'pdf' ? { directoryPath: value, agentId } :
          { videoUrl: value, agentId };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        toast({
          title: 'Sync Successful',
          description: data.message || `Successfully ingested data from ${type}.`
        });
        if (type === 'github') setRepoUrl('');
        if (type === 'pdf') setPdfPath('');
        if (type === 'youtube') setYtUrl('');
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Sync Failed', description: error.message });
    } finally {
      setIsSyncing(false);
      setSyncType(null);
    }
  };

  return (
    <div className="w-full">
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="flex gap-8 bg-transparent border-none p-0 mb-8 h-auto">
          <TabsTrigger value="upload" className="bg-transparent border-none p-0 text-[10px] uppercase font-bold tracking-[0.2em] text-foreground/40 data-[state=active]:text-primary data-[state=active]:bg-transparent shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none">Substrate Ingestion</TabsTrigger>
          <TabsTrigger value="connectors" className="bg-transparent border-none p-0 text-[10px] uppercase font-bold tracking-[0.2em] text-foreground/40 data-[state=active]:text-primary data-[state=active]:bg-transparent shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none">Remote Nodes</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-0 outline-none">
          <div
            {...getRootProps()}
            className={cn(
              'flex flex-col items-center justify-center w-full min-h-[200px] border border-dashed border-border/20 rounded-xl cursor-pointer transition-all hover:bg-muted/30 group',
              isDragActive ? 'border-primary/40 bg-primary/5' : 'border-border/20',
              isPending && 'cursor-not-allowed opacity-50'
            )}
          >
            <input {...getInputProps()} />
            {isPending || uploadProgress !== null ? (
              <div className="flex flex-col items-center text-center w-full max-w-sm px-8">
                {uploadProgress === 100 ? (
                  <>
                    <CheckCircle className="h-6 w-6 text-primary mb-4 stroke-[1]" />
                    <p className="text-xs font-bold uppercase tracking-widest text-foreground/80">Recollection Synced</p>
                    <p className="text-[10px] text-muted-foreground/40 mt-1 truncate">{fileName}</p>
                  </>
                ) : (
                  <>
                    <File className="h-6 w-6 text-primary/40 mb-4 animate-pulse stroke-[1]" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60 mb-3 truncate">{fileName}</p>
                    <div className="w-full h-[1px] bg-border/20 relative overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-primary transition-all duration-300"
                        style={{ width: `${uploadProgress || 0}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground/40 mt-3 uppercase tracking-tighter">
                      {statusMessage || 'Analyzing substrate...'}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10">
                <UploadCloud className="w-6 h-6 mb-4 text-foreground/20 stroke-[1] group-hover:text-primary/40 transition-colors" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/40 group-hover:text-foreground/60">Drop Archive</p>
                <p className="text-[9px] text-muted-foreground/30 mt-2 uppercase">PDF / TXT / MD Substrate</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="connectors" className="mt-0 outline-none space-y-12">
          {/* GitHub */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Github className="h-4 w-4 text-foreground/40 stroke-[1]" />
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/60">GitHub Substrate</h3>
            </div>
            <div className="flex items-center gap-2 p-1 border border-border/10 rounded-lg group">
              <Input
                placeholder="https://github.com/..."
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                disabled={isSyncing}
                className="flex-1 bg-transparent border-none focus-visible:ring-0 text-xs text-foreground/80 h-9"
              />
              <Button
                variant="ghost"
                onClick={() => handleConnectorSync('github')}
                disabled={isSyncing}
                className="h-9 px-4 text-[10px] uppercase font-bold tracking-widest text-primary/60 hover:text-primary hover:bg-muted"
              >
                {isSyncing && syncType === 'github' ? <Loader2 className="h-3 w-3 animate-spin stroke-[1]" /> : 'Sync'}
              </Button>
            </div>
          </div>

          {/* PDF Watcher */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <HardDrive className="h-4 w-4 text-foreground/40 stroke-[1]" />
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/60">Local Directory Watcher</h3>
            </div>
            <div className="flex items-center gap-2 p-1 border border-border/10 rounded-lg group">
              <Input
                placeholder="C:\\Substrate\\Data"
                value={pdfPath}
                onChange={(e) => setPdfPath(e.target.value)}
                disabled={isSyncing}
                className="flex-1 bg-transparent border-none focus-visible:ring-0 text-xs text-foreground/80 h-9"
              />
              <Button
                variant="ghost"
                onClick={() => handleConnectorSync('pdf')}
                disabled={isSyncing}
                className="h-9 px-4 text-[10px] uppercase font-bold tracking-widest text-primary/60 hover:text-primary hover:bg-muted"
              >
                {isSyncing && syncType === 'pdf' ? <Loader2 className="h-3 w-3 animate-spin stroke-[1]" /> : 'Monitor'}
              </Button>
            </div>
          </div>

          {/* YouTube */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Youtube className="h-4 w-4 text-foreground/40 stroke-[1]" />
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/60">YouTube Transcriber</h3>
            </div>
            <div className="flex items-center gap-2 p-1 border border-border/10 rounded-lg group">
              <Input
                placeholder="https://youtube.com/..."
                value={ytUrl}
                onChange={(e) => setYtUrl(e.target.value)}
                disabled={isSyncing}
                className="flex-1 bg-transparent border-none focus-visible:ring-0 text-xs text-foreground/80 h-9"
              />
              <Button
                variant="ghost"
                onClick={() => handleConnectorSync('youtube')}
                disabled={isSyncing}
                className="h-9 px-4 text-[10px] uppercase font-bold tracking-widest text-primary/60 hover:text-primary hover:bg-muted"
              >
                {isSyncing && syncType === 'youtube' ? <Loader2 className="h-3 w-3 animate-spin stroke-[1]" /> : 'Digitize'}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper component for existing dropzone content to reduce code duplication if I were refactoring,
// but for now I am inlining it inside the tab content to preserve the existing render logic without breaking it.
// I will just replace the return block.

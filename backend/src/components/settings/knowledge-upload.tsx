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
    <div className="w-full mb-8">
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">File Upload</TabsTrigger>
          <TabsTrigger value="connectors">Remote Connectors</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <div
            {...getRootProps()}
            className={cn(
              'flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors mt-2',
              isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50',
              isPending && 'cursor-not-allowed opacity-50'
            )}
          >
            {/* ... (existing dropzone content) ... */}
            <input {...getInputProps()} />
            {isPending || uploadProgress !== null ? (
              <div className="flex flex-col items-center text-center w-full max-w-sm px-4">
                {uploadProgress === 100 ? (
                  <>
                    <CheckCircle className="h-10 w-10 text-green-500 mb-2" />
                    <p className="font-semibold text-lg">Indexing Complete!</p>
                    <p className="text-sm text-muted-foreground truncate">{fileName}</p>
                  </>
                ) : (
                  <>
                    <File className="h-10 w-10 text-primary mb-2" />
                    <p className="text-sm font-semibold text-primary mb-2 truncate">{fileName}</p>
                    <Progress value={uploadProgress || 0} className="w-full h-2" />
                    <p className="text-xs text-muted-foreground mt-2">
                      {statusMessage || 'Processing document, please wait...'}
                    </p>
                    {jobId && (
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Job ID: {jobId.substring(0, 8)}...
                      </p>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mb-4">PDF, TXT, or MD files</p>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-[10px] font-medium border border-green-500/20">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Encrypted & Private</span>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="connectors">
          <div className="space-y-4 mt-2">
            {/* GitHub */}
            <div className="border rounded-lg p-6 space-y-4 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Github className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">GitHub Connector</h3>
              </div>
              <div className="grid gap-2">
                <p className="text-sm text-muted-foreground">
                  Ingest a public repository to give Pandora context about your codebase.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://github.com/username/repo"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    disabled={isSyncing}
                  />
                  <Button onClick={() => handleConnectorSync('github')} disabled={isSyncing}>
                    {isSyncing && syncType === 'github' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sync'}
                  </Button>
                </div>
              </div>
            </div>

            {/* PDF Watcher */}
            <div className="border rounded-lg p-6 space-y-4 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Local PDF Watcher</h3>
              </div>
              <div className="grid gap-2">
                <p className="text-sm text-muted-foreground">
                  Scan a local directory for PDFs and auto-ingest new documents.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="C:\Users\Documents\Papers"
                    value={pdfPath}
                    onChange={(e) => setPdfPath(e.target.value)}
                    disabled={isSyncing}
                  />
                  <Button onClick={() => handleConnectorSync('pdf')} disabled={isSyncing}>
                    {isSyncing && syncType === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Scan'}
                  </Button>
                </div>
              </div>
            </div>

            {/* YouTube */}
            <div className="border rounded-lg p-6 space-y-4 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Youtube className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">YouTube Transcriber</h3>
              </div>
              <div className="grid gap-2">
                <p className="text-sm text-muted-foreground">
                  Paste a video URL to transcribe and index its content for chat.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={ytUrl}
                    onChange={(e) => setYtUrl(e.target.value)}
                    disabled={isSyncing}
                  />
                  <Button onClick={() => handleConnectorSync('youtube')} disabled={isSyncing}>
                    {isSyncing && syncType === 'youtube' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Transcribe'}
                  </Button>
                </div>
              </div>
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

'use client';

import React, { useState, useTransition, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Loader2, UploadCloud, File, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';

interface KnowledgeUploadProps {
  userId: string;
  agentId?: string;
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

export function KnowledgeUpload({ userId, agentId = 'universe' }: KnowledgeUploadProps) {
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
        const API_URL = process.env.NEXT_PUBLIC_API_URL || window.location.origin;

        const response = await fetch(`${API_URL}/api/ingest/${jobId}`, {
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

          // 2. Get auth token
          const token = await user.getIdToken();
          const API_URL = process.env.NEXT_PUBLIC_API_URL || window.location.origin;

          // 3. Call the new Ingestion API
          const response = await fetch(`${API_URL}/api/ingest`, {
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

  return (
    <div className="w-full mb-8">
      <div
        {...getRootProps()}
        className={cn(
          'flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
          isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50',
          isPending && 'cursor-not-allowed opacity-50'
        )}
      >
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
                <p className="text-xs text-muted-foreground">PDF, TXT, or MD files</p>
            </div>
        )}
      </div>
    </div>
  );
}

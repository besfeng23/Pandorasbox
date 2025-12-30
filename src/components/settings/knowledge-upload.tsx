'use client';

import React, { useState, useTransition, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadKnowledge } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, UploadCloud, File, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KnowledgeUploadProps {
  userId: string;
}

export function KnowledgeUpload({ userId }: KnowledgeUploadProps) {
  const [isPending, startTransition] = useTransition();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    
    setFileName(file.name);
    setUploadProgress(0); // Start progress

    startTransition(async () => {
      // Simulate progress for large file processing
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
            if (prev === null) return 0;
            if (prev >= 95) {
                clearInterval(progressInterval);
                return prev;
            }
            return prev + 5;
        });
      }, 500);

      const result = await uploadKnowledge(formData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success) {
        toast({
          title: 'Success!',
          description: result.message,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: result.message,
        });
      }

      // Reset UI after a short delay
      setTimeout(() => {
        setUploadProgress(null);
        setFileName(null);
      }, 2000);
    });
  }, [userId, toast]);

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
                        <Progress value={uploadProgress} className="w-full h-2" />
                        <p className="text-xs text-muted-foreground mt-2">Indexing document, please wait...</p>
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

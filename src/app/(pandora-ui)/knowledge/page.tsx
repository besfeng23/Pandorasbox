"use client";

import React, { useState, useEffect } from "react";
import { useUser, useFirestore } from "@/firebase";
import { Loader2, Trash2, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { KnowledgeUpload } from "@/components/settings/knowledge-upload";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { toDate } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface KnowledgeFile {
  filename: string;
  chunks: number;
  uploadedAt: Date;
  status: "indexed" | "processing";
}

export default function KnowledgePage() {
  const { user, isLoading } = useUser();
  const firestore = useFirestore();
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.uid || !firestore) return;
    
    const loadFiles = async () => {
      setIsLoadingFiles(true);
      try {
        const historyQuery = query(
          collection(firestore, 'history'),
          where('userId', '==', user.uid),
          where('type', '==', 'knowledge_chunk'),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(historyQuery);
        
        // Group by source_filename
        const fileMap = new Map<string, { chunks: number; uploadedAt: Date }>();
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const filename = data.source_filename || 'Unknown';
          const uploadedAt = toDate(data.createdAt);
          
          if (fileMap.has(filename)) {
            const existing = fileMap.get(filename)!;
            existing.chunks++;
            if (uploadedAt > existing.uploadedAt) {
              existing.uploadedAt = uploadedAt;
            }
          } else {
            fileMap.set(filename, { chunks: 1, uploadedAt });
          }
        });
        
        const fileList: KnowledgeFile[] = Array.from(fileMap.entries()).map(([filename, data]) => ({
          filename,
          chunks: data.chunks,
          uploadedAt: data.uploadedAt,
          status: 'indexed' as const
        }));
        
        setFiles(fileList);
      } catch (error) {
        console.error('Error loading knowledge files:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load knowledge files.' });
      } finally {
        setIsLoadingFiles(false);
      }
    };
    
    loadFiles();
  }, [user?.uid, firestore, toast]);

  const handleDelete = async (filename: string) => {
    if (!user?.uid || !firestore) return;
    try {
      const historyQuery = query(
        collection(firestore, 'history'),
        where('userId', '==', user.uid),
        where('type', '==', 'knowledge_chunk'),
        where('source_filename', '==', filename)
      );
      const snapshot = await getDocs(historyQuery);
      
      // Delete all chunks (in batches if needed)
      const batch = firestore.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      setFiles(prev => prev.filter(f => f.filename !== filename));
      setDeleteDialogOpen(null);
      toast({ title: 'Deleted', description: `Removed ${filename} from knowledge base.` });
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete file.' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 text-sm text-muted-foreground">
        Sign in to manage knowledge.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold gradient-text-cyan">Knowledge</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload documents and let Pandora build searchable context.
        </p>
      </div>

      <div className="rounded-xl border border-border glass-panel p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Upload Document</h2>
        <KnowledgeUpload userId={user.uid} />
      </div>

      <div className="rounded-xl border border-border glass-panel p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Indexed Files</h2>
          {isLoadingFiles && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        
        {files.length === 0 && !isLoadingFiles ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            No files indexed yet. Upload a document to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.filename}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/30 hover:bg-card/40 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">{file.filename}</div>
                    <div className="text-xs text-muted-foreground">
                      {file.chunks} chunks • {formatDistanceToNow(file.uploadedAt, { addSuffix: true })}
                    </div>
                  </div>
                  {file.status === 'indexed' && (
                    <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                  onClick={() => setDeleteDialogOpen(file.filename)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen !== null} onOpenChange={(open) => !open && setDeleteDialogOpen(null)}>
        <AlertDialogContent className="glass-panel-strong border border-destructive/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete File?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all indexed chunks for "{deleteDialogOpen}" from your knowledge base. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialogOpen && handleDelete(deleteDialogOpen)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}



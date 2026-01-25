'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/dashboard/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Search, Plus, Trash2, Edit, RefreshCw, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface Collection {
  name: string;
  documentCount: string;
  hasData: boolean;
  error?: string;
}

interface Document {
  id: string;
  [key: string]: any;
}

export default function StudioPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [docLoading, setDocLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadCollections();
  }, []);

  useEffect(() => {
    if (selectedCollection) {
      loadDocuments(selectedCollection);
    }
  }, [selectedCollection]);

  const loadCollections = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/studio/collections');
      const data = await response.json();
      setCollections(data.collections || []);
    } catch (error) {
      console.error('Error loading collections:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load collections',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async (collectionName: string) => {
    try {
      setDocLoading(true);
      const response = await fetch(`/api/studio/collections/${collectionName}?limit=50`);
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to load documents from ${collectionName}`,
      });
    } finally {
      setDocLoading(false);
    }
  };

  const handleDelete = async (collection: string, docId: string) => {
    if (!confirm(`Delete document ${docId}?`)) return;

    try {
      const response = await fetch(`/api/studio/collections/${collection}/${docId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Document deleted',
        });
        loadDocuments(collection);
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete document',
      });
    }
  };

  const filteredCollections = collections.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDocuments = documents.filter(doc => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return Object.values(doc).some(val =>
      String(val).toLowerCase().includes(searchLower)
    );
  });

  return (
    <AppLayout>
      <div className="flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Firebase Studio</h1>
          <p className="text-muted-foreground">
            Auto-discovered collections from your Firestore backend
          </p>
        </div>
        <Link href="/studio/generate">
          <Button>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate UI from Prompt
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="collections" className="w-full">
        <TabsList>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          {selectedCollection && (
            <TabsTrigger value="documents">{selectedCollection}</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="collections" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search collections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={loadCollections} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading collections...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCollections.map((collection) => (
                <Card
                  key={collection.name}
                  className="cursor-pointer hover:shadow-card-light transition-shadow"
                  onClick={() => setSelectedCollection(collection.name)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        {collection.name}
                      </CardTitle>
                      {collection.hasData && (
                        <Badge variant="secondary">{collection.documentCount}</Badge>
                      )}
                    </div>
                    {collection.error && (
                      <CardDescription className="text-destructive text-xs">
                        {collection.error}
                      </CardDescription>
                    )}
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {selectedCollection && (
          <TabsContent value="documents" className="space-y-4">
            <div className="flex gap-4 items-center justify-between">
              <h2 className="text-2xl font-semibold">{selectedCollection}</h2>
              <div className="flex gap-2">
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64"
                />
                <Button onClick={() => loadDocuments(selectedCollection)} variant="outline">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {docLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading documents...</div>
            ) : filteredDocuments.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No documents found
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredDocuments.map((doc) => (
                  <Card key={doc.id} className="shadow-card-light">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-mono">{doc.id}</CardTitle>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(doc, null, 2));
                              toast({ title: 'Copied to clipboard' });
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(selectedCollection, doc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                        {JSON.stringify(doc, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
      </div>
    </AppLayout>
  );
}


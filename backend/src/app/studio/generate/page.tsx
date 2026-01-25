'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Code, Download, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

export default function GeneratePage() {
  const [prompt, setPrompt] = useState('');
  const [componentName, setComponentName] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a prompt',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          componentName: componentName || undefined,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedCode(data.code);
      if (data.componentName) {
        setComponentName(data.componentName);
      }

      toast({
        title: 'Success',
        description: 'Component generated successfully!',
      });
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate component',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied',
      description: 'Component code copied to clipboard',
    });
  };

  const handleDownload = () => {
    const filename = `${componentName || 'GeneratedComponent'}.tsx`;
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: 'Downloaded',
      description: `Saved as ${filename}`,
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Sparkles className="h-8 w-8" />
          Prompt-to-UI Generator
        </h1>
        <p className="text-muted-foreground">
          Describe what you want, and we'll generate a React component that auto-binds to your Firestore backend
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-card-light">
          <CardHeader>
            <CardTitle>Describe Your Component</CardTitle>
            <CardDescription>
              Use natural language to describe the UI you want. The AI will analyze your Firestore schema and generate a complete component.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="component-name">Component Name (optional)</Label>
              <Input
                id="component-name"
                placeholder="e.g., UserDashboard, ThreadList"
                value={componentName}
                onChange={(e) => setComponentName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                placeholder="e.g., Create a dashboard that shows all user threads in a card grid, with search functionality and the ability to create new threads..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Component
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-card-light">
          <CardHeader>
            <CardTitle>Generated Component</CardTitle>
            <CardDescription>
              Your auto-generated React component ready to use
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generatedCode ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={handleCopy}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Code
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <SyntaxHighlighter
                    language="tsx"
                    style={vscDarkPlus}
                    customStyle={{
                      margin: 0,
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  >
                    {generatedCode}
                  </SyntaxHighlighter>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Generated component will appear here</p>
                <p className="text-xs mt-2">Enter a prompt and click Generate</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 shadow-card-light">
        <CardHeader>
          <CardTitle>Example Prompts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Thread Management</h4>
              <p className="text-sm text-muted-foreground">
                "Create a thread list component with search, filters by agent type, and a create new thread button. Show thread title, last message preview, and timestamp."
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Memory Dashboard</h4>
              <p className="text-sm text-muted-foreground">
                "Build a memory management interface with a table showing all memories, ability to edit/delete, and search by content. Include pagination."
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">User Analytics</h4>
              <p className="text-sm text-muted-foreground">
                "Generate a user analytics dashboard with charts showing thread count over time, message statistics, and top memories by importance."
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Artifact Viewer</h4>
              <p className="text-sm text-muted-foreground">
                "Create an artifact gallery component with cards showing artifact title, type, and preview. Include filters by type and search functionality."
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit } from "lucide-react";
import { EmailForm } from "./email-form";

export function Login() {

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <Card className="w-[400px] glass-panel-strong border-primary/20">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <BrainCircuit className="w-12 h-12 text-primary animate-pulse-slow" />
          </div>
          <CardTitle className="text-primary">PandorasBox</CardTitle>
          <CardDescription className="text-muted-foreground">Your personal AI with long-term memory.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmailForm />
        </CardContent>
      </Card>
    </div>
  );
}
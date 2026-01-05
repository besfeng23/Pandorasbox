'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit } from "lucide-react";
import { EmailForm } from "./email-form";

export function Login() {

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-void">
      <Card className="w-[400px] glass-panel-strong border-glow-cyan">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <BrainCircuit className="w-12 h-12 neon-text-cyan animate-pulse-slow" />
          </div>
          <CardTitle className="neon-text-cyan">PandorasBox</CardTitle>
          <CardDescription className="text-white/60">Your personal AI with long-term memory.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmailForm />
        </CardContent>
      </Card>
    </div>
  );
}
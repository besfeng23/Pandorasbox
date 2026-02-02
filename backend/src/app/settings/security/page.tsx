'use client';

import React from 'react';
import { Shield, Lock, EyeOff } from 'lucide-react';

export default function SecurityPage() {
    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <section className="space-y-6">
                <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/60 mb-2 block">System Integrity</span>
                    <h2 className="text-xl font-light tracking-tight text-foreground/90">Sovereign Encryption</h2>
                    <p className="text-xs text-foreground/40 mt-2 max-w-lg leading-relaxed">
                        Data in Pandora's Box is stored locally. Your cryptographic substrate ensures that all "Brain" operations and "Memory" storage remain within your private domain.
                    </p>
                </div>

                <div className="grid gap-4 mt-8">
                    {[
                        { title: 'Local Vault', desc: 'Qdrant vector database is isolated from external ingress.', icon: Shield, status: 'Active' },
                        { title: 'Identity Layer', desc: 'Firebase Auth tokens are handled via stateless sessions.', icon: Lock, status: 'Secured' },
                        { title: 'Zero-Telemetry', desc: 'No usage metrics are exfiltrated to mothership servers.', icon: EyeOff, status: 'Enforced' }
                    ].map((item, i) => (
                        <div key={i} className="group flex items-center justify-between p-4 border border-border/5 bg-transparent hover:border-primary/20 transition-all">
                            <div className="flex items-center gap-4">
                                <item.icon className="h-4 w-4 text-foreground/20 stroke-[1] group-hover:text-primary transition-colors" />
                                <div>
                                    <p className="text-[13px] font-medium text-foreground/70">{item.title}</p>
                                    <p className="text-[11px] text-foreground/30">{item.desc}</p>
                                </div>
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-primary/40 px-2 py-0.5 border border-primary/10">{item.status}</span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

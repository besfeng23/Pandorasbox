'use client';

import React from 'react';
import { Menu } from 'lucide-react';
import { PandoraBoxIcon } from '@/components/icons';
import { useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

export default function MobileHeader() {
    const { toggleSidebar } = useSidebar();

    return (
        <>
            <header className="md:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-[#09090b] text-white">
                <div className="flex items-center gap-2">
                    <PandoraBoxIcon className="h-8 w-8 text-white bg-transparent" />
                    <span className="font-semibold text-lg">Pandora&apos;s Box</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSidebar}
                    className="p-1 hover:bg-zinc-800 rounded text-zinc-300 hover:text-white"
                >
                    <Menu className="w-6 h-6" />
                </Button>
            </header>
        </>
    );
}

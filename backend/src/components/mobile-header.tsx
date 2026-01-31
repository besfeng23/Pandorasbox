'use client';

import React, { useState } from 'react';
import { Menu, X, Brain, Plug, Bot, Plus, User } from 'lucide-react';
import { PandoraBoxIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useAuthActions, useUser } from '@/firebase';

export default function MobileHeader() {
    const [isOpen, setIsOpen] = useState(false);
    const { user } = useUser();
    const { logout } = useAuthActions();

    return (
        <>
            {/* Top Bar - Visible only on Mobile */}
            <header className="md:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-[#09090b] text-white">
                <div className="flex items-center gap-2">
                    <PandoraBoxIcon className="h-8 w-8 text-white bg-transparent" />
                    <span className="font-semibold text-lg">Pandora&apos;s Box</span>
                </div>
                <button onClick={() => setIsOpen(true)} className="p-1 hover:bg-zinc-800 rounded">
                    <Menu className="w-6 h-6 text-zinc-300" />
                </button>
            </header>

            {/* Mobile Menu Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Slide-out Drawer */}
                    <div className="relative w-[85%] max-w-[300px] h-full bg-[#09090b] border-r border-zinc-800 p-4 flex flex-col animate-in slide-in-from-left duration-200">

                        {/* Drawer Header */}
                        <div className="flex items-center justify-between mb-8">
                            <span className="font-semibold text-white text-lg">Menu</span>
                            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-zinc-800 rounded">
                                <X className="w-6 h-6 text-zinc-400" />
                            </button>
                        </div>

                        {/* Navigation Links */}
                        <nav className="space-y-2 flex-1">
                            <MobileNavItem icon={<Brain size={20} />} label="Memory" />
                            <MobileNavItem icon={<Plug size={20} />} label="Data Connectors" />
                            <MobileNavItem icon={<Bot size={20} />} label="Agents" />
                        </nav>

                        {/* Builder/Universe Toggle */}
                        <div className="mt-auto mb-4 bg-zinc-900 p-1 rounded-lg flex text-sm font-medium">
                            <button className="flex-1 bg-zinc-800 text-white py-2 rounded-md shadow-sm">Builder</button>
                            <button className="flex-1 text-zinc-500 py-2">Universe</button>
                        </div>

                        {/* Action Button */}
                        <button className="w-full flex items-center justify-center gap-2 border border-zinc-800 bg-zinc-900 text-white py-3 rounded-lg mb-6">
                            <Plus size={18} />
                            <span>New Thread</span>
                        </button>

                        {/* User Profile */}
                        <div className="pt-4 border-t border-zinc-800 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt="User" className="w-full h-full rounded-full" />
                                ) : (
                                    <User size={20} className="text-zinc-300" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{user?.email || 'User'}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    <span className="text-xs text-zinc-500">ONLINE</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </>
    );
}

const MobileNavItem = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
    <button className="w-full flex items-center gap-3 px-3 py-3 text-base font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-md transition-colors">
        {icon}
        {label}
    </button>
);

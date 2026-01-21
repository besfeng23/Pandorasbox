'use client';

import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Icons } from '../icons';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { StatusIndicator } from '../status-indicator';
import { useUser } from '@/firebase';
import { Settings2 } from 'lucide-react';

export function CommandRail() {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <>
      <SidebarHeader className="h-14 justify-center border-b border-white/10">
        <Icons.brain strokeWidth={1.5} className="w-7 h-7 neon-text-cyan" />
      </SidebarHeader>
      <SidebarContent className="p-2 flex-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/" passHref>
              <SidebarMenuButton
                tooltip="Chat"
                isActive={pathname === '/'}
                size="lg"
                asChild
                className={pathname === '/' ? 'bg-neon-cyan/20 border border-neon-cyan/30' : ''}
              >
                <Icons.chat strokeWidth={1.5} className={pathname === '/' ? 'text-neon-cyan' : 'text-white/60'} />
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/graph" passHref>
              <SidebarMenuButton
                tooltip="Knowledge Graph"
                isActive={pathname === '/graph'}
                size="lg"
                asChild
                className={pathname === '/graph' ? 'bg-neon-cyan/20 border border-neon-cyan/30' : ''}
              >
                <Icons.brain strokeWidth={1.5} className={pathname === '/graph' ? 'text-neon-cyan' : 'text-white/60'} />
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/memory" passHref>
              <SidebarMenuButton
                tooltip="Memory"
                isActive={pathname === '/memory'}
                size="lg"
                asChild
                className={pathname === '/memory' ? 'bg-neon-cyan/20 border border-neon-cyan/30' : ''}
              >
                <Icons.memory strokeWidth={1.5} className={pathname === '/memory' ? 'text-neon-cyan' : 'text-white/60'} />
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-white/10">
        {user && <StatusIndicator userId={user.uid} />}
        <Separator className="my-2 bg-white/10" />
        <SidebarMenu>
          <SidebarMenuItem>
             <Link href="/settings" passHref>
                <SidebarMenuButton 
                    tooltip="Settings" 
                    size="lg" 
                    asChild
                    isActive={pathname === '/settings'}
                    className={pathname === '/settings' ? 'bg-neon-cyan/20 border border-neon-cyan/30' : ''}
                >
                 <Settings2 strokeWidth={1.5} className={pathname === '/settings' ? 'text-neon-cyan' : 'text-white/60'} />
                </SidebarMenuButton>
             </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
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

export function CommandRail() {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <>
      <SidebarHeader className="h-14 justify-center">
        <Icons.brain strokeWidth={1.5} className="w-7 h-7 text-primary" />
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/" passHref>
              <SidebarMenuButton
                tooltip="Chat"
                isActive={pathname === '/'}
                size="lg"
                asChild
              >
                <Icons.chat strokeWidth={1.5} />
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        {user && <StatusIndicator userId={user.uid} />}
        <Separator className="my-2" />
        <SidebarMenu>
          <SidebarMenuItem>
             <Link href="/settings" passHref>
                <SidebarMenuButton 
                    tooltip="Settings & Memory" 
                    size="lg" 
                    asChild
                    isActive={pathname === '/settings'}
                >
                 <Icons.settings strokeWidth={1.5} />
                </SidebarMenuButton>
             </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Settings, HelpCircle, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Breadcrumb } from '@/components/breadcrumb';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

interface AppHeaderProps {
  userEmail: string;
  userName?: string;
}

export function EnhancedHeader({ userEmail, userName }: AppHeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Get initials from email or name
  const getInitials = () => {
    if (userName) {
      return userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return userEmail.slice(0, 2).toUpperCase();
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-xl px-6 shadow-sm"
    >
      <div className="flex items-center gap-4">
        <Breadcrumb />
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Actions */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <HelpCircle className="h-5 w-5" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500"></span>
          </span>
        </motion.button>

        <div className="h-6 w-px bg-gray-200" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 rounded-lg px-2 py-1.5 outline-none transition-colors hover:bg-gray-100">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {userName || userEmail.split('@')[0]}
              </div>
              <div className="text-xs text-gray-500">{userEmail}</div>
            </div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Avatar className="ring-2 ring-gray-100 ring-offset-2">
                <AvatarFallback className="bg-gradient-to-br from-sky-400 to-blue-500 text-white font-semibold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </motion.div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white/95 backdrop-blur-xl">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{userName || 'User'}</p>
                <p className="text-xs leading-none text-gray-500">{userEmail}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Profile
              <Badge variant="outline" className="ml-auto text-xs">Soon</Badge>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.header>
  );
}

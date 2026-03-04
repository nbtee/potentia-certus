'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  color?: 'aqua' | 'ocean' | 'violet' | 'rose';
  index?: number;
}

const colorClasses = {
  aqua: {
    bg: 'from-[#00C9A7]/10 to-[#00C9A7]/5',
    icon: 'text-[#00C9A7]',
    ring: 'ring-[#00C9A7]/20',
    gradient: 'from-[#00C9A7] to-[#3B9EB5]',
  },
  ocean: {
    bg: 'from-[#3B9EB5]/10 to-[#5488B5]/10',
    icon: 'text-[#3B9EB5]',
    ring: 'ring-[#3B9EB5]/20',
    gradient: 'from-[#3B9EB5] to-[#5488B5]',
  },
  violet: {
    bg: 'from-[#8566A8]/10 to-[#6C6EB5]/10',
    icon: 'text-[#8566A8]',
    ring: 'ring-[#8566A8]/20',
    gradient: 'from-[#8566A8] to-[#6C6EB5]',
  },
  rose: {
    bg: 'from-[#C75591]/10 to-[#A85C9A]/10',
    icon: 'text-[#C75591]',
    ring: 'ring-[#C75591]/20',
    gradient: 'from-[#C75591] to-[#A85C9A]',
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  description,
  color = 'aqua',
  index = 0,
}: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card className="relative overflow-hidden border-gray-200/60 bg-white/80 backdrop-blur-xl transition-shadow hover:shadow-xl hover:shadow-gray-100/50">
        {/* Decorative gradient */}
        <div className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-50 transition-opacity group-hover:opacity-70',
          colors.bg
        )} />

        <div className="relative p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                {title}
              </p>
              <div className="space-y-1">
                <motion.p
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.1 + 0.2 }}
                  className="text-3xl font-bold text-gray-900"
                >
                  {value}
                </motion.p>
                {description && (
                  <p className="text-sm text-gray-500">{description}</p>
                )}
              </div>

              {trend && (
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      trend.isPositive ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {trend.isPositive ? '+' : ''}{trend.value}%
                  </span>
                  <span className="text-xs text-gray-500">vs last period</span>
                </div>
              )}
            </div>

            <motion.div
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg ring-2',
                colors.gradient,
                colors.ring
              )}
            >
              <Icon className="h-6 w-6 text-white" />
            </motion.div>
          </div>
        </div>

        {/* Shine effect on hover */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full"
          whileHover={{ translateX: '200%' }}
          transition={{ duration: 0.6 }}
        />
      </Card>
    </motion.div>
  );
}

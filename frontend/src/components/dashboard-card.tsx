'use client';

import { motion } from 'framer-motion';
import { ChevronRight, Shield, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardCardProps {
  name: string;
  description: string;
  accentColor: string;
  iconName: string;
  completionPct: number;
  completedItems: number;
  totalItems: number;
  completedCaps: number;
  totalCaps: number;
  onClick: () => void;
  index: number;
}

export function DashboardCard({
  name, description, accentColor, completionPct,
  completedItems, totalItems, completedCaps, totalCaps,
  onClick, index,
}: DashboardCardProps) {
  const getTrend = () => {
    if (completionPct >= 75) return { icon: TrendingUp, label: 'On track', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' };
    if (completionPct >= 40) return { icon: Minus, label: 'In progress', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30' };
    return { icon: TrendingDown, label: 'Attention needed', color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30' };
  };

  const trend = getTrend();
  const TrendIcon = trend.icon;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onClick={onClick}
      className="group relative w-full text-left"
    >
      <div className="glass rounded-2xl p-6 card-lift cursor-pointer transition-all duration-300 hover:shadow-lg">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl shadow-sm"
              style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
            >
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-1">{description}</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall completion</span>
            <motion.span
              key={completionPct}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-semibold text-foreground"
              style={{ color: accentColor }}
            >
              {completionPct}%
            </motion.span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionPct}%` }}
              transition={{ duration: 1, delay: index * 0.15, ease: 'easeOut' }}
              className="h-full rounded-full transition-all"
              style={{ backgroundColor: accentColor }}
            />
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Checklist Items</p>
            <motion.p
              key={`${completedItems}-${totalItems}`}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="text-lg font-semibold text-foreground"
            >
              {completedItems}
              <span className="text-sm font-normal text-muted-foreground"> / {totalItems}</span>
            </motion.p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">L1 Capabilities</p>
            <motion.p
              key={`${completedCaps}-${totalCaps}`}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="text-lg font-semibold text-foreground"
            >
              {completedCaps}
              <span className="text-sm font-normal text-muted-foreground"> / {totalCaps}</span>
            </motion.p>
          </div>
        </div>

        {/* Trend chip */}
        <div className="mt-3 flex items-center justify-end">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', trend.color)}>
            <TrendIcon className="h-3 w-3" />
            {trend.label}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

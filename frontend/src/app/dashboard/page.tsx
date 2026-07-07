'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Shield, AlertTriangle, Clock, CheckCircle2, Loader2,
  ArrowRight, ListChecks
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { capabilities } from '@/lib/api';
import { Navbar } from '@/components/navbar';
import { DashboardCard } from '@/components/dashboard-card';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    fetchDashboard();
  }, [user, authLoading]);

  const fetchDashboard = async () => {
    try {
      const result = await capabilities.getDashboard();
      setData(result);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Cybersecurity Capability Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, {user.full_name}. Here&apos;s your organization&apos;s cybersecurity posture overview.
          </p>
        </motion.div>

        {/* Summary strip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {data && (
            <>
              <SummaryCard
                label="Overall Completion"
                value={`${data.overall_completion_pct || 0}%`}
                icon={CheckCircle2}
                color="text-teal-600 dark:text-teal-400"
                delay={0}
              />
              <SummaryCard
                label="Completed Items"
                value={`${data.total_completed_items || 0}/${data.total_items || 0}`}
                icon={ListChecks}
                color="text-blue-600 dark:text-blue-400"
                delay={0.05}
              />
              <SummaryCard
                label="In Progress"
                value={data.in_progress_items || 0}
                icon={Clock}
                color="text-amber-600 dark:text-amber-400"
                delay={0.1}
              />
              <SummaryCard
                label="Overdue Actions"
                value={data.overdue_items || 0}
                icon={AlertTriangle}
                color="text-red-600 dark:text-red-400"
                delay={0.15}
              />
            </>
          )}
        </motion.div>

        {/* Domain cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data?.domains?.map((domain: any, i: number) => (
            <DashboardCard
              key={domain.id}
              name={domain.name}
              description={domain.description || ''}
              accentColor={domain.accent_color}
              iconName={domain.icon_name}
              completionPct={domain.progress?.completion_pct || 0}
              completedItems={domain.progress?.completed_items || 0}
              totalItems={domain.progress?.total_items || 0}
              completedCaps={domain.completed_capabilities || 0}
              totalCaps={domain.capability_count || 0}
              onClick={() => router.push(`/domains/${domain.id}`)}
              index={i}
            />
          ))}

          {/* Empty state */}
          {data?.domains?.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
              <Shield className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <h3 className="text-lg font-medium text-foreground">No domains found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Your organization doesn&apos;t have any capability domains configured yet.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color, delay }: {
  label: string; value: string | number; icon: any; color: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass rounded-xl p-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={cn('h-4 w-4', color)} />
      </div>
      <motion.p
        key={String(value)}
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        className={cn('mt-1 text-2xl font-bold', color)}
      >
        {value}
      </motion.p>
    </motion.div>
  );
}

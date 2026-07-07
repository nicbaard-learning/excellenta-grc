'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ChevronDown, ChevronRight, CheckCircle2, Circle,
  Clock, AlertTriangle, XCircle, Loader2, ListChecks,
  User, Calendar, FileText
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { capabilities } from '@/lib/api';
import { Navbar } from '@/components/navbar';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  complete: 'text-emerald-600 dark:text-emerald-400',
  in_progress: 'text-amber-600 dark:text-amber-400',
  blocked: 'text-red-600 dark:text-red-400',
  not_started: 'text-muted-foreground',
  not_applicable: 'text-slate-400 dark:text-slate-600',
};

const statusIcons: Record<string, any> = {
  complete: CheckCircle2,
  in_progress: Clock,
  blocked: XCircle,
  not_started: Circle,
  not_applicable: AlertTriangle,
};

const statusLabels: Record<string, string> = {
  complete: 'Complete',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  not_started: 'Not Started',
  not_applicable: 'N/A',
};

export default function CapabilityDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (params.id) fetchCapability();
  }, [params.id, user, authLoading]);

  const fetchCapability = async () => {
    try {
      const result = await capabilities.getCapability(params.id as string);
      setData(result);
    } catch (err) {
      console.error('Failed to load capability:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateItemStatus = async (itemId: string, newStatus: string) => {
    setUpdating(itemId);
    try {
      await capabilities.updateChecklistItem(itemId, { status: newStatus });
      await fetchCapability();
    } catch (err) {
      console.error('Failed to update:', err);
    } finally {
      setUpdating(null);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back button + header */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{data.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data.description}</p>
        </motion.div>

        {/* Progress */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 glass rounded-2xl p-6"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Capability Progress</span>
            <span className="text-2xl font-bold text-teal-600 dark:text-teal-400">{data.progress?.completion_pct || 0}%</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-secondary">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${data.progress?.completion_pct || 0}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full bg-teal-500"
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Completed" value={data.progress?.completed_items || 0} color="text-emerald-600 dark:text-emerald-400" />
            <Metric label="In Progress" value={data.progress?.in_progress || 0} color="text-amber-600 dark:text-amber-400" />
            <Metric label="Blocked" value={data.progress?.blocked || 0} color="text-red-600 dark:text-red-400" />
            <Metric label="Total Items" value={data.progress?.total_items || 0} color="text-foreground" />
          </div>
        </motion.div>

        {/* L2 Sub-capabilities with checklist items */}
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          L2 Sub-Capabilities
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({data.sub_capabilities?.length || 0})
          </span>
        </h2>

        <div className="space-y-3">
          {data.sub_capabilities?.map((sub: any, i: number) => {
            const isExpanded = expandedSub === sub.id;
            const subProgress = sub.progress?.completion_pct || 0;

            return (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-xl overflow-hidden"
              >
                {/* Sub-capability header */}
                <button
                  onClick={() => setExpandedSub(isExpanded ? null : sub.id)}
                  className="flex w-full items-center justify-between p-5 text-left hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{sub.name}</h3>
                      {subProgress >= 100 && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{sub.progress?.completed_items || 0}/{sub.progress?.total_items || 0} items</span>
                      <span className={cn('font-medium', subProgress >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground')}>
                        {subProgress}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${subProgress}%` }} />
                    </div>
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                {/* Expanded checklist items */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border px-5 py-3 space-y-2">
                        {sub.checklist_items?.length > 0 ? (
                          sub.checklist_items.map((item: any) => {
                            const StatusIcon = statusIcons[item.status] || Circle;
                            const isUpdating = updating === item.id;

                            return (
                              <div
                                key={item.id}
                                className="flex items-start gap-3 rounded-lg p-3 hover:bg-secondary/50 transition-colors"
                              >
                                <button
                                  onClick={() => {
                                    const nextStatus = item.status === 'complete' ? 'not_started' : 'complete';
                                    updateItemStatus(item.id, nextStatus);
                                  }}
                                  disabled={isUpdating}
                                  className="mt-0.5 shrink-0"
                                >
                                  {isUpdating ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                  ) : (
                                    <StatusIcon className={cn('h-4 w-4', statusColors[item.status] || 'text-muted-foreground')} />
                                  )}
                                </button>

                                <div className="min-w-0 flex-1">
                                  <p className={cn(
                                    'text-sm font-medium',
                                    item.status === 'complete' ? 'text-muted-foreground line-through' : 'text-foreground'
                                  )}>
                                    {item.title}
                                  </p>
                                  {item.description && (
                                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                                  )}
                                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                    {item.owner && (
                                      <span className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        {item.owner}
                                      </span>
                                    )}
                                    {item.due_date && (
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(item.due_date).toLocaleDateString()}
                                      </span>
                                    )}
                                    <select
                                      value={item.status}
                                      onChange={(e) => updateItemStatus(item.id, e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="rounded-md border border-input bg-background px-2 py-0.5 text-xs text-foreground focus:border-ring focus:outline-none"
                                    >
                                      {Object.entries(statusLabels).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="py-4 text-center text-sm text-muted-foreground">
                            No checklist items yet
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-lg font-semibold', color)}>{value}</p>
    </div>
  );
}

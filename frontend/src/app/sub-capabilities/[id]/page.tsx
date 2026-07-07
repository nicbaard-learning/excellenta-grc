'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, CheckCircle2, Circle, Clock, XCircle, AlertTriangle,
  Loader2, User, Calendar, FileText, Paperclip, Plus
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { capabilities } from '@/lib/api';
import { Navbar } from '@/components/navbar';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { icon: any; label: string; color: string; bgColor: string }> = {
  complete: { icon: CheckCircle2, label: 'Complete', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30' },
  in_progress: { icon: Clock, label: 'In Progress', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-950/30' },
  blocked: { icon: XCircle, label: 'Blocked', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-950/30' },
  not_started: { icon: Circle, label: 'Not Started', color: 'text-muted-foreground', bgColor: 'bg-secondary' },
  not_applicable: { icon: AlertTriangle, label: 'N/A', color: 'text-slate-400 dark:text-slate-600', bgColor: 'bg-slate-50 dark:bg-slate-950/30' },
};

const statusOptions = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'complete', label: 'Complete' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'not_applicable', label: 'Not Applicable' },
];

export default function SubCapabilityChecklistPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (params.id) fetchSubCapability();
  }, [params.id, user, authLoading]);

  const fetchSubCapability = async () => {
    try {
      const result = await capabilities.getSubCapability(params.id as string);
      setData(result);
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateItemStatus = async (itemId: string, newStatus: string) => {
    setUpdating(itemId);
    try {
      await capabilities.updateChecklistItem(itemId, { status: newStatus });
      await fetchSubCapability();
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
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
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
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-foreground">Completion Progress</span>
            <span className="text-3xl font-bold text-teal-600 dark:text-teal-400">
              {data.progress?.completion_pct || 0}%
            </span>
          </div>
          <div className="mb-4 h-3 overflow-hidden rounded-full bg-secondary">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${data.progress?.completion_pct || 0}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full bg-teal-500"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <StatusBadge status="complete" count={data.progress?.completed_items || 0} />
            <StatusBadge status="in_progress" count={data.progress?.in_progress || 0} />
            <StatusBadge status="blocked" count={data.progress?.blocked || 0} />
            <StatusBadge status="not_started" count={data.progress?.not_started || 0} />
            <StatusBadge status="not_applicable" count={data.progress?.not_applicable || 0} />
          </div>
        </motion.div>

        {/* Checklist items */}
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Checklist Items
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({data.checklist_items?.length || 0})
          </span>
        </h2>

        <div className="space-y-3">
          {data.checklist_items?.length > 0 ? (
            data.checklist_items.map((item: any, i: number) => {
              const cfg = statusConfig[item.status] || statusConfig.not_started;
              const StatusIcon = cfg.icon;
              const isUpdating = updating === item.id;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn('glass rounded-xl p-5 transition-all', item.status === 'complete' ? 'opacity-80' : '')}
                >
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => {
                        const nextStatus = item.status === 'complete' ? 'not_started' : 'complete';
                        updateItemStatus(item.id, nextStatus);
                      }}
                      disabled={isUpdating}
                      className="mt-0.5 shrink-0"
                    >
                      {isUpdating ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : (
                        <StatusIcon className={cn('h-5 w-5', cfg.color, 'hover:scale-110 transition-transform')} />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className={cn(
                            'font-medium text-foreground',
                            item.status === 'complete' ? 'line-through text-muted-foreground' : ''
                          )}>
                            {item.title}
                          </p>
                          {item.description && (
                            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                          )}
                        </div>
                        <select
                          value={item.status}
                          onChange={(e) => updateItemStatus(item.id, e.target.value)}
                          className={cn(
                            'shrink-0 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring',
                            item.status === 'complete' && 'border-emerald-200 dark:border-emerald-800'
                          )}
                        >
                          {statusOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {item.owner && (
                          <span className="flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1">
                            <User className="h-3 w-3" />
                            {item.owner}
                          </span>
                        )}
                        {item.due_date && (
                          <span className="flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(item.due_date).toLocaleDateString()}
                          </span>
                        )}
                        <span className={cn('rounded-md px-2 py-1', cfg.bgColor, cfg.color)}>
                          {cfg.label}
                        </span>
                        {item.evidence_url && (
                          <a
                            href={item.evidence_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 hover:bg-secondary/80 transition-colors"
                          >
                            <Paperclip className="h-3 w-3" />
                            Evidence
                          </a>
                        )}
                        {!item.evidence_url && (
                          <span className="flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-muted-foreground/60">
                            <Paperclip className="h-3 w-3" />
                            No evidence
                          </span>
                        )}
                      </div>

                      {item.notes && (
                        <div className="mt-3 flex items-start gap-2 rounded-lg bg-secondary/50 p-3">
                          <FileText className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">{item.notes}</p>
                        </div>
                      )}

                      <p className="mt-2 text-xs text-muted-foreground">
                        Updated {new Date(item.updated_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <h3 className="text-lg font-medium text-foreground">No checklist items</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                This sub-capability doesn&apos;t have any checklist items yet.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status, count }: { status: string; count: number }) {
  const cfg = statusConfig[status] || statusConfig.not_started;
  const Icon = cfg.icon;

  return (
    <div className={cn('flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium', cfg.bgColor, cfg.color)}>
      <Icon className="h-3 w-3" />
      {cfg.label} ({count})
    </div>
  );
}

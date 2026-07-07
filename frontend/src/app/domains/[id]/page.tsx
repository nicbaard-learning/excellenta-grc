'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Shield, Loader2, CheckCircle2, ChevronRight,
  ListChecks
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { capabilities } from '@/lib/api';
import { Navbar } from '@/components/navbar';

export default function DomainDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (params.id) {
      fetchDomain();
    }
  }, [params.id, user, authLoading]);

  const fetchDomain = async () => {
    try {
      const result = await capabilities.getDomain(params.id as string);
      setData(result);
    } catch (err) {
      console.error('Failed to load domain:', err);
    } finally {
      setLoading(false);
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
        {/* Back + Header */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => router.push('/dashboard')}
            className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm"
              style={{ backgroundColor: `${data.accent_color}15`, color: data.accent_color }}
            >
              <Shield className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{data.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{data.description}</p>
            </div>
          </div>
        </motion.div>

        {/* Domain progress */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 glass rounded-2xl p-6"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Domain Progress</span>
            <span className="text-2xl font-bold" style={{ color: data.accent_color }}>
              {data.progress?.completion_pct || 0}%
            </span>
          </div>
          <div className="mb-4 h-3 overflow-hidden rounded-full bg-secondary">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${data.progress?.completion_pct || 0}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ backgroundColor: data.accent_color }}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Completed Items" value={`${data.progress?.completed_items || 0}/${data.progress?.total_items || 0}`} />
            <Metric label="In Progress" value={data.progress?.in_progress || 0} />
            <Metric label="Blocked" value={data.progress?.blocked || 0} />
            <Metric label="Not Applicable" value={data.progress?.not_applicable || 0} />
          </div>
        </motion.div>

        {/* L1 Capabilities */}
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          L1 Capabilities
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({data.capabilities?.length || 0})
          </span>
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {data.capabilities?.map((cap: any, i: number) => (
            <motion.button
              key={cap.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => router.push(`/capabilities/${cap.id}`)}
              className="group glass rounded-xl p-5 text-left card-lift"
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{cap.name}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{cap.description}</p>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-semibold text-foreground">{cap.progress?.completion_pct || 0}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${cap.progress?.completion_pct || 0}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: data.accent_color }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ListChecks className="h-3 w-3" />
                  {cap.progress?.completed_items || 0}/{cap.progress?.total_items || 0} items
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {cap.completed_sub_capabilities || 0}/{cap.sub_capability_count || 0} L2s
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

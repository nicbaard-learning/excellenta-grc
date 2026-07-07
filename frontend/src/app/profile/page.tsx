'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Shield, Mail, Moon, Sun, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { auth } from '@/lib/api';
import { Navbar } from '@/components/navbar';

export default function ProfilePage() {
  const { user, loading: authLoading, updateUser } = useAuth();
  let themeContext;
  try {
    themeContext = useTheme();
  } catch {
    themeContext = null;
  }
  const isDark = themeContext?.isDark ?? false;
  const toggle = themeContext?.toggle ?? (() => {});
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    setFullName(user.full_name);
  }, [user, authLoading, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await auth.updateProfile({ full_name: fullName });
      updateUser({ full_name: fullName });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to update:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || authLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Profile Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your account settings and preferences</p>
        </motion.div>

        <div className="mt-8 space-y-6">
          {/* Profile info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-6"
          >
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">{user.full_name}</h2>
                <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Full Name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
                <div className="flex items-center gap-2 rounded-lg border border-input bg-secondary px-4 py-2.5 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {user.email}
                  <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </span>
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : saved ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Saved!
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </motion.div>

          {/* Theme preference */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-6"
          >
            <h2 className="mb-4 text-lg font-semibold text-foreground">Appearance</h2>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                {isDark ? <Moon className="h-5 w-5 text-foreground" /> : <Sun className="h-5 w-5 text-foreground" />}
                <div>
                  <p className="text-sm font-medium text-foreground">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">{isDark ? 'Dark theme active' : 'Light theme active'}</p>
                </div>
              </div>
              <button
                onClick={toggle}
                className={`
                  relative h-6 w-11 rounded-full transition-colors
                  ${isDark ? 'bg-primary' : 'bg-input'}
                `}
              >
                <span
                  className={`
                    absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform
                    ${isDark ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>
          </motion.div>

          {/* Organization info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-2xl p-6"
          >
            <h2 className="mb-4 text-lg font-semibold text-foreground">Organization</h2>
            <div className="flex items-center gap-3 rounded-lg border border-border p-4">
              <Shield className="h-8 w-8 text-primary/60" />
              <div>
                <p className="text-sm font-medium text-foreground">Organization ID</p>
                <p className="text-xs font-mono text-muted-foreground">{user.organization_id}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

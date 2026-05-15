'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface JournalItem {
  journalName: string;
  url: string;
  type: string;
}

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [name, setName] = useState('');
  const [journals, setJournals] = useState<JournalItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/');
      return;
    }
    if (session?.user) {
      if (session.user.onboardingComplete) {
        router.push('/');
        return;
      }
      setName(session.user.name ?? '');
    }
  }, [session, status, router]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/journals');
        const data = await res.json();
        setJournals(data || []);
      } catch (e) {
        // ignore
      }
    };
    load();
  }, []);

  const toggle = (name: string) => {
    setSelected(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const move = (index: number, dir: -1 | 1) => {
    setSelected(prev => {
      const arr = [...prev];
      const j = arr[index];
      if (!j) return arr;
      const ni = index + dir;
      if (ni < 0 || ni >= arr.length) return arr;
      arr[index] = arr[ni];
      arr[ni] = j;
      return arr;
    });
  };

  const save = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, selectedJournals: selected }),
      });
      if (!res.ok) throw new Error('Save failed');
      window.location.assign('/');
    } catch (e: any) {
      setError(e?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center py-12">
      <div className="w-full max-w-3xl bg-white/95 dark:bg-gray-900/95 p-8 rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold mb-4">Welcome — set your profile</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Display name</label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Choose journals</h2>
            <p className="text-sm text-gray-500 mb-2">Select and order journals you want to see on your home screen.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {journals.map((j: JournalItem) => (
                <label key={j.journalName} className="flex items-center gap-2 p-2 border rounded">
                  <input type="checkbox" checked={selected.includes(j.journalName)} onChange={() => toggle(j.journalName)} />
                  <span className="text-sm">{j.journalName}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Order selected journals</h3>
            {selected.length === 0 ? (
              <p className="text-sm text-gray-500">No journals selected yet.</p>
            ) : (
              <ul className="space-y-2">
                {selected.map((name, idx) => (
                  <li key={name} className="flex items-center justify-between p-2 border rounded">
                    <span>{name}</span>
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => move(idx, -1)} disabled={idx===0}>Up</Button>
                      <Button size="sm" onClick={() => move(idx, 1)} disabled={idx===selected.length-1}>Down</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <div className="text-red-500">{error}</div>}

          <div className="flex justify-end">
            <Button onClick={save} disabled={loading}>
              Save and continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { invokeFunction } from '@/lib/edgeFunctions';

/**
 * Public newsletter view. Tries the public-newsletter-html function first
 * (works for anyone, only serves status=sent newsletters). If that 404s and
 * the viewer is signed in with full access, falls back to preview-newsletter
 * so admins can preview drafts before sending.
 */
export default function NewsletterView() {
  const { weekEndingDate } = useParams<{ weekEndingDate: string }>();
  const { session, isFullAccess, loading: authLoading } = useAuth();
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!weekEndingDate || authLoading) return;
    let cancelled = false;

    async function load() {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

      try {
        const res = await fetch(
          `${supabaseUrl}/functions/v1/public-newsletter-html?week_ending_date=${weekEndingDate}`,
        );
        if (res.ok) {
          const text = await res.text();
          if (!cancelled) setHtml(text);
          return;
        }
      } catch {
        // fall through to admin preview
      }

      if (session && isFullAccess) {
        try {
          const text = await invokeFunction<string>('preview-newsletter', {
            week_ending_date: weekEndingDate,
          });
          if (!cancelled) setHtml(text);
          return;
        } catch {
          // fall through to error
        }
      }

      if (!cancelled) setError('Newsletter not available.');
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [weekEndingDate, session, isFullAccess, authLoading]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!html) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return <iframe title="Newsletter" srcDoc={html} className="h-screen w-full border-0" />;
}

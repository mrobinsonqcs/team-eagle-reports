import type { NewsletterStatus } from '@/integrations/supabase/types';

export interface LeaderboardEntry {
  name: string;
  subtitle?: string;
  primaryValue: number;
  secondaryValue?: number;
}

export interface NewsletterDraftData {
  divisionTotals: {
    totalUnits: number;
    netInstalledProtections: number;
    appointmentsSet: number;
    demosRan: number;
    recruitsInTraining: number;
    qualifiedRecruits: number;
  };
  officesSubmitted: number;
  officesTotal: number;
  topTeamSales: LeaderboardEntry[];
  topPersonalSales: LeaderboardEntry[];
  topMarketing: LeaderboardEntry[];
  topRookieSales: LeaderboardEntry[];
}

export const NEWSLETTER_STATUS_LABELS: Record<NewsletterStatus, string> = {
  draft: 'Draft',
  ready: 'Ready',
  sent: 'Sent',
  skipped: 'Skipped',
};

export const NEWSLETTER_STATUS_BADGE_VARIANT: Record<
  NewsletterStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  draft: 'outline',
  ready: 'secondary',
  sent: 'default',
  skipped: 'destructive',
};

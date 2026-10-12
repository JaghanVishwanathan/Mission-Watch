import { PlannedFeature } from './placeholder';

export const PLANNED: Record<
  'globe' | 'intelligence' | 'watchlist' | 'notifications',
  PlannedFeature
> = {
  globe: {
    eyebrow: 'Geospatial exploration',
    title: 'Mission Globe',
    summary: 'An interactive 3D globe for exploring launch sites, destinations and mission paths.',
    phase: 'Phase 3',
    requirement: 'FR-04, FR-05',
    icon: 'globe',
    capabilities: [
      'Rotate and zoom a CesiumJS globe, loaded only when you open this page',
      'Launch-site markers that open mission details',
      'Filter the missions shown on the globe',
      'Trajectories from real data where it exists, and clearly labelled illustrative paths where it does not',
      'Mission Story Mode, with a milestone timeline kept in sync with the map',
    ],
  },
  intelligence: {
    eyebrow: 'Evidence-based analytics',
    title: 'Launch Intelligence',
    summary:
      'Postponement analysis, provider comparisons, data quality indicators and model evaluation.',
    phase: 'Phases 6–7',
    requirement: 'FR-10, FR-11, FR-12',
    icon: 'spark',
    capabilities: [
      'Postponement trends derived from stored schedule snapshots',
      'Data quality and coverage indicators',
      'Model evaluation on chronologically later data, compared against a simple baseline',
      'SHAP explanations that describe what the model does, not what caused a delay',
      'Delay-risk estimates, shown only after the model has passed validation',
    ],
  },
  watchlist: {
    eyebrow: 'Your missions',
    title: 'Watchlist',
    summary: 'Follow missions you care about and keep personal mission collections.',
    phase: 'Phase 7',
    requirement: 'FR-08, FR-09',
    icon: 'star',
    capabilities: [
      'Save launches to a personal watchlist',
      'Create mission collections',
      'Remove your saved data at any time',
      'Requires sign-in, which arrives with the backend',
    ],
  },
  notifications: {
    eyebrow: 'Stay informed',
    title: 'Notifications',
    summary: 'Get alerts when the missions you follow change.',
    phase: 'Phase 7',
    requirement: 'FR-09',
    icon: 'bell',
    capabilities: [
      'Alerts for schedule and status changes',
      'Upcoming launch reminders',
      'Deduplicated notifications that cite their source',
      'In-app first, with email to follow later',
    ],
  },
};

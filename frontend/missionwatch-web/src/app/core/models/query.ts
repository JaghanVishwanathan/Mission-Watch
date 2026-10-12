import { LaunchStatus } from './launch';

export type LaunchSortField = 'time' | 'name' | 'provider';
export type SortDirection = 'asc' | 'desc';

export interface LaunchQuery {
  text?: string;
  statuses?: LaunchStatus[];
  providerIds?: string[];
  /** Inclusive ISO date (yyyy-mm-dd) bounds, interpreted in UTC. */
  from?: string;
  to?: string;
  sort?: LaunchSortField;
  direction?: SortDirection;
}

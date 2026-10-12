import { Routes } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { Shell } from './layout/shell';
import { PLANNED } from './features/placeholder/planned-features';

const placeholder = () => import('./features/placeholder/placeholder').then((m) => m.Placeholder);

/** Every feature is lazy-loaded so each page ships as its own chunk (NFR-01). */
export const routes: Routes = [
  {
    path: '',
    component: Shell,
    children: [
      {
        path: '',
        title: 'Dashboard',
        loadComponent: () => import('./features/home/home').then((m) => m.Home),
      },
      {
        path: 'launches',
        title: 'Launch Explorer',
        loadComponent: () => import('./features/explorer/explorer').then((m) => m.Explorer),
      },
      {
        path: 'launches/:id',
        title: 'Mission details',
        loadComponent: () =>
          import('./features/mission-detail/mission-detail').then((m) => m.MissionDetail),
      },
      {
        path: 'analytics',
        title: 'Analytics',
        // ECharts (tree-shaken) is fetched only when this route is visited.
        providers: [
          provideEchartsCore({
            echarts: () => import('./features/analytics/echarts-setup').then((m) => m.echarts),
          }),
        ],
        loadComponent: () => import('./features/analytics/analytics').then((m) => m.Analytics),
      },
      {
        path: 'live',
        title: 'Live Mission Control',
        loadComponent: () => import('./features/live/live').then((m) => m.Live),
      },
      {
        path: 'globe',
        title: 'Mission Globe',
        loadComponent: placeholder,
        data: { feature: PLANNED.globe },
      },
      {
        path: 'intelligence',
        title: 'Launch Intelligence',
        loadComponent: placeholder,
        data: { feature: PLANNED.intelligence },
      },
      {
        path: 'watchlist',
        title: 'Watchlist',
        loadComponent: placeholder,
        data: { feature: PLANNED.watchlist },
      },
      {
        path: 'notifications',
        title: 'Notifications',
        loadComponent: placeholder,
        data: { feature: PLANNED.notifications },
      },
      {
        path: 'about/data-sources',
        title: 'Data sources',
        loadComponent: () =>
          import('./features/data-sources/data-sources').then((m) => m.DataSources),
      },
      {
        path: '**',
        title: 'Not found',
        loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
      },
    ],
  },
];

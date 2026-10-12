import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icon } from '../../shared/ui/icon';
import { PageHeader } from '../../shared/ui/page-header';

interface Source {
  name: string;
  url: string;
  use: string;
  refresh: string;
  status: 'Demo data in use' | 'Planned' | 'Optional';
  limitations: string;
}

@Component({
  selector: 'mw-data-sources',
  imports: [Icon, PageHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './data-sources.html',
  styleUrl: './data-sources.scss',
})
export class DataSources {
  protected readonly sources: Source[] = [
    {
      name: 'Launch Library 2 (The Space Devs)',
      url: 'https://ll.thespacedevs.com/docs/',
      use: 'Launch schedules, providers, rockets, payloads, launch sites and outcomes',
      refresh: 'Planned: upcoming launches every few minutes, historical records daily',
      status: 'Planned',
      limitations:
        'Community-maintained and rate limited. The current schedule overwrites older values, so MissionWatch stores its own snapshots.',
    },
    {
      name: 'NASA Image and Video Library',
      url: 'https://images.nasa.gov/',
      use: 'Mission photography and video',
      refresh: 'On demand, cached',
      status: 'Planned',
      limitations:
        'Coverage is strongest for NASA missions. Attribution and source links are kept with every item.',
    },
    {
      name: 'NASA Open APIs',
      url: 'https://api.nasa.gov/',
      use: 'Supplementary astronomy content such as APOD',
      refresh: 'Daily',
      status: 'Optional',
      limitations: 'Requires an API key, which stays on the server.',
    },
    {
      name: 'JPL Solar System Dynamics APIs',
      url: 'https://ssd-api.jpl.nasa.gov/',
      use: 'Orbital context for small-body missions',
      refresh: 'On demand',
      status: 'Optional',
      limitations: 'Relevant only to a subset of missions.',
    },
    {
      name: 'Open-Meteo',
      url: 'https://open-meteo.com/',
      use: 'Launch-site weather for exploratory analysis and viewing conditions',
      refresh: 'Hourly',
      status: 'Optional',
      limitations: 'Weather is never presented as proof that it caused a postponement.',
    },
    {
      name: 'Spaceflight News API',
      url: 'https://api.spaceflightnewsapi.net/',
      use: 'Related news articles',
      refresh: 'Hourly',
      status: 'Optional',
      limitations: 'Each article links to and credits its original publisher.',
    },
  ];
}

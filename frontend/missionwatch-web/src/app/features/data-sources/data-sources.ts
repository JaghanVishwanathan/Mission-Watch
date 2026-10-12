import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CACHE_POLICY, LL2_LIST_LIMIT } from '../../core/config';
import { Icon } from '../../shared/ui/icon';
import { PageHeader } from '../../shared/ui/page-header';

interface Source {
  name: string;
  url: string;
  use: string;
  refresh: string;
  status: 'Live' | 'Snapshot' | 'Planned' | 'Optional';
  license: string;
  limitations: string;
}

const minutes = (ms: number) => Math.round(ms / 60_000);

@Component({
  selector: 'mw-data-sources',
  imports: [Icon, PageHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './data-sources.html',
  styleUrl: './data-sources.scss',
})
export class DataSources {
  protected readonly listLimit = LL2_LIST_LIMIT;
  protected readonly listTtl = minutes(CACHE_POLICY.lists.ttlMs);
  protected readonly detailTtl = minutes(CACHE_POLICY.detail.ttlMs);

  protected readonly sources: Source[] = [
    {
      name: 'Launch Library 2 (The Space Devs)',
      url: 'https://thespacedevs.com/llapi',
      use: 'Upcoming and recent launches, providers, rockets, pads, mission timelines, launch updates and webcast links',
      refresh: `Lists cached ${minutes(CACHE_POLICY.lists.ttlMs)} min, mission details ${minutes(CACHE_POLICY.detail.ttlMs)} min, in your browser`,
      status: 'Live',
      license:
        'Free tier; attribution to The Space Devs. Images carry their own credit and licence.',
      limitations:
        'About 15 anonymous requests per hour per visitor. The current schedule overwrites older values, so it cannot provide schedule history.',
    },
    {
      name: 'GCAT, General Catalog of Artificial Space Objects (J. C. McDowell)',
      url: 'https://planet4589.org/space/gcat',
      use: 'Every orbital launch attempt since 1957, for the Analytics page and dashboard statistics',
      refresh: 'Snapshot rebuilt on each deployment and weekly',
      status: 'Snapshot',
      license: 'CC BY 4.0',
      limitations:
        'Providers are recorded as launch agencies, which differ from Launch Library 2 names. Success means propulsive success into orbit.',
    },
    {
      name: 'NASA Image and Video Library',
      url: 'https://images.nasa.gov',
      use: 'Related imagery on mission pages',
      refresh: 'Searches cached for 24 hours',
      status: 'Live',
      license: 'Generally public domain; credits are shown with each image',
      limitations:
        'Matched by keyword, so images may show related vehicles or earlier missions. Coverage is strongest for NASA missions.',
    },
    {
      name: 'NASA Open APIs',
      url: 'https://api.nasa.gov/',
      use: 'Supplementary astronomy content such as APOD',
      refresh: 'Daily',
      status: 'Optional',
      license: 'Varies by dataset',
      limitations: 'Requires an API key, which must stay on the server (Phase 4).',
    },
    {
      name: 'YouTube (Everyday Astronaut, NASASpaceflight)',
      url: 'https://www.youtube.com',
      use: 'Embedded livestreams and Live Chat on the Live Mission Control page',
      refresh: 'Real time, through the official YouTube player',
      status: 'Optional',
      license: 'Broadcasts belong to their creators; shown with attribution via official embeds',
      limitations:
        'Loads only after you allow third-party content. Live status is what the player reports. Embedded chat is not available on mobile browsers.',
    },
    {
      name: 'X (SpaceX)',
      url: 'https://x.com/SpaceX',
      use: 'The official SpaceX broadcast post and discussion on the Live Mission Control page',
      refresh: 'Real time, through X embeds',
      status: 'Optional',
      license: 'Posts belong to their authors; shown via official X embeds',
      limitations:
        'Loads only after you allow third-party content. X does not report broadcast status to embeds, and some broadcasts can only be watched on X.',
    },
    {
      name: 'Open-Meteo',
      url: 'https://open-meteo.com/',
      use: 'Launch-site weather for exploratory analysis and viewing conditions',
      refresh: 'Hourly',
      status: 'Planned',
      license: 'CC BY 4.0',
      limitations: 'Weather is never presented as proof that it caused a postponement.',
    },
    {
      name: 'Spaceflight News API',
      url: 'https://api.spaceflightnewsapi.net/',
      use: 'Related news articles',
      refresh: 'Hourly',
      status: 'Planned',
      license: 'Articles belong to their publishers',
      limitations: 'Each article will link to and credit its original publisher.',
    },
  ];
}

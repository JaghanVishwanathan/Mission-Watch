import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { makeLaunch } from '../../testing/fixtures';
import { mapNasaItems, mediaQueries, NasaMediaService } from './nasa-media.service';

const item = (id: string, mediaType = 'image') => ({
  links: [
    {
      href: `http://images-assets.nasa.gov/image/${id}/thumb.jpg`,
      rel: 'preview',
      render: 'image',
    },
  ],
  data: [
    {
      nasa_id: id,
      title: `Title ${id}`,
      date_created: '2022-04-21T00:00:00Z',
      center: 'KSC',
      photographer: 'Kim Shiflett',
      media_type: mediaType,
    },
  ],
});

describe('NASA media', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('builds keyword candidates from specific to general', () => {
    const launch = makeLaunch({
      missionName: 'Starlink Group 15-25',
      rocket: { id: 'r', name: 'Falcon 9 Block 5', family: 'Falcon', providerId: 'p' },
    });
    expect(mediaQueries(launch)).toEqual(['Starlink Group 15-25', 'Starlink', 'Falcon']);
  });

  it('maps search results, forcing https and skipping non-images', () => {
    const items = mapNasaItems({ collection: { items: [item('a'), item('b', 'video')] } });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'a',
      thumbnailUrl: 'https://images-assets.nasa.gov/image/a/thumb.jpg',
      detailsUrl: 'https://images.nasa.gov/details/a',
      credit: 'Kim Shiflett / NASA KSC',
    });
  });

  it('tries the next keyword when one finds nothing, and reports which matched', async () => {
    const service = TestBed.inject(NasaMediaService);
    const http = TestBed.inject(HttpTestingController);
    const launch = makeLaunch({
      missionName: 'Crew-13',
      rocket: { id: 'r', name: 'Falcon 9 Block 5', family: 'Falcon', providerId: 'p' },
    });
    const result = firstValueFrom(service.related(launch));

    http.expectOne((r) => r.params.get('q') === 'Crew-13').flush({ collection: { items: [] } });
    await Promise.resolve();
    http
      .expectOne((r) => r.params.get('q') === 'Crew')
      .flush({ collection: { items: [item('x')] } });

    const { data } = await result;
    expect(data.matchedQuery).toBe('Crew');
    expect(data.items.map((i) => i.id)).toEqual(['x']);
    http.verify();
  });
});

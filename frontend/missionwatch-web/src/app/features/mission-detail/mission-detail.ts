import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { describeError, LAUNCH_DATA } from '../../core/data';
import { NasaMediaService } from '../../core/data/media/nasa-media.service';
import { Launch, UPCOMING_STATUSES } from '../../core/models';
import { formatLaunchTime, precisionLabel } from '../../core/util/launch-time';
import { formatShift, scheduleChanges } from '../../core/util/schedule';
import { formatOffset } from '../../core/util/time';
import { Countdown } from '../../shared/ui/countdown';
import { EmptyState } from '../../shared/ui/empty-state';
import { ErrorState } from '../../shared/ui/error-state';
import { Field } from '../../shared/ui/field';
import { FreshnessIndicator } from '../../shared/ui/freshness-indicator';
import { Icon } from '../../shared/ui/icon';
import { Skeleton } from '../../shared/ui/skeleton';
import { StatusBadge } from '../../shared/ui/status-badge';

const CATEGORY_LABELS: Record<string, string> = {
  communications: 'Communications',
  'earth-observation': 'Earth observation',
  navigation: 'Navigation',
  science: 'Science',
  'human-spaceflight': 'Human spaceflight',
  resupply: 'Resupply',
  technology: 'Technology demonstration',
  government: 'Government / national security',
};

@Component({
  selector: 'mw-mission-detail',
  imports: [
    DatePipe,
    RouterLink,
    Countdown,
    EmptyState,
    ErrorState,
    Field,
    FreshnessIndicator,
    Icon,
    Skeleton,
    StatusBadge,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mission-detail.html',
  styleUrl: './mission-detail.scss',
})
export class MissionDetail {
  private readonly data = inject(LAUNCH_DATA);
  private readonly media = inject(NasaMediaService);

  /** Bound from the `:id` route parameter. */
  readonly id = input.required<string>();

  protected readonly launch = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.data.getLaunch(params),
  });

  protected readonly meta = computed(() =>
    this.launch.hasValue() ? this.launch.value().meta : undefined,
  );
  protected readonly l = computed<Launch | null | undefined>(() =>
    this.launch.hasValue() ? this.launch.value().data : undefined,
  );

  /** Re-queried only when the launch itself changes, not when its summary is upgraded. */
  private readonly mediaTarget = computed(() => this.l() ?? undefined, {
    equal: (a, b) => a?.id === b?.id,
  });
  protected readonly related = rxResource({
    params: () => this.mediaTarget(),
    stream: ({ params }) => this.media.related(params),
  });

  protected readonly heroImageFailed = signal(false);
  protected readonly isUpcoming = computed(() => {
    const l = this.l();
    return !!l && UPCOMING_STATUSES.includes(l.status);
  });
  protected readonly when = computed(() => {
    const l = this.l();
    return l ? formatLaunchTime(l.scheduledTime, l.timePrecision) : '';
  });
  protected readonly precision = computed(() => precisionLabel(this.l()?.timePrecision));
  protected readonly changes = computed(() => scheduleChanges(this.l()?.scheduleHistory));
  protected readonly anyEstimated = computed(
    () => this.l()?.milestones?.some((m) => m.estimated) ?? false,
  );
  protected readonly category = computed(() => {
    const l = this.l();
    return l?.missionType ?? (l?.category ? CATEGORY_LABELS[l.category] : undefined);
  });
  protected readonly coordinates = computed(() => {
    const site = this.l()?.site;
    if (site?.latitude === undefined || site.longitude === undefined) return undefined;
    const lat = `${Math.abs(site.latitude).toFixed(3)}° ${site.latitude >= 0 ? 'N' : 'S'}`;
    const lon = `${Math.abs(site.longitude).toFixed(3)}° ${site.longitude >= 0 ? 'E' : 'W'}`;
    return `${lat}, ${lon}`;
  });
  protected readonly window = computed(() => {
    const l = this.l();
    if (!l?.windowStart || !l.windowEnd || l.timePrecision) return undefined;
    const t = (iso: string) =>
      new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return l.windowStart === l.windowEnd
      ? `Instantaneous at ${t(l.windowStart)}`
      : `${t(l.windowStart)} – ${t(l.windowEnd)}`;
  });
  protected readonly officialLinks = computed(
    () => this.l()?.links?.filter((x) => x.kind !== 'webcast') ?? [],
  );
  protected readonly webcasts = computed(
    () => this.l()?.links?.filter((x) => x.kind === 'webcast') ?? [],
  );

  protected readonly formatOffset = formatOffset;
  protected readonly formatShift = formatShift;
  protected readonly describeError = describeError;

  /** Drops a gallery tile whose image fails to load instead of leaving an empty box. */
  protected hideBrokenImage(event: Event): void {
    const item = (event.target as HTMLElement).closest('li');
    if (item) item.hidden = true;
  }

  protected yesNo(value: boolean | undefined): string | undefined {
    return value === undefined ? undefined : value ? 'Yes' : 'No';
  }

  protected withUnit(value: number | undefined, unit: string): string | undefined {
    return value === undefined ? undefined : `${value.toLocaleString()} ${unit}`;
  }
}

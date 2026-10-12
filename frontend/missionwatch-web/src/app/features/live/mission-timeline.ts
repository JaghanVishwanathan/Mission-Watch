import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { formatOffset } from '../../core/util/time';
import { Icon } from '../../shared/ui/icon';
import { TimelineEvent, TimelineEventStatus } from './live.models';
import { EVENT_STATUS_LABEL } from './live-util';

const STATUS_ICON: Record<TimelineEventStatus, string> = {
  planned: 'clock',
  imminent: 'spark',
  completed: 'check-circle',
  delayed: 'pause',
  cancelled: 'x-circle',
  unknown: 'help',
};

/** Mission events: planned vs confirmed are distinguished by marker, icon and label (AC-05). */
@Component({
  selector: 'mw-mission-timeline',
  imports: [DatePipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (events().length) {
      <ol class="events">
        @for (e of events(); track e.id) {
          <li [class]="'ev ev--' + e.status">
            <span class="marker" aria-hidden="true"></span>
            <span class="offset mono">{{
              e.offsetSeconds !== undefined ? formatOffset(e.offsetSeconds) : ''
            }}</span>
            <div class="body">
              <p class="title">{{ e.title }}</p>
              @if (e.description) {
                <p class="desc">{{ e.description }}</p>
              }
              <p class="times">
                @if (e.actualAt) {
                  Confirmed
                  <time [attr.datetime]="e.actualAt">{{
                    e.actualAt | date: 'MMM d, HH:mm:ss'
                  }}</time>
                } @else if (e.plannedAt) {
                  Planned
                  <time [attr.datetime]="e.plannedAt">{{
                    e.plannedAt | date: 'MMM d, HH:mm:ss'
                  }}</time>
                } @else {
                  Time not yet known
                }
              </p>
            </div>
            <span class="status">
              <mw-icon [name]="icon[e.status]" [size]="13" />
              {{ label[e.status] }}
            </span>
          </li>
        }
      </ol>
    } @else {
      <p class="empty">No mission events are available yet.</p>
    }
  `,
  styles: `
    .events {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
    }
    .ev {
      position: relative;
      display: grid;
      grid-template-columns: 14px 84px 1fr auto;
      align-items: start;
      gap: var(--space-3);
      padding: var(--space-3) 0;
      border-bottom: 1px solid var(--border);
    }
    .ev:last-child {
      border-bottom: 0;
    }
    .marker {
      margin-top: 5px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 1.5px solid var(--text-muted);
    }
    .ev--completed .marker {
      background: var(--status-good);
      border-color: var(--status-good);
    }
    .ev--imminent .marker {
      border-color: var(--signal);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--signal) 25%, transparent);
    }
    .ev--delayed .marker,
    .ev--cancelled .marker {
      border-style: dashed;
      border-color: var(--status-warning);
    }
    .offset {
      font-size: var(--fs-sm);
      color: var(--text-secondary);
    }
    .title {
      font-weight: 600;
    }
    .ev--cancelled .title {
      text-decoration: line-through;
    }
    .desc,
    .times {
      font-size: var(--fs-xs);
      color: var(--text-muted);
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: var(--tracking-wide);
      text-transform: uppercase;
      white-space: nowrap;
      color: var(--status-neutral);
    }
    .ev--completed .status {
      color: var(--status-good);
    }
    .ev--imminent .status {
      color: var(--signal);
    }
    .ev--delayed .status,
    .ev--cancelled .status {
      color: var(--status-warning);
    }
    .empty {
      color: var(--text-muted);
      font-size: var(--fs-sm);
    }
    @media (max-width: 560px) {
      .ev {
        grid-template-columns: 14px 1fr auto;
      }
      .offset {
        grid-column: 2;
      }
      .body {
        grid-column: 2;
      }
      .status {
        grid-column: 3;
        grid-row: 1;
      }
    }
  `,
})
export class MissionTimeline {
  readonly events = input.required<TimelineEvent[]>();
  protected readonly formatOffset = formatOffset;
  protected readonly label = EVENT_STATUS_LABEL;
  protected readonly icon = STATUS_ICON;
}

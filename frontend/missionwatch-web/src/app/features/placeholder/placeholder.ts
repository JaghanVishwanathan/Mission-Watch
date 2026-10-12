import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../shared/ui/icon';
import { PageHeader } from '../../shared/ui/page-header';

export interface PlannedFeature {
  title: string;
  eyebrow: string;
  summary: string;
  phase: string;
  icon: string;
  capabilities: string[];
  requirement: string;
}

/** Shared page for primary routes whose feature lands in a later phase (keeps navigation complete). */
@Component({
  selector: 'mw-placeholder',
  imports: [RouterLink, Icon, PageHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let f = feature();
    <div class="page">
      <mw-page-header [eyebrow]="f.eyebrow" [title]="f.title" [subtitle]="f.summary" />

      <section class="panel planned" aria-labelledby="planned-title">
        <div class="icon"><mw-icon [name]="f.icon" [size]="32" /></div>
        <div class="text">
          <p class="phase">{{ f.phase }} · {{ f.requirement }}</p>
          <h2 id="planned-title">Coming in a later phase</h2>
          <p class="muted">This area is part of the MissionWatch roadmap. Planned capabilities:</p>
          <ul>
            @for (c of f.capabilities; track c) {
              <li>{{ c }}</li>
            }
          </ul>
          <div class="actions">
            <a routerLink="/launches" class="btn btn--primary"
              ><mw-icon name="compass" [size]="16" /> Explore launches</a
            >
            <a routerLink="/about/data-sources" class="btn">About the project</a>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: `
    .page {
      display: grid;
      gap: var(--space-6);
    }
    .planned {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: var(--space-5);
      padding: var(--space-6);
      border-style: dashed;
      border-color: var(--border-strong);
    }
    .icon {
      display: grid;
      place-items: center;
      width: 64px;
      height: 64px;
      border-radius: var(--radius);
      background: var(--accent-soft);
      color: var(--accent-strong);
    }
    .text {
      display: grid;
      gap: var(--space-3);
    }
    .phase {
      font-size: var(--fs-xs);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--accent-strong);
      font-weight: 650;
    }
    h2 {
      font-size: var(--fs-xl);
    }
    .muted {
      color: var(--text-secondary);
    }
    ul {
      margin: 0;
      padding-left: var(--space-5);
      color: var(--text-secondary);
      display: grid;
      gap: var(--space-1);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin-top: var(--space-2);
    }
    @media (max-width: 600px) {
      .planned {
        grid-template-columns: 1fr;
        padding: var(--space-5);
      }
    }
  `,
})
export class Placeholder {
  /** Supplied through route data. */
  readonly feature = input.required<PlannedFeature>();
}

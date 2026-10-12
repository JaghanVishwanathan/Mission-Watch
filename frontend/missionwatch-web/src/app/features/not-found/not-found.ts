import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyState } from '../../shared/ui/empty-state';

@Component({
  selector: 'mw-not-found',
  imports: [RouterLink, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <h1 class="visually-hidden">Page not found</h1>
      <mw-empty-state
        title="Lost in space"
        message="This page doesn't exist. It may have moved, or the link may be wrong."
        icon="orbit"
      >
        <a routerLink="/" class="btn btn--primary">Back to dashboard</a>
      </mw-empty-state>
    </div>
  `,
})
export class NotFound {}

import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ThemeService } from '../core/state/theme.service';
import { Icon } from '../shared/ui/icon';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  exact?: boolean;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'Explore',
    items: [
      { label: 'Dashboard', path: '/', icon: 'home', exact: true },
      { label: 'Launch Explorer', path: '/launches', icon: 'compass' },
      { label: 'Mission Globe', path: '/globe', icon: 'globe' },
    ],
  },
  {
    heading: 'Analyse',
    items: [
      { label: 'Analytics', path: '/analytics', icon: 'chart' },
      { label: 'Launch Intelligence', path: '/intelligence', icon: 'spark' },
    ],
  },
  {
    heading: 'You',
    items: [
      { label: 'Watchlist', path: '/watchlist', icon: 'star' },
      { label: 'Notifications', path: '/notifications', icon: 'bell' },
    ],
  },
  {
    heading: 'About',
    items: [{ label: 'Data sources', path: '/about/data-sources', icon: 'info' }],
  },
];

@Component({
  selector: 'mw-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'navOpen.set(false)' },
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  protected readonly theme = inject(ThemeService);
  protected readonly navGroups = NAV_GROUPS;
  protected readonly navOpen = signal(false);
  protected readonly year = new Date().getFullYear();

  constructor() {
    const sub = inject(Router)
      .events.pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.navOpen.set(false));
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }

  protected focusMain(event: Event): void {
    event.preventDefault();
    document.getElementById('main')?.focus();
  }
}

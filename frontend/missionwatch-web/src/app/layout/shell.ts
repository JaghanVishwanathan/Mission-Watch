import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ThemeService } from '../core/state/theme.service';
import { Icon } from '../shared/ui/icon';

interface NavItem {
  label: string;
  path: string;
  exact?: boolean;
}

/** Shown inline in the top bar on wide screens. */
export const PRIMARY_NAV: NavItem[] = [
  { label: 'Live', path: '/live' },
  { label: 'Launches', path: '/launches' },
  { label: 'Analytics', path: '/analytics' },
  { label: 'Globe', path: '/globe' },
  { label: 'Intelligence', path: '/intelligence' },
];

/** Everything, shown in the menu panel. */
export const MENU_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/', exact: true },
  ...PRIMARY_NAV,
  { label: 'Watchlist', path: '/watchlist' },
  { label: 'Notifications', path: '/notifications' },
  { label: 'Data sources', path: '/about/data-sources' },
];

@Component({
  selector: 'mw-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'menuOpen.set(false)',
    '(window:scroll)': 'onScroll()',
  },
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly document = inject(DOCUMENT);
  protected readonly theme = inject(ThemeService);
  protected readonly primaryNav = PRIMARY_NAV;
  protected readonly menuNav = MENU_NAV;
  protected readonly menuOpen = signal(false);
  /** The top bar is transparent over the dashboard hero until the page scrolls. */
  protected readonly scrolled = signal(false);
  protected readonly year = new Date().getFullYear();

  constructor() {
    const sub = inject(Router)
      .events.pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        this.menuOpen.set(false);
        this.onScroll();
      });
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }

  protected onScroll(): void {
    this.scrolled.set((this.document.defaultView?.scrollY ?? 0) > 24);
  }

  protected focusMain(event: Event): void {
    event.preventDefault();
    this.document.getElementById('main')?.focus();
  }
}

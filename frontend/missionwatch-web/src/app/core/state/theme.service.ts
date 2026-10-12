import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';

export type ThemePreference = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'mw-theme';

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly media = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: light)');
  private readonly systemTheme = signal<Theme>(this.media?.matches ? 'light' : 'dark');

  readonly preference = signal<ThemePreference>(readStoredPreference());
  readonly theme = computed<Theme>(() => {
    const pref = this.preference();
    return pref === 'system' ? this.systemTheme() : pref;
  });

  constructor() {
    this.media?.addEventListener?.('change', (e) =>
      this.systemTheme.set(e.matches ? 'light' : 'dark'),
    );

    effect(() => {
      const pref = this.preference();
      const root = this.document.documentElement;
      if (pref === 'system') root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', pref);
      try {
        if (pref === 'system') localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, pref);
      } catch {
        // Storage unavailable (private mode, blocked cookies): theme still applies for this session.
      }
    });
  }

  toggle(): void {
    this.preference.set(this.theme() === 'dark' ? 'light' : 'dark');
  }
}

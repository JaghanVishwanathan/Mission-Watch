import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('follows the system by default and leaves data-theme unset', async () => {
    const service = TestBed.inject(ThemeService);
    TestBed.tick();
    expect(service.preference()).toBe('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('toggles, applies and persists an explicit theme', () => {
    const service = TestBed.inject(ThemeService);
    const before = service.theme();
    service.toggle();
    TestBed.tick();
    const after = service.theme();
    expect(after).not.toBe(before);
    expect(document.documentElement.getAttribute('data-theme')).toBe(after);
    expect(localStorage.getItem('mw-theme')).toBe(after);
  });

  it('restores a stored preference', () => {
    localStorage.setItem('mw-theme', 'light');
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('light');
  });
});

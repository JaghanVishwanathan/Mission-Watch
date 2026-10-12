import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LaunchStatus } from '../../core/models';
import { ErrorState } from './error-state';
import { Field } from './field';
import { StatusBadge } from './status-badge';

@Component({
  imports: [StatusBadge],
  template: '<mw-status-badge [status]="status()" />',
})
class BadgeHost {
  readonly status = signal<LaunchStatus>('go');
}

@Component({
  imports: [Field],
  template: '<dl><div mw-field label="Payload" [value]="value()"></div></dl>',
})
class FieldHost {
  readonly value = signal<string | number | undefined>(undefined);
}

describe('StatusBadge', () => {
  it('shows a text label and an icon, not colour alone', async () => {
    const fixture = TestBed.createComponent(BadgeHost);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Go');
    expect(el.querySelector('mw-icon')).not.toBeNull();

    fixture.componentInstance.status.set('partial-failure');
    await fixture.whenStable();
    expect(el.textContent).toContain('Partial failure');
    expect(el.querySelector('.tone-serious')).not.toBeNull();
  });
});

describe('Field', () => {
  it('labels missing values as unavailable', async () => {
    const fixture = TestBed.createComponent(FieldHost);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('dt')?.textContent).toBe('Payload');
    expect(el.querySelector('.unavailable')?.textContent).toBe('Unavailable');

    fixture.componentInstance.value.set('Galileo FOC');
    await fixture.whenStable();
    expect(el.querySelector('.unavailable')).toBeNull();
    expect(el.querySelector('dd')?.textContent?.trim()).toBe('Galileo FOC');
  });

  it('treats zero as a real value', async () => {
    const fixture = TestBed.createComponent(FieldHost);
    fixture.componentInstance.value.set(0);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('dd')?.textContent?.trim()).toBe(
      '0',
    );
  });
});

describe('ErrorState', () => {
  it('announces the error and emits retry', async () => {
    const fixture = TestBed.createComponent(ErrorState);
    let retried = 0;
    fixture.componentInstance.retry.subscribe(() => retried++);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    el.querySelector('button')!.click();
    expect(retried).toBe(1);
  });
});

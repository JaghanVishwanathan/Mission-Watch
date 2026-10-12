import { TestBed } from '@angular/core/testing';
import { TimelineEvent } from './live.models';
import { MissionArc } from './mission-arc';

const T0 = Date.parse('2026-10-14T12:00:00Z');

function ev(id: string, offsetS: number, actualAt: string | null = null): TimelineEvent {
  return {
    id,
    missionId: 'm',
    title: id,
    plannedAt: new Date(T0 + offsetS * 1000).toISOString(),
    actualAt,
    status: actualAt ? 'completed' : 'planned',
    source: 'test',
    updatedAt: new Date(T0).toISOString(),
    offsetSeconds: offsetS,
  };
}

async function render(now: number, events: TimelineEvent[]) {
  const fixture = TestBed.createComponent(MissionArc);
  fixture.componentRef.setInput('events', events);
  fixture.componentRef.setInput('t0', new Date(T0).toISOString());
  fixture.componentRef.setInput('now', now);
  fixture.componentRef.setInput('missionName', 'Tranche 1');
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('MissionArc', () => {
  const events = [
    ev('liftoff', 0, new Date(T0).toISOString()),
    ev('meco', 150),
    ev('entry-burn', 400),
    ev('landing-burn', 480),
  ];

  it('marks passed, current and upcoming events as the clock advances', async () => {
    const el = await render(T0 + 450_000, events);
    const state = (id: string) =>
      [...el.querySelectorAll('g.m')].find((g) => g.textContent?.trim() === id)!.classList;

    expect(state('liftoff').contains('m--past')).toBe(true);
    expect(state('liftoff').contains('confirmed')).toBe(true);
    expect(state('meco').contains('m--past')).toBe(true);
    expect(state('meco').contains('confirmed')).toBe(false);
    expect(state('landing-burn').contains('m--current')).toBe(true);
    expect(el.querySelector('.clock')?.textContent).toContain('T+');
    expect(el.querySelector('.clock')?.textContent).toContain('00:07:30');
    expect(el.querySelector('.next')?.textContent).toContain('landing-burn');
  });

  it('counts down before liftoff with the first event current', async () => {
    const el = await render(T0 - 90_000, events);
    expect(el.querySelector('.clock')?.textContent).toContain('T-');
    expect(el.querySelector('.clock')?.textContent).toContain('00:01:30');
    expect(el.querySelector('g.m--current')?.textContent?.trim()).toBe('liftoff');
    expect(el.querySelectorAll('g.m--upcoming').length).toBe(3);
  });
});

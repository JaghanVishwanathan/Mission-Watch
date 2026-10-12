import { areaOf, initialOrder, makeMain, move } from './live-layout';

describe('live layout', () => {
  const ids = ['ea', 'nsf', 'spacex'];

  it('puts streams with a link first when nothing is saved', () => {
    expect(initialOrder(ids, new Set(['nsf', 'spacex']))).toEqual(['nsf', 'spacex', 'ea']);
  });

  it('keeps a saved order, dropping unknown IDs and appending new ones', () => {
    expect(initialOrder(ids, new Set(), ['spacex', 'old', 'ea', 'ea'])).toEqual([
      'spacex',
      'ea',
      'nsf',
    ]);
    expect(initialOrder(ids, new Set(), 'garbage' as unknown as string[])).toEqual(ids);
  });

  it('swaps a stream into the main position', () => {
    expect(makeMain(ids, 'spacex')).toEqual(['spacex', 'nsf', 'ea']);
    expect(makeMain(ids, 'ea')).toBe(ids);
  });

  it('moves streams one step and ignores moves off either end', () => {
    expect(move(ids, 'spacex', -1)).toEqual(['ea', 'spacex', 'nsf']);
    expect(move(ids, 'spacex', 1)).toBe(ids);
    expect(move(ids, 'ea', -1)).toBe(ids);
  });

  it('maps positions to grid areas', () => {
    expect(ids.map((id) => areaOf(ids, id))).toEqual(['main', 'side1', 'side2']);
    expect(areaOf([...ids, 'extra'], 'extra')).toBe('auto');
  });
});

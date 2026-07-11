import { describe, expect, it } from 'vitest';

import { allocateFefoBatches, selectFefoBatch } from './inventory-utils';

describe('selectFefoBatch', () => {
  it('selects the earliest expiring batch with available stock', () => {
    const batches = [
      { id: 'b1', currentQty: 5, expiryDate: new Date('2026-10-01') },
      { id: 'b2', currentQty: 7, expiryDate: new Date('2026-08-01') },
      { id: 'b3', currentQty: 3, expiryDate: new Date('2026-09-01') },
    ];

    const selected = selectFefoBatch(batches as Array<{ id: string; currentQty: number; expiryDate: Date | null }>, 4);

    expect(selected?.id).toBe('b2');
  });

  it('returns null when no batch has enough available stock', () => {
    const batches = [
      { id: 'b1', currentQty: 2, expiryDate: new Date('2026-10-01') },
      { id: 'b2', currentQty: 1, expiryDate: new Date('2026-08-01') },
    ];

    const selected = selectFefoBatch(batches as Array<{ id: string; currentQty: number; expiryDate: Date | null }>, 5);

    expect(selected).toBeNull();
  });

  it('allocates across multiple batches using FEFO order', () => {
    const batches = [
      { id: 'b1', currentQty: 3, expiryDate: new Date('2026-10-01') },
      { id: 'b2', currentQty: 4, expiryDate: new Date('2026-08-01') },
      { id: 'b3', currentQty: 2, expiryDate: new Date('2026-09-01') },
    ];

    const allocation = allocateFefoBatches(batches as Array<{ id: string; currentQty: number; expiryDate: Date | null }>, 5);

    expect(allocation).toEqual([
      { id: 'b2', qty: 4 },
      { id: 'b3', qty: 1 },
    ]);
  });
});

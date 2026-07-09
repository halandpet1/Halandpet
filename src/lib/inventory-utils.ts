export type InventoryBatchCandidate = {
  id: string;
  currentQty: number;
  expiryDate: Date | null;
};

export function selectFefoBatch(batches: InventoryBatchCandidate[], requiredQty: number) {
  const availableBatches = batches
    .filter((batch) => batch.currentQty > 0 && (batch.expiryDate ? batch.expiryDate >= new Date() : true))
    .sort((left, right) => {
      const leftExpiry = left.expiryDate ? left.expiryDate.getTime() : Number.POSITIVE_INFINITY;
      const rightExpiry = right.expiryDate ? right.expiryDate.getTime() : Number.POSITIVE_INFINITY;
      return leftExpiry - rightExpiry;
    });

  return availableBatches.find((batch) => batch.currentQty >= requiredQty) ?? null;
}

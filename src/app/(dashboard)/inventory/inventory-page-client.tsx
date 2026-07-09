'use client';

import { useCallback, useEffect, useState } from 'react';
import { createDispensing, createProduct, createPurchaseOrder, createStockAdjustment, createStockOpname, listInventoryMovements, listProducts } from '@/actions/inventory.actions';

type ProductItem = {
  id: string;
  sku: string;
  name: string;
  type: string;
  unit: string;
  currentQty: number;
  reorderLevel: number;
  requiresBatch: boolean;
  isActive: boolean;
};

export function InventoryPageClient() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [movements, setMovements] = useState<Array<{ id: string; notes?: string | null; qty: number; type: string; createdAt: Date; product?: { name: string } }>>([]);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({ sku: '', name: '', type: 'OTHER', unit: 'pcs', initialQty: '0', reorderLevel: '0', basePrice: '0', costPrice: '0', requiresBatch: false, isActive: true });
  const [poForm, setPoForm] = useState({ supplierName: '', productId: '', qty: '1', unitPrice: '0', expectedDate: '', notes: '' });
  const [adjustmentForm, setAdjustmentForm] = useState({ productId: '', delta: '0', notes: '' });
  const [opnameForm, setOpnameForm] = useState({ productId: '', delta: '0', notes: '' });
  const [dispenseForm, setDispenseForm] = useState({ productId: '', delta: '1', notes: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    const [productResult, movementResult] = await Promise.all([listProducts({ search, page: 1, pageSize }), listInventoryMovements({ page: 1, pageSize, search })]);
    if (productResult.success) {
      setProducts((productResult.data?.items ?? []) as ProductItem[]);
    }
    if (movementResult.success) {
      setMovements((movementResult.data?.items ?? []) as Array<{ id: string; notes?: string | null; qty: number; type: string; createdAt: Date; product?: { name: string } }>);
    }
    setLoading(false);
  }, [pageSize, search]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleProductSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null); setError(null);
    const result = await createProduct({ ...productForm, initialQty: Number(productForm.initialQty), reorderLevel: Number(productForm.reorderLevel), basePrice: Number(productForm.basePrice), costPrice: Number(productForm.costPrice), requiresBatch: Boolean(productForm.requiresBatch), isActive: Boolean(productForm.isActive) });
    if (result.success) {
      setMessage('Produk berhasil dibuat');
      setProductForm({ sku: '', name: '', type: 'OTHER', unit: 'pcs', initialQty: '0', reorderLevel: '0', basePrice: '0', costPrice: '0', requiresBatch: false, isActive: true });
      await loadData();
      return;
    }
    setError(result.error);
  }

  async function handlePurchaseSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null); setError(null);
    const result = await createPurchaseOrder({ ...poForm, qty: Number(poForm.qty), unitPrice: Number(poForm.unitPrice) });
    if (result.success) {
      setMessage('Purchase order berhasil dibuat');
      setPoForm({ supplierName: '', productId: '', qty: '1', unitPrice: '0', expectedDate: '', notes: '' });
      await loadData();
      return;
    }
    setError(result.error);
  }

  async function handleAdjustmentSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null); setError(null);
    const result = await createStockAdjustment({ ...adjustmentForm, delta: Number(adjustmentForm.delta) });
    if (result.success) {
      setMessage('Penyesuaian stok berhasil');
      setAdjustmentForm({ productId: '', delta: '0', notes: '' });
      await loadData();
      return;
    }
    setError(result.error);
  }

  async function handleOpnameSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null); setError(null);
    const result = await createStockOpname({ ...opnameForm, delta: Number(opnameForm.delta) });
    if (result.success) {
      setMessage('Stock opname berhasil');
      setOpnameForm({ productId: '', delta: '0', notes: '' });
      await loadData();
      return;
    }
    setError(result.error);
  }

  async function handleDispenseSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null); setError(null);
    const result = await createDispensing({ ...dispenseForm, delta: Number(dispenseForm.delta) });
    if (result.success) {
      setMessage('Dispensing berhasil');
      setDispenseForm({ productId: '', delta: '1', notes: '' });
      await loadData();
      return;
    }
    setError(result.error);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Module 4</p>
          <h1 className="text-3xl font-semibold">Inventory & Pharmacy</h1>
        </div>
      </div>
      {message ? <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</div> : null}
      {error ? <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <form onSubmit={handleProductSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Master Produk</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm"><span className="mb-2 block">SKU</span><input value={productForm.sku} onChange={(event) => setProductForm((current) => ({ ...current, sku: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Nama</span><input value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Tipe</span><select value={productForm.type} onChange={(event) => setProductForm((current) => ({ ...current, type: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2"><option value="MEDICINE">Medicine</option><option value="SUPPLEMENT">Supplement</option><option value="FOOD">Food</option><option value="ACCESSORY">Accessory</option><option value="SERVICE">Service</option><option value="OTHER">Other</option></select></label>
            <label className="text-sm"><span className="mb-2 block">Satuan</span><input value={productForm.unit} onChange={(event) => setProductForm((current) => ({ ...current, unit: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Qty Awal</span><input type="number" value={productForm.initialQty} onChange={(event) => setProductForm((current) => ({ ...current, initialQty: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Reorder Level</span><input type="number" value={productForm.reorderLevel} onChange={(event) => setProductForm((current) => ({ ...current, reorderLevel: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Base Price</span><input type="number" value={productForm.basePrice} onChange={(event) => setProductForm((current) => ({ ...current, basePrice: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Cost Price</span><input type="number" value={productForm.costPrice} onChange={(event) => setProductForm((current) => ({ ...current, costPrice: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={productForm.requiresBatch} onChange={(event) => setProductForm((current) => ({ ...current, requiresBatch: event.target.checked }))} /> Memerlukan batch</label>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2">Simpan produk</button>
        </form>

        <form onSubmit={handlePurchaseSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Purchase Order</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm"><span className="mb-2 block">Supplier</span><input value={poForm.supplierName} onChange={(event) => setPoForm((current) => ({ ...current, supplierName: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Produk ID</span><input value={poForm.productId} onChange={(event) => setPoForm((current) => ({ ...current, productId: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Qty</span><input type="number" value={poForm.qty} onChange={(event) => setPoForm((current) => ({ ...current, qty: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Unit Price</span><input type="number" value={poForm.unitPrice} onChange={(event) => setPoForm((current) => ({ ...current, unitPrice: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm md:col-span-2"><span className="mb-2 block">Expected Date</span><input type="date" value={poForm.expectedDate} onChange={(event) => setPoForm((current) => ({ ...current, expectedDate: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm md:col-span-2"><span className="mb-2 block">Catatan</span><input value={poForm.notes} onChange={(event) => setPoForm((current) => ({ ...current, notes: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          </div>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2">Buat PO</button>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <form onSubmit={handleAdjustmentSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Stock Adjustment</h2>
          <label className="text-sm"><span className="mb-2 block">Produk ID</span><input value={adjustmentForm.productId} onChange={(event) => setAdjustmentForm((current) => ({ ...current, productId: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm"><span className="mb-2 block">Delta</span><input type="number" value={adjustmentForm.delta} onChange={(event) => setAdjustmentForm((current) => ({ ...current, delta: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm"><span className="mb-2 block">Alasan</span><input value={adjustmentForm.notes} onChange={(event) => setAdjustmentForm((current) => ({ ...current, notes: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2">Simpan adjustment</button>
        </form>

        <form onSubmit={handleOpnameSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Stock Opname</h2>
          <label className="text-sm"><span className="mb-2 block">Produk ID</span><input value={opnameForm.productId} onChange={(event) => setOpnameForm((current) => ({ ...current, productId: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm"><span className="mb-2 block">Delta</span><input type="number" value={opnameForm.delta} onChange={(event) => setOpnameForm((current) => ({ ...current, delta: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm"><span className="mb-2 block">Catatan</span><input value={opnameForm.notes} onChange={(event) => setOpnameForm((current) => ({ ...current, notes: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2">Simpan opname</button>
        </form>
      </div>

      <form onSubmit={handleDispenseSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">Dispensing Farmasi</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm"><span className="mb-2 block">Produk ID</span><input value={dispenseForm.productId} onChange={(event) => setDispenseForm((current) => ({ ...current, productId: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm"><span className="mb-2 block">Jumlah</span><input type="number" value={dispenseForm.delta} onChange={(event) => setDispenseForm((current) => ({ ...current, delta: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm md:col-span-2"><span className="mb-2 block">Catatan</span><input value={dispenseForm.notes} onChange={(event) => setDispenseForm((current) => ({ ...current, notes: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
        </div>
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2">Simpan dispensing</button>
      </form>

      <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari produk atau mutasi" className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 md:max-w-sm" />
          <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2"><option value={10}>10 per halaman</option><option value={20}>20 per halaman</option></select>
        </div>
        {loading ? <div>Memuat...</div> : null}
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-800 text-left text-slate-300"><tr><th className="px-4 py-3">Produk</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Stok</th><th className="px-4 py-3">Reorder</th></tr></thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-white/10"><td className="px-4 py-3">{product.name}</td><td className="px-4 py-3">{product.sku}</td><td className="px-4 py-3">{product.currentQty}</td><td className="px-4 py-3">{product.reorderLevel}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
        <h2 className="mb-4 text-xl font-semibold">Riwayat Mutasi</h2>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-800 text-left text-slate-300"><tr><th className="px-4 py-3">Produk</th><th className="px-4 py-3">Jenis</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3">Catatan</th><th className="px-4 py-3">Waktu</th></tr></thead>
            <tbody>
              {movements.map((movement) => (
                <tr key={movement.id} className="border-t border-white/10"><td className="px-4 py-3">{movement.product?.name ?? '-'}</td><td className="px-4 py-3">{movement.type}</td><td className="px-4 py-3">{movement.qty}</td><td className="px-4 py-3">{movement.notes ?? '-'}</td><td className="px-4 py-3">{movement.createdAt ? new Date(movement.createdAt).toLocaleString() : '-'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

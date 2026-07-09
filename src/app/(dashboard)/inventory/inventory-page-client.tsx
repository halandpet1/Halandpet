'use client';

import { useCallback, useEffect, useState } from 'react';
import { createDisposal, createDispensing, createGoodsReceipt, createProduct, createPurchaseOrder, createPurchaseRequest, createStockAdjustment, createStockOpname, createStockReturn, createSupplier, createSupplierInvoice, createSupplierPayment, createWarehouse, createWarehouseTransfer, getInventoryAlerts, getInventoryDashboardSummary, getInventoryReportData, listInventoryMovements, listProducts } from '@/actions/inventory.actions';
import { updatePrescriptionQueueStatus } from '@/actions/clinical-slice3.actions';

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
  const [supplierForm, setSupplierForm] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '', paymentTerm: '', creditLimit: '0', status: 'ACTIVE' });
  const [invoiceForm, setInvoiceForm] = useState({ supplierId: '', purchaseOrderId: '', supplierName: '', subtotal: '0', tax: '0', discount: '0', total: '0', dueDate: '', notes: '' });
  const [paymentForm, setPaymentForm] = useState({ supplierInvoiceId: '', supplierId: '', amount: '0', method: 'TRANSFER', referenceNo: '' });
  const [warehouseForm, setWarehouseForm] = useState({ name: '', code: '', location: '', isDefault: false, isActive: true });
  const [prForm, setPrForm] = useState({ productId: '', warehouseId: '', qty: '1', priority: 'NORMAL', requestedBy: '', notes: '' });
  const [adjustmentForm, setAdjustmentForm] = useState({ productId: '', delta: '0', notes: '' });
  const [opnameForm, setOpnameForm] = useState({ productId: '', delta: '0', notes: '' });
  const [dispenseForm, setDispenseForm] = useState({ productId: '', delta: '1', notes: '' });
  const [goodsReceiptForm, setGoodsReceiptForm] = useState({ purchaseOrderId: '', warehouseId: '', receivedBy: '', notes: '', items: [{ productId: '', qty: '1', unitPrice: '0', batchNo: '', expiryDate: '', notes: '' }] });
  const [transferForm, setTransferForm] = useState({ fromWarehouseId: '', toWarehouseId: '', requestedBy: '', notes: '', items: [{ productId: '', qty: '1', batchNo: '', notes: '' }] });
  const [returnForm, setReturnForm] = useState({ type: 'SUPPLIER', productId: '', warehouseId: '', batchId: '', qty: '1', reason: '', requestedBy: '', notes: '' });
  const [disposalForm, setDisposalForm] = useState({ productId: '', warehouseId: '', batchId: '', type: 'EXPIRED', qty: '1', reason: '', notes: '' });
  const [alerts, setAlerts] = useState<Array<{ type: string; message: string }>>([]);
  const [dashboardSummary, setDashboardSummary] = useState<{ productCount?: number; warehouseCount?: number; purchaseOrderCount?: number; supplierCount?: number; activeSupplierCount?: number; lowStockCount?: number; nearExpiredCount?: number; expiredCount?: number; stockValue?: number; purchaseValue?: number; adjustmentCount?: number; disposalCount?: number; transferCount?: number }>({});
  const [reportData, setReportData] = useState<{ products?: Array<{ id: string; sku: string; name: string; currentQty: number; reorderLevel: number; costPrice: number }>; purchaseOrders?: Array<{ id: string; poNumber: string; supplierName: string; status: string; total: number }>; supplierPayments?: Array<{ id: string; amount: number; method: string; referenceNo: string | null; paidAt: Date | null }>; nearExpiredBatches?: Array<{ id: string; batchNo: string; productId: string; expiryDate: Date | null; currentQty: number }>; expiredBatches?: Array<{ id: string; batchNo: string; productId: string; expiryDate: Date | null; currentQty: number }>; movements?: Array<{ id: string; product?: { name: string }; qty: number; notes?: string | null; createdAt: Date }>; stockValue?: number } | null>(null);
  const [queueForm, setQueueForm] = useState({ prescriptionId: '', queueStatus: 'PREPARING' });

  const loadData = useCallback(async () => {
    setLoading(true);
    const [productResult, movementResult, alertResult, summaryResult, reportResult] = await Promise.all([listProducts({ search, page: 1, pageSize }), listInventoryMovements({ page: 1, pageSize, search }), getInventoryAlerts(), getInventoryDashboardSummary(), getInventoryReportData()]);
    if (productResult.success) {
      setProducts((productResult.data?.items ?? []) as ProductItem[]);
    }
    if (movementResult.success) {
      setMovements((movementResult.data?.items ?? []) as Array<{ id: string; notes?: string | null; qty: number; type: string; createdAt: Date; product?: { name: string } }>);
    }
    if (alertResult.success) {
      setAlerts((alertResult.data?.alerts ?? []) as Array<{ type: string; message: string }>);
    }
    if (summaryResult.success) {
      setDashboardSummary((summaryResult.data ?? {}) as typeof dashboardSummary);
    }
    if (reportResult.success) {
      setReportData({
        ...(reportResult.data ?? {}),
        products: (reportResult.data?.products ?? []).map((product) => ({ ...product, costPrice: Number(product.costPrice ?? 0) })),
        purchaseOrders: (reportResult.data?.purchaseOrders ?? []).map((order) => ({ ...order, total: Number(order.total ?? 0) })),
        supplierPayments: (reportResult.data?.supplierPayments ?? []).map((payment) => ({ ...payment, amount: Number(payment.amount ?? 0) })),
        stockValue: Number(reportResult.data?.stockValue ?? 0),
      } as typeof reportData);
    }
    setLoading(false);
  }, [pageSize, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
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

  async function handleSupplierSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null); setError(null);
    const result = await createSupplier({ ...supplierForm, creditLimit: Number(supplierForm.creditLimit) });
    if (result.success) {
      setMessage('Supplier berhasil dibuat');
      setSupplierForm({ name: '', contactPerson: '', phone: '', email: '', address: '', paymentTerm: '', creditLimit: '0', status: 'ACTIVE' });
      await loadData();
      return;
    }
    setError(result.error);
  }

  async function handleWarehouseSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null); setError(null);
    const result = await createWarehouse({ ...warehouseForm, isDefault: Boolean(warehouseForm.isDefault), isActive: Boolean(warehouseForm.isActive) });
    if (result.success) {
      setMessage('Warehouse berhasil dibuat');
      setWarehouseForm({ name: '', code: '', location: '', isDefault: false, isActive: true });
      await loadData();
      return;
    }
    setError(result.error);
  }

  async function handleInvoiceSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null); setError(null);
    const subtotal = Number(invoiceForm.subtotal);
    const tax = Number(invoiceForm.tax);
    const discount = Number(invoiceForm.discount);
    const total = subtotal + tax - discount;
    const result = await createSupplierInvoice({ ...invoiceForm, supplierId: invoiceForm.supplierId || undefined, purchaseOrderId: invoiceForm.purchaseOrderId || undefined, subtotal, tax, discount, total, dueDate: invoiceForm.dueDate || undefined, notes: invoiceForm.notes || undefined });
    if (result.success) {
      setMessage('Invoice supplier berhasil dibuat');
      setInvoiceForm({ supplierId: '', purchaseOrderId: '', supplierName: '', subtotal: '0', tax: '0', discount: '0', total: '0', dueDate: '', notes: '' });
      await loadData();
      return;
    }
    setError(result.error);
  }

  async function handlePaymentSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null); setError(null);
    const result = await createSupplierPayment({ ...paymentForm, amount: Number(paymentForm.amount), supplierId: paymentForm.supplierId || undefined, referenceNo: paymentForm.referenceNo || undefined });
    if (result.success) {
      setMessage('Pembayaran supplier berhasil dicatat');
      setPaymentForm({ supplierInvoiceId: '', supplierId: '', amount: '0', method: 'TRANSFER', referenceNo: '' });
      await loadData();
      return;
    }
    setError(result.error);
  }

  async function handleQueueStatusSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null); setError(null);
    const result = await updatePrescriptionQueueStatus(queueForm.prescriptionId, queueForm.queueStatus);
    if (result.success) {
      setMessage('Status antrian resep berhasil diperbarui');
      setQueueForm({ prescriptionId: '', queueStatus: 'PREPARING' });
      await loadData();
      return;
    }
    setError(result.error);
  }

  async function handlePurchaseRequestSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null); setError(null);
    const result = await createPurchaseRequest({ ...prForm, qty: Number(prForm.qty) });
    if (result.success) {
      setMessage('Purchase request berhasil dibuat');
      setPrForm({ productId: '', warehouseId: '', qty: '1', priority: 'NORMAL', requestedBy: '', notes: '' });
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

  async function handleGoodsReceiptSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null); setError(null);
    const result = await createGoodsReceipt({
      ...goodsReceiptForm,
      items: goodsReceiptForm.items.map((item) => ({ ...item, qty: Number(item.qty), unitPrice: Number(item.unitPrice) })),
    });
    if (result.success) {
      setMessage('Goods receipt berhasil dicatat');
      setGoodsReceiptForm({ purchaseOrderId: '', warehouseId: '', receivedBy: '', notes: '', items: [{ productId: '', qty: '1', unitPrice: '0', batchNo: '', expiryDate: '', notes: '' }] });
      await loadData();
      return;
    }
    setError(result.error);
  }

  async function handleTransferSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null); setError(null);
    const result = await createWarehouseTransfer({ ...transferForm, items: transferForm.items.map((item) => ({ ...item, qty: Number(item.qty) })) });
    if (result.success) {
      setMessage('Transfer warehouse berhasil dibuat');
      setTransferForm({ fromWarehouseId: '', toWarehouseId: '', requestedBy: '', notes: '', items: [{ productId: '', qty: '1', batchNo: '', notes: '' }] });
      await loadData();
      return;
    }
    setError(result.error);
  }

  async function handleReturnSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null); setError(null);
    const result = await createStockReturn({ ...returnForm, qty: Number(returnForm.qty) });
    if (result.success) {
      setMessage('Return stok berhasil dibuat');
      setReturnForm({ type: 'SUPPLIER', productId: '', warehouseId: '', batchId: '', qty: '1', reason: '', requestedBy: '', notes: '' });
      await loadData();
      return;
    }
    setError(result.error);
  }

  async function handleDisposalSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null); setError(null);
    const result = await createDisposal({ ...disposalForm, qty: Number(disposalForm.qty) });
    if (result.success) {
      setMessage('Disposal stok berhasil dicatat');
      setDisposalForm({ productId: '', warehouseId: '', batchId: '', type: 'EXPIRED', qty: '1', reason: '', notes: '' });
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
        <form onSubmit={handleSupplierSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Supplier</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm"><span className="mb-2 block">Nama</span><input value={supplierForm.name} onChange={(event) => setSupplierForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Contact Person</span><input value={supplierForm.contactPerson} onChange={(event) => setSupplierForm((current) => ({ ...current, contactPerson: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Telepon</span><input value={supplierForm.phone} onChange={(event) => setSupplierForm((current) => ({ ...current, phone: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Email</span><input value={supplierForm.email} onChange={(event) => setSupplierForm((current) => ({ ...current, email: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm md:col-span-2"><span className="mb-2 block">Alamat</span><input value={supplierForm.address} onChange={(event) => setSupplierForm((current) => ({ ...current, address: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Payment Term</span><input value={supplierForm.paymentTerm} onChange={(event) => setSupplierForm((current) => ({ ...current, paymentTerm: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Credit Limit</span><input type="number" value={supplierForm.creditLimit} onChange={(event) => setSupplierForm((current) => ({ ...current, creditLimit: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          </div>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2">Simpan supplier</button>
        </form>

        <form onSubmit={handleWarehouseSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Warehouse</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm"><span className="mb-2 block">Nama</span><input value={warehouseForm.name} onChange={(event) => setWarehouseForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Kode</span><input value={warehouseForm.code} onChange={(event) => setWarehouseForm((current) => ({ ...current, code: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm md:col-span-2"><span className="mb-2 block">Lokasi</span><input value={warehouseForm.location} onChange={(event) => setWarehouseForm((current) => ({ ...current, location: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={warehouseForm.isDefault} onChange={(event) => setWarehouseForm((current) => ({ ...current, isDefault: event.target.checked }))} /> Default warehouse</label>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2">Simpan warehouse</button>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <form onSubmit={handleInvoiceSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Supplier Invoice</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm"><span className="mb-2 block">Supplier ID</span><input value={invoiceForm.supplierId} onChange={(event) => setInvoiceForm((current) => ({ ...current, supplierId: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Purchase Order ID</span><input value={invoiceForm.purchaseOrderId} onChange={(event) => setInvoiceForm((current) => ({ ...current, purchaseOrderId: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Nama Supplier</span><input value={invoiceForm.supplierName} onChange={(event) => setInvoiceForm((current) => ({ ...current, supplierName: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Due Date</span><input type="date" value={invoiceForm.dueDate} onChange={(event) => setInvoiceForm((current) => ({ ...current, dueDate: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Subtotal</span><input type="number" value={invoiceForm.subtotal} onChange={(event) => setInvoiceForm((current) => ({ ...current, subtotal: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Tax</span><input type="number" value={invoiceForm.tax} onChange={(event) => setInvoiceForm((current) => ({ ...current, tax: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Discount</span><input type="number" value={invoiceForm.discount} onChange={(event) => setInvoiceForm((current) => ({ ...current, discount: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Total</span><input type="number" value={invoiceForm.total} onChange={(event) => setInvoiceForm((current) => ({ ...current, total: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm md:col-span-2"><span className="mb-2 block">Catatan</span><input value={invoiceForm.notes} onChange={(event) => setInvoiceForm((current) => ({ ...current, notes: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          </div>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2">Buat invoice</button>
        </form>

        <form onSubmit={handlePaymentSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Supplier Payment</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm"><span className="mb-2 block">Invoice ID</span><input value={paymentForm.supplierInvoiceId} onChange={(event) => setPaymentForm((current) => ({ ...current, supplierInvoiceId: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Supplier ID</span><input value={paymentForm.supplierId} onChange={(event) => setPaymentForm((current) => ({ ...current, supplierId: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Amount</span><input type="number" value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Method</span><select value={paymentForm.method} onChange={(event) => setPaymentForm((current) => ({ ...current, method: event.target.value as 'TRANSFER' | 'CASH' | 'CHEQUE' }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2"><option value="TRANSFER">Transfer</option><option value="CASH">Cash</option><option value="CHEQUE">Cheque</option></select></label>
            <label className="text-sm md:col-span-2"><span className="mb-2 block">Reference No</span><input value={paymentForm.referenceNo} onChange={(event) => setPaymentForm((current) => ({ ...current, referenceNo: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          </div>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2">Catat pembayaran</button>
        </form>
      </div>

      <form onSubmit={handleQueueStatusSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">Prescription Queue</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm"><span className="mb-2 block">Prescription ID</span><input value={queueForm.prescriptionId} onChange={(event) => setQueueForm((current) => ({ ...current, prescriptionId: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm"><span className="mb-2 block">Status</span><select value={queueForm.queueStatus} onChange={(event) => setQueueForm((current) => ({ ...current, queueStatus: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2"><option value="WAITING">Waiting</option><option value="PREPARING">Preparing</option><option value="DISPENSING">Dispensing</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></select></label>
        </div>
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2">Perbarui queue resep</button>
      </form>

      <form onSubmit={handlePurchaseRequestSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">Purchase Request</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm"><span className="mb-2 block">Produk ID</span><input value={prForm.productId} onChange={(event) => setPrForm((current) => ({ ...current, productId: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm"><span className="mb-2 block">Warehouse ID</span><input value={prForm.warehouseId} onChange={(event) => setPrForm((current) => ({ ...current, warehouseId: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm"><span className="mb-2 block">Qty</span><input type="number" value={prForm.qty} onChange={(event) => setPrForm((current) => ({ ...current, qty: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm"><span className="mb-2 block">Priority</span><select value={prForm.priority} onChange={(event) => setPrForm((current) => ({ ...current, priority: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2"><option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></select></label>
          <label className="text-sm"><span className="mb-2 block">Requested By</span><input value={prForm.requestedBy} onChange={(event) => setPrForm((current) => ({ ...current, requestedBy: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm md:col-span-2"><span className="mb-2 block">Catatan</span><input value={prForm.notes} onChange={(event) => setPrForm((current) => ({ ...current, notes: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
        </div>
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2">Buat purchase request</button>
      </form>

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

      <form onSubmit={handleGoodsReceiptSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">Goods Receipt</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm"><span className="mb-2 block">Purchase Order ID</span><input value={goodsReceiptForm.purchaseOrderId} onChange={(event) => setGoodsReceiptForm((current) => ({ ...current, purchaseOrderId: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm"><span className="mb-2 block">Warehouse ID</span><input value={goodsReceiptForm.warehouseId} onChange={(event) => setGoodsReceiptForm((current) => ({ ...current, warehouseId: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm"><span className="mb-2 block">Diterima oleh</span><input value={goodsReceiptForm.receivedBy} onChange={(event) => setGoodsReceiptForm((current) => ({ ...current, receivedBy: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm md:col-span-2"><span className="mb-2 block">Catatan</span><input value={goodsReceiptForm.notes} onChange={(event) => setGoodsReceiptForm((current) => ({ ...current, notes: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
        </div>
        <div className="rounded-xl border border-white/10 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Item diterima</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm"><span className="mb-2 block">Produk ID</span><input value={goodsReceiptForm.items[0]?.productId ?? ''} onChange={(event) => setGoodsReceiptForm((current) => ({ ...current, items: [{ ...current.items[0], productId: event.target.value, qty: current.items[0]?.qty ?? '1', unitPrice: current.items[0]?.unitPrice ?? '0', batchNo: current.items[0]?.batchNo ?? '', expiryDate: current.items[0]?.expiryDate ?? '', notes: current.items[0]?.notes ?? '' }] }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Qty</span><input type="number" value={goodsReceiptForm.items[0]?.qty ?? '1'} onChange={(event) => setGoodsReceiptForm((current) => ({ ...current, items: [{ ...current.items[0], productId: current.items[0]?.productId ?? '', qty: event.target.value, unitPrice: current.items[0]?.unitPrice ?? '0', batchNo: current.items[0]?.batchNo ?? '', expiryDate: current.items[0]?.expiryDate ?? '', notes: current.items[0]?.notes ?? '' }] }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Unit Price</span><input type="number" value={goodsReceiptForm.items[0]?.unitPrice ?? '0'} onChange={(event) => setGoodsReceiptForm((current) => ({ ...current, items: [{ ...current.items[0], productId: current.items[0]?.productId ?? '', qty: current.items[0]?.qty ?? '1', unitPrice: event.target.value, batchNo: current.items[0]?.batchNo ?? '', expiryDate: current.items[0]?.expiryDate ?? '', notes: current.items[0]?.notes ?? '' }] }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Batch No</span><input value={goodsReceiptForm.items[0]?.batchNo ?? ''} onChange={(event) => setGoodsReceiptForm((current) => ({ ...current, items: [{ ...current.items[0], productId: current.items[0]?.productId ?? '', qty: current.items[0]?.qty ?? '1', unitPrice: current.items[0]?.unitPrice ?? '0', batchNo: event.target.value, expiryDate: current.items[0]?.expiryDate ?? '', notes: current.items[0]?.notes ?? '' }] }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm"><span className="mb-2 block">Expiry Date</span><input type="date" value={goodsReceiptForm.items[0]?.expiryDate ?? ''} onChange={(event) => setGoodsReceiptForm((current) => ({ ...current, items: [{ ...current.items[0], productId: current.items[0]?.productId ?? '', qty: current.items[0]?.qty ?? '1', unitPrice: current.items[0]?.unitPrice ?? '0', batchNo: current.items[0]?.batchNo ?? '', expiryDate: event.target.value, notes: current.items[0]?.notes ?? '' }] }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
            <label className="text-sm md:col-span-2"><span className="mb-2 block">Catatan item</span><input value={goodsReceiptForm.items[0]?.notes ?? ''} onChange={(event) => setGoodsReceiptForm((current) => ({ ...current, items: [{ ...current.items[0], productId: current.items[0]?.productId ?? '', qty: current.items[0]?.qty ?? '1', unitPrice: current.items[0]?.unitPrice ?? '0', batchNo: current.items[0]?.batchNo ?? '', expiryDate: current.items[0]?.expiryDate ?? '', notes: event.target.value }] }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          </div>
        </div>
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2">Catat goods receipt</button>
      </form>

      <form onSubmit={handleTransferSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">Warehouse Transfer</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm"><span className="mb-2 block">Warehouse Asal</span><input value={transferForm.fromWarehouseId} onChange={(event) => setTransferForm((current) => ({ ...current, fromWarehouseId: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm"><span className="mb-2 block">Warehouse Tujuan</span><input value={transferForm.toWarehouseId} onChange={(event) => setTransferForm((current) => ({ ...current, toWarehouseId: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm"><span className="mb-2 block">Requested By</span><input value={transferForm.requestedBy} onChange={(event) => setTransferForm((current) => ({ ...current, requestedBy: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm md:col-span-2"><span className="mb-2 block">Catatan</span><input value={transferForm.notes} onChange={(event) => setTransferForm((current) => ({ ...current, notes: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm"><span className="mb-2 block">Produk ID</span><input value={transferForm.items[0]?.productId ?? ''} onChange={(event) => setTransferForm((current) => ({ ...current, items: [{ ...current.items[0], productId: event.target.value, qty: current.items[0]?.qty ?? '1', batchNo: current.items[0]?.batchNo ?? '', notes: current.items[0]?.notes ?? '' }] }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm"><span className="mb-2 block">Qty</span><input type="number" value={transferForm.items[0]?.qty ?? '1'} onChange={(event) => setTransferForm((current) => ({ ...current, items: [{ ...current.items[0], productId: current.items[0]?.productId ?? '', qty: event.target.value, batchNo: current.items[0]?.batchNo ?? '', notes: current.items[0]?.notes ?? '' }] }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm"><span className="mb-2 block">Batch No</span><input value={transferForm.items[0]?.batchNo ?? ''} onChange={(event) => setTransferForm((current) => ({ ...current, items: [{ ...current.items[0], productId: current.items[0]?.productId ?? '', qty: current.items[0]?.qty ?? '1', batchNo: event.target.value, notes: current.items[0]?.notes ?? '' }] }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm md:col-span-2"><span className="mb-2 block">Catatan item</span><input value={transferForm.items[0]?.notes ?? ''} onChange={(event) => setTransferForm((current) => ({ ...current, items: [{ ...current.items[0], productId: current.items[0]?.productId ?? '', qty: current.items[0]?.qty ?? '1', batchNo: current.items[0]?.batchNo ?? '', notes: event.target.value }] }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
        </div>
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2">Buat transfer</button>
      </form>

      <form onSubmit={handleReturnSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">Stock Return</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm"><span className="mb-2 block">Jenis</span><select value={returnForm.type} onChange={(event) => setReturnForm((current) => ({ ...current, type: event.target.value as 'SUPPLIER' | 'CUSTOMER' | 'INTERNAL' }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2"><option value="SUPPLIER">Supplier</option><option value="CUSTOMER">Customer</option><option value="INTERNAL">Internal</option></select></label>
          <label className="text-sm"><span className="mb-2 block">Produk ID</span><input value={returnForm.productId} onChange={(event) => setReturnForm((current) => ({ ...current, productId: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm"><span className="mb-2 block">Warehouse ID</span><input value={returnForm.warehouseId} onChange={(event) => setReturnForm((current) => ({ ...current, warehouseId: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm"><span className="mb-2 block">Batch ID</span><input value={returnForm.batchId} onChange={(event) => setReturnForm((current) => ({ ...current, batchId: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm"><span className="mb-2 block">Qty</span><input type="number" value={returnForm.qty} onChange={(event) => setReturnForm((current) => ({ ...current, qty: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm"><span className="mb-2 block">Reason</span><input value={returnForm.reason} onChange={(event) => setReturnForm((current) => ({ ...current, reason: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm"><span className="mb-2 block">Requested By</span><input value={returnForm.requestedBy} onChange={(event) => setReturnForm((current) => ({ ...current, requestedBy: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm md:col-span-2"><span className="mb-2 block">Catatan</span><input value={returnForm.notes} onChange={(event) => setReturnForm((current) => ({ ...current, notes: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
        </div>
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2">Buat return</button>
      </form>

      <form onSubmit={handleDisposalSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">Disposal / Lost & Damage</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm"><span className="mb-2 block">Produk ID</span><input value={disposalForm.productId} onChange={(event) => setDisposalForm((current) => ({ ...current, productId: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm"><span className="mb-2 block">Jenis</span><select value={disposalForm.type} onChange={(event) => setDisposalForm((current) => ({ ...current, type: event.target.value as 'EXPIRED' | 'DAMAGED' | 'BROKEN' | 'LOST' | 'SHRINKAGE' }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2"><option value="EXPIRED">Expired</option><option value="DAMAGED">Damaged</option><option value="BROKEN">Broken</option><option value="LOST">Lost</option><option value="SHRINKAGE">Shrinkage</option></select></label>
          <label className="text-sm"><span className="mb-2 block">Warehouse ID</span><input value={disposalForm.warehouseId} onChange={(event) => setDisposalForm((current) => ({ ...current, warehouseId: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm"><span className="mb-2 block">Batch ID</span><input value={disposalForm.batchId} onChange={(event) => setDisposalForm((current) => ({ ...current, batchId: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm"><span className="mb-2 block">Qty</span><input type="number" value={disposalForm.qty} onChange={(event) => setDisposalForm((current) => ({ ...current, qty: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm"><span className="mb-2 block">Reason</span><input value={disposalForm.reason} onChange={(event) => setDisposalForm((current) => ({ ...current, reason: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
          <label className="text-sm md:col-span-2"><span className="mb-2 block">Catatan</span><input value={disposalForm.notes} onChange={(event) => setDisposalForm((current) => ({ ...current, notes: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" /></label>
        </div>
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2">Catat disposal</button>
      </form>

      <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Laporan Inventory</h2>
          <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">Ringkasan operasional</div>
        </div>
        <div className="mb-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Nilai stok</p>
            <p className="mt-2 text-xl font-semibold">{reportData?.stockValue ?? dashboardSummary.stockValue ?? 0}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Batch dekat kadaluarsa</p>
            <p className="mt-2 text-xl font-semibold">{reportData?.nearExpiredBatches?.length ?? 0}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Pembayaran supplier</p>
            <p className="mt-2 text-xl font-semibold">{reportData?.supplierPayments?.length ?? 0}</p>
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200">PO terbaru</div>
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/70 text-left text-slate-300"><tr><th className="px-4 py-3">No. PO</th><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Total</th></tr></thead>
              <tbody>
                {(reportData?.purchaseOrders ?? []).slice(0, 5).map((order) => (
                  <tr key={order.id} className="border-t border-white/10"><td className="px-4 py-3">{order.poNumber}</td><td className="px-4 py-3">{order.supplierName}</td><td className="px-4 py-3">{order.status}</td><td className="px-4 py-3">{order.total}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200">Batch kedaluwarsa</div>
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/70 text-left text-slate-300"><tr><th className="px-4 py-3">Batch</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3">Kadaluarsa</th></tr></thead>
              <tbody>
                {(reportData?.expiredBatches ?? []).slice(0, 5).map((batch) => (
                  <tr key={batch.id} className="border-t border-white/10"><td className="px-4 py-3">{batch.batchNo}</td><td className="px-4 py-3">{batch.currentQty}</td><td className="px-4 py-3">{batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : '-'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
        <div className="mb-4 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-slate-950 p-3"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Produk</p><p className="mt-1 text-xl font-semibold">{dashboardSummary.productCount ?? 0}</p></div>
          <div className="rounded-xl border border-white/10 bg-slate-950 p-3"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Warehouse</p><p className="mt-1 text-xl font-semibold">{dashboardSummary.warehouseCount ?? 0}</p></div>
          <div className="rounded-xl border border-white/10 bg-slate-950 p-3"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">PO</p><p className="mt-1 text-xl font-semibold">{dashboardSummary.purchaseOrderCount ?? 0}</p></div>
          <div className="rounded-xl border border-white/10 bg-slate-950 p-3"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Nilai Stok</p><p className="mt-1 text-xl font-semibold">{dashboardSummary.stockValue ?? 0}</p></div>
        </div>
        <div className="mb-4 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-slate-950 p-3"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Supplier</p><p className="mt-1 text-xl font-semibold">{dashboardSummary.supplierCount ?? 0}</p></div>
          <div className="rounded-xl border border-white/10 bg-slate-950 p-3"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Low Stock</p><p className="mt-1 text-xl font-semibold">{dashboardSummary.lowStockCount ?? 0}</p></div>
          <div className="rounded-xl border border-white/10 bg-slate-950 p-3"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Near Expired</p><p className="mt-1 text-xl font-semibold">{dashboardSummary.nearExpiredCount ?? 0}</p></div>
          <div className="rounded-xl border border-white/10 bg-slate-950 p-3"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Disposal</p><p className="mt-1 text-xl font-semibold">{dashboardSummary.disposalCount ?? 0}</p></div>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {alerts.slice(0, 6).map((alert, index) => <div key={`${alert.type}-${index}`} className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-sm text-amber-300">{alert.message}</div>)}
        </div>
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

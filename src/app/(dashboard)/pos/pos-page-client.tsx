'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPosCheckout, getCustomerMembership, getSalesReportSummary, listSalesTransactions, validateVoucher, upsertCustomerMembership, openCashRegister, closeCashRegister } from '@/actions/sales.actions';
import { listProducts } from '@/actions/inventory.actions';

export function PosPageClient() {
  const [products, setProducts] = useState<Array<{ id: string; sku: string; name: string; currentQty: number; sellingPrice?: number | null }>>([]);
  const [cart, setCart] = useState<Array<{ productId: string; name: string; qty: number; unitPrice: number }>>([]);
  const [customerId, setCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'DEBIT' | 'QRIS' | 'TRANSFER'>('CASH');
  const [discount, setDiscount] = useState('0');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [membershipInfo, setMembershipInfo] = useState<{ tier: string; status: string; discountPercent: number; points: number } | null>(null);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [serviceFee, setServiceFee] = useState('0');
  const [metrics, setMetrics] = useState<{ today: { revenue: number; transactions: number; outstanding: number }; week: { revenue: number; transactions: number; outstanding: number }; month: { revenue: number; transactions: number; outstanding: number } } | null>(null);
  const [transactions, setTransactions] = useState<Array<{ id: string; invoiceNo: string; status: string; total: number; createdAt: Date | null }>>([]);
  const [cashRegisterStatus, setCashRegisterStatus] = useState<'OPEN' | 'CLOSED' | null>(null);
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const result = await listProducts({ page: 1, pageSize: 20 });
      if (result.success) {
        setProducts(result.data?.items ?? []);
      }
      const sales = await listSalesTransactions();
      if (sales.success) {
        setTransactions((sales.data?.items ?? []).map((item) => ({ id: item.id, invoiceNo: item.invoiceNo, status: item.status, total: Number(item.total ?? 0), createdAt: item.createdAt }))); 
      }
      const summary = await getSalesReportSummary();
      if (summary.success) {
        setMetrics(summary.data ?? null);
      }
    })();
  }, []);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.qty * item.unitPrice, 0), [cart]);
  const taxAmount = useMemo(() => subtotal * (Number(taxRate || 0) / 100), [subtotal, taxRate]);
  const serviceFeeAmount = useMemo(() => Number(serviceFee || 0), [serviceFee]);
  const total = useMemo(() => subtotal + taxAmount + serviceFeeAmount - Number(discount || 0) - voucherDiscount, [subtotal, taxAmount, serviceFeeAmount, discount, voucherDiscount]);

  function addToCart(product: { id: string; name: string; currentQty: number; sellingPrice?: number | null }) {
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) => item.productId === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...current, { productId: product.id, name: product.name, qty: 1, unitPrice: Number(product.sellingPrice ?? 0) }];
    });
  }

  function updateQty(productId: string, qty: number) {
    setCart((current) => current.flatMap((item) => item.productId === productId ? (qty > 0 ? [{ ...item, qty }] : []) : [item]));
  }

  function removeItem(productId: string) {
    setCart((current) => current.filter((item) => item.productId !== productId));
  }

  async function handleMembershipSync() {
    if (!customerId.trim()) {
      setMessage('Masukkan customer terlebih dahulu untuk mengaktifkan membership');
      return;
    }
    const result = await upsertCustomerMembership({ customerId, tier: 'STANDARD', status: 'ACTIVE', discountPercent: 5 });
    if (result.success) {
      const membership = await getCustomerMembership(customerId);
      if (membership.success) {
        setMembershipInfo(membership.data ?? null);
      }
      setMessage('Membership disinkronkan');
    }
  }

  async function handleVoucherCheck() {
    if (!voucherCode.trim()) {
      setMessage('Masukkan kode voucher');
      return;
    }
    const result = await validateVoucher(voucherCode, subtotal, customerId || undefined);
    if (result.success) {
      setVoucherDiscount(result.data?.discount ?? 0);
      setMessage(`Voucher diterima: ${result.data?.discount ?? 0}`);
    } else {
      setVoucherDiscount(0);
      setMessage(result.error ?? 'Voucher tidak valid');
    }
  }

  async function handleCashRegister(action: 'OPEN' | 'CLOSE') {
    if (action === 'OPEN') {
      const result = await openCashRegister({ openingBalance: 0, notes: 'Shift POS' });
      if (result.success) {
        setActiveShiftId(result.data?.id ?? null);
        setCashRegisterStatus('OPEN');
      }
    } else {
      const result = await closeCashRegister({ shiftId: activeShiftId ?? '', closingBalance: total, notes: 'Close shift' });
      if (result.success) {
        setActiveShiftId(null);
        setCashRegisterStatus('CLOSED');
      }
    }
  }

  async function handleCheckout(event: React.FormEvent) {
    event.preventDefault();
    if (!cart.length) {
      setMessage('Tambahkan item ke keranjang terlebih dahulu');
      return;
    }

    const result = await createPosCheckout({
      customerId: customerId || undefined,
      items: cart.map((item) => ({ productId: item.productId, qty: item.qty, unitPrice: item.unitPrice })),
      discount: Number(discount || 0),
      paymentMethod,
      amountPaid: total,
      notes,
    });

    if (result.success) {
      setMessage(`Checkout berhasil: ${result.data?.invoiceNo}`);
      setCart([]);
      setDiscount('0');
      setNotes('');
      setCustomerId('');
      const sales = await listSalesTransactions();
      if (sales.success) {
        setTransactions((sales.data?.items ?? []).map((item) => ({ id: item.id, invoiceNo: item.invoiceNo, status: item.status, total: Number(item.total ?? 0), createdAt: item.createdAt })));
      }
    } else {
      setMessage(result.error);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">POS</p>
        <h1 className="text-3xl font-semibold">Point of Sale</h1>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Produk</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {products.map((product) => (
              <button key={product.id} type="button" onClick={() => addToCart(product)} className="rounded-xl border border-white/10 bg-slate-950 p-4 text-left">
                <p className="font-medium">{product.name}</p>
                <p className="mt-1 text-sm text-slate-400">Stok: {product.currentQty}</p>
                <p className="mt-2 text-sm text-emerald-400">{product.sellingPrice ? `Rp ${product.sellingPrice}` : 'Harga belum diatur'}</p>
              </button>
            ))}
          </div>
        </div>
        <form onSubmit={handleCheckout} className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Cart</h2>
          <div className="mt-4 space-y-3">
            {cart.map((item) => (
              <div key={item.productId} className="rounded-lg border border-white/10 bg-slate-950 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-slate-400">Rp {item.unitPrice} / item</p>
                  </div>
                  <button type="button" onClick={() => removeItem(item.productId)} className="text-sm text-rose-400">Hapus</button>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => updateQty(item.productId, item.qty - 1)} className="rounded bg-slate-800 px-2 py-1">-</button>
                    <span className="min-w-8 text-center">{item.qty}</span>
                    <button type="button" onClick={() => updateQty(item.productId, item.qty + 1)} className="rounded bg-slate-800 px-2 py-1">+</button>
                  </div>
                  <p className="text-sm text-emerald-400">Rp {item.qty * item.unitPrice}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-3">
            <label className="block text-sm">
              <span className="mb-2 block">Customer</span>
              <input value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" placeholder="Customer ID / Walk-In" />
            </label>
            <label className="block text-sm">
              <span className="mb-2 block">Metode pembayaran</span>
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as 'CASH' | 'CARD' | 'DEBIT' | 'QRIS' | 'TRANSFER')} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="DEBIT">Debit</option>
                <option value="QRIS">QRIS</option>
                <option value="TRANSFER">Transfer</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-2 block">Diskon</span>
              <input type="number" value={discount} onChange={(event) => setDiscount(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-2 block">Voucher</span>
              <div className="flex gap-2">
                <input value={voucherCode} onChange={(event) => setVoucherCode(event.target.value)} className="flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2" placeholder="Kode voucher" />
                <button type="button" onClick={handleVoucherCheck} className="rounded-lg bg-slate-800 px-3 py-2">Cek</button>
              </div>
            </label>
            <label className="block text-sm">
              <span className="mb-2 block">Membership</span>
              <div className="flex gap-2">
                <input value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2" placeholder="Customer ID" />
                <button type="button" onClick={handleMembershipSync} className="rounded-lg bg-slate-800 px-3 py-2">Sync</button>
              </div>
              {membershipInfo ? <p className="mt-2 text-xs text-slate-400">{membershipInfo.tier} • {membershipInfo.points} poin • {membershipInfo.discountPercent}% diskon</p> : null}
            </label>
            <label className="block text-sm">
              <span className="mb-2 block">Pajak (%)</span>
              <input type="number" value={taxRate} onChange={(event) => setTaxRate(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-2 block">Biaya layanan</span>
              <input type="number" value={serviceFee} onChange={(event) => setServiceFee(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-2 block">Catatan</span>
              <input value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
            </label>
          </div>
          <div className="mt-6 rounded-xl border border-white/10 bg-slate-950 p-4">
            <div className="flex items-center justify-between text-sm text-slate-400"><span>Subtotal</span><span>Rp {subtotal}</span></div>
            <div className="mt-2 flex items-center justify-between text-sm text-slate-400"><span>Diskon</span><span>Rp {discount}</span></div>
            <div className="mt-2 flex items-center justify-between text-sm text-slate-400"><span>Voucher</span><span>Rp {voucherDiscount}</span></div>
            <div className="mt-2 flex items-center justify-between text-sm text-slate-400"><span>Pajak</span><span>Rp {taxAmount}</span></div>
            <div className="mt-2 flex items-center justify-between text-sm text-slate-400"><span>Biaya layanan</span><span>Rp {serviceFeeAmount}</span></div>
            <div className="mt-4 flex items-center justify-between text-lg font-semibold"><span>Grand Total</span><span>Rp {total}</span></div>
          </div>
          <div className="mt-6 flex gap-2">
            <button type="button" onClick={() => void handleCashRegister('OPEN')} className="flex-1 rounded-lg bg-slate-800 px-4 py-3 font-semibold">Open Shift</button>
            <button type="button" onClick={() => void handleCashRegister('CLOSE')} className="flex-1 rounded-lg bg-amber-600 px-4 py-3 font-semibold">Close Shift</button>
          </div>
          <button type="submit" className="mt-3 w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold">Checkout</button>
          {cashRegisterStatus ? <p className="mt-2 text-sm text-slate-400">Status shift: {cashRegisterStatus}</p> : null}
          {message ? <p className="mt-4 text-sm text-slate-300">{message}</p> : null}
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics ? (
          <>
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-4"><p className="text-sm text-slate-400">Pendapatan hari ini</p><p className="mt-2 text-2xl font-semibold">Rp {metrics.today.revenue}</p></div>
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-4"><p className="text-sm text-slate-400">Transaksi hari ini</p><p className="mt-2 text-2xl font-semibold">{metrics.today.transactions}</p></div>
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-4"><p className="text-sm text-slate-400">Outstanding</p><p className="mt-2 text-2xl font-semibold">Rp {metrics.today.outstanding}</p></div>
          </>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">Transaksi terbaru</h2>
        <div className="mt-4 space-y-3">
          {transactions.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950 p-3">
              <div>
                <p className="font-medium">{item.invoiceNo}</p>
                <p className="text-sm text-slate-400">{item.status}</p>
              </div>
              <p className="text-sm text-emerald-400">Rp {item.total}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { api } from '@/lib/api';
import type { GiftCard, GiftCardStats } from '@/lib/api';
import {
  CreditCard, Plus, Search, Loader2, X, ChevronRight,
  CheckCircle, AlertCircle, Save, Trash2, Copy, RefreshCw,
  Zap, TrendingUp, TrendingDown, RotateCcw, Gift,
  ArrowUpRight, ArrowDownRight, Wand2,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function cardStatus(c: GiftCard): 'active' | 'inactive' | 'expired' | 'exhausted' {
  if (c.status) return c.status;
  if (!c.isActive) return 'inactive';
  if (c.expiryDate && new Date() > new Date(c.expiryDate)) return 'expired';
  if (c.balance === 0) return 'exhausted';
  return 'active';
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  expired: 'bg-red-100 text-red-600',
  exhausted: 'bg-amber-100 text-amber-600',
};

const BLANK_FORM = {
  code: '',
  initialBalance: 5000,
  recipientName: '',
  recipientEmail: '',
  note: '',
  purchaserName: '',
  purchaserEmail: '',
  expiryDate: '',
  isActive: true,
};

// ── NewCardForm ────────────────────────────────────────────────

function NewCardForm({
  onCreated,
}: {
  onCreated: (card: GiftCard) => void;
}) {
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [saving, setSaving] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  function showMsg(type: 'ok' | 'err', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function generateCode() {
    setGeneratingCode(true);
    try {
      const { code } = await api.giftCards.generateCode();
      setForm(f => ({ ...f, code }));
    } catch {
      // fallback: generate client-side
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      setForm(f => ({ ...f, code: `KENT-${seg()}-${seg()}` }));
    }
    setGeneratingCode(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.initialBalance) return;
    setSaving(true);
    try {
      const created = await api.giftCards.create({
        ...form,
        expiryDate: form.expiryDate || null,
      });
      onCreated(created);
      setForm({ ...BLANK_FORM });
      showMsg('ok', 'Gift card created');
    } catch (err: any) {
      showMsg('err', err.message || 'Failed to create');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm shadow-lg text-white ${toast.type === 'ok' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">New Gift Card</h2>
        <p className="text-xs text-gray-400 mt-0.5">Issue a gift card manually</p>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
        {/* Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Code</label>
          <div className="flex gap-2">
            <input
              type="text" value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="Auto-generated if blank"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono uppercase focus:outline-none focus:border-amber-400"
            />
            <button type="button" onClick={generateCode} disabled={generatingCode}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
              {generatingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Leave blank to auto-generate a KENT-XXXX-XXXX code</p>
        </div>

        {/* Value */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Value (₦) <span className="text-red-400">*</span></label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₦</span>
            <input type="number" required min={1} value={form.initialBalance}
              onChange={e => setForm(f => ({ ...f, initialBalance: parseFloat(e.target.value) || 0 }))}
              className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
            />
          </div>
          {/* Quick amounts */}
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {[1000, 2500, 5000, 10000, 25000, 50000].map(v => (
              <button key={v} type="button" onClick={() => setForm(f => ({ ...f, initialBalance: v }))}
                className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition ${form.initialBalance === v ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                {fmt(v)}
              </button>
            ))}
          </div>
        </div>

        {/* Recipient */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Recipient</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
              <input type="text" value={form.recipientName}
                onChange={e => setForm(f => ({ ...f, recipientName: e.target.value }))}
                placeholder="Jane Doe"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" value={form.recipientEmail}
                onChange={e => setForm(f => ({ ...f, recipientEmail: e.target.value }))}
                placeholder="jane@example.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Personal Message</label>
            <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              rows={2} placeholder="Happy Birthday! Enjoy your gift."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 resize-none"
            />
          </div>
        </div>

        {/* Purchaser */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Purchaser (optional)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
              <input type="text" value={form.purchaserName}
                onChange={e => setForm(f => ({ ...f, purchaserName: e.target.value }))}
                placeholder="John Doe"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" value={form.purchaserEmail}
                onChange={e => setForm(f => ({ ...f, purchaserEmail: e.target.value }))}
                placeholder="john@example.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Expiry + active */}
        <div className="grid grid-cols-2 gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Expiry Date</label>
            <input type="date" value={form.expiryDate}
              onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
            />
            <p className="text-xs text-gray-400 mt-1">Leave blank = no expiry</p>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-700">Active</p>
              <p className="text-xs text-gray-400">Usable now</p>
            </div>
            <button type="button" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? 'bg-green-500' : 'bg-gray-200'}`}>
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        <button type="submit" disabled={saving || !form.initialBalance}
          className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-40 transition">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
          Create Gift Card
        </button>
      </form>
    </div>
  );
}

// ── GiftCardDetail ─────────────────────────────────────────────

function GiftCardDetail({
  card,
  onUpdated,
  onDeleted,
}: {
  card: GiftCard;
  onUpdated: (c: GiftCard) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    recipientName: card.recipientName,
    recipientEmail: card.recipientEmail,
    note: card.note,
    purchaserName: card.purchaserName,
    purchaserEmail: card.purchaserEmail,
    expiryDate: card.expiryDate ? card.expiryDate.slice(0, 10) : '',
    isActive: card.isActive,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // Top-up panel
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpNote, setTopUpNote] = useState('');
  const [topUpLoading, setTopUpLoading] = useState(false);

  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  useEffect(() => {
    setForm({
      recipientName: card.recipientName,
      recipientEmail: card.recipientEmail,
      note: card.note,
      purchaserName: card.purchaserName,
      purchaserEmail: card.purchaserEmail,
      expiryDate: card.expiryDate ? card.expiryDate.slice(0, 10) : '',
      isActive: card.isActive,
    });
    setEditing(false);
    setShowDelete(false);
    setShowTopUp(false);
  }, [card._id]);

  function showMsg(type: 'ok' | 'err', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await api.giftCards.update(card._id, {
        ...form,
        expiryDate: form.expiryDate || null,
      });
      onUpdated(updated);
      setEditing(false);
      showMsg('ok', 'Saved');
    } catch (err: any) {
      showMsg('err', err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.giftCards.delete(card._id);
      onDeleted(card._id);
    } catch (err: any) {
      showMsg('err', err.message);
      setDeleting(false);
      setShowDelete(false);
    }
  }

  async function handleTopUp(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(topUpAmount);
    if (!amount || amount <= 0) return;
    setTopUpLoading(true);
    try {
      const updated = await api.giftCards.credit(card._id, amount, topUpNote || 'Admin top-up');
      onUpdated(updated);
      setTopUpAmount('');
      setTopUpNote('');
      setShowTopUp(false);
      showMsg('ok', `Topped up ${fmt(amount)}`);
    } catch (err: any) {
      showMsg('err', err.message);
    } finally {
      setTopUpLoading(false);
    }
  }

  async function toggleActive() {
    try {
      const updated = await api.giftCards.update(card._id, { isActive: !card.isActive });
      onUpdated(updated);
      showMsg('ok', updated.isActive ? 'Activated' : 'Deactivated');
    } catch (err: any) {
      showMsg('err', err.message);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(card.code);
    showMsg('ok', 'Code copied');
  }

  const st = cardStatus(card);
  const usedPct = card.initialBalance > 0
    ? Math.round(((card.initialBalance - card.balance) / card.initialBalance) * 100)
    : 0;

  return (
    <div className="flex-1 overflow-y-auto">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm shadow-lg text-white ${toast.type === 'ok' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-gray-900 font-mono text-lg tracking-wider">{card.code}</p>
              <button onClick={copyCode} className="text-gray-300 hover:text-gray-500 transition">
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Created {fmtDate(card.createdAt)}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[st]}`}>{st}</span>
        </div>

        {/* Balance gauge */}
        <div className="mt-4">
          <div className="flex items-end justify-between mb-1.5">
            <div>
              <p className="text-xs text-gray-400">Remaining balance</p>
              <p className="text-2xl font-bold text-gray-900">{fmt(card.balance)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">of {fmt(card.initialBalance)}</p>
              <p className="text-sm font-semibold text-gray-500">{usedPct}% used</p>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${usedPct >= 90 ? 'bg-red-400' : usedPct >= 60 ? 'bg-amber-400' : 'bg-green-400'}`}
              style={{ width: `${100 - usedPct}%` }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          <button onClick={() => setEditing(e => !e)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-medium transition ${editing ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <Save className="w-3.5 h-3.5" /> {editing ? 'Editing…' : 'Edit'}
          </button>
          <button onClick={() => setShowTopUp(t => !t)}
            className="flex items-center gap-1.5 px-3 py-2 border border-green-200 text-green-700 rounded-xl text-xs font-medium hover:bg-green-50 transition">
            <TrendingUp className="w-3.5 h-3.5" /> Top Up
          </button>
          <button onClick={toggleActive}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-medium transition ${card.isActive ? 'border-orange-200 text-orange-600 hover:bg-orange-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
            {card.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button onClick={() => setShowDelete(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-xl text-xs font-medium hover:bg-red-50 transition">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Top-up panel */}
      {showTopUp && (
        <form onSubmit={handleTopUp} className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-xl space-y-3">
          <p className="text-sm font-semibold text-green-800">Add Credit</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₦</span>
            <input type="number" min={1} required value={topUpAmount}
              onChange={e => setTopUpAmount(e.target.value)} placeholder="Amount"
              className="w-full border border-green-200 rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-green-400 bg-white"
            />
          </div>
          <input type="text" value={topUpNote} onChange={e => setTopUpNote(e.target.value)}
            placeholder="Reason (optional)"
            className="w-full border border-green-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400 bg-white"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowTopUp(false)}
              className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-white">Cancel</button>
            <button type="submit" disabled={topUpLoading || !topUpAmount}
              className="flex-1 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-40">
              {topUpLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Add Credit'}
            </button>
          </div>
        </form>
      )}

      {/* Edit form */}
      {editing && (
        <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
          <p className="text-sm font-semibold text-amber-800">Edit Details</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Recipient Name</label>
              <input type="text" value={form.recipientName}
                onChange={e => setForm(f => ({ ...f, recipientName: e.target.value }))}
                className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Recipient Email</label>
              <input type="email" value={form.recipientEmail}
                onChange={e => setForm(f => ({ ...f, recipientEmail: e.target.value }))}
                className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Purchaser Name</label>
              <input type="text" value={form.purchaserName}
                onChange={e => setForm(f => ({ ...f, purchaserName: e.target.value }))}
                className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Expiry Date</label>
              <input type="date" value={form.expiryDate}
                onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
                className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 bg-white"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Note</label>
            <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              rows={2} className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 bg-white resize-none" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(false)}
              className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-white">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving}
              className="flex-1 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-40">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Info grid */}
      <div className="px-6 mt-5 space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {card.recipientName && (
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400 mb-0.5">Recipient</p>
              <p className="font-medium text-gray-800">{card.recipientName}</p>
              {card.recipientEmail && <p className="text-xs text-gray-500 truncate">{card.recipientEmail}</p>}
            </div>
          )}
          {card.purchaserName && (
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400 mb-0.5">Purchaser</p>
              <p className="font-medium text-gray-800">{card.purchaserName}</p>
              {card.purchaserEmail && <p className="text-xs text-gray-500 truncate">{card.purchaserEmail}</p>}
            </div>
          )}
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-400 mb-0.5">Expires</p>
            <p className="font-medium text-gray-800">{fmtDate(card.expiryDate)}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-400 mb-0.5">Transactions</p>
            <p className="font-medium text-gray-800">{card.usageHistory.length}</p>
          </div>
        </div>

        {card.note && (
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800 italic">
            "{card.note}"
          </div>
        )}

        {/* Usage history */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Transaction History</p>
          {card.usageHistory.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No transactions yet</p>
          ) : (
            <div className="space-y-1.5 pb-6">
              {[...card.usageHistory].reverse().map(h => (
                <div key={h._id} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${h.type === 'credit' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {h.type === 'credit'
                      ? <ArrowUpRight className="w-4 h-4 text-green-600" />
                      : <ArrowDownRight className="w-4 h-4 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{h.description}</p>
                    <p className="text-xs text-gray-400">{fmtDateTime(h.createdAt)} · bal: {fmt(h.balanceAfter)}</p>
                  </div>
                  <p className={`text-sm font-bold flex-shrink-0 ${h.type === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                    {h.type === 'credit' ? '+' : '-'}{fmt(h.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete {card.code}?</h3>
                <p className="text-sm text-gray-500">This cannot be undone</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ValidateTester ─────────────────────────────────────────────

function ValidateTester() {
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function test(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.giftCards.validate(code, parseFloat(amount) || undefined);
      setResult(res);
    } catch (err: any) {
      setResult({ valid: false, error: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-6 mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5" /> Test a code
      </p>
      <form onSubmit={test} className="space-y-2">
        <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="KENT-XXXX-XXXX" required
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:border-amber-400 bg-white" />
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Order amount (optional)"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 bg-white" />
        <button type="submit" disabled={loading || !code}
          className="w-full py-2 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-900 disabled:opacity-40">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Validate'}
        </button>
      </form>
      {result && (
        <div className={`mt-2 p-3 rounded-xl text-sm ${result.valid ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'}`}>
          {result.valid
            ? <>✓ Valid — <strong>{fmt(result.card?.balance)}</strong> balance · usable: <strong>{fmt(result.usableAmount)}</strong></>
            : <>✗ {result.error}</>
          }
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export default function GiftCardsPage() {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [filtered, setFiltered] = useState<GiftCard[]>([]);
  const [stats, setStats] = useState<GiftCardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | 'new'>('new');
  const searchRef = useRef<ReturnType<typeof setTimeout>>();

  async function load() {
    setLoading(true);
    try {
      const { cards: data, stats: s } = await api.giftCards.getAll();
      setCards(data);
      setStats(s);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      const q = search.toUpperCase();
      let list = cards;
      if (q) list = list.filter(c =>
        c.code.includes(q) ||
        c.recipientName.toLowerCase().includes(search.toLowerCase()) ||
        c.recipientEmail.toLowerCase().includes(search.toLowerCase())
      );
      if (statusFilter !== 'all') list = list.filter(c => cardStatus(c) === statusFilter);
      setFiltered(list);
    }, 200);
  }, [search, statusFilter, cards]);

  const selected = selectedId === 'new' ? null : cards.find(c => c._id === selectedId) ?? null;

  function handleCreated(card: GiftCard) {
    setCards(prev => [card, ...prev]);
    setSelectedId(card._id);
  }

  function handleUpdated(updated: GiftCard) {
    setCards(prev => prev.map(c => c._id === updated._id ? updated : c));
  }

  function handleDeleted(id: string) {
    setCards(prev => prev.filter(c => c._id !== id));
    setSelectedId('new');
  }

  function copyCode(code: string, e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
  }

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-4rem)] overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8 -my-6 flex">

        {/* ── Left panel ── */}
        <div className={`w-full md:w-[380px] lg:w-[400px] flex-shrink-0 flex flex-col border-r border-gray-200 bg-white ${selectedId ? 'hidden md:flex' : 'flex'}`}>

          {/* Header + KPIs */}
          <div className="px-4 pt-5 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-amber-500" /> Gift Cards
                </h1>
                {stats && (
                  <p className="text-xs text-gray-400 mt-0.5">{stats.active} active · {stats.total} total</p>
                )}
              </div>
              <button onClick={() => setSelectedId('new')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selectedId === 'new' ? 'bg-amber-100 text-amber-700' : 'bg-amber-500 text-white hover:bg-amber-600'}`}>
                <Plus className="w-3.5 h-3.5" /> New
              </button>
            </div>

            {/* Mini KPIs */}
            {stats && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-gray-50 rounded-xl p-2 text-center">
                  <p className="text-xs font-bold text-gray-800">{fmt(stats.totalIssued)}</p>
                  <p className="text-[10px] text-gray-400">Issued</p>
                </div>
                <div className="bg-red-50 rounded-xl p-2 text-center">
                  <p className="text-xs font-bold text-red-700">{fmt(stats.totalRedeemed)}</p>
                  <p className="text-[10px] text-red-400">Redeemed</p>
                </div>
                <div className="bg-green-50 rounded-xl p-2 text-center">
                  <p className="text-xs font-bold text-green-700">{fmt(stats.totalRemaining)}</p>
                  <p className="text-[10px] text-green-400">Remaining</p>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="text" placeholder="Search code, recipient…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 bg-gray-50" />
            </div>

            {/* Status filter */}
            <div className="flex gap-1">
              {['all', 'active', 'exhausted', 'expired', 'inactive'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-medium transition capitalize ${statusFilter === s ? 'bg-amber-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Gift className="w-10 h-10 mx-auto opacity-15 mb-2" />
                <p className="text-sm">{search ? 'No results' : 'No gift cards yet'}</p>
              </div>
            ) : (
              filtered.map(c => {
                const st = cardStatus(c);
                const usedPct = c.initialBalance > 0 ? Math.round(((c.initialBalance - c.balance) / c.initialBalance) * 100) : 0;
                return (
                  <button key={c._id} onClick={() => setSelectedId(c._id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 text-left transition ${selectedId === c._id ? 'bg-amber-50 border-l-2 border-l-amber-400' : 'hover:bg-gray-50'}`}>
                    <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
                      <Gift className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-gray-800 font-mono truncate">{c.code}</p>
                        <button onClick={e => copyCode(c.code, e)} className="text-gray-300 hover:text-gray-500 transition flex-shrink-0">
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-gray-500 font-medium">{fmt(c.balance)}</span>
                        <span className="text-gray-300 text-xs">/ {fmt(c.initialBalance)}</span>
                      </div>
                      {c.recipientName && <p className="text-xs text-gray-400 truncate">→ {c.recipientName}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLES[st]}`}>{st}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className={`flex-1 flex flex-col bg-gray-50 ${selectedId ? 'flex' : 'hidden md:flex'}`}>
          <div className="md:hidden px-4 pt-4 pb-2">
            <button onClick={() => setSelectedId('new')} className="text-sm text-amber-600 font-medium">← New card</button>
          </div>

          {selectedId === 'new' ? (
            <NewCardForm key="new" onCreated={handleCreated} />
          ) : selected ? (
            <>
              <GiftCardDetail key={selected._id} card={selected} onUpdated={handleUpdated} onDeleted={handleDeleted} />
              <ValidateTester />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
              <Gift className="w-14 h-14 opacity-10" />
              <p className="font-medium text-sm">Select a gift card to view</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

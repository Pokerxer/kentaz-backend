'use client';

import { useState, useEffect, useRef } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { api } from '@/lib/api';
import type { ShippingZone, ShippingMethod, ShippingSettings } from '@/lib/api';
import {
  Truck, Plus, Save, Trash2, Loader2, X, ChevronRight,
  CheckCircle, AlertCircle, MapPin, Package, Clock,
  ToggleLeft, ToggleRight, Pencil, Settings, ChevronDown,
  ChevronUp, Store, Zap,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────

function fmt(n: number) {
  return n === 0 ? 'Free' : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);
}

// Abuja areas grouped by proximity/delivery zone
const ABUJA_AREAS = {
  'Central Abuja': [
    'Maitama', 'Asokoro', 'Wuse', 'Wuse 2', 'Garki', 'Garki 2',
    'Central Business District', 'CBD', 'Cadastral Zone',
  ],
  'Middle Ring': [
    'Jabi', 'Utako', 'Gudu', 'Durumi', 'Guzape', 'Kado',
    'Lifecamp', 'Nbora', 'Wuye', 'Katampe', 'Dakibiyu',
  ],
  'Outer Abuja': [
    'Gwarinpa', 'Lugbe', 'Kubwa', 'Karu', 'Nyanya', 'Mararaba',
    'Dutse', 'Gwagwalada', 'Lokogoma', 'Galadimawa', 'Apo',
    'Kabusa', 'Pyakasa', 'Idu', 'Deidei',
  ],
  'Satellite Towns': [
    'Suleja', 'Keffi', 'Gwagwalada', 'Kuje', 'Bwari', 'Abaji', 'Kwali',
    'Masaka', 'Uke', 'Toto',
  ],
  'Other Nigeria': [
    'Lagos', 'Port Harcourt', 'Kano', 'Ibadan', 'Kaduna',
    'Enugu', 'Benin City', 'Warri', 'Aba', 'Onitsha',
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi',
    'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta',
    'Ebonyi', 'Edo', 'Ekiti', 'Gombe', 'Imo', 'Jigawa',
    'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Nasarawa', 'Niger',
    'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
    'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
  ],
};

// Flat list for the calculator dropdown
const ALL_AREAS = Object.values(ABUJA_AREAS).flat();

type MethodForm = Omit<ShippingMethod, '_id'> & { _id?: string };

const BLANK_METHOD: MethodForm = {
  name: '',
  description: '',
  price: 0,
  minDays: 1,
  maxDays: 3,
  freeThreshold: null,
  isActive: true,
};

// ── GlobalSettings panel ───────────────────────────────────────

function GlobalSettings({
  settings,
  onSaved,
}: {
  settings: ShippingSettings;
  onSaved: (s: ShippingSettings) => void;
}) {
  const [form, setForm] = useState({ ...settings });
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => { setForm({ ...settings }); }, [settings._id]);

  const hasChanges = JSON.stringify(form) !== JSON.stringify(settings);

  async function save() {
    setSaving(true);
    try {
      const updated = await api.shipping.updateSettings(form);
      onSaved(updated);
    } catch {}
    setSaving(false);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${form.enableShipping ? 'bg-green-100' : 'bg-gray-100'}`}>
            <Truck className={`w-4 h-4 ${form.enableShipping ? 'text-green-600' : 'text-gray-400'}`} />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">Global Shipping Settings</p>
            <p className="text-xs text-gray-400">
              Shipping is {form.enableShipping ? 'enabled' : 'disabled'} · {form.defaultProcessingDays}d processing
              {form.allowPickup ? ' · Pickup available' : ''}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4">
          {/* Enable shipping + processing days */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-700">Enable Shipping</p>
                <p className="text-xs text-gray-400">Accept delivery orders</p>
              </div>
              <button onClick={() => setForm(f => ({ ...f, enableShipping: !f.enableShipping }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.enableShipping ? 'bg-green-500' : 'bg-gray-200'}`}>
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${form.enableShipping ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <label className="block text-xs font-medium text-gray-600 mb-1">Processing Days</label>
              <div className="flex items-center gap-2">
                <input type="number" min={0} value={form.defaultProcessingDays}
                  onChange={e => setForm(f => ({ ...f, defaultProcessingDays: parseInt(e.target.value) || 0 }))}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-semibold text-center focus:outline-none focus:border-amber-400"
                />
                <span className="text-xs text-gray-500">days before dispatch</span>
              </div>
            </div>
          </div>

          {/* Checkout note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Checkout Note</label>
            <input type="text" value={form.checkoutNote}
              onChange={e => setForm(f => ({ ...f, checkoutNote: e.target.value }))}
              placeholder="e.g. Orders placed before 12pm ship same day"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Pickup */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Store Pickup</span>
              </div>
              <button onClick={() => setForm(f => ({ ...f, allowPickup: !f.allowPickup }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.allowPickup ? 'bg-green-500' : 'bg-gray-200'}`}>
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform ${form.allowPickup ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {form.allowPickup && (
              <div className="px-4 py-3 space-y-3 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Pickup Price (₦)</label>
                    <input type="number" min={0} value={form.pickupPrice}
                      onChange={e => setForm(f => ({ ...f, pickupPrice: parseFloat(e.target.value) || 0 }))}
                      placeholder="0 = free"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Pickup Address</label>
                    <input type="text" value={form.pickupAddress}
                      onChange={e => setForm(f => ({ ...f, pickupAddress: e.target.value }))}
                      placeholder="123 Victoria Island, Lagos"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pickup Note</label>
                  <input type="text" value={form.pickupNote}
                    onChange={e => setForm(f => ({ ...f, pickupNote: e.target.value }))}
                    placeholder="Available Mon–Sat, 9am–6pm"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={save} disabled={saving || !hasChanges}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-40 transition">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Settings
            </button>
            {hasChanges && <span className="text-xs text-gray-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> Unsaved</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── MethodRow ──────────────────────────────────────────────────

function MethodRow({
  method,
  onUpdate,
  onDelete,
}: {
  method: MethodForm & { _id?: string };
  onUpdate: (m: MethodForm) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(!method._id);
  const [form, setForm] = useState({ ...method });

  function save() {
    if (!form.name.trim()) return;
    onUpdate(form);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 bg-white border border-gray-100 rounded-xl group">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${method.isActive ? 'bg-green-400' : 'bg-gray-300'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-800">{method.name}</p>
            <span className="text-sm font-bold text-amber-600">{fmt(method.price)}</span>
            {method.freeThreshold !== null && (
              <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                Free over ₦{method.freeThreshold.toLocaleString()}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400">
            {method.minDays}–{method.maxDays} days
            {method.description ? ` · ${method.description}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <button onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-3 space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Method Name <span className="text-red-400">*</span></label>
          <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Standard Delivery"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Price (₦)</label>
          <input type="number" min={0} value={form.price} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 bg-white"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Min Days</label>
          <input type="number" min={0} value={form.minDays} onChange={e => setForm(f => ({ ...f, minDays: parseInt(e.target.value) || 0 }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Max Days</label>
          <input type="number" min={0} value={form.maxDays} onChange={e => setForm(f => ({ ...f, maxDays: parseInt(e.target.value) || 0 }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Free Threshold (₦)</label>
          <input type="number" min={0}
            value={form.freeThreshold ?? ''}
            onChange={e => setForm(f => ({ ...f, freeThreshold: e.target.value ? parseFloat(e.target.value) : null }))}
            placeholder="None"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 bg-white"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
        <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="e.g. Delivered to your doorstep"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 bg-white"
        />
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <button type="button" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.isActive ? 'bg-green-500' : 'bg-gray-200'}`}>
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform ${form.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-xs text-gray-600">Active</span>
        </label>
        <div className="flex gap-2">
          <button onClick={() => { setForm({ ...method }); setEditing(false); if (!method._id) onDelete(); }}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium hover:bg-white">Cancel</button>
          <button onClick={save} disabled={!form.name.trim()}
            className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 disabled:opacity-40">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ZoneDetail ─────────────────────────────────────────────────

function ZoneDetail({
  zone,
  onSaved,
  onDeleted,
}: {
  zone: ShippingZone;
  onSaved: (z: ShippingZone) => void;
  onDeleted: (id: string) => void;
}) {
  const [name, setName] = useState(zone.name);
  const [description, setDescription] = useState(zone.description);
  const [isActive, setIsActive] = useState(zone.isActive);
  const [regions, setRegions] = useState<string[]>(zone.regions);
  const [methods, setMethods] = useState<MethodForm[]>(zone.methods.map(m => ({ ...m })));
  const [regionInput, setRegionInput] = useState('');
  const [showRegionPicker, setShowRegionPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [newMethodKey, setNewMethodKey] = useState(0);

  useEffect(() => {
    setName(zone.name);
    setDescription(zone.description);
    setIsActive(zone.isActive);
    setRegions(zone.regions);
    setMethods(zone.methods.map(m => ({ ...m })));
    setShowDelete(false);
  }, [zone._id]);

  function showMsg(type: 'ok' | 'err', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const updated = await api.shipping.updateZone(zone._id, {
        name, description, isActive, regions,
        methods: methods.filter(m => m.name.trim()) as any,
      });
      onSaved(updated);
      showMsg('ok', 'Zone saved');
    } catch (err: any) {
      showMsg('err', err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.shipping.deleteZone(zone._id);
      onDeleted(zone._id);
    } catch (err: any) {
      showMsg('err', err.message);
      setDeleting(false);
      setShowDelete(false);
    }
  }

  function addRegion(r: string) {
    const t = r.trim();
    if (t && !regions.includes(t)) setRegions(prev => [...prev, t]);
    setRegionInput('');
  }

  function addNewMethod() {
    setMethods(prev => [...prev, { ...BLANK_METHOD, _id: undefined }]);
    setNewMethodKey(k => k + 1);
  }

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
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              className="text-lg font-bold text-gray-900 bg-transparent border-none outline-none w-full focus:bg-gray-50 rounded-lg px-1 -ml-1"
            />
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                {isActive ? 'Active' : 'Inactive'}
              </span>
              <span className="text-xs text-gray-400">{methods.filter(m => m.isActive).length} active methods · {regions.length} regions</span>
            </div>
          </div>
          <button onClick={() => setIsActive(a => !a)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${isActive ? 'bg-green-500' : 'bg-gray-200'}`}>
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)}
            placeholder="e.g. All Lagos deliveries"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Regions */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-gray-700">Regions Covered</label>
            <button onClick={() => setShowRegionPicker(s => !s)}
              className="text-xs text-amber-600 hover:text-amber-700 font-medium">
              {showRegionPicker ? 'Hide states' : 'Pick from states'}
            </button>
          </div>

          {/* Selected regions */}
          <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
            {regions.map(r => (
              <span key={r} className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-100 rounded-full text-xs font-medium text-blue-700">
                {r}
                <button onClick={() => setRegions(prev => prev.filter(x => x !== r))} className="text-blue-300 hover:text-blue-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {regions.length === 0 && <p className="text-xs text-gray-400 italic">No regions — this zone won't match any address</p>}
          </div>

          {/* Area picker — grouped by Abuja proximity */}
          {showRegionPicker && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 mb-2 space-y-3 max-h-56 overflow-y-auto">
              {Object.entries(ABUJA_AREAS).map(([group, areas]) => {
                const available = areas.filter(a => !regions.includes(a));
                if (available.length === 0) return null;
                return (
                  <div key={group}>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{group}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {available.map(a => (
                        <button key={a} onClick={() => addRegion(a)}
                          className="px-2 py-0.5 border border-gray-200 bg-white rounded-full text-xs text-gray-600 hover:border-blue-300 hover:bg-blue-50 transition">
                          + {a}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Custom input */}
          <div className="flex gap-2">
            <input type="text" value={regionInput} onChange={e => setRegionInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRegion(regionInput); } }}
              placeholder="Add custom region, press Enter"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
            />
            <button onClick={() => addRegion(regionInput)} disabled={!regionInput.trim()}
              className="px-3 py-2 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200 disabled:opacity-40 transition">
              Add
            </button>
          </div>
        </div>

        {/* Shipping methods */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Shipping Methods</label>
            <button onClick={addNewMethod}
              className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700">
              <Plus className="w-3.5 h-3.5" /> Add Method
            </button>
          </div>

          {methods.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
              <Package className="w-8 h-8 mx-auto opacity-20 mb-2" />
              <p className="text-xs">No methods yet — add one above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {methods.map((m, i) => (
                <MethodRow
                  key={m._id || `new-${newMethodKey}-${i}`}
                  method={m}
                  onUpdate={updated => setMethods(prev => prev.map((x, j) => j === i ? updated : x))}
                  onDelete={() => setMethods(prev => prev.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          )}
        </div>

        {/* Save / Delete */}
        <div className="flex items-center gap-2 pb-4">
          <button onClick={handleSave} disabled={saving || !name.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-40 transition">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Zone
          </button>
          <button onClick={() => setShowDelete(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete "{zone.name}"?</h3>
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

// ── NewZonePanel ───────────────────────────────────────────────

function NewZonePanel({ onCreated }: { onCreated: (z: ShippingZone) => void }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const zone = await api.shipping.createZone({ name, isActive: true, regions: [], methods: [] });
      onCreated(zone);
      setName('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
        <MapPin className="w-7 h-7 text-amber-400" />
      </div>
      <div>
        <h3 className="font-bold text-gray-900">Create a Shipping Zone</h3>
        <p className="text-sm text-gray-400 mt-1">Zones define which regions you ship to and at what price</p>
      </div>
      <form onSubmit={handleCreate} className="w-full max-w-xs space-y-2">
        <input type="text" value={name} onChange={e => setName(e.target.value)} required
          placeholder="e.g. Lagos, Abuja, South-West…"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:border-amber-400"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button type="submit" disabled={saving || !name.trim()}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-40 transition">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Create Zone
        </button>
      </form>
    </div>
  );
}

// ── Rate Calculator ────────────────────────────────────────────

function RateCalculator() {
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [total, setTotal] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function calculate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // Pass area as both state and city so it matches against zone regions
      const res = await api.shipping.calculate(state, `${state} ${city}`.trim(), parseFloat(total) || 0);
      setResult(res);
    } catch (err: any) {
      setResult({ available: false, error: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <button className="w-full flex items-center gap-3 px-5 py-4 cursor-default">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-blue-500" />
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-gray-900">Rate Calculator</p>
          <p className="text-xs text-gray-400">Test what rates a customer would see</p>
        </div>
      </button>
      <div className="border-t border-gray-100 px-5 pb-4">
        <form onSubmit={calculate} className="space-y-2 mt-3">
          <div className="grid grid-cols-2 gap-2">
            <select value={state} onChange={e => setState(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400">
              <option value="">Area / State…</option>
              {Object.entries(ABUJA_AREAS).map(([group, areas]) => (
                <optgroup key={group} label={group}>
                  {areas.map(a => <option key={a} value={a}>{a}</option>)}
                </optgroup>
              ))}
            </select>
            <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Street / estate (optional)"
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
            />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₦</span>
            <input type="number" min={0} value={total} onChange={e => setTotal(e.target.value)} placeholder="Cart total"
              className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-amber-400"
            />
          </div>
          <button type="submit" disabled={loading || !state}
            className="w-full py-2 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-900 disabled:opacity-40">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Calculate Rates'}
          </button>
        </form>
        {result && (
          <div className="mt-3 space-y-2">
            {!result.available ? (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">✗ {result.error}</p>
            ) : (
              <>
                <p className="text-xs font-semibold text-gray-500">Zone: {result.zone?.name} · {result.processingDays}d processing</p>
                {result.methods?.map((m: any) => (
                  <div key={m._id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl text-sm">
                    <div>
                      <p className="font-medium text-gray-800">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.minDays}–{m.maxDays} days</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${m.isFree ? 'text-green-600' : 'text-gray-800'}`}>
                        {m.isFree ? 'FREE' : `₦${m.price.toLocaleString()}`}
                      </p>
                      {m.isFree && m.originalPrice > 0 && (
                        <p className="text-xs text-gray-400 line-through">₦{m.originalPrice.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                ))}
                {result.pickup && (
                  <div className="flex items-center justify-between p-2.5 bg-blue-50 rounded-xl text-sm">
                    <div>
                      <p className="font-medium text-blue-800">{result.pickup.name}</p>
                      {result.pickup.description && <p className="text-xs text-blue-500">{result.pickup.description}</p>}
                    </div>
                    <p className={`font-bold ${result.pickup.isFree ? 'text-green-600' : 'text-blue-700'}`}>
                      {result.pickup.isFree ? 'FREE' : `₦${result.pickup.price?.toLocaleString()}`}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export default function ShippingPage() {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [settings, setSettings] = useState<ShippingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | 'new'>('new');

  async function load() {
    setLoading(true);
    try {
      const { zones: z, settings: s } = await api.shipping.getAll();
      setZones(z);
      setSettings(s);
      if (z.length > 0 && selectedId === 'new') setSelectedId(z[0]._id);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const selected = selectedId === 'new' ? null : zones.find(z => z._id === selectedId) ?? null;

  function handleZoneSaved(updated: ShippingZone) {
    setZones(prev => prev.map(z => z._id === updated._id ? updated : z));
  }

  function handleZoneDeleted(id: string) {
    setZones(prev => prev.filter(z => z._id !== id));
    setSelectedId('new');
  }

  function handleZoneCreated(zone: ShippingZone) {
    setZones(prev => [...prev, zone]);
    setSelectedId(zone._id);
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-4">

        {/* Global settings + calculator row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            {settings && (
              <GlobalSettings settings={settings} onSaved={setSettings} />
            )}
          </div>
          <RateCalculator />
        </div>

        {/* Zones split-view */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 22rem)' }}>
          <div className="flex h-full">

            {/* Left: zones list */}
            <div className="w-64 flex-shrink-0 border-r border-gray-100 flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-500" /> Zones
                  {!loading && <span className="text-xs font-normal text-gray-400">({zones.length})</span>}
                </p>
                <button onClick={() => setSelectedId('new')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition ${selectedId === 'new' ? 'bg-amber-100 text-amber-700' : 'bg-amber-500 text-white hover:bg-amber-600'}`}>
                  <Plus className="w-3 h-3" /> New
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
                ) : zones.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">No zones yet</p>
                ) : (
                  zones.map(z => (
                    <button key={z._id} onClick={() => setSelectedId(z._id)}
                      className={`w-full flex items-center gap-2.5 px-4 py-3 border-b border-gray-50 text-left transition ${selectedId === z._id ? 'bg-amber-50 border-l-2 border-l-amber-400' : 'hover:bg-gray-50'}`}>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${z.isActive ? 'bg-green-400' : 'bg-gray-300'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{z.name}</p>
                        <p className="text-xs text-gray-400">
                          {z.methods.filter(m => m.isActive).length} method{z.methods.filter(m => m.isActive).length !== 1 ? 's' : ''} · {z.regions.length} region{z.regions.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Right: zone editor */}
            <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
              {selected ? (
                <ZoneDetail key={selected._id} zone={selected} onSaved={handleZoneSaved} onDeleted={handleZoneDeleted} />
              ) : (
                <NewZonePanel onCreated={handleZoneCreated} />
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

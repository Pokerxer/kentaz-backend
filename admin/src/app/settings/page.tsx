'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Save, Globe, CreditCard, Truck } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'shipping', label: 'Shipping', icon: Truck },
  ];

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your store settings</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-64 flex-shrink-0">
          <nav className="flex lg:flex-col gap-2 lg:space-y-1 overflow-x-auto lg:overflow-visible">
            {tabs.map((tab) => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)} 
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-[#C9A84C]/10 text-[#C9A84C]' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <tab.icon className="h-4 w-4" /> 
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 rounded-lg border bg-white p-6">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
                <input type="text" defaultValue="Kentaz" className="w-full rounded-lg border p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Store URL</label>
                <input type="url" defaultValue="https://kentaz.com" className="w-full rounded-lg border p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select className="w-full rounded-lg border p-2.5 text-sm">
                  <option>NGN - Nigerian Naira</option>
                  <option>USD - US Dollar</option>
                  <option>GBP - British Pound</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <span className="text-green-700 font-bold text-sm">₦</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Paystack</p>
                    <p className="text-sm text-gray-500">Nigerian payments</p>
                  </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" className="peer sr-only" defaultChecked />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-[#C9A84C] peer-checked:after:translate-x-full"></div>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="font-medium text-gray-900">Standard Shipping</p>
                    <p className="text-sm text-gray-500">3-5 business days</p>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
                    <input type="number" defaultValue="2500" className="w-full rounded-lg border p-2 pl-8 text-sm" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between border-t pt-6">
            {saved && <span className="text-sm text-green-600">Settings saved!</span>}
            <div className="ml-auto">
              <button onClick={handleSave} className="flex items-center gap-2 rounded-lg bg-[#C9A84C] px-4 py-2 text-sm font-medium text-white hover:bg-[#B8953F]">
                <Save className="h-4 w-4" /> Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

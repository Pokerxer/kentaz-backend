'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Save, Globe, CreditCard, Truck, Bell, Shield,
  Mail, MessageSquare, AlertTriangle, Clock
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [storeSettings, setStoreSettings] = useState({
    storeName: 'Kentaz',
    storeUrl: 'https://kentaz.com',
    currency: 'NGN',
    timezone: 'Africa/Lagos',
    email: 'admin@kentaz.com',
    phone: '+234',
  });

  const [paymentSettings, setPaymentSettings] = useState({
    paystackEnabled: true,
    paystackPublicKey: '',
    paystackSecretKey: '',
    codEnabled: true,
    codFee: 0,
  });

  const [shippingSettings, setShippingSettings] = useState({
    enableShipping: true,
    defaultProcessingDays: 3,
    freeShippingThreshold: 50000,
    standardShippingFee: 2500,
    expressShippingFee: 5000,
    allowPickup: true,
    pickupAddress: '',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailOrders: true,
    emailLowStock: true,
    emailLowStockThreshold: 10,
    emailDailyDigest: false,
    pushNewOrders: true,
    pushLowStock: true,
    pushDailyReport: false,
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    sessionTimeout: 60,
    passwordMinLength: 8,
    requireUppercase: true,
    requireNumbers: true,
    ipWhitelist: '',
  });

  const tabs = [
    { id: 'general', label: 'Store Info', icon: Globe },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'shipping', label: 'Shipping', icon: Truck },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  const handleSave = () => {
    setSaving(true);
    // Simulate API call
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 800);
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your store settings</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-64 flex-shrink-0">
          <nav className="flex lg:flex-col gap-2 lg:space-y-1 overflow-x-auto lg:overflow-visible pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-[#C9A84C]/10 text-[#C9A84C]' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 rounded-lg border bg-white p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Store Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
                    <input
                      type="text"
                      value={storeSettings.storeName}
                      onChange={(e) => setStoreSettings({ ...storeSettings, storeName: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Store URL</label>
                    <input
                      type="url"
                      value={storeSettings.storeUrl}
                      onChange={(e) => setStoreSettings({ ...storeSettings, storeUrl: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <select
                      value={storeSettings.currency}
                      onChange={(e) => setStoreSettings({ ...storeSettings, currency: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent outline-none"
                    >
                      <option value="NGN">NGN - Nigerian Naira</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="EUR">EUR - Euro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                    <select
                      value={storeSettings.timezone}
                      onChange={(e) => setStoreSettings({ ...storeSettings, timezone: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent outline-none"
                    >
                      <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                      <option value="Africa/London">Europe/London (GMT)</option>
                      <option value="America/New_York">America/New York (EST)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={storeSettings.email}
                      onChange={(e) => setStoreSettings({ ...storeSettings, email: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      value={storeSettings.phone}
                      onChange={(e) => setStoreSettings({ ...storeSettings, phone: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <span className="text-green-700 font-bold text-sm">₦</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Paystack</p>
                    <p className="text-sm text-gray-500">Accept Nigerian payments</p>
                  </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={paymentSettings.paystackEnabled}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, paystackEnabled: e.target.checked })}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-[#C9A84C] peer-checked:after:translate-x-full"></div>
                </label>
              </div>

              {paymentSettings.paystackEnabled && (
                <div className="space-y-4 pl-14">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Public Key</label>
                    <input
                      type="text"
                      placeholder="pk_test_..."
                      value={paymentSettings.paystackPublicKey}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, paystackPublicKey: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Secret Key</label>
                    <input
                      type="password"
                      placeholder="sk_test_..."
                      value={paymentSettings.paystackSecretKey}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, paystackSecretKey: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-blue-700" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Cash on Delivery</p>
                    <p className="text-sm text-gray-500">Allow COD payments</p>
                  </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={paymentSettings.codEnabled}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, codEnabled: e.target.checked })}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-[#C9A84C] peer-checked:after:translate-x-full"></div>
                </label>
              </div>

              {paymentSettings.codEnabled && (
                <div className="pl-14">
                  <label className="block text-sm font-medium text-gray-700 mb-1">COD Fee (NGN)</label>
                  <input
                    type="number"
                    value={paymentSettings.codFee}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, codFee: parseInt(e.target.value) || 0 })}
                    className="w-full md:w-48 rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium text-gray-900">Enable Shipping</p>
                  <p className="text-sm text-gray-500">Allow customers to ship orders</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={shippingSettings.enableShipping}
                    onChange={(e) => setShippingSettings({ ...shippingSettings, enableShipping: e.target.checked })}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-[#C9A84C] peer-checked:after:translate-x-full"></div>
                </label>
              </div>

              {shippingSettings.enableShipping && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Default Processing Days</label>
                    <input
                      type="number"
                      min="1"
                      max="14"
                      value={shippingSettings.defaultProcessingDays}
                      onChange={(e) => setShippingSettings({ ...shippingSettings, defaultProcessingDays: parseInt(e.target.value) || 1 })}
                      className="w-full md:w-32 rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">Days to process orders before shipping</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-lg border p-4">
                      <p className="font-medium text-gray-900 mb-3">Standard Shipping</p>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
                        <input
                          type="number"
                          value={shippingSettings.standardShippingFee}
                          onChange={(e) => setShippingSettings({ ...shippingSettings, standardShippingFee: parseInt(e.target.value) || 0 })}
                          className="w-full rounded-lg border border-gray-300 p-2 pl-8 text-sm focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent outline-none"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">3-5 business days</p>
                    </div>

                    <div className="rounded-lg border p-4">
                      <p className="font-medium text-gray-900 mb-3">Express Shipping</p>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
                        <input
                          type="number"
                          value={shippingSettings.expressShippingFee}
                          onChange={(e) => setShippingSettings({ ...shippingSettings, expressShippingFee: parseInt(e.target.value) || 0 })}
                          className="w-full rounded-lg border border-gray-300 p-2 pl-8 text-sm focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent outline-none"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">1-2 business days</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Free Shipping Threshold (NGN)</label>
                    <input
                      type="number"
                      value={shippingSettings.freeShippingThreshold}
                      onChange={(e) => setShippingSettings({ ...shippingSettings, freeShippingThreshold: parseInt(e.target.value) || 0 })}
                      className="w-full md:w-48 rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">Orders above this amount ship free</p>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium text-gray-900">Allow Store Pickup</p>
                      <p className="text-sm text-gray-500">Customers can pick up orders</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={shippingSettings.allowPickup}
                        onChange={(e) => setShippingSettings({ ...shippingSettings, allowPickup: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-[#C9A84C] peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Mail className="h-5 w-5" /> Email Notifications
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium text-gray-900">New Orders</p>
                      <p className="text-sm text-gray-500">Get email for new orders</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={notificationSettings.emailOrders}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, emailOrders: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-[#C9A84C] peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Low Stock Alerts</p>
                      <p className="text-sm text-gray-500">Alert when products are running low</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        value={notificationSettings.emailLowStockThreshold}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, emailLowStockThreshold: parseInt(e.target.value) || 10 })}
                        className="w-20 rounded-lg border border-gray-300 p-2 text-sm text-center"
                        disabled={!notificationSettings.emailLowStock}
                      />
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={notificationSettings.emailLowStock}
                          onChange={(e) => setNotificationSettings({ ...notificationSettings, emailLowStock: e.target.checked })}
                          className="peer sr-only"
                        />
                        <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-[#C9A84C] peer-checked:after:translate-x-full"></div>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium text-gray-900">Daily Summary</p>
                      <p className="text-sm text-gray-500">Receive daily sales digest</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={notificationSettings.emailDailyDigest}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, emailDailyDigest: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-[#C9A84C] peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Bell className="h-5 w-5" /> Push Notifications
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium text-gray-900">New Orders</p>
                      <p className="text-sm text-gray-500">Browser notifications for orders</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={notificationSettings.pushNewOrders}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, pushNewOrders: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-[#C9A84C] peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium text-gray-900">Low Stock Alerts</p>
                      <p className="text-sm text-gray-500">Browser notifications for low stock</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={notificationSettings.pushLowStock}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, pushLowStock: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-[#C9A84C] peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                  <p className="text-sm text-gray-500">Require 2FA for all admin logins</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={securitySettings.twoFactorEnabled}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, twoFactorEnabled: e.target.checked })}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-[#C9A84C] peer-checked:after:translate-x-full"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  max="480"
                  value={securitySettings.sessionTimeout}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) || 60 })}
                  className="w-full md:w-32 rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-logout after inactivity</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Password Requirements</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Length</label>
                    <input
                      type="number"
                      min="6"
                      max="32"
                      value={securitySettings.passwordMinLength}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, passwordMinLength: parseInt(e.target.value) || 8 })}
                      className="w-full md:w-32 rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium text-gray-900">Require Uppercase</p>
                      <p className="text-sm text-gray-500">At least one uppercase letter</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={securitySettings.requireUppercase}
                        onChange={(e) => setSecuritySettings({ ...securitySettings, requireUppercase: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-[#C9A84C] peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium text-gray-900">Require Numbers</p>
                      <p className="text-sm text-gray-500">At least one number</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={securitySettings.requireNumbers}
                        onChange={(e) => setSecuritySettings({ ...securitySettings, requireNumbers: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-[#C9A84C] peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Shield className="h-4 w-4" /> IP Whitelist
                </label>
                <textarea
                  value={securitySettings.ipWhitelist}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, ipWhitelist: e.target.value })}
                  placeholder="e.g., 192.168.1.1, 10.0.0.0/24"
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Comma-separated IP addresses or CIDR ranges. Leave empty to allow all.</p>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between border-t pt-6">
            {saved && <span className="text-sm text-green-600">Settings saved!</span>}
            <div className="ml-auto">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-[#C9A84C] px-4 py-2 text-sm font-medium text-white hover:bg-[#B8953F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

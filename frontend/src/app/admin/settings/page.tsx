'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Settings,
  Shield,
  Database,
  Bell,
  Mail,
  Globe,
  Key,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Upload,
  Download,
  Trash2,
  Plus,
  Edit,
  Eye,
  EyeOff
} from 'lucide-react';

interface SystemSettings {
  platform: {
    name: string;
    description: string;
    domain: string;
    supportEmail: string;
    maintenanceMode: boolean;
  };
  security: {
    sessionTimeout: number;
    passwordMinLength: number;
    twoFactorAuth: boolean;
    ipWhitelist: string[];
    allowedOrigins: string[];
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    adminAlerts: boolean;
  };
  backups: {
    autoBackup: boolean;
    backupFrequency: string;
    retentionDays: number;
    lastBackup: string;
    backupLocation: string;
  };
}

export default function PlatformSettings() {
  const { hasPermission } = useAuth();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('platform');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        // Show success message
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const createBackup = async () => {
    try {
      const response = await fetch('/api/admin/backup', {
        method: 'POST'
      });
      
      if (response.ok) {
        fetchSettings();
      }
    } catch (error) {
      console.error('Failed to create backup:', error);
    }
  };

  const restoreBackup = async (backupFile: File) => {
    try {
      const formData = new FormData();
      formData.append('backup', backupFile);

      const response = await fetch('/api/admin/restore', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        fetchSettings();
      }
    } catch (error) {
      console.error('Failed to restore backup:', error);
    }
  };

  if (loading && !settings) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'platform', label: 'Platform', icon: Globe },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'backups', label: 'Backups', icon: Database }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Platform Settings</h1>
          <p className="text-gray-600">Configure system-wide settings and preferences</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'platform' && settings && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Platform Name
                    </label>
                    <input
                      type="text"
                      value={settings.platform.name}
                      onChange={(e) => setSettings(prev => prev ? {
                        ...prev,
                        platform: { ...prev.platform, name: e.target.value }
                      } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Support Email
                    </label>
                    <input
                      type="email"
                      value={settings.platform.supportEmail}
                      onChange={(e) => setSettings(prev => prev ? {
                        ...prev,
                        platform: { ...prev.platform, supportEmail: e.target.value }
                      } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={settings.platform.description}
                      onChange={(e) => setSettings(prev => prev ? {
                        ...prev,
                        platform: { ...prev.platform, description: e.target.value }
                      } : null)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Domain
                    </label>
                    <input
                      type="text"
                      value={settings.platform.domain}
                      onChange={(e) => setSettings(prev => prev ? {
                        ...prev,
                        platform: { ...prev.platform, domain: e.target.value }
                      } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="maintenance"
                      checked={settings.platform.maintenanceMode}
                      onChange={(e) => setSettings(prev => prev ? {
                        ...prev,
                        platform: { ...prev.platform, maintenanceMode: e.target.checked }
                      } : null)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="maintenance" className="ml-2 block text-sm text-gray-700">
                      Maintenance Mode
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && settings && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Session Timeout (minutes)
                    </label>
                    <input
                      type="number"
                      value={settings.security.sessionTimeout}
                      onChange={(e) => setSettings(prev => prev ? {
                        ...prev,
                        security: { ...prev.security, sessionTimeout: parseInt(e.target.value) }
                      } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Password Length
                    </label>
                    <input
                      type="number"
                      value={settings.security.passwordMinLength}
                      onChange={(e) => setSettings(prev => prev ? {
                        ...prev,
                        security: { ...prev.security, passwordMinLength: parseInt(e.target.value) }
                      } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="2fa"
                      checked={settings.security.twoFactorAuth}
                      onChange={(e) => setSettings(prev => prev ? {
                        ...prev,
                        security: { ...prev.security, twoFactorAuth: e.target.checked }
                      } : null)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="2fa" className="ml-2 block text-sm text-gray-700">
                      Enable Two-Factor Authentication
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">IP Whitelist</h4>
                <div className="space-y-2">
                  {settings.security.ipWhitelist.map((ip, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={ip}
                        onChange={(e) => {
                          const newIps = [...settings.security.ipWhitelist];
                          newIps[index] = e.target.value;
                          setSettings(prev => prev ? {
                            ...prev,
                            security: { ...prev.security, ipWhitelist: newIps }
                          } : null);
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => {
                          const newIps = settings.security.ipWhitelist.filter((_, i) => i !== index);
                          setSettings(prev => prev ? {
                            ...prev,
                            security: { ...prev.security, ipWhitelist: newIps }
                          } : null);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setSettings(prev => prev ? {
                      ...prev,
                      security: { ...prev.security, ipWhitelist: [...prev.security.ipWhitelist, ''] }
                    } : null)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add IP Address
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Allowed Origins</h4>
                <div className="space-y-2">
                  {settings.security.allowedOrigins.map((origin, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={origin}
                        onChange={(e) => {
                          const newOrigins = [...settings.security.allowedOrigins];
                          newOrigins[index] = e.target.value;
                          setSettings(prev => prev ? {
                            ...prev,
                            security: { ...prev.security, allowedOrigins: newOrigins }
                          } : null);
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => {
                          const newOrigins = settings.security.allowedOrigins.filter((_, i) => i !== index);
                          setSettings(prev => prev ? {
                            ...prev,
                            security: { ...prev.security, allowedOrigins: newOrigins }
                          } : null);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setSettings(prev => prev ? {
                      ...prev,
                      security: { ...prev.security, allowedOrigins: [...prev.security.allowedOrigins, ''] }
                    } : null)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add Origin
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && settings && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-md font-medium text-gray-900">Email Notifications</h4>
                      <p className="text-sm text-gray-600">Send notifications via email</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.emailNotifications}
                      onChange={(e) => setSettings(prev => prev ? {
                        ...prev,
                        notifications: { ...prev.notifications, emailNotifications: e.target.checked }
                      } : null)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-md font-medium text-gray-900">Push Notifications</h4>
                      <p className="text-sm text-gray-600">Send push notifications to users</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.pushNotifications}
                      onChange={(e) => setSettings(prev => prev ? {
                        ...prev,
                        notifications: { ...prev.notifications, pushNotifications: e.target.checked }
                      } : null)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-md font-medium text-gray-900">SMS Notifications</h4>
                      <p className="text-sm text-gray-600">Send notifications via SMS</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.smsNotifications}
                      onChange={(e) => setSettings(prev => prev ? {
                        ...prev,
                        notifications: { ...prev.notifications, smsNotifications: e.target.checked }
                      } : null)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-md font-medium text-gray-900">Admin Alerts</h4>
                      <p className="text-sm text-gray-600">Send critical alerts to administrators</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.adminAlerts}
                      onChange={(e) => setSettings(prev => prev ? {
                        ...prev,
                        notifications: { ...prev.notifications, adminAlerts: e.target.checked }
                      } : null)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backups' && settings && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Backup Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="autoBackup"
                      checked={settings.backups.autoBackup}
                      onChange={(e) => setSettings(prev => prev ? {
                        ...prev,
                        backups: { ...prev.backups, autoBackup: e.target.checked }
                      } : null)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="autoBackup" className="ml-2 block text-sm text-gray-700">
                      Automatic Backups
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Backup Frequency
                    </label>
                    <select
                      value={settings.backups.backupFrequency}
                      onChange={(e) => setSettings(prev => prev ? {
                        ...prev,
                        backups: { ...prev.backups, backupFrequency: e.target.value }
                      } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Retention Days
                    </label>
                    <input
                      type="number"
                      value={settings.backups.retentionDays}
                      onChange={(e) => setSettings(prev => prev ? {
                        ...prev,
                        backups: { ...prev.backups, retentionDays: parseInt(e.target.value) }
                      } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Backup Location
                    </label>
                    <input
                      type="text"
                      value={settings.backups.backupLocation}
                      onChange={(e) => setSettings(prev => prev ? {
                        ...prev,
                        backups: { ...prev.backups, backupLocation: e.target.value }
                      } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Backup Operations</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h5 className="font-medium text-gray-900">Last Backup</h5>
                      <p className="text-sm text-gray-600">
                        {settings.backups.lastBackup ? new Date(settings.backups.lastBackup).toLocaleString() : 'No backup yet'}
                      </p>
                    </div>
                    <button
                      onClick={createBackup}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Create Backup
                    </button>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">Restore from backup file</p>
                        <input
                          type="file"
                          accept=".backup,.sql"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) restoreBackup(file);
                          }}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Automation Settings Component
 * Simplified version without design system dependencies
 */

import React, { useState, useEffect } from 'react';

export const AutomationSettings: React.FC = () => {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/tabellen-eintrag/admin/settings');
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

    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      const response = await fetch('/api/tabellen-eintrag/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        alert('Settings saved successfully');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    }
  };

  if (loading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div style={{ padding: '16px' }}>
      <h3 style={{ marginBottom: '16px' }}>Automation Settings</h3>
      
      <div style={{ marginBottom: '16px' }}>
        <label>
          <input
            type="checkbox"
            checked={settings.enabled || false}
            onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
          />
          <span style={{ marginLeft: '8px' }}>Enable Automation</span>
        </label>
      </div>

      <button
        onClick={handleSave}
        style={{
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Save Settings
      </button>
    </div>
  );
};

export default AutomationSettings;
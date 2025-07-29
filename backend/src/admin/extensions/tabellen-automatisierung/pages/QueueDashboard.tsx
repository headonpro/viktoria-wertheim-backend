/**
 * Queue Dashboard Admin Page
 * Simplified version without design system dependencies
 */

import React, { useState } from 'react';
import { QueueMonitor } from '../components/QueueMonitor';
import { SystemHealthMonitor } from '../components/SystemHealthMonitor';
import { SnapshotManager } from '../components/SnapshotManager';
import { MonitoringDashboard } from '../components/MonitoringDashboard';

interface QueueDashboardProps {
  onBack?: () => void;
}

export const QueueDashboard: React.FC<QueueDashboardProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { id: 'queue', label: 'Queue Monitor' },
    { id: 'health', label: 'System Health' },
    { id: 'snapshots', label: 'Snapshots' },
    { id: 'monitoring', label: 'Monitoring' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return <QueueMonitor refreshInterval={3000} showHistory={true} maxHistoryItems={50} />;
      case 1:
        return <SystemHealthMonitor refreshInterval={10000} />;
      case 2:
        return <SnapshotManager />;
      case 3:
        return <MonitoringDashboard />;
      default:
        return <div>Tab not found</div>;
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        {onBack && (
          <button 
            onClick={onBack}
            style={{
              background: 'none',
              border: '1px solid #ddd',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '16px'
            }}
          >
            ← Back
          </button>
        )}
        <h1 style={{ display: 'inline', fontSize: '24px', fontWeight: '600' }}>
          Tabellen-Automatisierung Dashboard
        </h1>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ borderBottom: '1px solid #ddd' }}>
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(index)}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: activeTab === index ? '#f8f9fa' : 'transparent',
                borderBottom: activeTab === index ? '2px solid #007bff' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === index ? '600' : '400'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ minHeight: '400px' }}>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default QueueDashboard;
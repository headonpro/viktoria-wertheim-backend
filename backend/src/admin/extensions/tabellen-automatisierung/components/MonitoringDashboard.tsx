/**
 * Monitoring Dashboard Component
 * Simplified version without design system dependencies
 */

import React, { useState, useEffect } from 'react';

export const MonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/tabellen-eintrag/monitoring/metrics');
        if (response.ok) {
          const data = await response.json();
          setMetrics(data);
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return <div>Loading monitoring data...</div>;
  }

  return (
    <div style={{ padding: '16px' }}>
      <h3 style={{ marginBottom: '16px' }}>Monitoring Dashboard</h3>
      
      {metrics ? (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <strong>System Status:</strong> {metrics.status || 'Unknown'}
          </div>
          <div style={{ marginBottom: '16px' }}>
            <strong>Last Updated:</strong> {new Date().toLocaleString()}
          </div>
        </div>
      ) : (
        <div>No monitoring data available</div>
      )}
    </div>
  );
};

export default MonitoringDashboard;
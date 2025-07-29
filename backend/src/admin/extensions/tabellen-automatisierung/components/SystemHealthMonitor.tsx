/**
 * System Health Monitor Component
 * Simplified version without design system dependencies
 */

import React, { useState, useEffect } from 'react';

interface SystemHealthMonitorProps {
  refreshInterval?: number;
}

export const SystemHealthMonitor: React.FC<SystemHealthMonitorProps> = ({
  refreshInterval = 10000
}) => {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealthStatus = async () => {
      try {
        const response = await fetch('/api/tabellen-eintrag/monitoring/health');
        if (response.ok) {
          const data = await response.json();
          setHealthStatus(data);
        }
      } catch (error) {
        console.error('Failed to fetch health status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHealthStatus();
    const interval = setInterval(fetchHealthStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  if (loading) {
    return <div>Loading system health...</div>;
  }

  return (
    <div style={{ padding: '16px' }}>
      <h3 style={{ marginBottom: '16px' }}>System Health</h3>
      
      {healthStatus ? (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <strong>Overall Status:</strong> 
            <span style={{ 
              color: healthStatus.overall === 'healthy' ? 'green' : 'red',
              marginLeft: '8px'
            }}>
              {healthStatus.overall || 'Unknown'}
            </span>
          </div>
          
          {healthStatus.components && (
            <div>
              <h4>Components:</h4>
              {healthStatus.components.map((component: any, index: number) => (
                <div key={index} style={{ marginBottom: '8px', paddingLeft: '16px' }}>
                  <strong>{component.name}:</strong> 
                  <span style={{ 
                    color: component.status === 'healthy' ? 'green' : 'red',
                    marginLeft: '8px'
                  }}>
                    {component.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>No health status available</div>
      )}
    </div>
  );
};

export default SystemHealthMonitor;
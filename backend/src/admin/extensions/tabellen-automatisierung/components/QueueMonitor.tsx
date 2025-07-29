/**
 * Queue Monitor Component
 * Simplified version without design system dependencies
 */

import React, { useState, useEffect } from 'react';

interface QueueMonitorProps {
  refreshInterval?: number;
  showHistory?: boolean;
  maxHistoryItems?: number;
}

export const QueueMonitor: React.FC<QueueMonitorProps> = ({
  refreshInterval = 5000,
  showHistory = false,
  maxHistoryItems = 20
}) => {
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQueueStatus = async () => {
      try {
        const response = await fetch('/api/tabellen-eintrag/admin/queue-status');
        if (response.ok) {
          const data = await response.json();
          setQueueStatus(data);
        }
      } catch (error) {
        console.error('Failed to fetch queue status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQueueStatus();
    const interval = setInterval(fetchQueueStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  if (loading) {
    return <div>Loading queue status...</div>;
  }

  return (
    <div style={{ padding: '16px' }}>
      <h3 style={{ marginBottom: '16px' }}>Queue Monitor</h3>
      
      {queueStatus ? (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <strong>Status:</strong> {queueStatus.status || 'Unknown'}
          </div>
          <div style={{ marginBottom: '16px' }}>
            <strong>Pending Jobs:</strong> {queueStatus.pendingJobs || 0}
          </div>
          <div style={{ marginBottom: '16px' }}>
            <strong>Processing Jobs:</strong> {queueStatus.processingJobs || 0}
          </div>
        </div>
      ) : (
        <div>No queue status available</div>
      )}
    </div>
  );
};

export default QueueMonitor;
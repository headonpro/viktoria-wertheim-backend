/**
 * Snapshot Manager Component
 * Simplified version without design system dependencies
 */

import React, { useState, useEffect } from 'react';

export const SnapshotManager: React.FC = () => {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSnapshots = async () => {
      try {
        const response = await fetch('/api/tabellen-eintrag/admin/snapshots');
        if (response.ok) {
          const data = await response.json();
          setSnapshots(data.snapshots || []);
        }
      } catch (error) {
        console.error('Failed to fetch snapshots:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSnapshots();
  }, []);

  if (loading) {
    return <div>Loading snapshots...</div>;
  }

  return (
    <div style={{ padding: '16px' }}>
      <h3 style={{ marginBottom: '16px' }}>Snapshot Manager</h3>
      
      {snapshots.length > 0 ? (
        <div>
          {snapshots.map((snapshot, index) => (
            <div key={index} style={{ 
              border: '1px solid #ddd', 
              padding: '12px', 
              marginBottom: '8px',
              borderRadius: '4px'
            }}>
              <div><strong>ID:</strong> {snapshot.id}</div>
              <div><strong>Liga:</strong> {snapshot.ligaId}</div>
              <div><strong>Created:</strong> {new Date(snapshot.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      ) : (
        <div>No snapshots available</div>
      )}
    </div>
  );
};

export default SnapshotManager;
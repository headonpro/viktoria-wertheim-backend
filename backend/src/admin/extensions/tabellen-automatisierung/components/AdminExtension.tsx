/**
 * Admin Panel Extension for Tabellen-Automatisierung
 * Integrates manual recalculation functionality into the Liga admin panel
 */

import React from 'react';
import { RecalculateButton } from './RecalculateButton';

interface AdminExtensionProps {
  ligaId: number;
  ligaName: string;
}

export const AdminExtension: React.FC<AdminExtensionProps> = ({
  ligaId,
  ligaName
}) => {
  const handleRecalculationSuccess = (response: any) => {
    // Could trigger notifications or other UI updates
    console.log('Recalculation started successfully:', response);
  };

  const handleRecalculationError = (error: string) => {
    // Could trigger error notifications
    console.error('Recalculation failed:', error);
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        padding: '16px',
        marginTop: '16px'
      }}
    >
      <h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: '600' }}>
        Tabellen-Automatisierung
      </h3>
      
      <p style={{ marginBottom: '16px', color: '#666', fontSize: '14px' }}>
        Manuelle Steuerung der automatischen Tabellenberechnung für diese Liga.
      </p>

      <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #eee' }} />

      <RecalculateButton
        ligaId={ligaId}
        ligaName={ligaName}
        onSuccess={handleRecalculationSuccess}
        onError={handleRecalculationError}
      />

      <p style={{ marginTop: '8px', color: '#999', fontSize: '12px' }}>
        Die Tabellenberechnung wird automatisch ausgeführt, wenn Spielergebnisse 
        eingetragen werden. Verwenden Sie diese Funktion nur bei Problemen oder 
        nach Datenmigrationen.
      </p>
    </div>
  );
};

export default AdminExtension;
/**
 * Manual Recalculation Button Component
 * Simplified version without design system dependencies
 */

import React, { useState } from 'react';

interface RecalculateButtonProps {
  ligaId: number;
  ligaName: string;
  onSuccess?: (response: any) => void;
  onError?: (error: string) => void;
}

interface RecalculationState {
  isLoading: boolean;
  result: any | null;
  error: string | null;
  showResult: boolean;
}

export const RecalculateButton: React.FC<RecalculateButtonProps> = ({
  ligaId,
  ligaName,
  onSuccess,
  onError
}) => {
  const [state, setState] = useState<RecalculationState>({
    isLoading: false,
    result: null,
    error: null,
    showResult: false
  });

  const handleRecalculate = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null, result: null }));

    try {
      const response = await fetch(`/api/tabellen-eintrag/admin/recalculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ligaId })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        result, 
        showResult: true 
      }));

      onSuccess?.(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage,
        showResult: true 
      }));
      onError?.(errorMessage);
    }
  };

  const handleDismiss = () => {
    setState(prev => ({ ...prev, showResult: false, error: null, result: null }));
  };

  return (
    <div>
      <button
        onClick={handleRecalculate}
        disabled={state.isLoading}
        style={{
          backgroundColor: state.isLoading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: state.isLoading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '500'
        }}
      >
        {state.isLoading ? 'Calculating...' : `Recalculate ${ligaName}`}
      </button>

      {state.showResult && (
        <div style={{ marginTop: '12px' }}>
          {state.error && (
            <div style={{
              backgroundColor: '#f8d7da',
              color: '#721c24',
              padding: '12px',
              borderRadius: '4px',
              border: '1px solid #f5c6cb'
            }}>
              <strong>Error:</strong> {state.error}
              <button 
                onClick={handleDismiss}
                style={{
                  float: 'right',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                ×
              </button>
            </div>
          )}

          {state.result && (
            <div style={{
              backgroundColor: '#d4edda',
              color: '#155724',
              padding: '12px',
              borderRadius: '4px',
              border: '1px solid #c3e6cb'
            }}>
              <strong>Success!</strong> Recalculation completed.
              <button 
                onClick={handleDismiss}
                style={{
                  float: 'right',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecalculateButton;
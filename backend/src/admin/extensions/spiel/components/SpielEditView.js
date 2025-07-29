import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Grid, 
  GridItem, 
  Typography, 
  Divider,
  Alert,
  Button,
  Badge,
  Flex
} from '@strapi/design-system';
import { CheckCircle, ExclamationMarkCircle, Refresh } from '@strapi/icons';
import { useFetchClient } from '@strapi/helper-plugin';
import ClubSelect from './ClubSelect';
import ValidationDialog from './ValidationDialog';
import ConfirmationDialog from './ConfirmationDialog';

const SpielEditView = ({ 
  modifiedData, 
  onChange, 
  errors = {},
  onSave = null,
  isCreating = false
}) => {
  const [ligaId, setLigaId] = useState(null);
  const [validationState, setValidationState] = useState({
    heimClub: { isValid: true, errors: [], warnings: [] },
    gastClub: { isValid: true, errors: [], warnings: [] },
    overall: { isValid: true, errors: [], warnings: [] }
  });
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [confirmationOperation, setConfirmationOperation] = useState('save');
  const [isValidating, setIsValidating] = useState(false);
  const { get, post } = useFetchClient();

  // Extract liga ID from the form data
  useEffect(() => {
    if (modifiedData.liga) {
      setLigaId(modifiedData.liga);
    }
  }, [modifiedData.liga]);

  // Comprehensive game validation
  const validateGame = useCallback(async (gameData = modifiedData) => {
    setIsValidating(true);
    try {
      const response = await post('/api/spiel/validate', gameData);
      return response.data;
    } catch (error) {
      console.error('Validation error:', error);
      return {
        isValid: false,
        errors: [{ field: 'general', message: `Validierungsfehler: ${error.message}` }],
        warnings: []
      };
    } finally {
      setIsValidating(false);
    }
  }, [modifiedData, post]);

  // Handle club validation state changes
  const handleClubValidationChange = (field) => (validationResult) => {
    setValidationState(prev => ({
      ...prev,
      [field]: validationResult,
      overall: {
        isValid: validationResult.isValid && prev[field === 'heimClub' ? 'gastClub' : 'heimClub'].isValid,
        errors: [
          ...prev[field === 'heimClub' ? 'gastClub' : 'heimClub'].errors,
          ...validationResult.errors
        ],
        warnings: [
          ...prev[field === 'heimClub' ? 'gastClub' : 'heimClub'].warnings,
          ...validationResult.warnings
        ]
      }
    }));
  };

  const handleClubChange = (field) => (event) => {
    onChange({
      target: {
        name: field,
        value: event.target.value,
        type: 'relation'
      }
    });
  };

  // Validate entire game before save
  const handleValidateAndSave = async () => {
    const validation = await validateGame();
    
    // Update validation state for inline display
    setValidationState(prev => ({
      ...prev,
      overall: validation
    }));
    
    // Show confirmation dialog with validation results
    setConfirmationOperation(isCreating ? 'create' : 'save');
    setShowConfirmationDialog(true);
  };

  // Handle delete operation
  const handleDelete = async () => {
    setConfirmationOperation('delete');
    setShowConfirmationDialog(true);
  };

  // Confirm operation after validation
  const handleConfirmOperation = async () => {
    setShowConfirmationDialog(false);
    
    if (confirmationOperation === 'delete') {
      // Handle delete operation
      if (onDelete) {
        await onDelete();
      }
    } else {
      // Handle save/create operation
      if (onSave) {
        await onSave();
      }
    }
  };

  // Enhanced validation with better error handling
  const handleRealTimeValidation = async () => {
    if (!modifiedData.heim_club || !modifiedData.gast_club) {
      return;
    }
    
    try {
      const validation = await validateGame();
      setValidationState(prev => ({
        ...prev,
        overall: validation
      }));
    } catch (error) {
      console.error('Real-time validation failed:', error);
    }
  };

  // Check if we're using team-based or club-based system
  const hasTeamData = modifiedData.heim_team || modifiedData.gast_team;
  const hasClubData = modifiedData.heim_club || modifiedData.gast_club;

  return (
    <Box>
      {/* Header with validation status */}
      <Flex justifyContent="space-between" alignItems="center" marginBottom={4}>
        <Box>
          <Typography variant="beta" as="h2">
            Mannschaften/Clubs
          </Typography>
          <Typography variant="omega" textColor="neutral600">
            Wählen Sie entweder Teams (alte Methode) oder Clubs (neue Methode) aus
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          {/* Validation status indicator */}
          <Badge
            backgroundColor={validationState.overall.isValid ? 'success100' : 'danger100'}
            textColor={validationState.overall.isValid ? 'success600' : 'danger600'}
            size="S"
          >
            {validationState.overall.isValid ? (
              <>
                <CheckCircle width="12px" height="12px" /> Gültig
              </>
            ) : (
              <>
                <ExclamationMarkCircle width="12px" height="12px" /> Fehler
              </>
            )}
          </Badge>
          
          {/* Validate button */}
          <Button
            size="S"
            variant="secondary"
            startIcon={<Refresh />}
            onClick={() => validateGame()}
            loading={isValidating}
          >
            Validieren
          </Button>
          
          {/* Save with validation button */}
          {onSave && (
            <Button
              size="S"
              variant="default"
              onClick={handleValidateAndSave}
              disabled={isValidating}
            >
              {isCreating ? 'Erstellen' : 'Speichern'}
            </Button>
          )}
        </Box>
      </Flex>

      {/* Show warning if both systems are used */}
      {hasTeamData && hasClubData && (
        <Box marginBottom={4}>
          <Alert closeLabel="Schließen" title="Gemischte Daten" variant="default">
            Sowohl Team- als auch Club-Daten sind vorhanden. Club-Daten haben Vorrang.
          </Alert>
        </Box>
      )}

      {/* Overall validation errors */}
      {!validationState.overall.isValid && validationState.overall.errors.length > 0 && (
        <Box marginBottom={4}>
          <Alert closeLabel="Schließen" title="Validierungsfehler" variant="danger">
            <ul>
              {validationState.overall.errors.map((error, index) => (
                <li key={index}>{error.message}</li>
              ))}
            </ul>
          </Alert>
        </Box>
      )}

      {/* Overall validation warnings */}
      {validationState.overall.warnings.length > 0 && (
        <Box marginBottom={4}>
          <Alert closeLabel="Schließen" title="Hinweise" variant="default">
            <ul>
              {validationState.overall.warnings.map((warning, index) => (
                <li key={index}>{warning.message}</li>
              ))}
            </ul>
          </Alert>
        </Box>
      )}

      {/* Club Selection (New System) */}
      <Box marginBottom={6}>
        <Typography variant="delta" as="h3" marginBottom={3}>
          Club-Auswahl (Empfohlen)
        </Typography>
        
        <Grid gap={4}>
          <GridItem col={6}>
            <Box>
              <Typography variant="pi" fontWeight="bold" marginBottom={2}>
                Heim-Club
              </Typography>
              <ClubSelect
                name="heim_club"
                value={modifiedData.heim_club}
                onChange={handleClubChange('heim_club')}
                error={errors.heim_club}
                ligaId={ligaId}
                otherClubId={modifiedData.gast_club}
                placeholder="Heim-Club auswählen..."
                onValidationChange={handleClubValidationChange('heimClub')}
                enableRealTimeValidation={true}
                showValidationDetails={true}
              />
            </Box>
          </GridItem>
          
          <GridItem col={6}>
            <Box>
              <Typography variant="pi" fontWeight="bold" marginBottom={2}>
                Gast-Club
              </Typography>
              <ClubSelect
                name="gast_club"
                value={modifiedData.gast_club}
                onChange={handleClubChange('gast_club')}
                error={errors.gast_club}
                ligaId={ligaId}
                otherClubId={modifiedData.heim_club}
                placeholder="Gast-Club auswählen..."
                onValidationChange={handleClubValidationChange('gastClub')}
                enableRealTimeValidation={true}
                showValidationDetails={true}
              />
            </Box>
          </GridItem>
        </Grid>

        {/* Liga filter status */}
        {ligaId && (
          <Box marginTop={3}>
            <Typography variant="pi" textColor="primary600">
              ✓ Clubs werden automatisch nach der ausgewählten Liga gefiltert
            </Typography>
          </Box>
        )}
        
        {!ligaId && (
          <Box marginTop={3}>
            <Alert closeLabel="Schließen" title="Liga auswählen" variant="default">
              Wählen Sie zuerst eine Liga aus, um die Club-Auswahl zu filtern
            </Alert>
          </Box>
        )}
      </Box>

      <Divider />

      {/* Team Selection (Legacy System) */}
      <Box marginTop={6}>
        <Typography variant="delta" as="h3" marginBottom={3}>
          Team-Auswahl (Veraltet)
        </Typography>
        <Typography variant="omega" textColor="neutral600" marginBottom={3}>
          Diese Felder sind für Rückwärtskompatibilität verfügbar, aber die Club-Auswahl wird empfohlen.
        </Typography>
        
        {/* Note: The actual team selection fields would be rendered by Strapi's default components */}
        <Typography variant="pi" textColor="neutral500">
          Team-Felder werden durch die Standard-Strapi-Komponenten gerendert.
        </Typography>
      </Box>

      {/* Validation info */}
      <Box marginTop={6}>
        <Alert closeLabel="Schließen" title="Validierungsregeln" variant="default">
          <Typography variant="omega">
            • Entweder Team-Felder ODER Club-Felder müssen ausgefüllt sein<br/>
            • Ein Team/Club kann nicht gegen sich selbst spielen<br/>
            • Bei Club-Auswahl werden nur aktive Clubs der ausgewählten Liga angezeigt<br/>
            • Beide Clubs müssen in derselben Liga spielen<br/>
            • Viktoria-Clubs mit derselben Team-Zuordnung können nicht gegeneinander spielen
          </Typography>
        </Alert>
      </Box>

      {/* Enhanced Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmationDialog}
        onClose={() => setShowConfirmationDialog(false)}
        onConfirm={handleConfirmOperation}
        title={
          confirmationOperation === 'delete' 
            ? "Spiel löschen" 
            : isCreating 
              ? "Spiel erstellen" 
              : "Spiel speichern"
        }
        operation={confirmationOperation}
        data={modifiedData}
        validationResult={validationState.overall}
        showValidationDetails={true}
        requireConfirmation={confirmationOperation === 'delete'}
        dangerMessage={
          confirmationOperation === 'delete' 
            ? "Diese Aktion kann nicht rückgängig gemacht werden. Das Spiel wird permanent gelöscht."
            : null
        }
        warningMessage={
          validationState.overall.warnings?.length > 0
            ? `Es gibt ${validationState.overall.warnings.length} Warnung(en) zu beachten.`
            : null
        }
      />

      {/* Legacy Validation Dialog (kept for compatibility) */}
      <ValidationDialog
        isOpen={showValidationDialog}
        onClose={() => setShowValidationDialog(false)}
        onConfirm={() => {
          setShowValidationDialog(false);
          setShowConfirmationDialog(true);
        }}
        title={isCreating ? "Spiel erstellen" : "Spiel speichern"}
        operation={isCreating ? "save" : "update"}
        validationResult={validationState.overall}
        gameData={modifiedData}
        confirmButtonText="Weiter"
        showDetails={true}
      />
    </Box>
  );
};

export default SpielEditView;
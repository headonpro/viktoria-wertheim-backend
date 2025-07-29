import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Alert,
  Badge,
  Button,
  Flex,
  Grid,
  GridItem,
  Tooltip,
  IconButton,
  ProgressBar
} from '@strapi/design-system';
import { 
  CheckCircle, 
  ExclamationMarkCircle, 
  Information, 
  Refresh,
  Eye,
  EyeStriked
} from '@strapi/icons';
import { useFetchClient } from '@strapi/helper-plugin';

const EnhancedFormValidation = ({
  formData,
  onValidationChange,
  enableRealTimeValidation = true,
  showValidationDetails = true,
  validationEndpoint = '/api/spiel/validate',
  validationInterval = 1000, // ms
  children
}) => {
  const [validationState, setValidationState] = useState({
    isValid: true,
    errors: [],
    warnings: [],
    details: {},
    lastValidated: null,
    isValidating: false
  });
  const [showDetails, setShowDetails] = useState(showValidationDetails);
  const [validationHistory, setValidationHistory] = useState([]);
  const { post } = useFetchClient();

  // Debounced validation function
  const validateForm = useCallback(async (data = formData) => {
    if (!enableRealTimeValidation || !data) {
      return;
    }

    setValidationState(prev => ({ ...prev, isValidating: true }));

    try {
      const { data: validationResult } = await post(validationEndpoint, data);
      
      const newValidationState = {
        ...validationResult.data,
        lastValidated: new Date(),
        isValidating: false
      };

      setValidationState(newValidationState);
      
      // Add to validation history
      setValidationHistory(prev => [
        {
          timestamp: new Date(),
          isValid: validationResult.data.isValid,
          errorCount: validationResult.data.errors?.length || 0,
          warningCount: validationResult.data.warnings?.length || 0
        },
        ...prev.slice(0, 9) // Keep last 10 validations
      ]);

      // Notify parent component
      if (onValidationChange) {
        onValidationChange(newValidationState);
      }
    } catch (error) {
      console.error('Form validation failed:', error);
      const errorState = {
        isValid: false,
        errors: [{
          field: 'validation',
          message: `Validierung fehlgeschlagen: ${error.message}`,
          code: 'VALIDATION_API_ERROR'
        }],
        warnings: [],
        details: { apiError: error.message },
        lastValidated: new Date(),
        isValidating: false
      };

      setValidationState(errorState);
      
      if (onValidationChange) {
        onValidationChange(errorState);
      }
    }
  }, [formData, enableRealTimeValidation, validationEndpoint, post, onValidationChange]);

  // Debounce validation calls
  useEffect(() => {
    if (!enableRealTimeValidation) return;

    const timeoutId = setTimeout(() => {
      validateForm();
    }, validationInterval);

    return () => clearTimeout(timeoutId);
  }, [formData, validateForm, validationInterval, enableRealTimeValidation]);

  const getValidationStatusColor = () => {
    if (validationState.isValidating) return 'neutral';
    if (!validationState.isValid) return 'danger';
    if (validationState.warnings?.length > 0) return 'warning';
    return 'success';
  };

  const getValidationStatusIcon = () => {
    if (validationState.isValidating) return <Refresh />;
    if (!validationState.isValid) return <ExclamationMarkCircle />;
    if (validationState.warnings?.length > 0) return <Information />;
    return <CheckCircle />;
  };

  const getValidationStatusText = () => {
    if (validationState.isValidating) return 'Validierung läuft...';
    if (!validationState.isValid) {
      const errorCount = validationState.errors?.length || 0;
      return `${errorCount} Fehler gefunden`;
    }
    if (validationState.warnings?.length > 0) {
      const warningCount = validationState.warnings.length;
      return `${warningCount} Hinweis(e)`;
    }
    return 'Validierung erfolgreich';
  };

  const renderValidationSummary = () => (
    <Box marginBottom={4}>
      <Flex justifyContent="space-between" alignItems="center" marginBottom={2}>
        <Box>
          <Typography variant="delta">
            Formular-Validierung
          </Typography>
          <Typography variant="pi" textColor="neutral600">
            {enableRealTimeValidation ? 'Echtzeitvalidierung aktiv' : 'Manuelle Validierung'}
          </Typography>
        </Box>
        
        <Box display="flex" alignItems="center" gap={2}>
          {/* Validation status */}
          <Badge
            backgroundColor={`${getValidationStatusColor()}100`}
            textColor={`${getValidationStatusColor()}600`}
            size="S"
          >
            <Flex alignItems="center" gap={1}>
              {getValidationStatusIcon()}
              {getValidationStatusText()}
            </Flex>
          </Badge>

          {/* Toggle details visibility */}
          <Tooltip description={showDetails ? 'Details ausblenden' : 'Details anzeigen'}>
            <IconButton
              onClick={() => setShowDetails(!showDetails)}
              label="Details umschalten"
              icon={showDetails ? <EyeStriked /> : <Eye />}
              variant="ghost"
            />
          </Tooltip>

          {/* Manual validation trigger */}
          <Tooltip description="Validierung erneut ausführen">
            <IconButton
              onClick={() => validateForm()}
              disabled={validationState.isValidating}
              label="Validierung erneut ausführen"
              icon={<Refresh />}
            />
          </Tooltip>
        </Box>
      </Flex>

      {/* Validation progress */}
      {validationState.isValidating && (
        <Box marginBottom={2}>
          <ProgressBar value={undefined} size="S" />
        </Box>
      )}

      {/* Last validated info */}
      {validationState.lastValidated && (
        <Typography variant="pi" textColor="neutral500">
          Zuletzt validiert: {validationState.lastValidated.toLocaleTimeString('de-DE')}
        </Typography>
      )}
    </Box>
  );

  const renderValidationDetails = () => {
    if (!showDetails) return null;

    const { errors = [], warnings = [], details = {} } = validationState;

    return (
      <Box marginBottom={4}>
        {/* Errors */}
        {errors.length > 0 && (
          <Box marginBottom={3}>
            <Typography variant="delta" textColor="danger600" marginBottom={2}>
              Fehler ({errors.length})
            </Typography>
            {errors.map((error, index) => (
              <Box key={index} marginBottom={2}>
                <Alert variant="danger" closeLabel="Schließen">
                  <Typography fontWeight="semiBold">
                    {error.field && `${error.field}: `}{error.message}
                  </Typography>
                  {error.suggestion && (
                    <Typography variant="pi" marginTop={1}>
                      💡 {error.suggestion}
                    </Typography>
                  )}
                </Alert>
              </Box>
            ))}
          </Box>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <Box marginBottom={3}>
            <Typography variant="delta" textColor="warning600" marginBottom={2}>
              Hinweise ({warnings.length})
            </Typography>
            {warnings.map((warning, index) => (
              <Box key={index} marginBottom={2}>
                <Alert variant="default" closeLabel="Schließen">
                  <Typography>
                    {warning.field && `${warning.field}: `}{warning.message}
                  </Typography>
                  {warning.suggestion && (
                    <Typography variant="pi" marginTop={1}>
                      💡 {warning.suggestion}
                    </Typography>
                  )}
                </Alert>
              </Box>
            ))}
          </Box>
        )}

        {/* Validation details */}
        {Object.keys(details).length > 0 && (
          <Box marginBottom={3}>
            <Typography variant="delta" marginBottom={2}>
              Validierungsdetails
            </Typography>
            <Box padding={3} background="neutral100" borderRadius="4px">
              <Grid gap={2}>
                {details.clubValidation && (
                  <GridItem col={12}>
                    <Typography variant="omega" fontWeight="semiBold">
                      Club-Validierung:
                    </Typography>
                    <Badge
                      backgroundColor={details.clubValidation.isValid ? 'success100' : 'danger100'}
                      textColor={details.clubValidation.isValid ? 'success600' : 'danger600'}
                      size="S"
                    >
                      {details.clubValidation.isValid ? 'Erfolgreich' : 'Fehlgeschlagen'}
                    </Badge>
                  </GridItem>
                )}

                {details.ligaValidation && (
                  <GridItem col={12}>
                    <Typography variant="omega" fontWeight="semiBold">
                      Liga-Validierung:
                    </Typography>
                    <Badge
                      backgroundColor={details.ligaValidation.isValid ? 'success100' : 'danger100'}
                      textColor={details.ligaValidation.isValid ? 'success600' : 'danger600'}
                      size="S"
                    >
                      {details.ligaValidation.isValid ? 'Erfolgreich' : 'Fehlgeschlagen'}
                    </Badge>
                  </GridItem>
                )}

                {details.businessRuleValidation && (
                  <GridItem col={12}>
                    <Typography variant="omega" fontWeight="semiBold">
                      Geschäftsregel-Validierung:
                    </Typography>
                    <Badge
                      backgroundColor={details.businessRuleValidation.isValid ? 'success100' : 'danger100'}
                      textColor={details.businessRuleValidation.isValid ? 'success600' : 'danger600'}
                      size="S"
                    >
                      {details.businessRuleValidation.isValid ? 'Erfolgreich' : 'Fehlgeschlagen'}
                    </Badge>
                  </GridItem>
                )}

                {details.apiError && (
                  <GridItem col={12}>
                    <Typography variant="pi" textColor="danger600">
                      ❌ API-Fehler: {details.apiError}
                    </Typography>
                  </GridItem>
                )}
              </Grid>
            </Box>
          </Box>
        )}

        {/* Validation history */}
        {validationHistory.length > 0 && (
          <Box marginBottom={3}>
            <Typography variant="delta" marginBottom={2}>
              Validierungsverlauf
            </Typography>
            <Box padding={3} background="neutral100" borderRadius="4px">
              {validationHistory.slice(0, 5).map((entry, index) => (
                <Flex key={index} justifyContent="space-between" alignItems="center" marginBottom={1}>
                  <Typography variant="pi">
                    {entry.timestamp.toLocaleTimeString('de-DE')}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Badge
                      backgroundColor={entry.isValid ? 'success100' : 'danger100'}
                      textColor={entry.isValid ? 'success600' : 'danger600'}
                      size="S"
                    >
                      {entry.isValid ? '✓' : '✗'}
                    </Badge>
                    {entry.errorCount > 0 && (
                      <Typography variant="pi" textColor="danger600">
                        {entry.errorCount} Fehler
                      </Typography>
                    )}
                    {entry.warningCount > 0 && (
                      <Typography variant="pi" textColor="warning600">
                        {entry.warningCount} Hinweise
                      </Typography>
                    )}
                  </Box>
                </Flex>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  const renderValidationSettings = () => (
    <Box marginBottom={4}>
      <Typography variant="delta" marginBottom={2}>
        Validierungseinstellungen
      </Typography>
      <Box padding={3} background="neutral100" borderRadius="4px">
        <Grid gap={2}>
          <GridItem col={6}>
            <Typography variant="pi" textColor="neutral600">
              Echtzeitvalidierung:
            </Typography>
            <Badge
              backgroundColor={enableRealTimeValidation ? 'success100' : 'neutral100'}
              textColor={enableRealTimeValidation ? 'success600' : 'neutral600'}
              size="S"
            >
              {enableRealTimeValidation ? 'Aktiv' : 'Inaktiv'}
            </Badge>
          </GridItem>
          
          <GridItem col={6}>
            <Typography variant="pi" textColor="neutral600">
              Validierungsintervall:
            </Typography>
            <Typography variant="pi">
              {validationInterval}ms
            </Typography>
          </GridItem>
          
          <GridItem col={12}>
            <Typography variant="pi" textColor="neutral600">
              Endpoint:
            </Typography>
            <Typography variant="pi" fontFamily="monospace">
              {validationEndpoint}
            </Typography>
          </GridItem>
        </Grid>
      </Box>
    </Box>
  );

  return (
    <Box>
      {renderValidationSummary()}
      {renderValidationDetails()}
      {showDetails && renderValidationSettings()}
      
      {/* Form content */}
      <Box>
        {children}
      </Box>
    </Box>
  );
};

export default EnhancedFormValidation;
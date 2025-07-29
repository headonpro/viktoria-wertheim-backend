import React, { useState } from 'react';
import {
  Dialog,
  DialogBody,
  DialogFooter,
  Typography,
  Button,
  Box,
  Alert,
  Badge,
  Divider,
  Flex,
  Grid,
  GridItem,
  Checkbox
} from '@strapi/design-system';
import { ExclamationMarkCircle, CheckCircle, Cross, Trash, Edit, Plus } from '@strapi/icons';

const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Bestätigung erforderlich",
  operation = "save", // save, delete, update, create
  data = null,
  validationResult = null,
  showValidationDetails = true,
  confirmButtonText = null,
  cancelButtonText = "Abbrechen",
  requireConfirmation = false, // Require user to check a box
  warningMessage = null,
  dangerMessage = null,
  customContent = null
}) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [userConfirmed, setUserConfirmed] = useState(!requireConfirmation);

  const handleConfirm = async () => {
    if (requireConfirmation && !userConfirmed) {
      return;
    }
    
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  const getOperationIcon = () => {
    switch (operation) {
      case 'delete':
        return <Trash fill="danger600" />;
      case 'create':
        return <Plus fill="success600" />;
      case 'update':
        return <Edit fill="primary600" />;
      default:
        if (validationResult?.isValid === false) {
          return <ExclamationMarkCircle fill="danger600" />;
        }
        return <CheckCircle fill="success600" />;
    }
  };

  const getOperationColor = () => {
    switch (operation) {
      case 'delete':
        return 'danger';
      case 'create':
        return 'success';
      case 'update':
        return 'primary';
      default:
        if (validationResult?.isValid === false) {
          return 'danger';
        }
        return 'success';
    }
  };

  const getDefaultConfirmButtonText = () => {
    switch (operation) {
      case 'delete':
        return 'Löschen';
      case 'create':
        return 'Erstellen';
      case 'update':
        return 'Aktualisieren';
      case 'save':
        return 'Speichern';
      default:
        return 'Bestätigen';
    }
  };

  const getOperationTitle = () => {
    switch (operation) {
      case 'delete':
        return 'Spiel löschen';
      case 'create':
        return 'Spiel erstellen';
      case 'update':
        return 'Spiel aktualisieren';
      case 'save':
        return 'Spiel speichern';
      default:
        return title;
    }
  };

  const renderValidationSummary = () => {
    if (!validationResult || !showValidationDetails) return null;

    const { isValid, errors = [], warnings = [] } = validationResult;
    const errorCount = errors.length;
    const warningCount = warnings.length;

    return (
      <Box marginBottom={4}>
        <Alert
          closeLabel="Schließen"
          title={isValid ? "Validierung erfolgreich" : "Validierungsfehler"}
          variant={getOperationColor()}
        >
          {isValid ? (
            <Typography>
              Die Validierung war erfolgreich.
              {warningCount > 0 && ` Es gibt ${warningCount} Hinweis(e) zu beachten.`}
            </Typography>
          ) : (
            <Typography>
              Die Validierung ist fehlgeschlagen mit {errorCount} Fehler(n)
              {warningCount > 0 && ` und ${warningCount} Hinweis(en)`}.
            </Typography>
          )}
        </Alert>
      </Box>
    );
  };

  const renderValidationDetails = () => {
    if (!validationResult || !showValidationDetails) return null;

    const { errors = [], warnings = [], details = {} } = validationResult;

    return (
      <Box>
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

        {/* Validation Details */}
        {Object.keys(details).length > 0 && (
          <Box marginBottom={3}>
            <Typography variant="delta" marginBottom={2}>
              Validierungsdetails
            </Typography>
            <Box padding={3} background="neutral100" borderRadius="4px">
              <Grid gap={2}>
                {details.selectedClub && (
                  <GridItem col={12}>
                    <Typography variant="omega" fontWeight="semiBold">
                      Ausgewählter Club:
                    </Typography>
                    <Box marginTop={1} display="flex" alignItems="center" gap={2}>
                      <Typography>{details.selectedClub.name}</Typography>
                      <Badge
                        backgroundColor={details.selectedClub.club_typ === 'viktoria_verein' ? 'primary100' : 'secondary100'}
                        textColor={details.selectedClub.club_typ === 'viktoria_verein' ? 'primary600' : 'secondary600'}
                        size="S"
                      >
                        {details.selectedClub.club_typ === 'viktoria_verein' ? 'Viktoria' : 'Gegner'}
                      </Badge>
                      <Badge
                        backgroundColor={details.selectedClub.aktiv ? 'success100' : 'danger100'}
                        textColor={details.selectedClub.aktiv ? 'success600' : 'danger600'}
                        size="S"
                      >
                        {details.selectedClub.aktiv ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </Box>
                  </GridItem>
                )}

                {details.isViktoriaClub && (
                  <GridItem col={6}>
                    <Typography variant="pi" textColor="primary600">
                      ⚡ Viktoria-Verein erkannt
                    </Typography>
                  </GridItem>
                )}

                {details.multipleLeagues && (
                  <GridItem col={6}>
                    <Typography variant="pi" textColor="warning600">
                      ⚠️ Club spielt in {details.multipleLeagues} Ligen
                    </Typography>
                  </GridItem>
                )}

                {details.sameClubSelected && (
                  <GridItem col={12}>
                    <Typography variant="pi" textColor="danger600">
                      ❌ Derselbe Club für Heim und Gast ausgewählt
                    </Typography>
                  </GridItem>
                )}

                {details.clubNotInLiga && (
                  <GridItem col={12}>
                    <Typography variant="pi" textColor="danger600">
                      ❌ Club ist nicht in der ausgewählten Liga
                    </Typography>
                  </GridItem>
                )}

                {details.similarNames && (
                  <GridItem col={12}>
                    <Typography variant="pi" textColor="warning600">
                      ⚠️ Ähnliche Club-Namen erkannt (Ähnlichkeit: {Math.round(details.similarNames.similarity * 100)}%)
                    </Typography>
                  </GridItem>
                )}
              </Grid>
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  const renderGameDataSummary = () => {
    if (!data || !showValidationDetails) return null;

    return (
      <Box marginBottom={4}>
        <Typography variant="delta" marginBottom={2}>
          Spieldaten
        </Typography>
        <Box padding={3} background="neutral100" borderRadius="4px">
          <Grid gap={2}>
            {data.heim_club && (
              <GridItem col={6}>
                <Typography variant="pi" textColor="neutral600">Heim-Club:</Typography>
                <Typography fontWeight="semiBold">
                  {typeof data.heim_club === 'object' ? data.heim_club.name : `ID: ${data.heim_club}`}
                </Typography>
              </GridItem>
            )}

            {data.gast_club && (
              <GridItem col={6}>
                <Typography variant="pi" textColor="neutral600">Gast-Club:</Typography>
                <Typography fontWeight="semiBold">
                  {typeof data.gast_club === 'object' ? data.gast_club.name : `ID: ${data.gast_club}`}
                </Typography>
              </GridItem>
            )}

            {data.liga && (
              <GridItem col={6}>
                <Typography variant="pi" textColor="neutral600">Liga:</Typography>
                <Typography fontWeight="semiBold">
                  {typeof data.liga === 'object' ? data.liga.name : `ID: ${data.liga}`}
                </Typography>
              </GridItem>
            )}

            {data.datum && (
              <GridItem col={6}>
                <Typography variant="pi" textColor="neutral600">Datum:</Typography>
                <Typography fontWeight="semiBold">
                  {new Date(data.datum).toLocaleDateString('de-DE')}
                </Typography>
              </GridItem>
            )}

            {data.status && (
              <GridItem col={6}>
                <Typography variant="pi" textColor="neutral600">Status:</Typography>
                <Badge
                  backgroundColor={data.status === 'beendet' ? 'success100' : 'neutral100'}
                  textColor={data.status === 'beendet' ? 'success600' : 'neutral600'}
                  size="S"
                >
                  {data.status}
                </Badge>
              </GridItem>
            )}

            {(data.heim_tore !== undefined || data.gast_tore !== undefined) && (
              <GridItem col={6}>
                <Typography variant="pi" textColor="neutral600">Ergebnis:</Typography>
                <Typography fontWeight="semiBold">
                  {data.heim_tore ?? '-'} : {data.gast_tore ?? '-'}
                </Typography>
              </GridItem>
            )}
          </Grid>
        </Box>
      </Box>
    );
  };

  const getConfirmButtonVariant = () => {
    switch (operation) {
      case 'delete':
        return 'danger';
      case 'create':
        return 'success';
      case 'update':
        return 'primary';
      default:
        if (validationResult && !validationResult.isValid) {
          return 'danger';
        }
        return 'default';
    }
  };

  const shouldDisableConfirm = () => {
    if (requireConfirmation && !userConfirmed) {
      return true;
    }
    
    // Only disable for critical validation errors
    if (validationResult && !validationResult.isValid && operation !== 'delete') {
      const criticalErrors = validationResult.errors?.filter(error => 
        error.code !== 'SIMILAR_CLUB_NAMES' && 
        error.code !== 'VIKTORIA_VS_VIKTORIA'
      );
      return criticalErrors && criticalErrors.length > 0;
    }
    
    return false;
  };

  return (
    <Dialog onClose={onClose} title={getOperationTitle()} isOpen={isOpen}>
      <DialogBody>
        <Box>
          {/* Operation header */}
          <Flex alignItems="center" marginBottom={4}>
            {getOperationIcon()}
            <Box marginLeft={2}>
              <Typography variant="beta">
                {getOperationTitle()}
              </Typography>
            </Box>
          </Flex>

          <Divider marginBottom={4} />

          {/* Custom content */}
          {customContent && (
            <Box marginBottom={4}>
              {customContent}
            </Box>
          )}

          {/* Warning message */}
          {warningMessage && (
            <Box marginBottom={4}>
              <Alert variant="warning" closeLabel="Schließen" title="Warnung">
                {warningMessage}
              </Alert>
            </Box>
          )}

          {/* Danger message */}
          {dangerMessage && (
            <Box marginBottom={4}>
              <Alert variant="danger" closeLabel="Schließen" title="Achtung">
                {dangerMessage}
              </Alert>
            </Box>
          )}

          {/* Validation summary */}
          {renderValidationSummary()}

          {/* Game data summary */}
          {renderGameDataSummary()}

          {/* Validation details */}
          {renderValidationDetails()}

          {/* Operation-specific warnings */}
          {operation === 'delete' && (
            <Box marginTop={4}>
              <Alert variant="danger" closeLabel="Schließen" title="Achtung">
                Diese Aktion kann nicht rückgängig gemacht werden. Das Spiel wird permanent gelöscht.
                {data && (
                  <Box marginTop={2}>
                    <Typography variant="pi">
                      Spiel: {data.heim_club?.name || 'Unbekannt'} vs {data.gast_club?.name || 'Unbekannt'}
                      {data.datum && ` am ${new Date(data.datum).toLocaleDateString('de-DE')}`}
                    </Typography>
                  </Box>
                )}
              </Alert>
            </Box>
          )}

          {/* Validation error blocking */}
          {validationResult && !validationResult.isValid && operation !== 'delete' && (
            <Box marginTop={4}>
              <Alert variant="warning" closeLabel="Schließen" title="Validierungsfehler">
                Es wurden Validierungsfehler gefunden. Bitte korrigieren Sie diese vor dem Speichern.
              </Alert>
            </Box>
          )}

          {/* Confirmation checkbox */}
          {requireConfirmation && (
            <Box marginTop={4}>
              <Checkbox
                checked={userConfirmed}
                onChange={() => setUserConfirmed(!userConfirmed)}
              >
                <Typography variant="omega">
                  {operation === 'delete' 
                    ? 'Ich bestätige, dass ich das Spiel permanent löschen möchte'
                    : 'Ich bestätige, dass die eingegebenen Daten korrekt sind'
                  }
                </Typography>
              </Checkbox>
            </Box>
          )}
        </Box>
      </DialogBody>

      <DialogFooter
        startAction={
          <Button onClick={onClose} variant="tertiary">
            {cancelButtonText}
          </Button>
        }
        endAction={
          <Button
            onClick={handleConfirm}
            variant={getConfirmButtonVariant()}
            loading={isConfirming}
            disabled={shouldDisableConfirm() || isConfirming}
          >
            {confirmButtonText || getDefaultConfirmButtonText()}
          </Button>
        }
      />
    </Dialog>
  );
};

export default ConfirmationDialog;
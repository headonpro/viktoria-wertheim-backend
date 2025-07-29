import React, { useState, useEffect } from 'react';
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
  GridItem
} from '@strapi/design-system';
import { ExclamationMarkCircle, CheckCircle, Cross } from '@strapi/icons';

const ValidationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Validierung erforderlich",
  operation = "save", // save, delete, update
  validationResult = null,
  gameData = null,
  showDetails = true,
  confirmButtonText = "Bestätigen",
  cancelButtonText = "Abbrechen"
}) => {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  const getOperationIcon = () => {
    if (!validationResult) return <ExclamationMarkCircle />;
    
    if (validationResult.isValid) {
      return <CheckCircle fill="success600" />;
    } else {
      return <ExclamationMarkCircle fill="danger600" />;
    }
  };

  const getOperationColor = () => {
    if (!validationResult) return 'warning';
    return validationResult.isValid ? 'success' : 'danger';
  };

  const renderValidationSummary = () => {
    if (!validationResult) return null;

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
    if (!validationResult || !showDetails) return null;

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
              </Grid>
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  const renderGameDataSummary = () => {
    if (!gameData || !showDetails) return null;

    return (
      <Box marginBottom={4}>
        <Typography variant="delta" marginBottom={2}>
          Spieldaten
        </Typography>
        <Box padding={3} background="neutral100" borderRadius="4px">
          <Grid gap={2}>
            {gameData.heim_club && (
              <GridItem col={6}>
                <Typography variant="pi" textColor="neutral600">Heim-Club:</Typography>
                <Typography fontWeight="semiBold">
                  {typeof gameData.heim_club === 'object' ? gameData.heim_club.name : `ID: ${gameData.heim_club}`}
                </Typography>
              </GridItem>
            )}

            {gameData.gast_club && (
              <GridItem col={6}>
                <Typography variant="pi" textColor="neutral600">Gast-Club:</Typography>
                <Typography fontWeight="semiBold">
                  {typeof gameData.gast_club === 'object' ? gameData.gast_club.name : `ID: ${gameData.gast_club}`}
                </Typography>
              </GridItem>
            )}

            {gameData.liga && (
              <GridItem col={6}>
                <Typography variant="pi" textColor="neutral600">Liga:</Typography>
                <Typography fontWeight="semiBold">
                  {typeof gameData.liga === 'object' ? gameData.liga.name : `ID: ${gameData.liga}`}
                </Typography>
              </GridItem>
            )}

            {gameData.datum && (
              <GridItem col={6}>
                <Typography variant="pi" textColor="neutral600">Datum:</Typography>
                <Typography fontWeight="semiBold">
                  {new Date(gameData.datum).toLocaleDateString('de-DE')}
                </Typography>
              </GridItem>
            )}

            {gameData.status && (
              <GridItem col={6}>
                <Typography variant="pi" textColor="neutral600">Status:</Typography>
                <Badge
                  backgroundColor={gameData.status === 'beendet' ? 'success100' : 'neutral100'}
                  textColor={gameData.status === 'beendet' ? 'success600' : 'neutral600'}
                  size="S"
                >
                  {gameData.status}
                </Badge>
              </GridItem>
            )}

            {(gameData.heim_tore !== undefined || gameData.gast_tore !== undefined) && (
              <GridItem col={6}>
                <Typography variant="pi" textColor="neutral600">Ergebnis:</Typography>
                <Typography fontWeight="semiBold">
                  {gameData.heim_tore ?? '-'} : {gameData.gast_tore ?? '-'}
                </Typography>
              </GridItem>
            )}
          </Grid>
        </Box>
      </Box>
    );
  };

  const getConfirmButtonVariant = () => {
    if (!validationResult) return 'default';
    if (validationResult.isValid) return 'success';
    return 'danger';
  };

  const shouldDisableConfirm = () => {
    if (!validationResult) return false;
    // Only disable if there are critical errors
    return !validationResult.isValid && validationResult.errors?.length > 0;
  };

  return (
    <Dialog onClose={onClose} title={title} isOpen={isOpen}>
      <DialogBody>
        <Box>
          {/* Operation header */}
          <Flex alignItems="center" marginBottom={4}>
            {getOperationIcon()}
            <Box marginLeft={2}>
              <Typography variant="beta">
                {operation === 'save' && 'Spiel speichern'}
                {operation === 'update' && 'Spiel aktualisieren'}
                {operation === 'delete' && 'Spiel löschen'}
              </Typography>
            </Box>
          </Flex>

          <Divider marginBottom={4} />

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
              </Alert>
            </Box>
          )}

          {validationResult && !validationResult.isValid && (
            <Box marginTop={4}>
              <Alert variant="warning" closeLabel="Schließen" title="Validierungsfehler">
                Es wurden Validierungsfehler gefunden. Bitte korrigieren Sie diese vor dem Speichern.
              </Alert>
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
            {confirmButtonText}
          </Button>
        }
      />
    </Dialog>
  );
};

export default ValidationDialog;
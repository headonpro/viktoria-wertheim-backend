import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Flex, 
  Typography, 
  Table, 
  Thead, 
  Tbody, 
  Tr, 
  Td, 
  Th,
  Badge,
  IconButton,
  Dialog,
  DialogBody,
  DialogFooter,
  Tabs,
  Tab,
  TabGroup,
  TabPanels,
  TabPanel,
  Loader,
  Alert,
  ProgressBar,
  Card,
  CardBody,
  CardHeader,
  CardContent,
  Grid,
  GridItem,
  Status,
  Tooltip
} from '@strapi/design-system';
import { 
  Play, 
  Refresh, 
  Download, 
  Upload, 
  Eye,
  Check,
  Cross,
  Information,
  ExclamationMarkCircle,
  ArrowLeft,
  Cog,
  Database,
  CheckCircle,
  CrossCircle
} from '@strapi/icons';
import { useFetchClient } from '@strapi/helper-plugin';

const MigrationManagementView = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [migrationStatus, setMigrationStatus] = useState({});
  const [migrationHistory, setMigrationHistory] = useState([]);
  const [validationResults, setValidationResults] = useState({});
  const [dataQualityReport, setDataQualityReport] = useState({});
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [migrationProgress, setMigrationProgress] = useState(null);
  
  const { get, post, put, del } = useFetchClient();

  useEffect(() => {
    fetchMigrationData();
    // Set up polling for migration progress
    const interval = setInterval(fetchMigrationStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchMigrationData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchMigrationStatus(),
        fetchMigrationHistory(),
        fetchValidationResults(),
        fetchDataQualityReport()
      ]);
    } catch (error) {
      showAlert('Fehler beim Laden der Migrationsdaten', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const fetchMigrationStatus = async () => {
    try {
      const response = await get('/api/migration/status');
      setMigrationStatus(response.data);
      
      // Update progress if migration is running
      if (response.data.isRunning) {
        setMigrationProgress(response.data.progress);
      } else {
        setMigrationProgress(null);
      }
    } catch (error) {
      console.error('Error fetching migration status:', error);
    }
  };

  const fetchMigrationHistory = async () => {
    try {
      const response = await get('/api/migration/history');
      setMigrationHistory(response.data.history || []);
    } catch (error) {
      console.error('Error fetching migration history:', error);
    }
  };

  const fetchValidationResults = async () => {
    try {
      const response = await get('/api/migration/validation');
      setValidationResults(response.data);
    } catch (error) {
      console.error('Error fetching validation results:', error);
    }
  };

  const fetchDataQualityReport = async () => {
    try {
      const response = await get('/api/migration/data-quality');
      setDataQualityReport(response.data);
    } catch (error) {
      console.error('Error fetching data quality report:', error);
    }
  };

  const runMigration = async (type, options = {}) => {
    try {
      setOperationLoading(true);
      const response = await post('/api/migration/run', {
        type,
        options
      });
      
      if (response.data.success) {
        showAlert(`Migration "${type}" erfolgreich gestartet`, 'success');
        await fetchMigrationData();
      } else {
        showAlert(`Migration fehlgeschlagen: ${response.data.error}`, 'danger');
      }
    } catch (error) {
      showAlert('Fehler beim Starten der Migration', 'danger');
    } finally {
      setOperationLoading(false);
      setShowConfirmDialog(false);
    }
  };

  const rollbackMigration = async (backupId) => {
    try {
      setOperationLoading(true);
      const response = await post('/api/migration/rollback', { backupId });
      
      if (response.data.success) {
        showAlert('Rollback erfolgreich durchgeführt', 'success');
        await fetchMigrationData();
      } else {
        showAlert(`Rollback fehlgeschlagen: ${response.data.error}`, 'danger');
      }
    } catch (error) {
      showAlert('Fehler beim Rollback', 'danger');
    } finally {
      setOperationLoading(false);
      setShowConfirmDialog(false);
    }
  };

  const runValidation = async () => {
    try {
      setOperationLoading(true);
      const response = await post('/api/migration/validate');
      setValidationResults(response.data);
      showAlert('Validierung abgeschlossen', 'success');
    } catch (error) {
      showAlert('Fehler bei der Validierung', 'danger');
    } finally {
      setOperationLoading(false);
    }
  };

  const runDataCleanup = async () => {
    try {
      setOperationLoading(true);
      const response = await post('/api/migration/cleanup');
      
      if (response.data.success) {
        showAlert(`Datenbereinigung abgeschlossen: ${response.data.cleaned} Einträge bereinigt`, 'success');
        await fetchDataQualityReport();
      } else {
        showAlert('Datenbereinigung fehlgeschlagen', 'danger');
      }
    } catch (error) {
      showAlert('Fehler bei der Datenbereinigung', 'danger');
    } finally {
      setOperationLoading(false);
    }
  };

  const exportMigrationData = async () => {
    try {
      const response = await get('/api/migration/export');
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `migration-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      showAlert('Export erfolgreich', 'success');
    } catch (error) {
      showAlert('Fehler beim Export', 'danger');
    }
  };

  const showAlert = (message, variant) => {
    setAlert({ message, variant });
    setTimeout(() => setAlert(null), 5000);
  };

  const confirmOperation = (action, title, message) => {
    setConfirmAction({ action, title, message });
    setShowConfirmDialog(true);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'completed': { variant: 'success', label: 'Abgeschlossen' },
      'running': { variant: 'secondary', label: 'Läuft' },
      'failed': { variant: 'danger', label: 'Fehlgeschlagen' },
      'pending': { variant: 'neutral', label: 'Wartend' },
      'rolled_back': { variant: 'warning', label: 'Zurückgesetzt' }
    };
    
    const config = statusConfig[status] || { variant: 'neutral', label: status };
    return <Badge backgroundColor={`${config.variant}100`} textColor={`${config.variant}600`}>{config.label}</Badge>;
  };

  const getMigrationProgress = () => {
    if (!migrationProgress) return null;
    
    return (
      <Box marginBottom={4}>
        <Card>
          <CardHeader>
            <Typography variant="beta">Migration läuft...</Typography>
          </CardHeader>
          <CardBody>
            <Box marginBottom={2}>
              <Typography variant="omega">
                {migrationProgress.currentStep} ({migrationProgress.processed}/{migrationProgress.total})
              </Typography>
            </Box>
            <ProgressBar value={migrationProgress.percentage} />
            <Box marginTop={2}>
              <Typography variant="pi" textColor="neutral600">
                Geschätzte verbleibende Zeit: {migrationProgress.estimatedTimeRemaining}
              </Typography>
            </Box>
          </CardBody>
        </Card>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box padding={8}>
        <Flex justifyContent="center">
          <Loader>Lade Migrationsdaten...</Loader>
        </Flex>
      </Box>
    );
  }

  return (
    <Box padding={6}>
      {alert && (
        <Box marginBottom={4}>
          <Alert variant={alert.variant} title={alert.message} />
        </Box>
      )}

      {/* Header */}
      <Flex justifyContent="space-between" alignItems="center" marginBottom={6}>
        <Typography variant="alpha">Migration Management</Typography>
        <Flex gap={2}>
          <Button 
            variant="secondary" 
            startIcon={<Download />}
            onClick={exportMigrationData}
          >
            Export
          </Button>
          <Button 
            variant="secondary" 
            startIcon={<Refresh />}
            onClick={fetchMigrationData}
            loading={loading}
          >
            Aktualisieren
          </Button>
        </Flex>
      </Flex>

      {/* Migration Progress */}
      {getMigrationProgress()}

      {/* Tabs */}
      <TabGroup label="Migration Management Tabs" id="migration-tabs" onTabChange={setActiveTab}>
        <Tabs>
          <Tab>Übersicht</Tab>
          <Tab>Spiel Migration</Tab>
          <Tab>Tabellen Migration</Tab>
          <Tab>Validierung</Tab>
          <Tab>Datenqualität</Tab>
          <Tab>Verlauf</Tab>
        </Tabs>

        <TabPanels>
          {/* Overview Tab */}
          <TabPanel>
            <Box marginTop={4}>
              <Grid gap={4}>
                <GridItem col={6}>
                  <Card>
                    <CardHeader>
                      <Typography variant="beta">Migrations-Status</Typography>
                    </CardHeader>
                    <CardBody>
                      <Flex direction="column" gap={3}>
                        <Flex justifyContent="space-between">
                          <Typography>Spiel Migration:</Typography>
                          {getStatusBadge(migrationStatus.spiel?.status || 'pending')}
                        </Flex>
                        <Flex justifyContent="space-between">
                          <Typography>Tabellen Migration:</Typography>
                          {getStatusBadge(migrationStatus.tabellen?.status || 'pending')}
                        </Flex>
                        <Flex justifyContent="space-between">
                          <Typography>Letzte Validierung:</Typography>
                          <Typography variant="pi" textColor="neutral600">
                            {migrationStatus.lastValidation ? 
                              new Date(migrationStatus.lastValidation).toLocaleString() : 
                              'Nie'
                            }
                          </Typography>
                        </Flex>
                      </Flex>
                    </CardBody>
                  </Card>
                </GridItem>

                <GridItem col={6}>
                  <Card>
                    <CardHeader>
                      <Typography variant="beta">Statistiken</Typography>
                    </CardHeader>
                    <CardBody>
                      <Flex direction="column" gap={3}>
                        <Flex justifyContent="space-between">
                          <Typography>Migrierte Spiele:</Typography>
                          <Typography variant="beta">
                            {migrationStatus.spiel?.migrated || 0}
                          </Typography>
                        </Flex>
                        <Flex justifyContent="space-between">
                          <Typography>Migrierte Tabellen:</Typography>
                          <Typography variant="beta">
                            {migrationStatus.tabellen?.migrated || 0}
                          </Typography>
                        </Flex>
                        <Flex justifyContent="space-between">
                          <Typography>Verfügbare Backups:</Typography>
                          <Typography variant="beta">
                            {migrationHistory.filter(h => h.hasBackup).length}
                          </Typography>
                        </Flex>
                      </Flex>
                    </CardBody>
                  </Card>
                </GridItem>
              </Grid>
            </Box>
          </TabPanel>

          {/* Spiel Migration Tab */}
          <TabPanel>
            <Box marginTop={4}>
              <Card>
                <CardHeader>
                  <Typography variant="beta">Spiel Migration</Typography>
                </CardHeader>
                <CardBody>
                  <Flex direction="column" gap={4}>
                    <Typography>
                      Migriert Team-basierte Spiele zu Club-basierten Relationen.
                    </Typography>
                    
                    <Flex gap={2}>
                      <Button 
                        variant="secondary"
                        startIcon={<Eye />}
                        onClick={() => confirmOperation(
                          () => runMigration('spiel', { dryRun: true }),
                          'Dry-Run Spiel Migration',
                          'Führt eine Validierung der Spiel-Migration durch ohne Änderungen vorzunehmen.'
                        )}
                        loading={operationLoading}
                      >
                        Dry-Run
                      </Button>
                      
                      <Button 
                        variant="default"
                        startIcon={<Play />}
                        onClick={() => confirmOperation(
                          () => runMigration('spiel'),
                          'Spiel Migration starten',
                          'Startet die Migration von Team-basierten zu Club-basierten Spielen. Ein Backup wird automatisch erstellt.'
                        )}
                        loading={operationLoading}
                        disabled={migrationStatus.spiel?.status === 'running'}
                      >
                        Migration starten
                      </Button>
                    </Flex>

                    {migrationStatus.spiel && (
                      <Box padding={3} background="neutral100" borderRadius="4px">
                        <Typography variant="omega" fontWeight="bold">Status:</Typography>
                        <Typography>{migrationStatus.spiel.message}</Typography>
                        {migrationStatus.spiel.lastRun && (
                          <Typography variant="pi" textColor="neutral600">
                            Letzte Ausführung: {new Date(migrationStatus.spiel.lastRun).toLocaleString()}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Flex>
                </CardBody>
              </Card>
            </Box>
          </TabPanel>

          {/* Tabellen Migration Tab */}
          <TabPanel>
            <Box marginTop={4}>
              <Card>
                <CardHeader>
                  <Typography variant="beta">Tabellen-Eintrag Migration</Typography>
                </CardHeader>
                <CardBody>
                  <Flex direction="column" gap={4}>
                    <Typography>
                      Migriert Tabellen-Einträge zu Club-Relationen und aktualisiert Team-Namen.
                    </Typography>
                    
                    <Flex gap={2}>
                      <Button 
                        variant="secondary"
                        startIcon={<Eye />}
                        onClick={() => confirmOperation(
                          () => runMigration('tabellen', { dryRun: true }),
                          'Dry-Run Tabellen Migration',
                          'Führt eine Validierung der Tabellen-Migration durch ohne Änderungen vorzunehmen.'
                        )}
                        loading={operationLoading}
                      >
                        Dry-Run
                      </Button>
                      
                      <Button 
                        variant="default"
                        startIcon={<Play />}
                        onClick={() => confirmOperation(
                          () => runMigration('tabellen'),
                          'Tabellen Migration starten',
                          'Startet die Migration von Tabellen-Einträgen zu Club-Relationen. Ein Backup wird automatisch erstellt.'
                        )}
                        loading={operationLoading}
                        disabled={migrationStatus.tabellen?.status === 'running'}
                      >
                        Migration starten
                      </Button>
                    </Flex>

                    {migrationStatus.tabellen && (
                      <Box padding={3} background="neutral100" borderRadius="4px">
                        <Typography variant="omega" fontWeight="bold">Status:</Typography>
                        <Typography>{migrationStatus.tabellen.message}</Typography>
                        {migrationStatus.tabellen.lastRun && (
                          <Typography variant="pi" textColor="neutral600">
                            Letzte Ausführung: {new Date(migrationStatus.tabellen.lastRun).toLocaleString()}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Flex>
                </CardBody>
              </Card>
            </Box>
          </TabPanel>

          {/* Validation Tab */}
          <TabPanel>
            <Box marginTop={4}>
              <Flex direction="column" gap={4}>
                <Card>
                  <CardHeader>
                    <Flex justifyContent="space-between" alignItems="center">
                      <Typography variant="beta">Datenvalidierung</Typography>
                      <Button 
                        variant="secondary"
                        startIcon={<Refresh />}
                        onClick={runValidation}
                        loading={operationLoading}
                      >
                        Validierung starten
                      </Button>
                    </Flex>
                  </CardHeader>
                  <CardBody>
                    {validationResults.lastRun ? (
                      <Flex direction="column" gap={3}>
                        <Flex justifyContent="space-between">
                          <Typography>Letzte Validierung:</Typography>
                          <Typography variant="pi" textColor="neutral600">
                            {new Date(validationResults.lastRun).toLocaleString()}
                          </Typography>
                        </Flex>
                        
                        <Grid gap={2}>
                          <GridItem col={3}>
                            <Box textAlign="center" padding={2} background="success100" borderRadius="4px">
                              <Typography variant="beta" textColor="success600">
                                {validationResults.valid || 0}
                              </Typography>
                              <Typography variant="pi" textColor="success600">Gültig</Typography>
                            </Box>
                          </GridItem>
                          <GridItem col={3}>
                            <Box textAlign="center" padding={2} background="warning100" borderRadius="4px">
                              <Typography variant="beta" textColor="warning600">
                                {validationResults.warnings || 0}
                              </Typography>
                              <Typography variant="pi" textColor="warning600">Warnungen</Typography>
                            </Box>
                          </GridItem>
                          <GridItem col={3}>
                            <Box textAlign="center" padding={2} background="danger100" borderRadius="4px">
                              <Typography variant="beta" textColor="danger600">
                                {validationResults.errors || 0}
                              </Typography>
                              <Typography variant="pi" textColor="danger600">Fehler</Typography>
                            </Box>
                          </GridItem>
                          <GridItem col={3}>
                            <Box textAlign="center" padding={2} background="neutral100" borderRadius="4px">
                              <Typography variant="beta">
                                {validationResults.total || 0}
                              </Typography>
                              <Typography variant="pi" textColor="neutral600">Gesamt</Typography>
                            </Box>
                          </GridItem>
                        </Grid>

                        {validationResults.issues && validationResults.issues.length > 0 && (
                          <Box>
                            <Typography variant="omega" fontWeight="bold" marginBottom={2}>
                              Gefundene Probleme:
                            </Typography>
                            <Box maxHeight="300px" overflow="auto">
                              {validationResults.issues.map((issue, index) => (
                                <Box key={index} padding={2} marginBottom={1} background="neutral100" borderRadius="4px">
                                  <Flex alignItems="center" gap={2}>
                                    {issue.severity === 'error' ? 
                                      <CrossCircle fill="danger600" /> : 
                                      <ExclamationMarkCircle fill="warning600" />
                                    }
                                    <Typography variant="pi">
                                      {issue.type}: {issue.message}
                                    </Typography>
                                  </Flex>
                                  {issue.details && (
                                    <Typography variant="pi" textColor="neutral600" marginTop={1}>
                                      {JSON.stringify(issue.details)}
                                    </Typography>
                                  )}
                                </Box>
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Flex>
                    ) : (
                      <Typography textColor="neutral600">
                        Noch keine Validierung durchgeführt. Klicken Sie auf "Validierung starten".
                      </Typography>
                    )}
                  </CardBody>
                </Card>
              </Flex>
            </Box>
          </TabPanel>

          {/* Data Quality Tab */}
          <TabPanel>
            <Box marginTop={4}>
              <Flex direction="column" gap={4}>
                <Card>
                  <CardHeader>
                    <Flex justifyContent="space-between" alignItems="center">
                      <Typography variant="beta">Datenqualitätsbericht</Typography>
                      <Flex gap={2}>
                        <Button 
                          variant="secondary"
                          startIcon={<Refresh />}
                          onClick={fetchDataQualityReport}
                          loading={operationLoading}
                        >
                          Aktualisieren
                        </Button>
                        <Button 
                          variant="danger-light"
                          startIcon={<Database />}
                          onClick={() => confirmOperation(
                            runDataCleanup,
                            'Datenbereinigung starten',
                            'Bereinigt verwaiste Datensätze und inkonsistente Relationen. Diese Aktion kann nicht rückgängig gemacht werden.'
                          )}
                          loading={operationLoading}
                        >
                          Bereinigen
                        </Button>
                      </Flex>
                    </Flex>
                  </CardHeader>
                  <CardBody>
                    {dataQualityReport.lastGenerated ? (
                      <Flex direction="column" gap={4}>
                        <Typography variant="pi" textColor="neutral600">
                          Letzter Bericht: {new Date(dataQualityReport.lastGenerated).toLocaleString()}
                        </Typography>

                        <Grid gap={4}>
                          <GridItem col={6}>
                            <Box padding={3} background="neutral100" borderRadius="4px">
                              <Typography variant="omega" fontWeight="bold">Spiele</Typography>
                              <Flex direction="column" gap={1} marginTop={2}>
                                <Flex justifyContent="space-between">
                                  <Typography variant="pi">Team-basiert:</Typography>
                                  <Typography variant="pi">{dataQualityReport.spiele?.teamBased || 0}</Typography>
                                </Flex>
                                <Flex justifyContent="space-between">
                                  <Typography variant="pi">Club-basiert:</Typography>
                                  <Typography variant="pi">{dataQualityReport.spiele?.clubBased || 0}</Typography>
                                </Flex>
                                <Flex justifyContent="space-between">
                                  <Typography variant="pi">Inkonsistent:</Typography>
                                  <Typography variant="pi" textColor="danger600">
                                    {dataQualityReport.spiele?.inconsistent || 0}
                                  </Typography>
                                </Flex>
                              </Flex>
                            </Box>
                          </GridItem>

                          <GridItem col={6}>
                            <Box padding={3} background="neutral100" borderRadius="4px">
                              <Typography variant="omega" fontWeight="bold">Tabellen-Einträge</Typography>
                              <Flex direction="column" gap={1} marginTop={2}>
                                <Flex justifyContent="space-between">
                                  <Typography variant="pi">Mit Club-Relation:</Typography>
                                  <Typography variant="pi">{dataQualityReport.tabellen?.withClub || 0}</Typography>
                                </Flex>
                                <Flex justifyContent="space-between">
                                  <Typography variant="pi">Ohne Club-Relation:</Typography>
                                  <Typography variant="pi">{dataQualityReport.tabellen?.withoutClub || 0}</Typography>
                                </Flex>
                                <Flex justifyContent="space-between">
                                  <Typography variant="pi">Verwaiste Einträge:</Typography>
                                  <Typography variant="pi" textColor="danger600">
                                    {dataQualityReport.tabellen?.orphaned || 0}
                                  </Typography>
                                </Flex>
                              </Flex>
                            </Box>
                          </GridItem>
                        </Grid>

                        {dataQualityReport.issues && dataQualityReport.issues.length > 0 && (
                          <Box>
                            <Typography variant="omega" fontWeight="bold" marginBottom={2}>
                              Datenqualitätsprobleme:
                            </Typography>
                            <Box maxHeight="300px" overflow="auto">
                              {dataQualityReport.issues.map((issue, index) => (
                                <Box key={index} padding={2} marginBottom={1} background="danger100" borderRadius="4px">
                                  <Typography variant="pi" textColor="danger600">
                                    {issue.type}: {issue.description}
                                  </Typography>
                                  <Typography variant="pi" textColor="neutral600">
                                    Betroffene Einträge: {issue.count}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Flex>
                    ) : (
                      <Typography textColor="neutral600">
                        Noch kein Datenqualitätsbericht generiert.
                      </Typography>
                    )}
                  </CardBody>
                </Card>
              </Flex>
            </Box>
          </TabPanel>

          {/* History Tab */}
          <TabPanel>
            <Box marginTop={4}>
              <Card>
                <CardHeader>
                  <Typography variant="beta">Migrationsverlauf</Typography>
                </CardHeader>
                <CardBody>
                  {migrationHistory.length > 0 ? (
                    <Table colCount={6} rowCount={migrationHistory.length + 1}>
                      <Thead>
                        <Tr>
                          <Th><Typography variant="sigma">Datum</Typography></Th>
                          <Th><Typography variant="sigma">Typ</Typography></Th>
                          <Th><Typography variant="sigma">Status</Typography></Th>
                          <Th><Typography variant="sigma">Verarbeitet</Typography></Th>
                          <Th><Typography variant="sigma">Backup</Typography></Th>
                          <Th><Typography variant="sigma">Aktionen</Typography></Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {migrationHistory.map((entry) => (
                          <Tr key={entry.id}>
                            <Td>
                              <Typography variant="pi">
                                {new Date(entry.timestamp).toLocaleString()}
                              </Typography>
                            </Td>
                            <Td>
                              <Typography>{entry.type}</Typography>
                            </Td>
                            <Td>
                              {getStatusBadge(entry.status)}
                            </Td>
                            <Td>
                              <Typography>{entry.processed || 0}</Typography>
                            </Td>
                            <Td>
                              {entry.hasBackup ? (
                                <CheckCircle fill="success600" />
                              ) : (
                                <CrossCircle fill="danger600" />
                              )}
                            </Td>
                            <Td>
                              <Flex gap={1}>
                                <Tooltip description="Details anzeigen">
                                  <IconButton
                                    onClick={() => {/* TODO: Show details */}}
                                    label="Details"
                                    icon={<Eye />}
                                  />
                                </Tooltip>
                                {entry.hasBackup && entry.status === 'completed' && (
                                  <Tooltip description="Rollback durchführen">
                                    <IconButton
                                      onClick={() => confirmOperation(
                                        () => rollbackMigration(entry.backupId),
                                        'Rollback durchführen',
                                        `Möchten Sie die Migration vom ${new Date(entry.timestamp).toLocaleString()} rückgängig machen?`
                                      )}
                                      label="Rollback"
                                      icon={<ArrowLeft />}
                                    />
                                  </Tooltip>
                                )}
                              </Flex>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  ) : (
                    <Typography textColor="neutral600">
                      Noch keine Migrationen durchgeführt.
                    </Typography>
                  )}
                </CardBody>
              </Card>
            </Box>
          </TabPanel>
        </TabPanels>
      </TabGroup>

      {/* Confirmation Dialog */}
      <Dialog 
        onClose={() => setShowConfirmDialog(false)} 
        title={confirmAction?.title || 'Bestätigung'} 
        isOpen={showConfirmDialog}
      >
        <DialogBody>
          <Typography>
            {confirmAction?.message || 'Sind Sie sicher?'}
          </Typography>
        </DialogBody>
        <DialogFooter
          startAction={
            <Button onClick={() => setShowConfirmDialog(false)} variant="tertiary">
              Abbrechen
            </Button>
          }
          endAction={
            <Button 
              onClick={() => confirmAction?.action()} 
              variant="default"
              loading={operationLoading}
            >
              Bestätigen
            </Button>
          }
        />
      </Dialog>
    </Box>
  );
};

export default MigrationManagementView;
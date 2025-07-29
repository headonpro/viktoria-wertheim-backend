import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Flex,
  Typography,
  Modal,
  ModalLayout,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Textarea,
  Alert,
  ProgressBar,
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th,
  Badge,
  Divider
} from '@strapi/design-system';
import { Upload, Download, Check, Cross, Information } from '@strapi/icons';
import { useFetchClient } from '@strapi/helper-plugin';

const BulkImportExport = ({ isOpen, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('import');
  const [importData, setImportData] = useState('');
  const [importResults, setImportResults] = useState(null);
  const [exportData, setExportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [alert, setAlert] = useState(null);
  const fileInputRef = useRef(null);
  
  const { get, post } = useFetchClient();

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          setImportData(content);
          
          // Validate JSON
          JSON.parse(content);
          setAlert({ type: 'success', message: 'Datei erfolgreich geladen und validiert' });
        } catch (error) {
          setAlert({ type: 'danger', message: 'Ungültige JSON-Datei' });
        }
      };
      reader.readAsText(file);
    }
  };

  const validateImportData = (data) => {
    const errors = [];
    const warnings = [];
    
    if (!Array.isArray(data)) {
      errors.push('Daten müssen ein Array sein');
      return { errors, warnings, validItems: [] };
    }

    const validItems = [];
    const requiredFields = ['name', 'club_typ'];
    const validClubTypes = ['viktoria_verein', 'gegner_verein'];
    const validTeamMappings = ['team_1', 'team_2', 'team_3'];

    data.forEach((item, index) => {
      const itemErrors = [];
      const itemWarnings = [];

      // Check required fields
      requiredFields.forEach(field => {
        if (!item[field]) {
          itemErrors.push(`Zeile ${index + 1}: Pflichtfeld '${field}' fehlt`);
        }
      });

      // Validate club_typ
      if (item.club_typ && !validClubTypes.includes(item.club_typ)) {
        itemErrors.push(`Zeile ${index + 1}: Ungültiger club_typ '${item.club_typ}'`);
      }

      // Validate viktoria_team_mapping
      if (item.viktoria_team_mapping && !validTeamMappings.includes(item.viktoria_team_mapping)) {
        itemErrors.push(`Zeile ${index + 1}: Ungültiges viktoria_team_mapping '${item.viktoria_team_mapping}'`);
      }

      // Check viktoria_team_mapping consistency
      if (item.club_typ === 'viktoria_verein' && !item.viktoria_team_mapping) {
        itemWarnings.push(`Zeile ${index + 1}: Viktoria-Verein ohne Team-Zuordnung`);
      }

      // Validate name length
      if (item.name && (item.name.length < 2 || item.name.length > 100)) {
        itemErrors.push(`Zeile ${index + 1}: Name muss zwischen 2 und 100 Zeichen lang sein`);
      }

      // Validate kurz_name length
      if (item.kurz_name && (item.kurz_name.length < 2 || item.kurz_name.length > 20)) {
        itemErrors.push(`Zeile ${index + 1}: Kurzname muss zwischen 2 und 20 Zeichen lang sein`);
      }

      // Validate gruendungsjahr
      if (item.gruendungsjahr && (item.gruendungsjahr < 1800 || item.gruendungsjahr > 2030)) {
        itemErrors.push(`Zeile ${index + 1}: Gründungsjahr muss zwischen 1800 und 2030 liegen`);
      }

      if (itemErrors.length === 0) {
        validItems.push({
          ...item,
          _index: index + 1,
          _warnings: itemWarnings
        });
      }

      errors.push(...itemErrors);
      warnings.push(...itemWarnings);
    });

    return { errors, warnings, validItems };
  };

  const handleImport = async () => {
    try {
      setLoading(true);
      setProgress(0);
      
      const data = JSON.parse(importData);
      const validation = validateImportData(data);
      
      if (validation.errors.length > 0) {
        setAlert({ 
          type: 'danger', 
          message: `Validierungsfehler: ${validation.errors.slice(0, 5).join(', ')}${validation.errors.length > 5 ? '...' : ''}` 
        });
        setLoading(false);
        return;
      }

      const results = {
        total: validation.validItems.length,
        success: 0,
        failed: 0,
        errors: [],
        warnings: validation.warnings
      };

      // Process items in batches
      const batchSize = 5;
      for (let i = 0; i < validation.validItems.length; i += batchSize) {
        const batch = validation.validItems.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (item) => {
          try {
            await post('/api/clubs', { data: item });
            results.success++;
          } catch (error) {
            results.failed++;
            results.errors.push(`Zeile ${item._index}: ${error.response?.data?.error?.message || error.message}`);
          }
        }));

        setProgress(Math.round(((i + batch.length) / validation.validItems.length) * 100));
      }

      setImportResults(results);
      
      if (results.success > 0) {
        onSuccess?.();
      }

    } catch (error) {
      setAlert({ type: 'danger', message: 'Fehler beim Import: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const response = await get('/api/clubs?populate=ligen');
      
      const exportData = response.data.data.map(club => ({
        name: club.attributes.name,
        kurz_name: club.attributes.kurz_name,
        club_typ: club.attributes.club_typ,
        viktoria_team_mapping: club.attributes.viktoria_team_mapping,
        gruendungsjahr: club.attributes.gruendungsjahr,
        vereinsfarben: club.attributes.vereinsfarben,
        heimstadion: club.attributes.heimstadion,
        adresse: club.attributes.adresse,
        website: club.attributes.website,
        aktiv: club.attributes.aktiv,
        ligen: club.attributes.ligen?.data?.map(liga => liga.attributes.name) || []
      }));

      setExportData(exportData);
      
      // Auto-download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clubs-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      setAlert({ type: 'success', message: 'Export erfolgreich heruntergeladen' });
      
    } catch (error) {
      setAlert({ type: 'danger', message: 'Fehler beim Export: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const getExampleData = () => {
    return JSON.stringify([
      {
        "name": "SV Viktoria Wertheim",
        "kurz_name": "SV VIK",
        "club_typ": "viktoria_verein",
        "viktoria_team_mapping": "team_1",
        "gruendungsjahr": 1952,
        "vereinsfarben": "Gelb-Blau",
        "heimstadion": "Viktoria-Stadion Wertheim",
        "adresse": "Musterstraße 1, 97877 Wertheim",
        "website": "https://sv-viktoria-wertheim.de",
        "aktiv": true,
        "ligen": ["Kreisliga Tauberbischofsheim"]
      },
      {
        "name": "VfR Gerlachsheim",
        "kurz_name": "VfR GER",
        "club_typ": "gegner_verein",
        "gruendungsjahr": 1920,
        "vereinsfarben": "Rot-Weiß",
        "heimstadion": "Sportplatz Gerlachsheim",
        "aktiv": true,
        "ligen": ["Kreisliga Tauberbischofsheim"]
      }
    ], null, 2);
  };

  return (
    <Modal onClose={onClose} labelledBy="title">
      <ModalLayout>
        <ModalHeader>
          <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
            Bulk Import/Export
          </Typography>
        </ModalHeader>

        <ModalBody>
          {alert && (
            <Box marginBottom={4}>
              <Alert variant={alert.type} title={alert.message} />
            </Box>
          )}

          {/* Tab Navigation */}
          <Flex marginBottom={4}>
            <Button
              variant={activeTab === 'import' ? 'default' : 'tertiary'}
              onClick={() => setActiveTab('import')}
              startIcon={<Upload />}
            >
              Import
            </Button>
            <Button
              variant={activeTab === 'export' ? 'default' : 'tertiary'}
              onClick={() => setActiveTab('export')}
              startIcon={<Download />}
            >
              Export
            </Button>
          </Flex>

          {activeTab === 'import' && (
            <Box>
              <Typography variant="beta" marginBottom={2}>Vereine importieren</Typography>
              
              <Box marginBottom={4}>
                <Typography variant="omega" textColor="neutral600" marginBottom={2}>
                  Laden Sie eine JSON-Datei hoch oder fügen Sie JSON-Daten direkt ein:
                </Typography>
                
                <Flex gap={2} marginBottom={2}>
                  <Button
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    startIcon={<Upload />}
                  >
                    Datei auswählen
                  </Button>
                  <Button
                    variant="tertiary"
                    onClick={() => setImportData(getExampleData())}
                    startIcon={<Information />}
                  >
                    Beispiel laden
                  </Button>
                </Flex>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </Box>

              <Box marginBottom={4}>
                <Textarea
                  placeholder="JSON-Daten hier einfügen..."
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  rows={10}
                />
              </Box>

              {loading && (
                <Box marginBottom={4}>
                  <Typography variant="omega" marginBottom={2}>Import läuft... {progress}%</Typography>
                  <ProgressBar value={progress} />
                </Box>
              )}

              {importResults && (
                <Box marginBottom={4} padding={4} background="neutral100" borderRadius="4px">
                  <Typography variant="beta" marginBottom={2}>Import-Ergebnisse</Typography>
                  
                  <Flex gap={4} marginBottom={3}>
                    <Box>
                      <Typography variant="omega" textColor="neutral600">Gesamt:</Typography>
                      <Typography variant="beta">{importResults.total}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="omega" textColor="success600">Erfolgreich:</Typography>
                      <Typography variant="beta" textColor="success600">{importResults.success}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="omega" textColor="danger600">Fehlgeschlagen:</Typography>
                      <Typography variant="beta" textColor="danger600">{importResults.failed}</Typography>
                    </Box>
                  </Flex>

                  {importResults.errors.length > 0 && (
                    <Box marginBottom={3}>
                      <Typography variant="omega" textColor="danger600" marginBottom={1}>Fehler:</Typography>
                      <Box maxHeight="100px" overflow="auto">
                        {importResults.errors.slice(0, 10).map((error, index) => (
                          <Typography key={index} variant="pi" textColor="danger600">
                            • {error}
                          </Typography>
                        ))}
                        {importResults.errors.length > 10 && (
                          <Typography variant="pi" textColor="neutral600">
                            ... und {importResults.errors.length - 10} weitere
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}

                  {importResults.warnings.length > 0 && (
                    <Box>
                      <Typography variant="omega" textColor="warning600" marginBottom={1}>Warnungen:</Typography>
                      <Box maxHeight="100px" overflow="auto">
                        {importResults.warnings.slice(0, 5).map((warning, index) => (
                          <Typography key={index} variant="pi" textColor="warning600">
                            • {warning}
                          </Typography>
                        ))}
                        {importResults.warnings.length > 5 && (
                          <Typography variant="pi" textColor="neutral600">
                            ... und {importResults.warnings.length - 5} weitere
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}

          {activeTab === 'export' && (
            <Box>
              <Typography variant="beta" marginBottom={2}>Vereine exportieren</Typography>
              
              <Typography variant="omega" textColor="neutral600" marginBottom={4}>
                Exportiert alle Vereine als JSON-Datei. Die Datei kann später für den Import verwendet werden.
              </Typography>

              {loading && (
                <Box marginBottom={4}>
                  <Typography variant="omega" marginBottom={2}>Export läuft...</Typography>
                  <ProgressBar />
                </Box>
              )}

              {exportData && (
                <Box marginBottom={4} padding={4} background="neutral100" borderRadius="4px">
                  <Typography variant="beta" marginBottom={2}>Export-Vorschau</Typography>
                  <Typography variant="omega" textColor="neutral600" marginBottom={2}>
                    {exportData.length} Vereine exportiert
                  </Typography>
                  
                  <Box maxHeight="200px" overflow="auto">
                    <pre style={{ fontSize: '12px', color: '#666' }}>
                      {JSON.stringify(exportData.slice(0, 3), null, 2)}
                      {exportData.length > 3 && '\n... und weitere'}
                    </pre>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </ModalBody>

        <ModalFooter
          startActions={
            <Button onClick={onClose} variant="tertiary">
              Schließen
            </Button>
          }
          endActions={
            <Flex gap={2}>
              {activeTab === 'import' && (
                <Button
                  onClick={handleImport}
                  disabled={!importData || loading}
                  loading={loading}
                >
                  Import starten
                </Button>
              )}
              {activeTab === 'export' && (
                <Button
                  onClick={handleExport}
                  disabled={loading}
                  loading={loading}
                  startIcon={<Download />}
                >
                  Export starten
                </Button>
              )}
            </Flex>
          }
        />
      </ModalLayout>
    </Modal>
  );
};

export default BulkImportExport;
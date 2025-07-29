import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Grid,
  GridItem,
  Typography,
  Select,
  Option,
  NumberInput,
  DatePicker,
  Textarea,
  Button,
  Flex,
  Alert,
  Divider,
  Card,
  CardBody,
  CardContent,
  CardHeader,
  Loader,
  IconButton
} from '@strapi/design-system';
import {
  Refresh,
  Save,
  Eye
} from '@strapi/icons';
import { useFetchClient } from '@strapi/helper-plugin';
import ClubSelect from './ClubSelect';
import EnhancedFormValidation from './EnhancedFormValidation';

const EnhancedGameForm = ({
  initialData = {},
  onSave,
  onCancel,
  isCreating = true,
  readOnly = false
}) => {
  const [formData, setFormData] = useState({
    datum: '',
    liga: '',
    saison: '',
    spieltag: 1,
    heim_club: '',
    gast_club: '',
    heim_tore: null,
    gast_tore: null,
    status: 'geplant',
    notizen: '',
    ...initialData
  });

  const [ligen, setLigen] = useState([]);
  const [saisons, setSaisons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationState, setValidationState] = useState({
    isValid: false,
    errors: [],
    warnings: [],
    details: {}
  });
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [clubValidation, setClubValidation] = useState({
    heim: { isValid: true, errors: [], warnings: [] },
    gast: { isValid: true, errors: [], warnings: [] }
  });

  const { get, post, put } = useFetchClient();

  // Load initial data
  useEffect(() => {
    loadFormData();
  }, []);

  // Auto-save functionality
  useEffect(() => {
    if (autoSaveEnabled && !isCreating && formData.id) {
      const timer = setTimeout(() => {
        handleAutoSave();
      }, 5000); // Auto-save after 5 seconds of inactivity

      return () => clearTimeout(timer);
    }
  }, [formData, autoSaveEnabled, isCreating]);

  const loadFormData = async () => {
    try {
      setLoading(true);
      const [ligenResponse, saisonsResponse] = await Promise.all([
        get('/api/ligas?sort=name:asc'),
        get('/api/saisons?sort=jahr:desc')
      ]);

      setLigen(ligenResponse.data.data || []);
      setSaisons(saisonsResponse.data.data || []);
    } catch (error) {
      console.error('Error loading form data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleClubChange = useCallback((field) => (event) => {
    handleInputChange(field, event.target.value);
  }, [handleInputChange]);

  const handleValidationChange = useCallback((validationResult) => {
    setValidationState(validationResult);
  }, []);

  const handleClubValidationChange = useCallback((field) => (validationResult) => {
    setClubValidation(prev => ({
      ...prev,
      [field]: validationResult
    }));
  }, []);

  const handleAutoSave = async () => {
    if (readOnly || isCreating) return;

    try {
      await put(`/api/spiels/${formData.id}`, { data: formData });
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleSave = async () => {
    if (saving) return;

    try {
      setSaving(true);
      
      // Validate form before saving
      const validation = await validateForm();
      if (!validation.isValid) {
        setValidationState(validation);
        return;
      }

      if (isCreating) {
        await post('/api/spiels', { data: formData });
      } else {
        await put(`/api/spiels/${formData.id}`, { data: formData });
      }

      if (onSave) {
        onSave(formData);
      }
    } catch (error) {
      console.error('Save failed:', error);
      setValidationState({
        isValid: false,
        errors: [`Speichern fehlgeschlagen: ${error.message}`],
        warnings: [],
        details: {}
      });
    } finally {
      setSaving(false);
    }
  };

  const validateForm = async () => {
    const errors = [];
    const warnings = [];
    const details = {};

    // Basic field validation
    if (!formData.datum) errors.push('Datum ist erforderlich');
    if (!formData.liga) errors.push('Liga ist erforderlich');
    if (!formData.saison) errors.push('Saison ist erforderlich');
    if (!formData.spieltag) errors.push('Spieltag ist erforderlich');

    // Club validation
    if (!formData.heim_club) errors.push('Heim-Club ist erforderlich');
    if (!formData.gast_club) errors.push('Gast-Club ist erforderlich');
    
    if (formData.heim_club && formData.gast_club && formData.heim_club === formData.gast_club) {
      errors.push('Ein Club kann nicht gegen sich selbst spielen');
    }

    // Score validation for completed games
    if (formData.status === 'beendet') {
      if (formData.heim_tore === null || formData.heim_tore === undefined) {
        errors.push('Heim-Tore sind für beendete Spiele erforderlich');
      }
      if (formData.gast_tore === null || formData.gast_tore === undefined) {
        errors.push('Gast-Tore sind für beendete Spiele erforderlich');
      }
    }

    // Include club validation results
    if (!clubValidation.heim.isValid) {
      errors.push(...clubValidation.heim.errors);
    }
    if (!clubValidation.gast.isValid) {
      errors.push(...clubValidation.gast.errors);
    }

    warnings.push(...clubValidation.heim.warnings);
    warnings.push(...clubValidation.gast.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      details
    };
  };

  const isFormValid = useMemo(() => {
    return formData.datum && formData.liga && formData.saison && 
           formData.heim_club && formData.gast_club &&
           clubValidation.heim.isValid && clubValidation.gast.isValid;
  }, [formData, clubValidation]);

  if (loading) {
    return (
      <Box padding={4} display="flex" justifyContent="center">
        <Loader>Lade Formular...</Loader>
      </Box>
    );
  }

  return (
    <Box>
      <Card>
        <CardHeader>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="beta">
              {isCreating ? 'Neues Spiel erstellen' : 'Spiel bearbeiten'}
            </Typography>
            <Box display="flex" gap={2}>
              {!isCreating && (
                <Button
                  variant="tertiary"
                  startIcon={<Eye />}
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? 'Bearbeiten' : 'Vorschau'}
                </Button>
              )}
              <IconButton
                label="Neu laden"
                icon={<Refresh />}
                onClick={loadFormData}
                disabled={loading}
              />
            </Box>
          </Box>
        </CardHeader>

        <CardBody>
          <CardContent>
            {/* Enhanced validation alerts */}
            {validationState.errors.length > 0 && (
              <Box marginBottom={4}>
                <Alert variant="danger" title="Validierungsfehler">
                  <Box>
                    {validationState.errors.map((error, index) => (
                      <Box key={index} display="flex" alignItems="flex-start" gap={2} marginBottom={index < validationState.errors.length - 1 ? 2 : 0}>
                        <Typography variant="omega">❌</Typography>
                        <Typography variant="omega">{error}</Typography>
                      </Box>
                    ))}
                    <Box marginTop={3} padding={2} background="danger100" borderRadius="4px">
                      <Typography variant="pi" textColor="danger700">
                        💡 Beheben Sie alle Fehler, bevor Sie das Spiel speichern können.
                      </Typography>
                    </Box>
                  </Box>
                </Alert>
              </Box>
            )}

            {validationState.warnings.length > 0 && (
              <Box marginBottom={4}>
                <Alert variant="default" title="Hinweise">
                  <Box>
                    {validationState.warnings.map((warning, index) => (
                      <Box key={index} display="flex" alignItems="flex-start" gap={2} marginBottom={index < validationState.warnings.length - 1 ? 2 : 0}>
                        <Typography variant="omega">⚠️</Typography>
                        <Typography variant="omega">{warning}</Typography>
                      </Box>
                    ))}
                    <Box marginTop={3} padding={2} background="neutral100" borderRadius="4px">
                      <Typography variant="pi" textColor="neutral600">
                        💡 Hinweise können ignoriert werden, sollten aber überprüft werden.
                      </Typography>
                    </Box>
                  </Box>
                </Alert>
              </Box>
            )}

            <Grid gap={4}>
              {/* Basic game information */}
              <GridItem col={12}>
                <Typography variant="delta" marginBottom={3}>
                  Grunddaten
                </Typography>
              </GridItem>

              <GridItem col={6}>
                <DatePicker
                  label="Datum"
                  name="datum"
                  value={formData.datum}
                  onChange={(date) => handleInputChange('datum', date)}
                  required
                  disabled={readOnly}
                />
              </GridItem>

              <GridItem col={6}>
                <NumberInput
                  label="Spieltag"
                  name="spieltag"
                  value={formData.spieltag}
                  onValueChange={(value) => handleInputChange('spieltag', value)}
                  required
                  min={1}
                  disabled={readOnly}
                />
              </GridItem>

              <GridItem col={6}>
                <Select
                  label="Liga"
                  name="liga"
                  value={formData.liga}
                  onChange={(value) => handleInputChange('liga', value)}
                  required
                  disabled={readOnly}
                  placeholder="Liga auswählen..."
                >
                  {ligen.map((liga) => (
                    <Option key={liga.id} value={liga.id}>
                      {liga.name}
                    </Option>
                  ))}
                </Select>
              </GridItem>

              <GridItem col={6}>
                <Select
                  label="Saison"
                  name="saison"
                  value={formData.saison}
                  onChange={(value) => handleInputChange('saison', value)}
                  required
                  disabled={readOnly}
                  placeholder="Saison auswählen..."
                >
                  {saisons.map((saison) => (
                    <Option key={saison.id} value={saison.id}>
                      {saison.jahr}
                    </Option>
                  ))}
                </Select>
              </GridItem>

              {/* Club selection */}
              <GridItem col={12}>
                <Divider marginTop={4} marginBottom={4} />
                <Typography variant="delta" marginBottom={3}>
                  Club-Auswahl
                </Typography>
                {formData.liga ? (
                  <Alert variant="success" title="Liga-basierte Filterung aktiv">
                    <Box>
                      <Typography variant="omega">
                        Clubs werden automatisch nach der ausgewählten Liga gefiltert
                      </Typography>
                      <Typography variant="pi" textColor="neutral600" marginTop={1}>
                        💡 Verwenden Sie die Suchfunktion für schnelle Club-Auswahl
                      </Typography>
                    </Box>
                  </Alert>
                ) : (
                  <Alert variant="default" title="Liga auswählen">
                    <Typography variant="omega">
                      Wählen Sie zuerst eine Liga aus, um die verfügbaren Clubs zu sehen
                    </Typography>
                  </Alert>
                )}
              </GridItem>

              <GridItem col={6}>
                <Box>
                  <Typography variant="omega" fontWeight="semiBold" marginBottom={2}>
                    Heim-Club
                  </Typography>
                  <ClubSelect
                    name="heim_club"
                    value={formData.heim_club}
                    onChange={handleClubChange('heim_club')}
                    ligaId={formData.liga}
                    otherClubId={formData.gast_club}
                    required
                    placeholder="Heim-Club auswählen..."
                    onValidationChange={handleClubValidationChange('heim')}
                    showValidationDetails={true}
                    enableRealTimeValidation={true}
                  />
                </Box>
              </GridItem>

              <GridItem col={6}>
                <Box>
                  <Typography variant="omega" fontWeight="semiBold" marginBottom={2}>
                    Gast-Club
                  </Typography>
                  <ClubSelect
                    name="gast_club"
                    value={formData.gast_club}
                    onChange={handleClubChange('gast_club')}
                    ligaId={formData.liga}
                    otherClubId={formData.heim_club}
                    required
                    placeholder="Gast-Club auswählen..."
                    onValidationChange={handleClubValidationChange('gast')}
                    showValidationDetails={true}
                    enableRealTimeValidation={true}
                  />
                </Box>
              </GridItem>

              {/* Game status and scores */}
              <GridItem col={12}>
                <Divider marginTop={4} marginBottom={4} />
                <Typography variant="delta" marginBottom={3}>
                  Spielstand und Status
                </Typography>
              </GridItem>

              <GridItem col={4}>
                <Select
                  label="Status"
                  name="status"
                  value={formData.status}
                  onChange={(value) => handleInputChange('status', value)}
                  disabled={readOnly}
                >
                  <Option value="geplant">Geplant</Option>
                  <Option value="beendet">Beendet</Option>
                  <Option value="abgesagt">Abgesagt</Option>
                  <Option value="verschoben">Verschoben</Option>
                </Select>
              </GridItem>

              <GridItem col={4}>
                <NumberInput
                  label="Heim-Tore"
                  name="heim_tore"
                  value={formData.heim_tore}
                  onValueChange={(value) => handleInputChange('heim_tore', value)}
                  min={0}
                  disabled={readOnly || formData.status !== 'beendet'}
                  placeholder={formData.status === 'beendet' ? '0' : 'Nur bei beendeten Spielen'}
                />
              </GridItem>

              <GridItem col={4}>
                <NumberInput
                  label="Gast-Tore"
                  name="gast_tore"
                  value={formData.gast_tore}
                  onValueChange={(value) => handleInputChange('gast_tore', value)}
                  min={0}
                  disabled={readOnly || formData.status !== 'beendet'}
                  placeholder={formData.status === 'beendet' ? '0' : 'Nur bei beendeten Spielen'}
                />
              </GridItem>

              {/* Notes */}
              <GridItem col={12}>
                <Textarea
                  label="Notizen"
                  name="notizen"
                  value={formData.notizen}
                  onChange={(e) => handleInputChange('notizen', e.target.value)}
                  disabled={readOnly}
                  placeholder="Zusätzliche Informationen zum Spiel..."
                />
              </GridItem>

              {/* Auto-save and last saved info */}
              {!isCreating && (
                <GridItem col={12}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" marginTop={2}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Typography variant="pi" textColor="neutral600">
                        Auto-Speichern:
                      </Typography>
                      <Button
                        variant={autoSaveEnabled ? 'success' : 'secondary'}
                        size="S"
                        onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                      >
                        {autoSaveEnabled ? 'Ein' : 'Aus'}
                      </Button>
                    </Box>
                    {lastSaved && (
                      <Typography variant="pi" textColor="neutral500">
                        Zuletzt gespeichert: {lastSaved.toLocaleTimeString()}
                      </Typography>
                    )}
                  </Box>
                </GridItem>
              )}
            </Grid>
          </CardContent>
        </CardBody>

        {/* Form actions */}
        {!readOnly && (
          <Box padding={4} background="neutral100">
            <Flex justifyContent="space-between">
              <Button
                variant="tertiary"
                onClick={onCancel}
                disabled={saving}
              >
                Abbrechen
              </Button>
              
              <Box display="flex" gap={2}>
                <Button
                  variant="success"
                  startIcon={<Save />}
                  onClick={handleSave}
                  disabled={!isFormValid || saving}
                  loading={saving}
                >
                  {saving ? 'Speichere...' : (isCreating ? 'Erstellen' : 'Speichern')}
                </Button>
              </Box>
            </Flex>
          </Box>
        )}

        {/* Form validation summary */}
        <EnhancedFormValidation
          validationState={validationState}
          onValidationChange={handleValidationChange}
          formData={formData}
        />
      </Card>

      {/* Preview mode */}
      {showPreview && (
        <Box marginTop={4}>
          <Card>
            <CardHeader>
              <Typography variant="beta">Vorschau</Typography>
            </CardHeader>
            <CardBody>
              <CardContent>
                <Grid gap={2}>
                  <GridItem col={12}>
                    <Typography variant="alpha">
                      {formData.heim_club && formData.gast_club ? 
                        `Heim vs Gast` : 'Spiel-Vorschau'}
                    </Typography>
                  </GridItem>
                  <GridItem col={6}>
                    <Typography variant="omega">
                      <strong>Datum:</strong> {formData.datum || 'Nicht gesetzt'}
                    </Typography>
                  </GridItem>
                  <GridItem col={6}>
                    <Typography variant="omega">
                      <strong>Spieltag:</strong> {formData.spieltag || 'Nicht gesetzt'}
                    </Typography>
                  </GridItem>
                  <GridItem col={6}>
                    <Typography variant="omega">
                      <strong>Status:</strong> {formData.status || 'Nicht gesetzt'}
                    </Typography>
                  </GridItem>
                  {formData.status === 'beendet' && (
                    <GridItem col={6}>
                      <Typography variant="omega">
                        <strong>Ergebnis:</strong> {formData.heim_tore || 0} : {formData.gast_tore || 0}
                      </Typography>
                    </GridItem>
                  )}
                  {formData.notizen && (
                    <GridItem col={12}>
                      <Typography variant="omega">
                        <strong>Notizen:</strong> {formData.notizen}
                      </Typography>
                    </GridItem>
                  )}
                </Grid>
              </CardContent>
            </CardBody>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default EnhancedGameForm;
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Select, 
  Option, 
  Searchbar, 
  Box, 
  Typography,
  Alert,
  Loader,
  Badge,
  Tooltip,
  IconButton
} from '@strapi/design-system';
import { Information, Refresh } from '@strapi/icons';
import { useFetchClient } from '@strapi/helper-plugin';
import { getValidationMessage, getValidationHint } from '../utils/validation-messages';

const ClubSelect = ({ 
  name, 
  value, 
  onChange, 
  error, 
  required = false,
  ligaId = null,
  placeholder = "Club auswählen...",
  otherClubId = null, // To prevent selecting the same club for both teams
  onValidationChange = null, // Callback for validation state changes
  showValidationDetails = true, // Show detailed validation info
  enableRealTimeValidation = true // Enable real-time validation
}) => {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [validationError, setValidationError] = useState('');
  const [validationWarnings, setValidationWarnings] = useState([]);
  const [validationDetails, setValidationDetails] = useState(null);
  const [lastFetchError, setLastFetchError] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { get } = useFetchClient();

  const fetchClubs = useCallback(async () => {
    setLoading(true);
    setLastFetchError('');
    
    try {
      let url = '/api/clubs?populate=*&sort=name:asc&filters[aktiv][$eq]=true';
      
      // Enhanced league-based filtering
      if (ligaId) {
        url += `&filters[ligen][id][$eq]=${ligaId}`;
        
        // Also get league info for better error messages
        try {
          const { data: ligaData } = await get(`/api/ligen/${ligaId}`);
          setValidationDetails(prev => ({
            ...prev,
            currentLiga: ligaData
          }));
        } catch (ligaError) {
          console.warn('Could not fetch liga data:', ligaError);
        }
      }
      
      const { data } = await get(url);
      const clubsData = data || [];
      setClubs(clubsData);
      
      // Enhanced validation after fetching
      if (enableRealTimeValidation && value && clubsData.length > 0) {
        await validateClubSelection(value, clubsData);
      }
      
      // Log filtering results for debugging
      if (ligaId) {
        console.debug(`Loaded ${clubsData.length} clubs for liga ${ligaId}`);
      }
      
    } catch (error) {
      console.error('Error fetching clubs:', error);
      const errorMessage = error.response?.data?.error?.message || error.message;
      setLastFetchError(`Fehler beim Laden der Clubs: ${errorMessage}`);
      setClubs([]);
    } finally {
      setLoading(false);
    }
  }, [ligaId, get, value, enableRealTimeValidation, validateClubSelection]);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  // Enhanced filter clubs based on search term and exclude the other selected club
  const filteredClubs = useMemo(() => {
    let filtered = clubs;
    
    // Filter by search term with enhanced matching
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(club => {
        const nameMatch = club.name.toLowerCase().includes(searchLower);
        const kurzNameMatch = club.kurz_name && club.kurz_name.toLowerCase().includes(searchLower);
        
        // Enhanced matching: also check for word starts and abbreviations
        const nameWords = club.name.toLowerCase().split(/\s+/);
        const wordStartMatch = nameWords.some(word => word.startsWith(searchLower));
        
        // Check for abbreviation match (first letters of words)
        const abbreviation = nameWords.map(word => word.charAt(0)).join('');
        const abbreviationMatch = abbreviation.includes(searchLower);
        
        return nameMatch || kurzNameMatch || wordStartMatch || abbreviationMatch;
      });
      
      // Sort filtered results by relevance
      filtered.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        
        // Exact name match first
        if (aName === searchLower) return -1;
        if (bName === searchLower) return 1;
        
        // Name starts with search term
        if (aName.startsWith(searchLower) && !bName.startsWith(searchLower)) return -1;
        if (bName.startsWith(searchLower) && !aName.startsWith(searchLower)) return 1;
        
        // Kurz_name exact match
        if (a.kurz_name && a.kurz_name.toLowerCase() === searchLower) return -1;
        if (b.kurz_name && b.kurz_name.toLowerCase() === searchLower) return 1;
        
        // Default alphabetical sort
        return aName.localeCompare(bName);
      });
    } else {
      // Default sort by name when no search term
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    // Exclude the other selected club to prevent same club selection
    if (otherClubId) {
      filtered = filtered.filter(club => club.id !== otherClubId);
    }
    
    // Prioritize active clubs
    filtered.sort((a, b) => {
      if (a.aktiv && !b.aktiv) return -1;
      if (!a.aktiv && b.aktiv) return 1;
      return 0;
    });
    
    return filtered;
  }, [clubs, searchTerm, otherClubId]);

  // Enhanced real-time validation function with API validation
  const validateClubSelection = useCallback(async (selectedValue, clubList = clubs) => {
    if (!enableRealTimeValidation || !selectedValue) {
      setValidationError('');
      setValidationWarnings([]);
      setValidationDetails(null);
      if (onValidationChange) {
        onValidationChange({
          isValid: true,
          errors: [],
          warnings: [],
          details: {}
        });
      }
      return { isValid: true, errors: [], warnings: [] };
    }

    const errors = [];
    const warnings = [];
    const details = {};

    try {
      // Find the selected club
      const selectedClub = clubList.find(club => club.id === selectedValue);
      
      if (!selectedClub) {
        errors.push(getValidationMessage('CLUB_NOT_FOUND'));
        details.clubNotFound = true;
      } else {
        details.selectedClub = selectedClub;

        // Validate club is active
        if (!selectedClub.aktiv) {
          errors.push(getValidationMessage('CLUB_INACTIVE', { clubName: selectedClub.name }));
          details.clubInactive = true;
        }

        // Enhanced league validation with API call
        if (ligaId && selectedClub.ligen) {
          const isInLiga = selectedClub.ligen.some(liga => liga.id === ligaId);
          if (!isInLiga) {
            errors.push(getValidationMessage('CLUB_NOT_IN_LIGA', { clubName: selectedClub.name }));
            details.clubNotInLiga = true;
          } else {
            // Additional API validation for league membership
            try {
              const { data: ligaValidation } = await get(`/api/spiel/validate-club/${selectedValue}/liga/${ligaId}`);
              if (!ligaValidation.isValid) {
                ligaValidation.errors?.forEach(error => {
                  errors.push(error.message);
                });
                details.apiValidationFailed = true;
              }
              if (ligaValidation.warnings) {
                ligaValidation.warnings.forEach(warning => {
                  warnings.push(warning.message);
                });
              }
            } catch (apiError) {
              console.warn('API validation failed, using local validation:', apiError);
              warnings.push('Erweiterte Validierung nicht verfügbar');
              details.apiValidationUnavailable = true;
            }
          }
        }

        // Validate not same as other club
        if (otherClubId && selectedValue === otherClubId) {
          errors.push(getValidationMessage('CLUB_AGAINST_ITSELF'));
          details.sameClubSelected = true;
        }

        // Enhanced club match validation with API call
        if (otherClubId && selectedValue !== otherClubId && ligaId) {
          try {
            const { data: matchValidation } = await get('/api/spiel/validate-clubs', {
              params: {
                heimClubId: name === 'heim_club' ? selectedValue : otherClubId,
                gastClubId: name === 'gast_club' ? selectedValue : otherClubId,
                ligaId: ligaId
              }
            });
            
            if (!matchValidation.isValid) {
              matchValidation.errors?.forEach(error => {
                if (error.field === name || error.field === 'clubs') {
                  errors.push(error.message);
                }
              });
            }
            
            if (matchValidation.warnings) {
              matchValidation.warnings.forEach(warning => {
                if (warning.field === name || warning.field === 'clubs') {
                  warnings.push(warning.message);
                }
              });
            }
            
            details.matchValidation = matchValidation;
          } catch (apiError) {
            console.warn('Club match validation failed:', apiError);
            details.matchValidationFailed = true;
          }
        }

        // Add warnings for special cases
        if (selectedClub.club_typ === 'viktoria_verein') {
          warnings.push('Viktoria-Verein ausgewählt');
          details.isViktoriaClub = true;
          
          // Check for Viktoria team mapping conflicts
          if (otherClubId) {
            const otherClub = clubList.find(club => club.id === otherClubId);
            if (otherClub && otherClub.club_typ === 'viktoria_verein' && 
                otherClub.viktoria_team_mapping === selectedClub.viktoria_team_mapping) {
              errors.push('Viktoria-Clubs mit derselben Team-Zuordnung können nicht gegeneinander spielen');
              details.duplicateViktoriaMapping = true;
            }
          }
        }

        if (selectedClub.ligen && selectedClub.ligen.length > 1) {
          warnings.push(`Club spielt in ${selectedClub.ligen.length} Ligen`);
          details.multipleLeagues = selectedClub.ligen.length;
        }

        // Check for similar club names (potential user error)
        if (otherClubId) {
          const otherClub = clubList.find(club => club.id === otherClubId);
          if (otherClub) {
            const similarity = calculateNameSimilarity(selectedClub.name, otherClub.name);
            if (similarity > 0.8 && similarity < 1.0) {
              warnings.push(`Club-Namen sind sehr ähnlich: "${selectedClub.name}" vs "${otherClub.name}"`);
              details.similarNames = { similarity, otherClubName: otherClub.name };
            }
          }
        }
      }

      // Update validation state
      setValidationError(errors.length > 0 ? errors[0] : '');
      setValidationWarnings(warnings);
      setValidationDetails(details);

      // Notify parent component of validation state
      if (onValidationChange) {
        onValidationChange({
          isValid: errors.length === 0,
          errors,
          warnings,
          details
        });
      }

      return { isValid: errors.length === 0, errors, warnings, details };
    } catch (error) {
      console.error('Error in club validation:', error);
      const errorMsg = `Validierungsfehler: ${error.message}`;
      setValidationError(errorMsg);
      
      if (onValidationChange) {
        onValidationChange({
          isValid: false,
          errors: [errorMsg],
          warnings: [],
          details: { validationError: error.message }
        });
      }

      return { isValid: false, errors: [errorMsg], warnings: [], details: {} };
    }
  }, [clubs, ligaId, otherClubId, enableRealTimeValidation, onValidationChange, get, name]);

  // Helper function to calculate name similarity
  const calculateNameSimilarity = useCallback((name1, name2) => {
    if (!name1 || !name2) return 0;
    
    const longer = name1.length > name2.length ? name1.toLowerCase() : name2.toLowerCase();
    const shorter = name1.length > name2.length ? name2.toLowerCase() : name1.toLowerCase();
    
    if (longer.length === 0) return 1.0;
    
    // Simple similarity calculation
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) matches++;
    }
    
    return matches / longer.length;
  }, []);

  const handleChange = async (selectedValue) => {
    // Clear previous search when selecting
    setSearchTerm('');
    
    // Perform real-time validation
    const validation = await validateClubSelection(selectedValue);
    
    // Always proceed with change but show validation results
    onChange({
      target: {
        name,
        value: selectedValue,
        type: 'select'
      }
    });

    // Show validation feedback
    if (!validation.isValid && enableRealTimeValidation) {
      // Validation errors are already set in validateClubSelection
      console.warn('Club selection validation failed:', validation.errors);
    }
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setHighlightedIndex(-1); // Reset highlight when search changes
    setIsDropdownOpen(value.length > 0 || filteredClubs.length > 0);
    
    // Auto-select if only one match and search is specific enough
    if (value.length >= 3) {
      const matches = clubs.filter(club => {
        const nameMatch = club.name.toLowerCase().includes(value.toLowerCase());
        const kurzNameMatch = club.kurz_name && club.kurz_name.toLowerCase().includes(value.toLowerCase());
        return nameMatch || kurzNameMatch;
      });
      
      // If exactly one match and it's not already selected, suggest it
      if (matches.length === 1 && matches[0].id !== value && matches[0].id !== otherClubId) {
        // Don't auto-select, but we could add visual indication
        console.debug('Single match found:', matches[0].name);
      }
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event) => {
    if (!isDropdownOpen || filteredClubs.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredClubs.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredClubs.length - 1
        );
        break;
      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredClubs.length) {
          handleChange(filteredClubs[highlightedIndex].id);
          setIsDropdownOpen(false);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  }, [isDropdownOpen, filteredClubs, highlightedIndex, handleChange]);

  const selectedClub = clubs.find(club => club.id === value);

  return (
    <Box>
      {/* Enhanced header with search and refresh */}
      <Box display="flex" alignItems="center" marginBottom={2}>
        <Box flex="1" position="relative">
          <Searchbar
            name={`${name}_search`}
            onClear={() => {
              setSearchTerm('');
              setIsDropdownOpen(false);
              setHighlightedIndex(-1);
            }}
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            placeholder={ligaId ? "Club in Liga suchen..." : "Zuerst Liga auswählen, dann Club suchen..."}
            disabled={loading}
          />
          {/* Search results count */}
          {searchTerm && (
            <Box position="absolute" right={2} top="50%" transform="translateY(-50%)" zIndex={1}>
              <Typography variant="pi" textColor="neutral500">
                {filteredClubs.length} gefunden
              </Typography>
            </Box>
          )}
        </Box>
        <Box marginLeft={2}>
          <Tooltip description="Clubs neu laden">
            <IconButton
              onClick={fetchClubs}
              disabled={loading}
              label="Clubs neu laden"
              icon={<Refresh />}
            />
          </Tooltip>
        </Box>
        {showValidationDetails && (
          <Box marginLeft={1}>
            <Tooltip description={getValidationHint(name, { hasLiga: !!ligaId })}>
              <IconButton
                label="Validierungsinfo"
                icon={<Information />}
                variant="ghost"
              />
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* Enhanced club selection dropdown */}
      <Select
        name={name}
        value={value || ''}
        onChange={handleChange}
        error={error || validationError}
        required={required}
        placeholder={loading ? "Lade Clubs..." : ligaId ? placeholder : "Zuerst Liga auswählen..."}
        disabled={loading || !ligaId}
        onFocus={() => setIsDropdownOpen(true)}
        onBlur={() => {
          // Delay closing to allow for option selection
          setTimeout(() => setIsDropdownOpen(false), 150);
        }}
      >
        {filteredClubs.map((club, index) => (
          <Option 
            key={club.id} 
            value={club.id}
            style={{
              backgroundColor: index === highlightedIndex ? '#f0f0f0' : 'transparent'
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box flex="1">
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography 
                    variant="omega"
                    fontWeight={club.id === value ? 'semiBold' : 'normal'}
                  >
                    {club.name}
                  </Typography>
                  {club.kurz_name && (
                    <Typography variant="pi" textColor="neutral600">
                      ({club.kurz_name})
                    </Typography>
                  )}
                </Box>
                {/* Show league info if club is in multiple leagues */}
                {club.ligen && club.ligen.length > 1 && (
                  <Typography variant="pi" textColor="neutral500" marginTop={1}>
                    Ligen: {club.ligen.map(l => l.name).join(', ')}
                  </Typography>
                )}
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                {club.club_typ === 'viktoria_verein' && (
                  <Badge backgroundColor="primary100" textColor="primary600" size="S">
                    Viktoria
                  </Badge>
                )}
                {club.ligen && club.ligen.length > 1 && (
                  <Badge backgroundColor="warning100" textColor="warning600" size="S">
                    {club.ligen.length} Ligen
                  </Badge>
                )}
                {!club.aktiv && (
                  <Badge backgroundColor="danger100" textColor="danger600" size="S">
                    Inaktiv
                  </Badge>
                )}
                {club.id === value && (
                  <Typography variant="pi" textColor="success600">
                    ✓
                  </Typography>
                )}
              </Box>
            </Box>
          </Option>
        ))}
      </Select>

      {/* Loading indicator */}
      {loading && (
        <Box marginTop={2} display="flex" justifyContent="center">
          <Loader small>Lade Clubs...</Loader>
        </Box>
      )}

      {/* Fetch error */}
      {lastFetchError && (
        <Box marginTop={2}>
          <Alert closeLabel="Schließen" title="Ladefehler" variant="danger">
            {lastFetchError}
          </Alert>
        </Box>
      )}

      {/* Show selected club info with validation details */}
      {selectedClub && showValidationDetails && (
        <Box marginTop={2} padding={3} background="neutral100" borderRadius="4px">
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="omega" fontWeight="semiBold">
                {selectedClub.name}
              </Typography>
              {selectedClub.kurz_name && (
                <Typography variant="pi" textColor="neutral600">
                  Kurzname: {selectedClub.kurz_name}
                </Typography>
              )}
              <Box marginTop={1} display="flex" gap={1}>
                <Badge 
                  backgroundColor={selectedClub.club_typ === 'viktoria_verein' ? 'primary100' : 'secondary100'}
                  textColor={selectedClub.club_typ === 'viktoria_verein' ? 'primary600' : 'secondary600'}
                  size="S"
                >
                  {selectedClub.club_typ === 'viktoria_verein' ? 'Viktoria Verein' : 'Gegner Verein'}
                </Badge>
                <Badge 
                  backgroundColor={selectedClub.aktiv ? 'success100' : 'danger100'}
                  textColor={selectedClub.aktiv ? 'success600' : 'danger600'}
                  size="S"
                >
                  {selectedClub.aktiv ? 'Aktiv' : 'Inaktiv'}
                </Badge>
              </Box>
            </Box>
            {validationDetails && (
              <Box>
                {validationDetails.isViktoriaClub && (
                  <Typography variant="pi" textColor="primary600">
                    ⚡ Viktoria Club
                  </Typography>
                )}
                {validationDetails.multipleLeagues && (
                  <Typography variant="pi" textColor="warning600">
                    ⚠️ {validationDetails.multipleLeagues} Ligen
                  </Typography>
                )}
              </Box>
            )}
          </Box>
          
          {/* Liga information */}
          {selectedClub.ligen && selectedClub.ligen.length > 0 && (
            <Box marginTop={2}>
              <Typography variant="pi" textColor="neutral600" fontWeight="semiBold">
                Ligen:
              </Typography>
              <Box marginTop={1} display="flex" flexWrap="wrap" gap={1}>
                {selectedClub.ligen.map((liga) => (
                  <Badge 
                    key={liga.id}
                    backgroundColor={liga.id === ligaId ? 'success100' : 'neutral100'}
                    textColor={liga.id === ligaId ? 'success600' : 'neutral600'}
                    size="S"
                  >
                    {liga.name}
                    {liga.id === ligaId && ' ✓'}
                  </Badge>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Liga filter info */}
      {ligaId && (
        <Box marginTop={1}>
          <Typography variant="pi" textColor="neutral500">
            🔍 Gefiltert nach Liga-ID: {ligaId} ({filteredClubs.length} Clubs verfügbar)
          </Typography>
        </Box>
      )}

      {/* Enhanced validation feedback */}
      {validationError && (
        <Box marginTop={2}>
          <Alert closeLabel="Schließen" title="Validierungsfehler" variant="danger">
            <Box display="flex" alignItems="flex-start" gap={2}>
              <Typography variant="omega">❌</Typography>
              <Box>
                <Typography variant="omega" fontWeight="semiBold">
                  {validationError}
                </Typography>
                {validationDetails?.selectedClub && (
                  <Typography variant="pi" textColor="neutral600" marginTop={1}>
                    Betroffener Club: {validationDetails.selectedClub.name}
                  </Typography>
                )}
              </Box>
            </Box>
          </Alert>
        </Box>
      )}

      {/* Enhanced validation warnings */}
      {validationWarnings.length > 0 && (
        <Box marginTop={2}>
          <Alert closeLabel="Schließen" title="Hinweise" variant="default">
            <Box>
              {validationWarnings.map((warning, index) => (
                <Box key={index} display="flex" alignItems="flex-start" gap={2} marginBottom={index < validationWarnings.length - 1 ? 2 : 0}>
                  <Typography variant="omega">⚠️</Typography>
                  <Typography variant="omega">{warning}</Typography>
                </Box>
              ))}
              {validationDetails?.apiValidationUnavailable && (
                <Box marginTop={2} padding={2} background="warning100" borderRadius="4px">
                  <Typography variant="pi" textColor="warning700">
                    💡 Erweiterte API-Validierung ist momentan nicht verfügbar. Grundvalidierung wird verwendet.
                  </Typography>
                </Box>
              )}
            </Box>
          </Alert>
        </Box>
      )}

      {/* No clubs found message */}
      {!loading && filteredClubs.length === 0 && !lastFetchError && (
        <Box marginTop={2}>
          <Alert closeLabel="Schließen" title="Keine Clubs gefunden" variant="default">
            {searchTerm 
              ? `Keine Clubs gefunden für "${searchTerm}"`
              : ligaId 
                ? 'Keine aktiven Clubs in dieser Liga gefunden'
                : 'Keine aktiven Clubs verfügbar'
            }
            {ligaId && (
              <Box marginTop={2}>
                <Typography variant="pi" textColor="neutral600">
                  💡 Tipp: Überprüfen Sie, ob Clubs der Liga zugeordnet sind
                </Typography>
              </Box>
            )}
          </Alert>
        </Box>
      )}

      {/* Help text */}
      {showValidationDetails && !loading && filteredClubs.length > 0 && (
        <Box marginTop={2}>
          <Typography variant="pi" textColor="neutral500">
            💡 Verwenden Sie die Suchfunktion, um Clubs schnell zu finden. 
            {enableRealTimeValidation && ' Validierung erfolgt automatisch bei der Auswahl.'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ClubSelect;
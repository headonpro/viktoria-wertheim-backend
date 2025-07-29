import React, { useState, useEffect } from 'react';
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
  Select,
  Option,
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th,
  Badge,
  IconButton,
  Alert,
  Loader,
  Checkbox,
  Divider
} from '@strapi/design-system';
import { Plus, Trash, Check, Cross, Transfer } from '@strapi/icons';
import { useFetchClient } from '@strapi/helper-plugin';

const LigaAssignmentManager = ({ isOpen, onClose, onSuccess }) => {
  const [clubs, setClubs] = useState([]);
  const [ligen, setLigen] = useState([]);
  const [selectedLiga, setSelectedLiga] = useState('');
  const [selectedClub, setSelectedClub] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedClubs, setSelectedClubs] = useState([]);
  
  const { get, put } = useFetchClient();

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedLiga) {
      fetchAssignments();
    }
  }, [selectedLiga]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clubsResponse, ligenResponse] = await Promise.all([
        get('/api/clubs?populate=ligen'),
        get('/api/ligas')
      ]);
      
      setClubs(clubsResponse.data.data || []);
      setLigen(ligenResponse.data.data || []);
    } catch (error) {
      showAlert('Fehler beim Laden der Daten', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    if (!selectedLiga) return;
    
    try {
      const response = await get(`/api/ligas/${selectedLiga}?populate=clubs`);
      const ligaData = response.data.data;
      
      const assignedClubs = ligaData.attributes.clubs?.data || [];
      const unassignedClubs = clubs.filter(club => 
        !assignedClubs.some(assigned => assigned.id === club.id)
      );
      
      setAssignments({
        assigned: assignedClubs,
        unassigned: unassignedClubs,
        ligaName: ligaData.attributes.name
      });
    } catch (error) {
      showAlert('Fehler beim Laden der Zuordnungen', 'danger');
    }
  };

  const handleAssignClub = async (clubId, assign = true) => {
    try {
      const club = clubs.find(c => c.id === clubId);
      if (!club) return;

      const currentLigen = club.attributes.ligen?.data?.map(l => l.id) || [];
      let newLigen;
      
      if (assign) {
        newLigen = [...currentLigen, parseInt(selectedLiga)];
      } else {
        newLigen = currentLigen.filter(id => id !== parseInt(selectedLiga));
      }

      await put(`/api/clubs/${clubId}`, {
        data: { ligen: newLigen }
      });

      await fetchData();
      await fetchAssignments();
      
      showAlert(
        `${club.attributes.name} ${assign ? 'zur Liga hinzugefügt' : 'aus Liga entfernt'}`, 
        'success'
      );
    } catch (error) {
      showAlert('Fehler beim Aktualisieren der Zuordnung', 'danger');
    }
  };

  const handleBulkAssign = async (assign = true) => {
    try {
      setLoading(true);
      
      await Promise.all(selectedClubs.map(clubId => handleAssignClub(clubId, assign)));
      
      setSelectedClubs([]);
      setBulkMode(false);
      
      showAlert(
        `${selectedClubs.length} Vereine ${assign ? 'hinzugefügt' : 'entfernt'}`, 
        'success'
      );
    } catch (error) {
      showAlert('Fehler beim Bulk-Update', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleClubSelect = (clubId, selected) => {
    if (selected) {
      setSelectedClubs([...selectedClubs, clubId]);
    } else {
      setSelectedClubs(selectedClubs.filter(id => id !== clubId));
    }
  };

  const showAlert = (message, variant) => {
    setAlert({ message, variant });
    setTimeout(() => setAlert(null), 5000);
  };

  const getClubTypeBadge = (type) => {
    return type === 'viktoria_verein' 
      ? <Badge backgroundColor="success100" textColor="success600">Viktoria</Badge>
      : <Badge backgroundColor="neutral100" textColor="neutral600">Gegner</Badge>;
  };

  const getStatusBadge = (active) => {
    return active 
      ? <Badge backgroundColor="success100" textColor="success600">Aktiv</Badge>
      : <Badge backgroundColor="danger100" textColor="danger600">Inaktiv</Badge>;
  };

  if (loading && !assignments.assigned) {
    return (
      <Modal onClose={onClose} labelledBy="title">
        <ModalLayout>
          <ModalBody>
            <Flex justifyContent="center" padding={8}>
              <Loader>Lade Daten...</Loader>
            </Flex>
          </ModalBody>
        </ModalLayout>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} labelledBy="title">
      <ModalLayout>
        <ModalHeader>
          <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
            Liga-Zuordnungen verwalten
          </Typography>
        </ModalHeader>

        <ModalBody>
          {alert && (
            <Box marginBottom={4}>
              <Alert variant={alert.variant} title={alert.message} />
            </Box>
          )}

          {/* Liga Selection */}
          <Box marginBottom={4}>
            <Typography variant="omega" marginBottom={2}>Liga auswählen:</Typography>
            <Select
              placeholder="Liga wählen..."
              value={selectedLiga}
              onChange={setSelectedLiga}
            >
              {ligen.map(liga => (
                <Option key={liga.id} value={liga.id.toString()}>
                  {liga.attributes.name}
                </Option>
              ))}
            </Select>
          </Box>

          {selectedLiga && assignments.assigned && (
            <>
              {/* Controls */}
              <Flex justifyContent="space-between" alignItems="center" marginBottom={4}>
                <Typography variant="beta">
                  {assignments.ligaName}
                </Typography>
                <Flex gap={2}>
                  <Button
                    variant={bulkMode ? 'default' : 'tertiary'}
                    onClick={() => setBulkMode(!bulkMode)}
                    size="S"
                  >
                    Bulk-Modus
                  </Button>
                  {bulkMode && selectedClubs.length > 0 && (
                    <>
                      <Button
                        variant="success-light"
                        onClick={() => handleBulkAssign(true)}
                        size="S"
                        startIcon={<Plus />}
                      >
                        Hinzufügen ({selectedClubs.length})
                      </Button>
                      <Button
                        variant="danger-light"
                        onClick={() => handleBulkAssign(false)}
                        size="S"
                        startIcon={<Trash />}
                      >
                        Entfernen ({selectedClubs.length})
                      </Button>
                    </>
                  )}
                </Flex>
              </Flex>

              <Box display="grid" gridTemplateColumns="1fr 1fr" gap={4}>
                {/* Assigned Clubs */}
                <Box>
                  <Typography variant="delta" marginBottom={3} textColor="success600">
                    Zugeordnete Vereine ({assignments.assigned.length})
                  </Typography>
                  
                  <Box background="success50" borderRadius="4px" padding={3} maxHeight="400px" overflow="auto">
                    {assignments.assigned.length === 0 ? (
                      <Typography textColor="neutral600" textAlign="center">
                        Keine Vereine zugeordnet
                      </Typography>
                    ) : (
                      <Table colCount={bulkMode ? 4 : 3} rowCount={assignments.assigned.length}>
                        <Thead>
                          <Tr>
                            {bulkMode && <Th><Typography variant="sigma">Auswahl</Typography></Th>}
                            <Th><Typography variant="sigma">Name</Typography></Th>
                            <Th><Typography variant="sigma">Typ</Typography></Th>
                            <Th><Typography variant="sigma">Aktion</Typography></Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {assignments.assigned.map(club => (
                            <Tr key={club.id}>
                              {bulkMode && (
                                <Td>
                                  <Checkbox
                                    checked={selectedClubs.includes(club.id)}
                                    onChange={(e) => handleClubSelect(club.id, e.target.checked)}
                                  />
                                </Td>
                              )}
                              <Td>
                                <Typography variant="omega">{club.attributes.name}</Typography>
                              </Td>
                              <Td>
                                {getClubTypeBadge(club.attributes.club_typ)}
                              </Td>
                              <Td>
                                {!bulkMode && (
                                  <IconButton
                                    onClick={() => handleAssignClub(club.id, false)}
                                    label="Entfernen"
                                    icon={<Cross />}
                                  />
                                )}
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    )}
                  </Box>
                </Box>

                {/* Unassigned Clubs */}
                <Box>
                  <Typography variant="delta" marginBottom={3} textColor="neutral600">
                    Verfügbare Vereine ({assignments.unassigned.length})
                  </Typography>
                  
                  <Box background="neutral100" borderRadius="4px" padding={3} maxHeight="400px" overflow="auto">
                    {assignments.unassigned.length === 0 ? (
                      <Typography textColor="neutral600" textAlign="center">
                        Alle Vereine sind bereits zugeordnet
                      </Typography>
                    ) : (
                      <Table colCount={bulkMode ? 4 : 3} rowCount={assignments.unassigned.length}>
                        <Thead>
                          <Tr>
                            {bulkMode && <Th><Typography variant="sigma">Auswahl</Typography></Th>}
                            <Th><Typography variant="sigma">Name</Typography></Th>
                            <Th><Typography variant="sigma">Typ</Typography></Th>
                            <Th><Typography variant="sigma">Aktion</Typography></Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {assignments.unassigned.map(club => (
                            <Tr key={club.id}>
                              {bulkMode && (
                                <Td>
                                  <Checkbox
                                    checked={selectedClubs.includes(club.id)}
                                    onChange={(e) => handleClubSelect(club.id, e.target.checked)}
                                  />
                                </Td>
                              )}
                              <Td>
                                <Typography variant="omega">{club.attributes.name}</Typography>
                              </Td>
                              <Td>
                                {getClubTypeBadge(club.attributes.club_typ)}
                              </Td>
                              <Td>
                                {!bulkMode && (
                                  <IconButton
                                    onClick={() => handleAssignClub(club.id, true)}
                                    label="Hinzufügen"
                                    icon={<Plus />}
                                  />
                                )}
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Statistics */}
              <Box marginTop={4}>
                <Divider />
                <Box marginTop={3}>
                  <Flex gap={4}>
                    <Box padding={2} background="success100" borderRadius="4px" flex="1">
                      <Typography variant="sigma" textColor="success600">Zugeordnet</Typography>
                      <Typography variant="beta" textColor="success600">
                        {assignments.assigned.length}
                      </Typography>
                    </Box>
                    <Box padding={2} background="neutral100" borderRadius="4px" flex="1">
                      <Typography variant="sigma" textColor="neutral600">Verfügbar</Typography>
                      <Typography variant="beta">
                        {assignments.unassigned.length}
                      </Typography>
                    </Box>
                    <Box padding={2} background="primary100" borderRadius="4px" flex="1">
                      <Typography variant="sigma" textColor="primary600">Gesamt</Typography>
                      <Typography variant="beta" textColor="primary600">
                        {clubs.length}
                      </Typography>
                    </Box>
                  </Flex>
                </Box>
              </Box>
            </>
          )}
        </ModalBody>

        <ModalFooter
          startActions={
            <Button onClick={onClose} variant="tertiary">
              Schließen
            </Button>
          }
          endActions={
            selectedLiga && (
              <Button
                onClick={() => {
                  onSuccess?.();
                  onClose();
                }}
                variant="default"
              >
                Fertig
              </Button>
            )
          }
        />
      </ModalLayout>
    </Modal>
  );
};

export default LigaAssignmentManager;
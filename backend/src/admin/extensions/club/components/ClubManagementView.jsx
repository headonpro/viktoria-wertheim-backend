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
  Searchbar,
  Select,
  Option,
  Loader,
  Alert
} from '@strapi/design-system';
import { 
  Plus, 
  Pencil, 
  Trash, 
  Download, 
  Upload, 
  Eye,
  Check,
  Cross
} from '@strapi/icons';
import { useFetchClient } from '@strapi/helper-plugin';

const ClubManagementView = () => {
  const [clubs, setClubs] = useState([]);
  const [filteredClubs, setFilteredClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterLiga, setFilterLiga] = useState('all');
  const [ligen, setLigen] = useState([]);
  const [selectedClubs, setSelectedClubs] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [alert, setAlert] = useState(null);
  
  const { get, post, put, del } = useFetchClient();

  useEffect(() => {
    fetchClubs();
    fetchLigen();
  }, []);

  useEffect(() => {
    filterClubs();
  }, [clubs, searchTerm, filterType, filterLiga]);

  const fetchClubs = async () => {
    try {
      setLoading(true);
      const response = await get('/api/clubs?populate=*');
      setClubs(response.data.data || []);
    } catch (error) {
      showAlert('Fehler beim Laden der Vereine', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const fetchLigen = async () => {
    try {
      const response = await get('/api/ligas');
      setLigen(response.data.data || []);
    } catch (error) {
      console.error('Error fetching ligen:', error);
    }
  };

  const filterClubs = () => {
    let filtered = clubs;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(club => 
        club.attributes.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (club.attributes.kurz_name && club.attributes.kurz_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (club.attributes.heimstadion && club.attributes.heimstadion.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(club => club.attributes.club_typ === filterType);
    }

    // Liga filter
    if (filterLiga !== 'all') {
      filtered = filtered.filter(club => 
        club.attributes.ligen?.data?.some(liga => liga.id.toString() === filterLiga)
      );
    }

    setFilteredClubs(filtered);
  };

  const handleClubSelect = (clubId, selected) => {
    if (selected) {
      setSelectedClubs([...selectedClubs, clubId]);
    } else {
      setSelectedClubs(selectedClubs.filter(id => id !== clubId));
    }
  };

  const handleSelectAll = () => {
    if (selectedClubs.length === filteredClubs.length) {
      setSelectedClubs([]);
    } else {
      setSelectedClubs(filteredClubs.map(club => club.id));
    }
  };

  const handleDeleteClub = async (clubId) => {
    try {
      await del(`/api/clubs/${clubId}`);
      await fetchClubs();
      showAlert('Verein erfolgreich gelöscht', 'success');
    } catch (error) {
      showAlert('Fehler beim Löschen des Vereins', 'danger');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedClubs.map(id => del(`/api/clubs/${id}`)));
      await fetchClubs();
      setSelectedClubs([]);
      setShowDeleteDialog(false);
      showAlert(`${selectedClubs.length} Vereine erfolgreich gelöscht`, 'success');
    } catch (error) {
      showAlert('Fehler beim Löschen der Vereine', 'danger');
    }
  };

  const handleBulkActivate = async (active) => {
    try {
      await Promise.all(selectedClubs.map(id => 
        put(`/api/clubs/${id}`, { data: { aktiv: active } })
      ));
      await fetchClubs();
      setSelectedClubs([]);
      showAlert(`${selectedClubs.length} Vereine ${active ? 'aktiviert' : 'deaktiviert'}`, 'success');
    } catch (error) {
      showAlert('Fehler beim Aktualisieren der Vereine', 'danger');
    }
  };

  const handleExport = async () => {
    try {
      const response = await get('/api/clubs/export');
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clubs-export-${new Date().toISOString().split('T')[0]}.json`;
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

  if (loading) {
    return (
      <Box padding={8}>
        <Flex justifyContent="center">
          <Loader>Lade Vereine...</Loader>
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
        <Typography variant="alpha">Vereinsverwaltung</Typography>
        <Flex gap={2}>
          <Button 
            variant="secondary" 
            startIcon={<Download />}
            onClick={handleExport}
          >
            Export
          </Button>
          <Button 
            variant="secondary" 
            startIcon={<Upload />}
            onClick={() => {/* TODO: Implement import */}}
          >
            Import
          </Button>
          <Button 
            variant="default" 
            startIcon={<Plus />}
            onClick={() => window.location.href = '/admin/content-manager/collectionType/api::club.club/create'}
          >
            Neuer Verein
          </Button>
        </Flex>
      </Flex>

      {/* Filters */}
      <Box marginBottom={4}>
        <Flex gap={4} alignItems="end">
          <Box flex="1">
            <Searchbar
              name="search"
              placeholder="Vereine durchsuchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm('')}
            />
          </Box>
          <Box minWidth="150px">
            <Select
              placeholder="Typ filtern"
              value={filterType}
              onChange={setFilterType}
            >
              <Option value="all">Alle Typen</Option>
              <Option value="viktoria_verein">Viktoria Vereine</Option>
              <Option value="gegner_verein">Gegner Vereine</Option>
            </Select>
          </Box>
          <Box minWidth="150px">
            <Select
              placeholder="Liga filtern"
              value={filterLiga}
              onChange={setFilterLiga}
            >
              <Option value="all">Alle Ligen</Option>
              {ligen.map(liga => (
                <Option key={liga.id} value={liga.id.toString()}>
                  {liga.attributes.name}
                </Option>
              ))}
            </Select>
          </Box>
        </Flex>
      </Box>

      {/* Bulk Actions */}
      {selectedClubs.length > 0 && (
        <Box marginBottom={4} padding={3} background="neutral100" borderRadius="4px">
          <Flex justifyContent="space-between" alignItems="center">
            <Typography variant="omega">
              {selectedClubs.length} Verein(e) ausgewählt
            </Typography>
            <Flex gap={2}>
              <Button 
                variant="secondary" 
                size="S"
                onClick={() => handleBulkActivate(true)}
              >
                Aktivieren
              </Button>
              <Button 
                variant="secondary" 
                size="S"
                onClick={() => handleBulkActivate(false)}
              >
                Deaktivieren
              </Button>
              <Button 
                variant="danger-light" 
                size="S"
                onClick={() => setShowDeleteDialog(true)}
              >
                Löschen
              </Button>
            </Flex>
          </Flex>
        </Box>
      )}

      {/* Table */}
      <Box background="neutral0" borderRadius="4px" shadow="filterShadow">
        <Table colCount={8} rowCount={filteredClubs.length + 1}>
          <Thead>
            <Tr>
              <Th>
                <input
                  type="checkbox"
                  checked={selectedClubs.length === filteredClubs.length && filteredClubs.length > 0}
                  onChange={handleSelectAll}
                />
              </Th>
              <Th>
                <Typography variant="sigma">Name</Typography>
              </Th>
              <Th>
                <Typography variant="sigma">Kurzname</Typography>
              </Th>
              <Th>
                <Typography variant="sigma">Typ</Typography>
              </Th>
              <Th>
                <Typography variant="sigma">Team-Zuordnung</Typography>
              </Th>
              <Th>
                <Typography variant="sigma">Ligen</Typography>
              </Th>
              <Th>
                <Typography variant="sigma">Status</Typography>
              </Th>
              <Th>
                <Typography variant="sigma">Aktionen</Typography>
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredClubs.map((club) => (
              <Tr key={club.id}>
                <Td>
                  <input
                    type="checkbox"
                    checked={selectedClubs.includes(club.id)}
                    onChange={(e) => handleClubSelect(club.id, e.target.checked)}
                  />
                </Td>
                <Td>
                  <Typography textColor="neutral800">
                    {club.attributes.name}
                  </Typography>
                </Td>
                <Td>
                  <Typography textColor="neutral600">
                    {club.attributes.kurz_name || '-'}
                  </Typography>
                </Td>
                <Td>
                  {getClubTypeBadge(club.attributes.club_typ)}
                </Td>
                <Td>
                  <Typography textColor="neutral600">
                    {club.attributes.viktoria_team_mapping || '-'}
                  </Typography>
                </Td>
                <Td>
                  <Typography textColor="neutral600">
                    {club.attributes.ligen?.data?.length || 0} Liga(s)
                  </Typography>
                </Td>
                <Td>
                  {getStatusBadge(club.attributes.aktiv)}
                </Td>
                <Td>
                  <Flex gap={1}>
                    <IconButton
                      onClick={() => window.location.href = `/admin/content-manager/collectionType/api::club.club/${club.id}`}
                      label="Anzeigen"
                      icon={<Eye />}
                    />
                    <IconButton
                      onClick={() => window.location.href = `/admin/content-manager/collectionType/api::club.club/${club.id}?redirectUrl=/admin/content-manager/collectionType/api::club.club`}
                      label="Bearbeiten"
                      icon={<Pencil />}
                    />
                    <IconButton
                      onClick={() => handleDeleteClub(club.id)}
                      label="Löschen"
                      icon={<Trash />}
                    />
                  </Flex>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* Statistics */}
      <Box marginTop={4}>
        <Flex gap={4}>
          <Box padding={3} background="neutral100" borderRadius="4px" flex="1">
            <Typography variant="sigma" textColor="neutral600">Gesamt</Typography>
            <Typography variant="beta">{clubs.length}</Typography>
          </Box>
          <Box padding={3} background="success100" borderRadius="4px" flex="1">
            <Typography variant="sigma" textColor="success600">Viktoria Vereine</Typography>
            <Typography variant="beta" textColor="success600">
              {clubs.filter(c => c.attributes.club_typ === 'viktoria_verein').length}
            </Typography>
          </Box>
          <Box padding={3} background="neutral100" borderRadius="4px" flex="1">
            <Typography variant="sigma" textColor="neutral600">Gegner Vereine</Typography>
            <Typography variant="beta">
              {clubs.filter(c => c.attributes.club_typ === 'gegner_verein').length}
            </Typography>
          </Box>
          <Box padding={3} background="danger100" borderRadius="4px" flex="1">
            <Typography variant="sigma" textColor="danger600">Inaktiv</Typography>
            <Typography variant="beta" textColor="danger600">
              {clubs.filter(c => !c.attributes.aktiv).length}
            </Typography>
          </Box>
        </Flex>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog onClose={() => setShowDeleteDialog(false)} title="Vereine löschen" isOpen={showDeleteDialog}>
        <DialogBody>
          <Typography>
            Sind Sie sicher, dass Sie {selectedClubs.length} Verein(e) löschen möchten? 
            Diese Aktion kann nicht rückgängig gemacht werden.
          </Typography>
        </DialogBody>
        <DialogFooter
          startAction={
            <Button onClick={() => setShowDeleteDialog(false)} variant="tertiary">
              Abbrechen
            </Button>
          }
          endAction={
            <Button onClick={handleBulkDelete} variant="danger">
              Löschen
            </Button>
          }
        />
      </Dialog>
    </Box>
  );
};

export default ClubManagementView;
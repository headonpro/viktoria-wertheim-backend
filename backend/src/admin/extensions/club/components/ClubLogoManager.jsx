import React, { useState, useEffect, useRef } from 'react';
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
  Grid,
  GridItem,
  Card,
  CardBody,
  CardContent,
  CardAsset,
  CardBadge,
  CardAction,
  IconButton,
  Alert,
  Loader,
  ProgressBar,
  Divider,
  Badge
} from '@strapi/design-system';
import { 
  Upload, 
  Trash, 
  Eye, 
  Download, 
  Refresh, 
  Picture,
  Cross,
  Check
} from '@strapi/icons';
import { useFetchClient } from '@strapi/helper-plugin';

const ClubLogoManager = ({ isOpen, onClose, onSuccess }) => {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [alert, setAlert] = useState(null);
  const [selectedClub, setSelectedClub] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRefs = useRef({});
  
  const { get, post, put, del } = useFetchClient();

  useEffect(() => {
    if (isOpen) {
      fetchClubs();
    }
  }, [isOpen]);

  const fetchClubs = async () => {
    try {
      setLoading(true);
      const response = await get('/api/clubs?populate=logo&sort=name:asc');
      setClubs(response.data.data || []);
    } catch (error) {
      showAlert('Fehler beim Laden der Vereine', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (clubId) => {
    fileInputRefs.current[clubId]?.click();
  };

  const handleFileUpload = async (event, clubId) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      showAlert('Bitte wählen Sie eine Bilddatei aus', 'danger');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      showAlert('Datei ist zu groß. Maximum: 5MB', 'danger');
      return;
    }

    try {
      setUploadProgress(prev => ({ ...prev, [clubId]: 0 }));

      // Upload file to media library
      const formData = new FormData();
      formData.append('files', file);
      formData.append('ref', 'api::club.club');
      formData.append('refId', clubId);
      formData.append('field', 'logo');

      const uploadResponse = await post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(prev => ({ ...prev, [clubId]: progress }));
        }
      });

      // Update club with new logo
      await put(`/api/clubs/${clubId}`, {
        data: { logo: uploadResponse.data[0].id }
      });

      await fetchClubs();
      setUploadProgress(prev => ({ ...prev, [clubId]: undefined }));
      showAlert('Logo erfolgreich hochgeladen', 'success');

    } catch (error) {
      setUploadProgress(prev => ({ ...prev, [clubId]: undefined }));
      showAlert('Fehler beim Hochladen des Logos', 'danger');
    }

    // Reset file input
    event.target.value = '';
  };

  const handleDeleteLogo = async (clubId, logoId) => {
    try {
      // Remove logo from club
      await put(`/api/clubs/${clubId}`, {
        data: { logo: null }
      });

      // Delete file from media library
      await del(`/api/upload/files/${logoId}`);

      await fetchClubs();
      showAlert('Logo erfolgreich gelöscht', 'success');

    } catch (error) {
      showAlert('Fehler beim Löschen des Logos', 'danger');
    }
  };

  const handlePreviewImage = (imageUrl, clubName) => {
    setPreviewImage({ url: imageUrl, name: clubName });
  };

  const handleBulkUpload = async (files) => {
    // TODO: Implement bulk upload functionality
    showAlert('Bulk-Upload wird in einer zukünftigen Version verfügbar sein', 'warning');
  };

  const showAlert = (message, variant) => {
    setAlert({ message, variant });
    setTimeout(() => setAlert(null), 5000);
  };

  const getImageUrl = (logo) => {
    if (!logo?.data) return null;
    const baseUrl = process.env.STRAPI_ADMIN_BACKEND_URL || 'http://localhost:1337';
    return `${baseUrl}${logo.data.attributes.url}`;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getClubTypeBadge = (type) => {
    return type === 'viktoria_verein' 
      ? <Badge backgroundColor="success100" textColor="success600">Viktoria</Badge>
      : <Badge backgroundColor="neutral100" textColor="neutral600">Gegner</Badge>;
  };

  if (loading) {
    return (
      <Modal onClose={onClose} labelledBy="title">
        <ModalLayout>
          <ModalBody>
            <Flex justifyContent="center" padding={8}>
              <Loader>Lade Vereine...</Loader>
            </Flex>
          </ModalBody>
        </ModalLayout>
      </Modal>
    );
  }

  return (
    <>
      <Modal onClose={onClose} labelledBy="title">
        <ModalLayout>
          <ModalHeader>
            <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
              Club-Logo Verwaltung
            </Typography>
          </ModalHeader>

          <ModalBody>
            {alert && (
              <Box marginBottom={4}>
                <Alert variant={alert.variant} title={alert.message} />
              </Box>
            )}

            {/* Statistics */}
            <Box marginBottom={4}>
              <Flex gap={4}>
                <Box padding={3} background="neutral100" borderRadius="4px" flex="1">
                  <Typography variant="sigma" textColor="neutral600">Gesamt</Typography>
                  <Typography variant="beta">{clubs.length}</Typography>
                </Box>
                <Box padding={3} background="success100" borderRadius="4px" flex="1">
                  <Typography variant="sigma" textColor="success600">Mit Logo</Typography>
                  <Typography variant="beta" textColor="success600">
                    {clubs.filter(c => c.attributes.logo?.data).length}
                  </Typography>
                </Box>
                <Box padding={3} background="warning100" borderRadius="4px" flex="1">
                  <Typography variant="sigma" textColor="warning600">Ohne Logo</Typography>
                  <Typography variant="beta" textColor="warning600">
                    {clubs.filter(c => !c.attributes.logo?.data).length}
                  </Typography>
                </Box>
              </Flex>
            </Box>

            <Divider marginBottom={4} />

            {/* Club Grid */}
            <Box maxHeight="500px" overflow="auto">
              <Grid gap={4}>
                {clubs.map((club) => {
                  const hasLogo = club.attributes.logo?.data;
                  const logoUrl = getImageUrl(club.attributes.logo);
                  const isUploading = uploadProgress[club.id] !== undefined;

                  return (
                    <GridItem key={club.id} col={6} s={12}>
                      <Card>
                        <CardBody>
                          {hasLogo && logoUrl ? (
                            <CardAsset src={logoUrl} alt={`${club.attributes.name} Logo`} />
                          ) : (
                            <Box
                              background="neutral100"
                              height="120px"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                              borderRadius="4px"
                            >
                              <Picture size="L" />
                            </Box>
                          )}

                          <CardContent>
                            <Box marginBottom={2}>
                              <Typography variant="omega" fontWeight="bold">
                                {club.attributes.name}
                              </Typography>
                              <Typography variant="pi" textColor="neutral600">
                                {club.attributes.kurz_name || 'Kein Kurzname'}
                              </Typography>
                            </Box>

                            <Flex justifyContent="space-between" alignItems="center" marginBottom={2}>
                              {getClubTypeBadge(club.attributes.club_typ)}
                              {hasLogo ? (
                                <Badge backgroundColor="success100" textColor="success600">
                                  Logo vorhanden
                                </Badge>
                              ) : (
                                <Badge backgroundColor="warning100" textColor="warning600">
                                  Kein Logo
                                </Badge>
                              )}
                            </Flex>

                            {hasLogo && club.attributes.logo?.data && (
                              <Box marginBottom={2}>
                                <Typography variant="pi" textColor="neutral600">
                                  Größe: {formatFileSize(club.attributes.logo.data.attributes.size * 1000)}
                                </Typography>
                                <Typography variant="pi" textColor="neutral600">
                                  Format: {club.attributes.logo.data.attributes.ext?.toUpperCase()}
                                </Typography>
                              </Box>
                            )}

                            {isUploading && (
                              <Box marginBottom={2}>
                                <Typography variant="pi" marginBottom={1}>
                                  Upload: {uploadProgress[club.id]}%
                                </Typography>
                                <ProgressBar value={uploadProgress[club.id]} />
                              </Box>
                            )}
                          </CardContent>

                          <CardAction position="end">
                            <Flex gap={1}>
                              {hasLogo && logoUrl && (
                                <>
                                  <IconButton
                                    onClick={() => handlePreviewImage(logoUrl, club.attributes.name)}
                                    label="Vorschau"
                                    icon={<Eye />}
                                  />
                                  <IconButton
                                    onClick={() => handleDeleteLogo(club.id, club.attributes.logo.data.id)}
                                    label="Löschen"
                                    icon={<Trash />}
                                  />
                                </>
                              )}
                              <IconButton
                                onClick={() => handleFileSelect(club.id)}
                                label={hasLogo ? "Logo ersetzen" : "Logo hochladen"}
                                icon={<Upload />}
                                disabled={isUploading}
                              />
                            </Flex>
                          </CardAction>

                          {/* Hidden file input */}
                          <input
                            ref={el => fileInputRefs.current[club.id] = el}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => handleFileUpload(e, club.id)}
                          />
                        </CardBody>
                      </Card>
                    </GridItem>
                  );
                })}
              </Grid>
            </Box>
          </ModalBody>

          <ModalFooter
            startActions={
              <Button onClick={onClose} variant="tertiary">
                Schließen
              </Button>
            }
            endActions={
              <Button
                onClick={() => {
                  onSuccess?.();
                  onClose();
                }}
                variant="default"
              >
                Fertig
              </Button>
            }
          />
        </ModalLayout>
      </Modal>

      {/* Image Preview Modal */}
      {previewImage && (
        <Modal onClose={() => setPreviewImage(null)} labelledBy="preview-title">
          <ModalLayout>
            <ModalHeader>
              <Typography fontWeight="bold" textColor="neutral800" as="h2" id="preview-title">
                Logo Vorschau: {previewImage.name}
              </Typography>
            </ModalHeader>
            <ModalBody>
              <Box textAlign="center">
                <img
                  src={previewImage.url}
                  alt={`${previewImage.name} Logo`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '400px',
                    objectFit: 'contain'
                  }}
                />
              </Box>
            </ModalBody>
            <ModalFooter
              endActions={
                <Button onClick={() => setPreviewImage(null)} variant="default">
                  Schließen
                </Button>
              }
            />
          </ModalLayout>
        </Modal>
      )}
    </>
  );
};

export default ClubLogoManager;
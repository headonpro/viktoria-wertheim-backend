/**
 * Club Monitoring Dashboard Component
 * 
 * Admin panel component for displaying club system monitoring data,
 * metrics, alerts, and system health information.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { request } from '@strapi/helper-plugin';

const MonitoringDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [alertDialog, setAlertDialog] = useState({ open: false, alert: null });
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await request('/club/monitoring/dashboard', {
        method: 'GET'
      });
      
      if (response.success) {
        setDashboardData(response.data);
        setLastUpdated(new Date());
        setError(null);
      } else {
        setError(response.error || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Export monitoring data
  const handleExport = async () => {
    try {
      const response = await request('/club/monitoring/export', {
        method: 'GET'
      });
      
      const blob = new Blob([JSON.stringify(response, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `club-monitoring-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export data:', err);
    }
  };

  // Acknowledge alert
  const handleAcknowledgeAlert = async (alertId) => {
    try {
      await request(`/club/monitoring/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        body: { acknowledgedBy: 'admin' }
      });
      fetchDashboardData(); // Refresh data
      setAlertDialog({ open: false, alert: null });
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  // Resolve alert
  const handleResolveAlert = async (alertId) => {
    try {
      await request(`/club/monitoring/alerts/${alertId}/resolve`, {
        method: 'POST',
        body: { resolvedBy: 'admin' }
      });
      fetchDashboardData(); // Refresh data
      setAlertDialog({ open: false, alert: null });
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'degraded': return 'warning';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  // Get severity icon
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <ErrorIcon color="error" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'info': return <InfoIcon color="info" />;
      default: return <InfoIcon />;
    }
  };

  // Format uptime
  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading && !dashboardData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <Button color="inherit" size="small" onClick={fetchDashboardData}>
          Retry
        </Button>
      }>
        {error}
      </Alert>
    );
  }

  const { systemHealth, operationalMetrics, performanceMetrics, alertSummary, keyMetrics } = dashboardData || {};

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Club System Monitoring
        </Typography>
        <Box>
          <Tooltip title="Refresh Data">
            <IconButton onClick={fetchDashboardData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export Data">
            <IconButton onClick={handleExport}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Last Updated */}
      {lastUpdated && (
        <Typography variant="body2" color="textSecondary" mb={2}>
          Last updated: {lastUpdated.toLocaleString()}
        </Typography>
      )}

      {/* System Health Overview */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Health
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip 
                  label={systemHealth?.overall || 'Unknown'} 
                  color={getStatusColor(systemHealth?.overall)}
                  icon={systemHealth?.overall === 'healthy' ? <CheckCircleIcon /> : <WarningIcon />}
                />
                <Typography variant="body2">
                  Score: {systemHealth?.score || 0}%
                </Typography>
              </Box>
              <Typography variant="body2" color="textSecondary" mt={1}>
                Uptime: {formatUptime(systemHealth?.uptime || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Active Alerts
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {alertSummary?.active?.critical > 0 && (
                  <Chip label={`${alertSummary.active.critical} Critical`} color="error" size="small" />
                )}
                {alertSummary?.active?.warning > 0 && (
                  <Chip label={`${alertSummary.active.warning} Warning`} color="warning" size="small" />
                )}
                {alertSummary?.active?.info > 0 && (
                  <Chip label={`${alertSummary.active.info} Info`} color="info" size="small" />
                )}
                {(!alertSummary?.active || (alertSummary.active.critical + alertSummary.active.warning + alertSummary.active.info) === 0) && (
                  <Chip label="No Active Alerts" color="success" size="small" />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Active Clubs
              </Typography>
              <Typography variant="h4">
                {operationalMetrics?.clubOperations?.activeClubs || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total: {operationalMetrics?.clubOperations?.totalClubs || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Club Games
              </Typography>
              <Typography variant="h4">
                {operationalMetrics?.gameOperations?.clubBasedGames || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total: {operationalMetrics?.gameOperations?.totalGames || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs for detailed views */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }} mb={3}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Key Metrics" />
          <Tab label="Performance" />
          <Tab label="Components" />
          <Tab label="Recent Alerts" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {keyMetrics?.map((metric, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" gutterBottom>
                      {metric.name}
                    </Typography>
                    <Chip 
                      label={metric.status} 
                      color={getStatusColor(metric.status)} 
                      size="small"
                    />
                  </Box>
                  <Typography variant="h4">
                    {metric.value}{metric.unit}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {metric.description}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Updated: {new Date(metric.lastUpdated).toLocaleTimeString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Response Time
                </Typography>
                <Box mb={2}>
                  <Typography variant="body2">Average: {performanceMetrics?.responseTime?.average?.toFixed(0) || 0}ms</Typography>
                  <Typography variant="body2">P95: {performanceMetrics?.responseTime?.p95?.toFixed(0) || 0}ms</Typography>
                  <Typography variant="body2">P99: {performanceMetrics?.responseTime?.p99?.toFixed(0) || 0}ms</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Cache Performance
                </Typography>
                <Box mb={2}>
                  <Typography variant="body2">Hit Rate: {(performanceMetrics?.cachePerformance?.hitRate * 100)?.toFixed(1) || 0}%</Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={(performanceMetrics?.cachePerformance?.hitRate * 100) || 0}
                    sx={{ mt: 1 }}
                  />
                </Box>
                <Typography variant="body2">Miss Rate: {(performanceMetrics?.cachePerformance?.missRate * 100)?.toFixed(1) || 0}%</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          {Object.entries(systemHealth?.components || {}).map(([component, status]) => (
            <Grid item xs={12} md={6} lg={4} key={component}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                      {component.replace(/([A-Z])/g, ' $1').trim()}
                    </Typography>
                    <Chip 
                      label={status} 
                      color={getStatusColor(status)} 
                      size="small"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {activeTab === 3 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Alert</TableCell>
                <TableCell>Count</TableCell>
                <TableCell>Last Occurrence</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {alertSummary?.topAlerts?.map((alert, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <TimelineIcon color="action" />
                      {alert.name}
                    </Box>
                  </TableCell>
                  <TableCell>{alert.count}</TableCell>
                  <TableCell>{new Date(alert.lastOccurrence).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {(!alertSummary?.topAlerts || alertSummary.topAlerts.length === 0) && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <Typography color="textSecondary">No recent alerts</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Alert Dialog */}
      <Dialog 
        open={alertDialog.open} 
        onClose={() => setAlertDialog({ open: false, alert: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Alert Details
        </DialogTitle>
        <DialogContent>
          {alertDialog.alert && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {alertDialog.alert.title}
              </Typography>
              <Typography variant="body1" paragraph>
                {alertDialog.alert.description}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Current Value: {alertDialog.alert.currentValue}{alertDialog.alert.unit}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Threshold: {alertDialog.alert.operator} {alertDialog.alert.thresholdValue}{alertDialog.alert.unit}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Time: {new Date(alertDialog.alert.timestamp).toLocaleString()}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertDialog({ open: false, alert: null })}>
            Close
          </Button>
          {alertDialog.alert?.status === 'active' && (
            <>
              <Button 
                onClick={() => handleAcknowledgeAlert(alertDialog.alert.id)}
                color="warning"
              >
                Acknowledge
              </Button>
              <Button 
                onClick={() => handleResolveAlert(alertDialog.alert.id)}
                color="success"
              >
                Resolve
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MonitoringDashboard;
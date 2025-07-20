# Database Configuration Guide

This document provides comprehensive guidance for configuring the Viktoria Wertheim backend database, supporting both SQLite (development) and PostgreSQL (production) configurations.

## Overview

The backend supports two database configurations:
- **SQLite**: Recommended for local development and testing
- **PostgreSQL**: Required for production deployment, especially for single-server setups

## Configuration Files

### Primary Configuration
- `config/database.ts` - Main database configuration with environment-based client selection
- `config/database-validation.js` - Validation utilities for database configuration
- `.env` - Environment variables (not committed to version control)
- `.env.example` - Template for environment configuration

## Environment Variables

### Database Client Selection
```bash
# Set to 'sqlite' for development or 'postgres' for production
DATABASE_CLIENT=postgres
```

### PostgreSQL Configuration (Required when DATABASE_CLIENT=postgres)

#### Option 1: Individual Parameters
```bash
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=viktoria_wertheim
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=your_secure_password
DATABASE_SCHEMA=public
```

#### Option 2: Connection String
```bash
DATABASE_URL=postgresql://strapi:password@localhost:5432/viktoria_wertheim
```

### Optional PostgreSQL Settings

#### SSL Configuration (for remote connections)
```bash
DATABASE_SSL=false
DATABASE_SSL_KEY=
DATABASE_SSL_CERT=
DATABASE_SSL_CA=
DATABASE_SSL_CAPATH=
DATABASE_SSL_CIPHER=
DATABASE_SSL_REJECT_UNAUTHORIZED=true
```

#### Connection Pool Settings (optimized for single-server deployment)
```bash
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_CONNECTION_TIMEOUT=60000
DATABASE_ACQUIRE_TIMEOUT=30000
DATABASE_CREATE_TIMEOUT=30000
DATABASE_DESTROY_TIMEOUT=5000
DATABASE_IDLE_TIMEOUT=30000
DATABASE_REAP_INTERVAL=1000
DATABASE_CREATE_RETRY_INTERVAL=200
```

#### Advanced PostgreSQL Settings
```bash
# Unix domain socket for local connections (Linux/macOS)
DATABASE_SOCKET=/var/run/postgresql/.s.PGSQL.5432

# Enable debug logging
DATABASE_DEBUG=false
```

### SQLite Configuration (for development)
```bash
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db
```

## Single-Server Deployment Optimizations

The PostgreSQL configuration is optimized for single-server deployments where PostgreSQL, Strapi backend, and Next.js frontend run on the same Linux server.

### Key Optimizations:
1. **Connection Pool**: Limited to 10 connections maximum to conserve resources
2. **Local Connections**: Configured for localhost connections by default
3. **Unix Domain Sockets**: Support for socket-based connections when available
4. **Resource Sharing**: Balanced settings for co-located services

### Recommended Production Settings:
```bash
DATABASE_CLIENT=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=viktoria_wertheim
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=your_secure_password
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_SSL=false
```

## Configuration Validation

The system includes automatic validation of database configuration:

### Validation Features:
- **Required Field Checking**: Ensures all necessary PostgreSQL parameters are provided
- **Connection Pool Validation**: Validates pool size settings
- **Single-Server Warnings**: Provides optimization suggestions for single-server deployments
- **SSL Configuration Validation**: Warns about unnecessary SSL for local connections

### Testing Configuration:
```bash
# Run configuration validation tests
node scripts/test-db-config.js
```

### Validation Messages:
- ✅ **Success**: Configuration is valid and ready to use
- ⚠️ **Warnings**: Configuration works but could be optimized
- ❌ **Errors**: Configuration is invalid and must be fixed

## Migration from SQLite to PostgreSQL

### Prerequisites:
1. PostgreSQL server installed and running
2. Database and user created
3. Environment variables configured
4. Network connectivity verified

### Migration Steps:
1. **Backup Current Data**: Create SQLite backup before migration
2. **Configure PostgreSQL**: Update environment variables
3. **Test Connection**: Verify PostgreSQL connectivity
4. **Run Migration**: Execute data migration scripts (see migration tasks)
5. **Verify Data**: Confirm all data transferred correctly

### Environment Transition:
```bash
# Before migration (SQLite)
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db

# After migration (PostgreSQL)
DATABASE_CLIENT=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=viktoria_wertheim
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=your_secure_password
```

## Troubleshooting

### Common Issues:

#### Connection Refused
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution**: Ensure PostgreSQL is running and accepting connections

#### Authentication Failed
```
Error: password authentication failed for user "strapi"
```
**Solution**: Verify username and password in environment variables

#### Database Does Not Exist
```
Error: database "viktoria_wertheim" does not exist
```
**Solution**: Create the database in PostgreSQL before starting Strapi

#### Too Many Connections
```
Error: too many connections for role "strapi"
```
**Solution**: Reduce DATABASE_POOL_MAX or increase PostgreSQL connection limits

### Validation Errors:
Run the validation test to identify configuration issues:
```bash
node scripts/test-db-config.js
```

### Debug Mode:
Enable debug logging for detailed connection information:
```bash
DATABASE_DEBUG=true
```

## Development Workflow

### Local Development:
1. Use SQLite for quick setup and testing
2. Optionally use local PostgreSQL for production-like testing
3. Environment variables in `.env` file (not committed)

### Production Deployment:
1. Use PostgreSQL exclusively
2. Configure environment variables on server
3. Optimize settings for single-server deployment
4. Monitor connection pool usage

## Security Considerations

### Local Deployment:
- PostgreSQL configured for localhost-only access
- No external database connections allowed
- Proper file permissions for database files
- Secure password generation for database users

### Environment Variables:
- Never commit `.env` files to version control
- Use strong passwords for database authentication
- Rotate database credentials regularly
- Limit database user permissions to necessary operations

## Performance Monitoring

### Key Metrics:
- Database connection pool utilization
- Query response times
- Memory usage by PostgreSQL
- Concurrent connection counts

### Monitoring Commands:
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- Monitor connection pool
SELECT * FROM pg_stat_activity WHERE application_name LIKE '%strapi%';
```

## Support

For additional help with database configuration:
1. Check validation output for specific error messages
2. Review PostgreSQL logs for connection issues
3. Verify network connectivity and firewall settings
4. Consult Strapi documentation for database-specific guidance
# Environment Setup Guide

## Overview

This guide provides step-by-step instructions for setting up the refactored lifecycle hooks system in different environments. Each environment has specific requirements and configurations optimized for its use case.

## Prerequisites

### System Requirements

- **Node.js**: Version 18.x or higher
- **npm**: Version 8.x or higher
- **PostgreSQL**: Version 13.x or higher
- **Redis**: Version 6.x or higher (for production/staging)

### Development Tools

- **Git**: For version control
- **Docker**: Optional, for containerized development
- **PM2**: For production process management

## Development Environment Setup

### 1. Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd viktoria-wertheim

# Install dependencies
npm run install:all

# Set up environment variables
cp backend/.env.example backend/.env
```

### 2. Environment Configuration

Edit `backend/.env` with development settings:

```env
# Database Configuration
DATABASE_CLIENT=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=viktoria_wertheim_dev
DATABASE_USERNAME=strapi_dev
DATABASE_PASSWORD=dev_password
DATABASE_SSL=false

# Strapi Configuration
HOST=0.0.0.0
PORT=1337
APP_KEYS=your-app-keys-here
API_TOKEN_SALT=your-api-token-salt
ADMIN_JWT_SECRET=your-admin-jwt-secret
TRANSFER_TOKEN_SALT=your-transfer-token-salt
JWT_SECRET=your-jwt-secret

# Hook Configuration
HOOK_ENVIRONMENT=development
HOOK_TIMEOUT=10000
HOOK_RETRY_ATTEMPTS=3
HOOK_ENABLE_LOGGING=true
HOOK_LOG_LEVEL=debug

# Feature Flags
FEATURE_STRICT_VALIDATION=false
FEATURE_ASYNC_CALCULATIONS=false
FEATURE_PERFORMANCE_MONITORING=true

# Monitoring
MONITORING_ENABLE_METRICS=true
MONITORING_METRICS_INTERVAL=30000
```

### 3. Database Setup

```bash
# Create development database
createdb viktoria_wertheim_dev

# Create database user
psql -c "CREATE USER strapi_dev WITH PASSWORD 'dev_password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE viktoria_wertheim_dev TO strapi_dev;"

# Run database migrations
cd backend
npm run strapi build
npm run strapi develop
```

### 4. Configuration Files

Create development-specific configuration:

```bash
# Create development configuration
mkdir -p backend/config/environments
```

Create `backend/config/environments/development.json`:

```json
{
  "global": {
    "timeout": 10000,
    "retryAttempts": 3,
    "enableLogging": true,
    "logLevel": "debug"
  },
  "validation": {
    "strictMode": false,
    "warningsAsErrors": false,
    "enableCaching": false
  },
  "calculation": {
    "enableAsync": false,
    "maxConcurrentJobs": 2,
    "jobTimeout": 30000
  },
  "monitoring": {
    "enableMetrics": true,
    "enableTracing": true,
    "metricsInterval": 30000
  },
  "database": {
    "connectionPool": {
      "min": 2,
      "max": 10,
      "acquireTimeoutMillis": 60000,
      "createTimeoutMillis": 30000,
      "destroyTimeoutMillis": 5000,
      "idleTimeoutMillis": 30000,
      "reapIntervalMillis": 1000,
      "createRetryIntervalMillis": 200
    }
  }
}
```

### 5. Start Development Server

```bash
# Start backend in development mode
cd backend
npm run develop

# In another terminal, start frontend
cd frontend
npm run dev
```

### 6. Verify Installation

```bash
# Test hook configuration
node scripts/config-cli.js validate

# Run hook tests
npm run test:hooks

# Check monitoring dashboard
curl http://localhost:1337/api/hook-monitoring/status
```

## Staging Environment Setup

### 1. Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Install Redis
sudo apt-get install -y redis-server

# Install PM2 globally
sudo npm install -g pm2
```

### 2. Database Setup

```bash
# Create staging database
sudo -u postgres createdb viktoria_wertheim_staging

# Create database user
sudo -u postgres psql -c "CREATE USER strapi_staging WITH PASSWORD 'staging_secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE viktoria_wertheim_staging TO strapi_staging;"
```

### 3. Application Deployment

```bash
# Clone repository
git clone <repository-url> /var/www/viktoria-wertheim
cd /var/www/viktoria-wertheim

# Install dependencies
npm run install:all

# Set up environment variables
cp backend/.env.example backend/.env
```

Edit `backend/.env` for staging:

```env
# Database Configuration
DATABASE_CLIENT=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=viktoria_wertheim_staging
DATABASE_USERNAME=strapi_staging
DATABASE_PASSWORD=staging_secure_password
DATABASE_SSL=false

# Strapi Configuration
HOST=0.0.0.0
PORT=1337
NODE_ENV=production
APP_KEYS=staging-app-keys-here
API_TOKEN_SALT=staging-api-token-salt
ADMIN_JWT_SECRET=staging-admin-jwt-secret
TRANSFER_TOKEN_SALT=staging-transfer-token-salt
JWT_SECRET=staging-jwt-secret

# Hook Configuration
HOOK_ENVIRONMENT=staging
HOOK_TIMEOUT=5000
HOOK_RETRY_ATTEMPTS=2
HOOK_ENABLE_LOGGING=true
HOOK_LOG_LEVEL=info

# Feature Flags
FEATURE_STRICT_VALIDATION=true
FEATURE_ASYNC_CALCULATIONS=true
FEATURE_PERFORMANCE_MONITORING=true

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_staging_password

# Monitoring
MONITORING_ENABLE_METRICS=true
MONITORING_METRICS_INTERVAL=60000
MONITORING_ALERT_WEBHOOK=https://hooks.slack.com/staging-alerts
```

### 4. Configuration Files

Create `backend/config/environments/staging.json`:

```json
{
  "global": {
    "timeout": 5000,
    "retryAttempts": 2,
    "enableLogging": true,
    "logLevel": "info"
  },
  "validation": {
    "strictMode": true,
    "warningsAsErrors": false,
    "enableCaching": true,
    "cacheTimeout": 300000
  },
  "calculation": {
    "enableAsync": true,
    "maxConcurrentJobs": 5,
    "jobTimeout": 60000,
    "retryFailedJobs": true
  },
  "monitoring": {
    "enableMetrics": true,
    "enableTracing": true,
    "metricsInterval": 60000,
    "alertThresholds": {
      "errorRate": 0.03,
      "avgExecutionTime": 800,
      "queueBacklog": 50
    }
  },
  "database": {
    "connectionPool": {
      "min": 5,
      "max": 20,
      "acquireTimeoutMillis": 60000,
      "createTimeoutMillis": 30000,
      "destroyTimeoutMillis": 5000,
      "idleTimeoutMillis": 30000
    }
  },
  "redis": {
    "host": "localhost",
    "port": 6379,
    "retryDelayOnFailover": 100,
    "enableReadyCheck": true,
    "maxRetriesPerRequest": 3
  }
}
```

### 5. Build and Start Application

```bash
# Build application
cd backend
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env staging
pm2 save
pm2 startup
```

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'viktoria-backend-staging',
    script: './backend/dist/src/index.js',
    cwd: '/var/www/viktoria-wertheim',
    instances: 2,
    exec_mode: 'cluster',
    env_staging: {
      NODE_ENV: 'production',
      HOOK_ENVIRONMENT: 'staging'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
```

## Production Environment Setup

### 1. Infrastructure Requirements

#### Server Specifications
- **CPU**: 4+ cores
- **RAM**: 8GB+ 
- **Storage**: 100GB+ SSD
- **Network**: High-speed internet connection

#### Load Balancer Configuration (Nginx)

```nginx
upstream viktoria_backend {
    server 127.0.0.1:1337;
    server 127.0.0.1:1338;
}

server {
    listen 80;
    server_name api.viktoria-wertheim.de;
    
    location / {
        proxy_pass http://viktoria_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. Database Setup

```bash
# Create production database with optimized settings
sudo -u postgres createdb viktoria_wertheim_prod

# Create database user with limited privileges
sudo -u postgres psql -c "CREATE USER strapi_prod WITH PASSWORD 'production_secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE viktoria_wertheim_prod TO strapi_prod;"

# Optimize PostgreSQL configuration
sudo nano /etc/postgresql/13/main/postgresql.conf
```

PostgreSQL optimization:

```conf
# Memory settings
shared_buffers = 2GB
effective_cache_size = 6GB
work_mem = 64MB
maintenance_work_mem = 512MB

# Connection settings
max_connections = 200
max_prepared_transactions = 200

# Performance settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
```

### 3. Redis Setup

```bash
# Configure Redis for production
sudo nano /etc/redis/redis.conf
```

Redis configuration:

```conf
# Security
requirepass production_redis_password
bind 127.0.0.1

# Memory management
maxmemory 1gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Performance
tcp-keepalive 300
timeout 0
```

### 4. Application Configuration

Create `backend/.env` for production:

```env
# Database Configuration
DATABASE_CLIENT=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=viktoria_wertheim_prod
DATABASE_USERNAME=strapi_prod
DATABASE_PASSWORD=production_secure_password
DATABASE_SSL=true

# Strapi Configuration
HOST=0.0.0.0
PORT=1337
NODE_ENV=production
APP_KEYS=production-app-keys-here
API_TOKEN_SALT=production-api-token-salt
ADMIN_JWT_SECRET=production-admin-jwt-secret
TRANSFER_TOKEN_SALT=production-transfer-token-salt
JWT_SECRET=production-jwt-secret

# Hook Configuration
HOOK_ENVIRONMENT=production
HOOK_TIMEOUT=3000
HOOK_RETRY_ATTEMPTS=1
HOOK_ENABLE_LOGGING=true
HOOK_LOG_LEVEL=warn

# Feature Flags
FEATURE_STRICT_VALIDATION=true
FEATURE_ASYNC_CALCULATIONS=true
FEATURE_PERFORMANCE_MONITORING=true

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=production_redis_password

# Monitoring
MONITORING_ENABLE_METRICS=true
MONITORING_METRICS_INTERVAL=120000
MONITORING_ALERT_WEBHOOK=https://hooks.slack.com/production-alerts
MONITORING_ERROR_THRESHOLD=0.01
```

### 5. Production Configuration

Create `backend/config/environments/production.json`:

```json
{
  "global": {
    "timeout": 3000,
    "retryAttempts": 1,
    "enableLogging": true,
    "logLevel": "warn"
  },
  "validation": {
    "strictMode": true,
    "warningsAsErrors": false,
    "enableCaching": true,
    "cacheTimeout": 600000
  },
  "calculation": {
    "enableAsync": true,
    "maxConcurrentJobs": 20,
    "jobTimeout": 60000,
    "retryFailedJobs": true,
    "jobRetryDelay": 5000
  },
  "monitoring": {
    "enableMetrics": true,
    "enableTracing": false,
    "metricsInterval": 120000,
    "alertThresholds": {
      "errorRate": 0.01,
      "avgExecutionTime": 500,
      "queueBacklog": 50,
      "memoryUsage": 0.8,
      "cpuUsage": 0.7
    }
  },
  "database": {
    "connectionPool": {
      "min": 10,
      "max": 50,
      "acquireTimeoutMillis": 60000,
      "createTimeoutMillis": 30000,
      "destroyTimeoutMillis": 5000,
      "idleTimeoutMillis": 30000
    }
  },
  "redis": {
    "host": "localhost",
    "port": 6379,
    "retryDelayOnFailover": 100,
    "enableReadyCheck": true,
    "maxRetriesPerRequest": 3,
    "connectTimeout": 10000,
    "commandTimeout": 5000
  },
  "security": {
    "enableRateLimiting": true,
    "rateLimitWindow": 900000,
    "rateLimitMax": 1000,
    "enableCors": true,
    "corsOrigins": ["https://viktoria-wertheim.de"]
  }
}
```

### 6. Deployment Script

Create `scripts/deploy-production.sh`:

```bash
#!/bin/bash

set -e

echo "Starting production deployment..."

# Backup current version
pm2 stop viktoria-backend-prod || true
cp -r /var/www/viktoria-wertheim /var/www/viktoria-wertheim-backup-$(date +%Y%m%d-%H%M%S)

# Pull latest code
cd /var/www/viktoria-wertheim
git pull origin main

# Install dependencies
npm run install:all

# Build application
cd backend
npm run build

# Run database migrations
npm run strapi build

# Validate configuration
node scripts/config-cli.js validate

# Start application
pm2 start ecosystem.config.js --env production
pm2 save

echo "Production deployment completed successfully!"
```

### 7. Monitoring Setup

Create monitoring configuration in `backend/config/monitoring.json`:

```json
{
  "alerts": [
    {
      "name": "high-error-rate",
      "condition": "errorRate > 0.01",
      "severity": "critical",
      "channels": ["slack", "email"]
    },
    {
      "name": "slow-response-time",
      "condition": "avgExecutionTime > 500",
      "severity": "warning",
      "channels": ["slack"]
    },
    {
      "name": "queue-backlog",
      "condition": "queueBacklog > 50",
      "severity": "warning",
      "channels": ["slack"]
    },
    {
      "name": "memory-usage-high",
      "condition": "memoryUsage > 0.8",
      "severity": "critical",
      "channels": ["slack", "email"]
    }
  ],
  "channels": {
    "slack": {
      "webhook": "https://hooks.slack.com/production-alerts",
      "channel": "#alerts"
    },
    "email": {
      "smtp": {
        "host": "smtp.gmail.com",
        "port": 587,
        "secure": false,
        "auth": {
          "user": "alerts@viktoria-wertheim.de",
          "pass": "email_password"
        }
      },
      "recipients": ["admin@viktoria-wertheim.de"]
    }
  }
}
```

## Environment Verification

### Health Check Endpoints

Create health check scripts for each environment:

```bash
# Development health check
curl http://localhost:1337/api/hook-monitoring/health

# Staging health check
curl https://staging-api.viktoria-wertheim.de/api/hook-monitoring/health

# Production health check
curl https://api.viktoria-wertheim.de/api/hook-monitoring/health
```

### Automated Testing

Create environment-specific test suites:

```bash
# Run development tests
npm run test:dev

# Run staging tests
npm run test:staging

# Run production smoke tests
npm run test:prod:smoke
```

## Troubleshooting Common Issues

### Database Connection Issues

```bash
# Check database connectivity
psql -h localhost -U strapi_prod -d viktoria_wertheim_prod -c "SELECT 1;"

# Check connection pool status
curl http://localhost:1337/api/hook-monitoring/database/status
```

### Redis Connection Issues

```bash
# Test Redis connectivity
redis-cli -h localhost -p 6379 -a production_redis_password ping

# Check Redis memory usage
redis-cli -h localhost -p 6379 -a production_redis_password info memory
```

### Performance Issues

```bash
# Check hook performance metrics
curl http://localhost:1337/api/hook-monitoring/performance

# Monitor system resources
htop
iotop
```

### Configuration Issues

```bash
# Validate configuration
node scripts/config-cli.js validate

# Check configuration differences
node scripts/config-cli.js diff production staging
```

This environment setup guide provides comprehensive instructions for deploying the lifecycle hooks system across all environments with appropriate configurations and monitoring.
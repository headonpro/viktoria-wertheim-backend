#!/bin/bash

# Deployment script for Viktoria Wertheim Backend
# Supports zero-downtime deployment with rollback capabilities

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT=${1:-staging}
BACKUP_DIR="${PROJECT_ROOT}/backups"
DEPLOYMENT_LOG="${PROJECT_ROOT}/logs/deployment.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

# Validate environment
validate_environment() {
    log "Validating environment: $ENVIRONMENT"
    
    if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
        error "Invalid environment. Must be: development, staging, or production"
    fi
    
    # Check if environment config exists
    if [[ ! -f "$PROJECT_ROOT/config/environments/$ENVIRONMENT.json" ]]; then
        error "Environment configuration not found: $ENVIRONMENT.json"
    fi
    
    # Load environment variables
    if [[ -f "$PROJECT_ROOT/.env.$ENVIRONMENT" ]]; then
        source "$PROJECT_ROOT/.env.$ENVIRONMENT"
    elif [[ -f "$PROJECT_ROOT/.env" ]]; then
        source "$PROJECT_ROOT/.env"
    else
        warning "No environment file found"
    fi
    
    success "Environment validation completed"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check Node.js version
    NODE_VERSION=$(node --version)
    log "Node.js version: $NODE_VERSION"
    
    # Check database connectivity
    log "Testing database connection..."
    if ! npm run check:db > /dev/null 2>&1; then
        error "Database connection failed"
    fi
    
    # Check if required environment variables are set
    required_vars=("DATABASE_HOST" "DATABASE_NAME" "DATABASE_USERNAME" "DATABASE_PASSWORD")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            error "Required environment variable $var is not set"
        fi
    done
    
    # Run tests
    log "Running tests..."
    if ! npm run test > /dev/null 2>&1; then
        error "Tests failed"
    fi
    
    success "Pre-deployment checks completed"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/backup_$ENVIRONMENT_$BACKUP_TIMESTAMP"
    
    mkdir -p "$BACKUP_PATH"
    
    # Backup database
    log "Backing up database..."
    pg_dump -h "$DATABASE_HOST" -U "$DATABASE_USERNAME" -d "$DATABASE_NAME" > "$BACKUP_PATH/database.sql"
    
    # Backup current application
    log "Backing up application files..."
    tar -czf "$BACKUP_PATH/application.tar.gz" -C "$PROJECT_ROOT" \
        --exclude=node_modules \
        --exclude=.tmp \
        --exclude=logs \
        --exclude=backups \
        .
    
    # Backup snapshots
    if [[ -d "$PROJECT_ROOT/snapshots" ]]; then
        log "Backing up snapshots..."
        cp -r "$PROJECT_ROOT/snapshots" "$BACKUP_PATH/"
    fi
    
    echo "$BACKUP_PATH" > "$PROJECT_ROOT/.last_backup"
    success "Backup created: $BACKUP_PATH"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Check if migrations table exists
    if ! psql -h "$DATABASE_HOST" -U "$DATABASE_USERNAME" -d "$DATABASE_NAME" -c "\dt knex_migrations" > /dev/null 2>&1; then
        log "Creating migrations table..."
        psql -h "$DATABASE_HOST" -U "$DATABASE_USERNAME" -d "$DATABASE_NAME" -c "
            CREATE TABLE IF NOT EXISTS knex_migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                batch INTEGER,
                migration_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        "
    fi
    
    # Run SQL migrations
    for migration_file in "$PROJECT_ROOT/database/migrations"/*.sql; do
        if [[ -f "$migration_file" ]]; then
            migration_name=$(basename "$migration_file")
            
            # Check if migration already applied
            if psql -h "$DATABASE_HOST" -U "$DATABASE_USERNAME" -d "$DATABASE_NAME" -t -c "SELECT name FROM knex_migrations WHERE name = '$migration_name';" | grep -q "$migration_name"; then
                log "Migration $migration_name already applied, skipping..."
                continue
            fi
            
            log "Applying migration: $migration_name"
            if psql -h "$DATABASE_HOST" -U "$DATABASE_USERNAME" -d "$DATABASE_NAME" -f "$migration_file"; then
                # Record migration
                psql -h "$DATABASE_HOST" -U "$DATABASE_USERNAME" -d "$DATABASE_NAME" -c "
                    INSERT INTO knex_migrations (name, batch) VALUES ('$migration_name', 1);
                "
                success "Migration $migration_name applied successfully"
            else
                error "Migration $migration_name failed"
            fi
        fi
    done
    
    success "Database migrations completed"
}

# Build application
build_application() {
    log "Building application..."
    
    # Install dependencies
    log "Installing dependencies..."
    npm ci --production=false
    
    # Build application
    log "Building Strapi application..."
    npm run build
    
    success "Application build completed"
}

# Deploy application
deploy_application() {
    log "Deploying application..."
    
    # Set environment-specific configuration
    log "Setting up environment configuration..."
    cp "$PROJECT_ROOT/config/environments/$ENVIRONMENT.json" "$PROJECT_ROOT/config/environment.json"
    
    # Create necessary directories
    mkdir -p "$PROJECT_ROOT/logs"
    mkdir -p "$PROJECT_ROOT/snapshots/$ENVIRONMENT"
    
    # Set permissions
    chmod +x "$PROJECT_ROOT/scripts/"*.sh
    
    success "Application deployment completed"
}

# Health check
health_check() {
    log "Running health check..."
    
    # Start application in background for testing
    npm start &
    APP_PID=$!
    
    # Wait for application to start
    sleep 10
    
    # Check if application is responding
    if curl -f http://localhost:${PORT:-1337}/api/health > /dev/null 2>&1; then
        success "Health check passed"
        kill $APP_PID
        return 0
    else
        error "Health check failed"
        kill $APP_PID
        return 1
    fi
}

# Rollback function
rollback() {
    log "Starting rollback procedure..."
    
    if [[ ! -f "$PROJECT_ROOT/.last_backup" ]]; then
        error "No backup found for rollback"
    fi
    
    BACKUP_PATH=$(cat "$PROJECT_ROOT/.last_backup")
    
    if [[ ! -d "$BACKUP_PATH" ]]; then
        error "Backup directory not found: $BACKUP_PATH"
    fi
    
    log "Rolling back to backup: $BACKUP_PATH"
    
    # Stop application
    pkill -f "strapi" || true
    
    # Restore database
    log "Restoring database..."
    psql -h "$DATABASE_HOST" -U "$DATABASE_USERNAME" -d "$DATABASE_NAME" < "$BACKUP_PATH/database.sql"
    
    # Restore application files
    log "Restoring application files..."
    tar -xzf "$BACKUP_PATH/application.tar.gz" -C "$PROJECT_ROOT"
    
    # Restore snapshots
    if [[ -d "$BACKUP_PATH/snapshots" ]]; then
        log "Restoring snapshots..."
        cp -r "$BACKUP_PATH/snapshots" "$PROJECT_ROOT/"
    fi
    
    success "Rollback completed"
}

# Cleanup old backups
cleanup_backups() {
    log "Cleaning up old backups..."
    
    # Keep only last 5 backups
    if [[ -d "$BACKUP_DIR" ]]; then
        find "$BACKUP_DIR" -type d -name "backup_*" | sort -r | tail -n +6 | xargs rm -rf
    fi
    
    success "Backup cleanup completed"
}

# Main deployment function
main() {
    log "Starting deployment for environment: $ENVIRONMENT"
    
    # Create logs directory
    mkdir -p "$(dirname "$DEPLOYMENT_LOG")"
    
    case "${2:-deploy}" in
        "deploy")
            validate_environment
            pre_deployment_checks
            create_backup
            run_migrations
            build_application
            deploy_application
            
            if health_check; then
                cleanup_backups
                success "Deployment completed successfully!"
            else
                warning "Health check failed, initiating rollback..."
                rollback
                error "Deployment failed, rolled back to previous version"
            fi
            ;;
        "rollback")
            rollback
            ;;
        "health-check")
            health_check
            ;;
        *)
            echo "Usage: $0 <environment> [deploy|rollback|health-check]"
            echo "Environments: development, staging, production"
            exit 1
            ;;
    esac
}

# Handle script interruption
trap 'error "Deployment interrupted"' INT TERM

# Run main function
main "$@"
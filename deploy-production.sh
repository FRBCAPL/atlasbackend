#!/bin/bash

# Production Deployment Script for Front Range Pool League Backend
# This script ensures secure deployment with all necessary checks

set -e  # Exit on any error

echo "🚀 Starting Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Check Node.js version
print_status "Checking Node.js version..."
NODE_VERSION=$(node --version)
REQUIRED_VERSION="v18.0.0"

if [[ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]]; then
    print_error "Node.js version $NODE_VERSION is too old. Required: $REQUIRED_VERSION or higher"
    exit 1
fi
print_success "Node.js version: $NODE_VERSION"

# Check if .env file exists
print_status "Checking environment configuration..."
if [[ ! -f .env ]]; then
    print_error ".env file not found. Please create one based on PRODUCTION_SECURITY_CONFIG.md"
    exit 1
fi
print_success ".env file found"

# Validate required environment variables
print_status "Validating environment variables..."
source .env

REQUIRED_VARS=(
    "NODE_ENV"
    "MONGODB_URI"
    "STREAM_API_KEY"
    "STREAM_API_SECRET"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var}" ]]; then
        print_error "Required environment variable $var is not set"
        exit 1
    fi
done
print_success "All required environment variables are set"

# Check if NODE_ENV is production
if [[ "$NODE_ENV" != "production" ]]; then
    print_warning "NODE_ENV is set to '$NODE_ENV' instead of 'production'"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install dependencies
print_status "Installing dependencies..."
npm ci --only=production
print_success "Dependencies installed"

# Run security audit
print_status "Running security audit..."
npm audit --audit-level=moderate
print_success "Security audit passed"

# Run tests if available
if [[ -f "package.json" ]] && grep -q "\"test\":" package.json; then
    print_status "Running tests..."
    npm test
    print_success "Tests passed"
fi

# Check for sensitive files
print_status "Checking for sensitive files..."
SENSITIVE_FILES=(
    ".env"
    "*.pem"
    "*.key"
    "service-account*.json"
)

for pattern in "${SENSITIVE_FILES[@]}"; do
    if ls $pattern 1> /dev/null 2>&1; then
        print_warning "Sensitive files found matching pattern: $pattern"
    fi
done

# Create logs directory if it doesn't exist
print_status "Setting up logging..."
mkdir -p logs
print_success "Logging directory ready"

# Check disk space
print_status "Checking disk space..."
DISK_USAGE=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
if [[ $DISK_USAGE -gt 90 ]]; then
    print_error "Disk usage is at ${DISK_USAGE}%. Please free up space before deployment."
    exit 1
fi
print_success "Disk usage: ${DISK_USAGE}%"

# Backup current deployment if exists
if [[ -d "backup" ]]; then
    print_status "Creating backup of current deployment..."
    timestamp=$(date +%Y%m%d_%H%M%S)
    mv backup "backup_$timestamp"
    print_success "Backup created: backup_$timestamp"
fi

# Create new backup directory
mkdir -p backup

# Copy current files to backup
print_status "Backing up current files..."
cp -r . backup/ 2>/dev/null || true
print_success "Backup completed"

# Stop existing process if running
print_status "Stopping existing process..."
if pgrep -f "node server.js" > /dev/null; then
    pkill -f "node server.js"
    sleep 2
    print_success "Existing process stopped"
else
    print_status "No existing process found"
fi

# Start the application
print_status "Starting application..."
nohup node server.js > logs/app.log 2>&1 &
APP_PID=$!

# Wait a moment for the app to start
sleep 3

# Check if the application started successfully
if kill -0 $APP_PID 2>/dev/null; then
    print_success "Application started with PID: $APP_PID"
else
    print_error "Application failed to start. Check logs/app.log for details"
    exit 1
fi

# Health check
print_status "Performing health check..."
sleep 2
if curl -f http://localhost:${PORT:-8080}/health > /dev/null 2>&1; then
    print_success "Health check passed"
else
    print_error "Health check failed. Application may not be running properly"
    exit 1
fi

# Save PID to file for management
echo $APP_PID > app.pid
print_success "PID saved to app.pid"

# Display deployment information
echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📊 Application Information:"
echo "   PID: $APP_PID"
echo "   Port: ${PORT:-8080}"
echo "   Logs: logs/app.log"
echo "   Health Check: http://localhost:${PORT:-8080}/health"
echo ""
echo "🔧 Management Commands:"
echo "   Stop: kill \$(cat app.pid)"
echo "   Restart: ./deploy-production.sh"
echo "   View logs: tail -f logs/app.log"
echo "   Health check: curl http://localhost:${PORT:-8080}/health"
echo ""

print_success "Production deployment completed!"

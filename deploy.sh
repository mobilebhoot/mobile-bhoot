#!/bin/bash

# 🚀 PocketShield Production Deployment Script
# This script sets up PocketShield with real SMS/WhatsApp APIs

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
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
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should not be run as root for security reasons"
        exit 1
    fi
}

# Check system requirements
check_requirements() {
    print_status "Checking system requirements..."
    
    # Check OS
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        print_error "This script is designed for Linux systems"
        exit 1
    fi
    
    # Check available memory
    total_mem=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    required_mem=4194304  # 4GB in KB
    
    if [[ $total_mem -lt $required_mem ]]; then
        print_warning "System has less than 4GB RAM. Performance may be affected."
    fi
    
    # Check disk space
    available_space=$(df . | tail -1 | awk '{print $4}')
    required_space=10485760  # 10GB in KB
    
    if [[ $available_space -lt $required_space ]]; then
        print_error "Insufficient disk space. Need at least 10GB free space."
        exit 1
    fi
    
    print_success "System requirements check passed"
}

# Install Docker and Docker Compose
install_docker() {
    print_status "Installing Docker and Docker Compose..."
    
    # Update package manager
    sudo apt update
    
    # Install Docker
    if ! command -v docker &> /dev/null; then
        print_status "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        rm get-docker.sh
        print_success "Docker installed successfully"
    else
        print_success "Docker is already installed"
    fi
    
    # Install Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_status "Installing Docker Compose..."
        sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        print_success "Docker Compose installed successfully"
    else
        print_success "Docker Compose is already installed"
    fi
    
    # Verify installation
    docker --version
    docker-compose --version
}

# Generate secure passwords
generate_passwords() {
    print_status "Generating secure passwords..."
    
    JWT_SECRET=$(openssl rand -base64 32)
    JWT_REFRESH_SECRET=$(openssl rand -base64 32)
    DB_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
    REDIS_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
    GRAFANA_PASSWORD=$(openssl rand -base64 12 | tr -d "=+/" | cut -c1-12)
    
    print_success "Passwords generated successfully"
}

# Setup environment configuration
setup_environment() {
    print_status "Setting up environment configuration..."
    
    # Create backend .env file
    cat > backend/.env << EOF
# PocketShield Production Configuration
# Generated on $(date)

# Server Configuration
NODE_ENV=production
PORT=3000
API_BASE_URL=https://api.pocketshield.local
ALLOWED_ORIGINS=https://pocketshield.local,https://admin.pocketshield.local

# Database Configuration
DATABASE_URL=postgresql://pocketshield_user:${DB_PASSWORD}@postgres:5432/pocketshield_prod

# Redis Configuration
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
REDIS_PASSWORD=${REDIS_PASSWORD}

# JWT Security
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# SMS Configuration (MSG91) - UPDATE WITH YOUR CREDENTIALS
SMS_PROVIDER=MSG91
MSG91_AUTH_KEY=your_msg91_auth_key_here
MSG91_SENDER_ID=POCKET

# Alternative SMS (TextLocal) - UNCOMMENT IF USING
# SMS_PROVIDER=TEXTLOCAL
# TEXTLOCAL_API_KEY=your_textlocal_api_key_here
# TEXTLOCAL_SENDER=POCKET

# WhatsApp Configuration (Gupshup) - UPDATE WITH YOUR CREDENTIALS
WHATSAPP_PROVIDER=GUPSHUP
GUPSHUP_API_KEY=your_gupshup_api_key_here
GUPSHUP_APP_NAME=PocketShield
GUPSHUP_SOURCE_NUMBER=919876543210

# Alternative WhatsApp (Business API) - UNCOMMENT IF USING
# WHATSAPP_PROVIDER=BUSINESS
# WHATSAPP_ACCESS_TOKEN=your_whatsapp_business_token
# WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# Rate Limiting
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT=5
OTP_RATE_LIMIT=3

# Security
ENCRYPTION_KEY=$(openssl rand -base64 32 | cut -c1-32)
HASH_SALT_ROUNDS=12

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/pocketshield

# Monitoring (Optional)
# SENTRY_DSN=your_sentry_dsn_here
# NEW_RELIC_LICENSE_KEY=your_new_relic_key
EOF

    # Create docker-compose .env file
    cat > .env << EOF
# Docker Compose Environment Variables
DB_PASSWORD=${DB_PASSWORD}
REDIS_PASSWORD=${REDIS_PASSWORD}
GRAFANA_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
EOF

    print_success "Environment files created"
    print_warning "IMPORTANT: Update API credentials in backend/.env before starting services"
}

# Setup directories and permissions
setup_directories() {
    print_status "Setting up directories and permissions..."
    
    # Create log directory
    sudo mkdir -p /var/log/pocketshield
    sudo chown $USER:$USER /var/log/pocketshield
    
    # Create local logs directory
    mkdir -p logs
    
    print_success "Directories created successfully"
}

# Build and start services
start_services() {
    print_status "Building and starting services..."
    
    # Build backend image
    docker-compose build pocketshield-backend
    
    # Start database services first
    docker-compose up -d postgres redis
    
    # Wait for database to be ready
    print_status "Waiting for database to be ready..."
    sleep 10
    
    # Start backend service
    docker-compose up -d pocketshield-backend
    
    # Wait for backend to be ready
    print_status "Waiting for backend to be ready..."
    sleep 5
    
    print_success "Services started successfully"
}

# Verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    # Check if services are running
    if ! docker-compose ps | grep -q "Up"; then
        print_error "Some services are not running"
        docker-compose ps
        return 1
    fi
    
    # Check backend health
    max_attempts=30
    attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -s http://localhost:3000/health > /dev/null; then
            print_success "Backend is healthy"
            break
        fi
        
        print_status "Waiting for backend... (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        print_error "Backend health check failed"
        return 1
    fi
    
    # Test OTP health endpoint
    if curl -s http://localhost:3000/api/otp/health | grep -q "healthy"; then
        print_success "OTP service is configured"
    else
        print_warning "OTP service needs API credentials to be configured"
    fi
    
    print_success "Deployment verification completed"
}

# Display post-installation information
show_info() {
    print_success "🎉 PocketShield deployment completed!"
    echo
    echo "📊 Service URLs:"
    echo "   • Backend API: http://localhost:3000"
    echo "   • API Documentation: http://localhost:3000/api-docs"
    echo "   • Health Check: http://localhost:3000/health"
    echo "   • OTP Health: http://localhost:3000/api/otp/health"
    echo
    echo "🔧 Next Steps:"
    echo "   1. Update API credentials in backend/.env:"
    echo "      - MSG91_AUTH_KEY (for SMS)"
    echo "      - GUPSHUP_API_KEY (for WhatsApp)"
    echo "   2. Restart services: docker-compose restart pocketshield-backend"
    echo "   3. Test OTP sending with your mobile number"
    echo "   4. Configure SSL and domain for production"
    echo
    echo "📝 Important Files:"
    echo "   • Configuration: backend/.env"
    echo "   • Docker Environment: .env"
    echo "   • Logs: logs/ and /var/log/pocketshield/"
    echo "   • Setup Guide: PRODUCTION_SETUP.md"
    echo
    echo "🔍 Monitoring:"
    echo "   • View Logs: docker-compose logs -f pocketshield-backend"
    echo "   • Check Status: docker-compose ps"
    echo "   • Stop Services: docker-compose down"
    echo
    echo "💰 Generated Passwords (SAVE THESE):"
    echo "   • Database: ${DB_PASSWORD}"
    echo "   • Redis: ${REDIS_PASSWORD}"
    echo "   • Grafana: ${GRAFANA_PASSWORD}"
    echo
    print_warning "Remember to update your mobile app to use: http://your-server-ip:3000/api"
}

# Main deployment function
main() {
    echo "🚀 PocketShield Production Deployment"
    echo "====================================="
    echo
    
    check_root
    check_requirements
    install_docker
    generate_passwords
    setup_environment
    setup_directories
    start_services
    verify_deployment
    show_info
    
    echo
    print_success "Deployment completed successfully! 🎉"
    print_warning "Don't forget to configure your SMS/WhatsApp API credentials!"
}

# Handle script interruption
trap 'print_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"

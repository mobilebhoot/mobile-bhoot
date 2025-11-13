# 🚀 PocketShield Production Setup Guide

This guide will help you deploy PocketShield with **real SMS/WhatsApp APIs** for production use.

## 📋 Prerequisites

- **Server**: Ubuntu 20.04+ or CentOS 8+ with 4GB RAM minimum
- **Docker & Docker Compose**: Latest versions
- **Domain**: Registered domain pointing to your server
- **SSL Certificate**: Let's Encrypt or purchased certificate

## 🔧 1. API Service Registration

### 📱 SMS Provider (Choose One)

#### Option A: MSG91 (Recommended for India)
1. **Register**: https://msg91.com/signup
2. **Get Credentials**:
   ```bash
   MSG91_AUTH_KEY=your_auth_key_here
   MSG91_SENDER_ID=POCKET  # Pre-approved sender ID
   ```
3. **Pricing**: ₹0.15-0.25 per SMS

#### Option B: TextLocal (Alternative)
1. **Register**: https://www.textlocal.in/signup/
2. **Get Credentials**:
   ```bash
   TEXTLOCAL_API_KEY=your_api_key_here
   TEXTLOCAL_SENDER=POCKET
   ```
3. **Pricing**: ₹0.10-0.20 per SMS

### 💬 WhatsApp Provider (Choose One)

#### Option A: Gupshup (Recommended for India)
1. **Register**: https://www.gupshup.io/developer/register
2. **Create WhatsApp App**:
   ```bash
   GUPSHUP_API_KEY=your_api_key_here
   GUPSHUP_APP_NAME=PocketShield
   GUPSHUP_SOURCE_NUMBER=your_whatsapp_number
   ```
3. **Pricing**: ₹0.25 per message

#### Option B: WhatsApp Business API (Enterprise)
1. **Apply**: https://business.whatsapp.com/products/business-api
2. **Get Credentials**:
   ```bash
   WHATSAPP_ACCESS_TOKEN=your_access_token
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
   ```

## 🛠️ 2. Server Setup

### Install Docker & Docker Compose
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### Clone and Configure
```bash
# Clone repository
git clone https://github.com/your-org/pocketshield.git
cd pocketshield

# Copy environment template
cp backend/config/production.env backend/.env

# Generate secure passwords
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For DB_PASSWORD
openssl rand -base64 32  # For REDIS_PASSWORD
```

## ⚙️ 3. Environment Configuration

### Edit `backend/.env` file:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000
API_BASE_URL=https://api.yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com

# Database (PostgreSQL)
DATABASE_URL=postgresql://pocketshield_user:your_secure_db_password@postgres:5432/pocketshield_prod
DB_PASSWORD=your_secure_db_password

# Redis
REDIS_PASSWORD=your_secure_redis_password

# JWT Security
JWT_SECRET=your_super_secure_jwt_secret_key_minimum_32_characters_long
JWT_REFRESH_SECRET=your_refresh_token_secret_key_also_32_characters_minimum

# SMS Configuration (MSG91)
SMS_PROVIDER=MSG91
MSG91_AUTH_KEY=your_msg91_auth_key_here
MSG91_SENDER_ID=POCKET

# WhatsApp Configuration (Gupshup)
WHATSAPP_PROVIDER=GUPSHUP
GUPSHUP_API_KEY=your_gupshup_api_key_here
GUPSHUP_APP_NAME=PocketShield
GUPSHUP_SOURCE_NUMBER=919876543210

# Rate Limiting
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT=5
OTP_RATE_LIMIT=3

# Logging & Monitoring
LOG_LEVEL=info
SENTRY_DSN=your_sentry_dsn_for_error_tracking
```

### Create `.env` file in project root:
```bash
# Docker Compose Environment
DB_PASSWORD=your_secure_db_password
REDIS_PASSWORD=your_secure_redis_password
GRAFANA_ADMIN_PASSWORD=your_grafana_password
```

## 🚀 4. Deploy Services

### Basic Deployment (Backend + Database)
```bash
# Start core services
docker-compose up -d pocketshield-backend postgres redis

# Check logs
docker-compose logs -f pocketshield-backend

# Verify health
curl http://localhost:3000/health
```

### Full Deployment (with Monitoring)
```bash
# Start all services including monitoring
docker-compose --profile monitoring --profile logging up -d

# Services will be available at:
# - Backend API: http://localhost:3000
# - Grafana: http://localhost:3001
# - Kibana: http://localhost:5601
# - Prometheus: http://localhost:9090
```

## 🔒 5. SSL & Domain Setup

### Using Let's Encrypt
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Nginx Configuration
```nginx
# /etc/nginx/sites-available/pocketshield-api
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📱 6. Mobile App Configuration

Update mobile app to use production backend:

### Update `src/services/otpService.js`:
```javascript
// Change baseURL to production
this.baseURL = 'https://api.yourdomain.com/api';
```

### Build Production APK:
```bash
# Navigate to mobile app directory
cd mobile-bhoot

# Install dependencies
npm install

# Build for production
npx expo prebuild
npx expo run:android --variant release

# Or create APK
cd android
./gradlew assembleRelease
```

## 🧪 7. Testing Production APIs

### Test OTP Sending
```bash
curl -X POST https://api.yourdomain.com/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9876543210",
    "enableSMS": true,
    "enableWhatsApp": true
  }'
```

### Test OTP Verification
```bash
curl -X POST https://api.yourdomain.com/api/otp/verify \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9876543210",
    "otp": "123456"
  }'
```

### Check API Health
```bash
curl https://api.yourdomain.com/health
curl https://api.yourdomain.com/api/otp/health
```

## 📊 8. Monitoring & Logs

### View Logs
```bash
# Backend logs
docker-compose logs -f pocketshield-backend

# Database logs
docker-compose logs -f postgres

# All services
docker-compose logs -f
```

### Access Monitoring Dashboards
- **Grafana**: https://monitor.yourdomain.com:3001
- **API Documentation**: https://api.yourdomain.com/api-docs
- **Prometheus**: http://localhost:9090 (internal)

## 🔧 9. Performance Tuning

### Database Optimization
```sql
-- Connect to PostgreSQL
docker exec -it pocketshield-postgres psql -U pocketshield_user -d pocketshield_prod

-- Create indexes
CREATE INDEX idx_otp_phone_created ON otps(phone_number, created_at);
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_auth_tokens ON auth_tokens(token_hash);
```

### Redis Configuration
```bash
# Optimize Redis memory
docker exec -it pocketshield-redis redis-cli CONFIG SET maxmemory 256mb
docker exec -it pocketshield-redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

## 🚨 10. Security Hardening

### Firewall Setup
```bash
# Enable UFW
sudo ufw enable

# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 3000/tcp   # Block direct backend access
sudo ufw deny 5432/tcp   # Block direct DB access
```

### Regular Security Updates
```bash
# Create update script
cat > /etc/cron.weekly/update-pocketshield << 'EOF'
#!/bin/bash
cd /path/to/pocketshield
docker-compose pull
docker-compose up -d
docker system prune -f
apt update && apt upgrade -y
EOF

chmod +x /etc/cron.weekly/update-pocketshield
```

## 📈 11. Scaling & Load Balancing

### Horizontal Scaling
```yaml
# docker-compose.override.yml
version: '3.8'
services:
  pocketshield-backend:
    deploy:
      replicas: 3
    ports:
      - "3000-3002:3000"
```

### Load Balancer Configuration
```nginx
upstream pocketshield_backend {
    server localhost:3000 weight=1 max_fails=3 fail_timeout=30s;
    server localhost:3001 weight=1 max_fails=3 fail_timeout=30s;
    server localhost:3002 weight=1 max_fails=3 fail_timeout=30s;
}

server {
    location / {
        proxy_pass http://pocketshield_backend;
    }
}
```

## 🆘 12. Troubleshooting

### Common Issues

#### SMS Not Sending
```bash
# Check MSG91 logs
docker-compose logs pocketshield-backend | grep MSG91

# Verify credentials
curl -H "authkey: your_auth_key" "https://api.msg91.com/api/balance.php"
```

#### WhatsApp Delivery Fails
```bash
# Check Gupshup logs
docker-compose logs pocketshield-backend | grep Gupshup

# Test Gupshup API
curl -X POST "https://api.gupshup.io/sm/api/v1/msg" \
  -H "apikey: your_api_key" \
  -d "channel=whatsapp&source=your_number&destination=test_number&message=test"
```

#### Database Connection Issues
```bash
# Check database health
docker exec pocketshield-postgres pg_isready -U pocketshield_user

# Reset database connection
docker-compose restart pocketshield-backend postgres
```

### Emergency Contacts
- **MSG91 Support**: support@msg91.com
- **Gupshup Support**: support@gupshup.io
- **Server Issues**: Check logs and restart services

## 📞 Support

For production support:
- **Documentation**: https://docs.pocketshield.app
- **API Support**: api-support@pocketshield.app
- **Emergency**: Call your operations team

---

## 💰 Cost Estimation (Monthly)

### API Costs (For 10,000 users, 50,000 OTP/month)
- **MSG91 SMS**: 50,000 × ₹0.20 = ₹10,000
- **Gupshup WhatsApp**: 25,000 × ₹0.25 = ₹6,250
- **Total Messaging**: ~₹16,250/month

### Infrastructure Costs
- **Server (4GB RAM, 2CPU)**: ₹2,000-5,000/month
- **Database (Managed PostgreSQL)**: ₹1,500-3,000/month
- **Monitoring (Optional)**: ₹500-1,500/month
- **SSL Certificate**: Free (Let's Encrypt)
- **Total Infrastructure**: ~₹4,000-9,500/month

### **Total Monthly Cost**: ₹20,250-25,750 for 50K OTPs

---

🎉 **Congratulations!** Your PocketShield production environment is now ready with real SMS and WhatsApp APIs!

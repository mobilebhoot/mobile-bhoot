# PocketShield Cloud Threat Intelligence API Architecture

## Overview

The PocketShield Threat Intelligence API is a cloud-native, scalable platform that provides real-time security intelligence to mobile applications. It aggregates threat data from multiple sources, processes it using AI/ML algorithms, and delivers actionable security insights via RESTful APIs and WebSocket connections.

## System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile Apps   │    │  Web Dashboard  │    │  Third-party    │
│  (PocketShield) │    │    (Admin)      │    │  Integrations   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │              ┌───────▼──────────────────────▼───────┐
          │              │         API Gateway / Load Balancer   │
          │              │         (Rate Limiting, Auth, SSL)    │
          └──────────────┤                                       │
                         └───────┬──────────────────────┬───────┘
                                 │                      │
                    ┌────────────▼────────────┐    ┌────▼────────┐
                    │   Threat Intelligence   │    │  WebSocket  │
                    │      API Service        │    │   Service   │
                    │   (REST Endpoints)      │    │ (Real-time) │
                    └────────────┬────────────┘    └─────────────┘
                                 │                      │
              ┌──────────────────┼──────────────────────┘
              │                  │
    ┌─────────▼─────────┐   ┌────▼──────┐   ┌─────────────────┐
    │  Threat Analysis  │   │  Redis    │   │   PostgreSQL    │
    │   ML Pipeline     │   │  Cache    │   │   Database      │
    │ (Background Jobs) │   │           │   │  (Primary Data) │
    └─────────┬─────────┘   └───────────┘   └─────────────────┘
              │
    ┌─────────▼─────────┐   ┌─────────────────┐
    │  External Threat  │   │   Elasticsearch │
    │ Intelligence APIs │   │ (Search & Logs) │
    │ (VirusTotal, etc.)│   │                 │
    └───────────────────┘   └─────────────────┘
```

### Core Components

#### 1. API Gateway
- **Technology**: NGINX + Kong/AWS API Gateway
- **Features**: Rate limiting, authentication, SSL termination, request routing
- **Scaling**: Auto-scaling based on request volume

#### 2. Threat Intelligence API Service
- **Technology**: Node.js/Python FastAPI + Docker containers
- **Database**: PostgreSQL (primary), Redis (cache)
- **Message Queue**: Redis/RabbitMQ for background processing

#### 3. Real-time Communication
- **Technology**: WebSocket/Socket.IO for live updates
- **Features**: Push notifications, real-time threat alerts

#### 4. ML/AI Pipeline
- **Technology**: Python + TensorFlow/PyTorch, Celery workers
- **Features**: Threat pattern recognition, behavioral analysis, risk scoring

## API Specification

### Base URL
```
Production: https://api.pocketshield.security/v1
Staging: https://staging-api.pocketshield.security/v1
```

### Authentication
```http
Authorization: Bearer <JWT_TOKEN>
X-API-Key: <API_KEY>
X-Device-ID: <UNIQUE_DEVICE_ID>
```

### Core Endpoints

#### 1. Device Registration & Authentication
```http
POST /auth/register
POST /auth/login
POST /auth/refresh
GET  /auth/verify
```

#### 2. Threat Intelligence Endpoints

##### URL/Domain Analysis
```http
POST /threat/analyze/url
{
  "urls": ["https://example.com", "https://suspicious-site.org"],
  "context": {
    "source": "user_input|message|browser",
    "timestamp": "2024-01-01T00:00:00Z",
    "device_info": {...}
  }
}

Response:
{
  "job_id": "uuid-string",
  "results": [
    {
      "url": "https://suspicious-site.org",
      "risk_score": 85,
      "classification": "malicious",
      "threats": [
        {
          "type": "phishing",
          "confidence": 0.92,
          "description": "Detected banking phishing patterns"
        }
      ],
      "reputation": {
        "source": "virustotal",
        "malicious_count": 12,
        "total_scans": 67
      },
      "recommendations": [
        "Block access to this URL",
        "Report to security team"
      ]
    }
  ]
}
```

##### Application Security Analysis
```http
POST /threat/analyze/app
{
  "apps": [
    {
      "package_name": "com.example.app",
      "version": "1.2.3",
      "permissions": ["CAMERA", "LOCATION"],
      "install_source": "play_store"
    }
  ]
}

Response:
{
  "results": [
    {
      "package_name": "com.example.app",
      "risk_score": 25,
      "classification": "low_risk",
      "analysis": {
        "permissions_risk": 15,
        "reputation_risk": 10,
        "behavior_risk": 0
      },
      "vulnerabilities": [],
      "updates_available": true,
      "recommendations": ["Update to latest version"]
    }
  ]
}
```

##### Real-time Threat Feed
```http
GET /threat/feed?types=phishing,malware&since=2024-01-01T00:00:00Z
{
  "threats": [
    {
      "id": "threat-uuid",
      "type": "phishing",
      "indicators": {
        "urls": ["http://fake-bank.com"],
        "domains": ["fake-bank.com"],
        "ip_addresses": ["192.168.1.100"]
      },
      "risk_score": 90,
      "first_seen": "2024-01-01T10:00:00Z",
      "tags": ["banking", "indian-users"],
      "ttl": 3600
    }
  ],
  "pagination": {
    "next_cursor": "cursor-string",
    "has_more": true
  }
}
```

#### 3. Device Security Endpoints

##### Security Posture Assessment
```http
POST /device/assess
{
  "device_info": {
    "os": "android",
    "version": "13",
    "security_patch": "2024-01-01",
    "rooted": false,
    "installed_apps": [...],
    "network_info": {...}
  }
}

Response:
{
  "overall_score": 75,
  "risk_level": "medium",
  "findings": [
    {
      "category": "os_security",
      "score": 85,
      "issues": ["Security patch is 30 days old"]
    },
    {
      "category": "app_security",
      "score": 70,
      "issues": ["3 apps need updates", "1 suspicious app detected"]
    }
  ],
  "recommendations": [...]
}
```

#### 4. Behavioral Analysis

##### Anomaly Detection
```http
POST /behavior/analyze
{
  "events": [
    {
      "type": "app_install",
      "timestamp": "2024-01-01T12:00:00Z",
      "details": {"package": "com.suspicious.app"}
    },
    {
      "type": "network_access",
      "timestamp": "2024-01-01T12:05:00Z",
      "details": {"destination": "suspicious-domain.com"}
    }
  ]
}
```

#### 5. Incident Response

##### Threat Reporting
```http
POST /incident/report
{
  "type": "phishing_attempt",
  "details": {
    "url": "http://fake-site.com",
    "method": "sms",
    "content": "Click here to verify your account"
  },
  "evidence": {...}
}
```

### WebSocket Events

#### Connection
```javascript
const socket = io('wss://api.pocketshield.security', {
  auth: {
    token: 'jwt-token'
  }
});
```

#### Real-time Events
```javascript
// Threat alerts
socket.on('threat_alert', (data) => {
  /*
  {
    "type": "new_threat",
    "severity": "high",
    "threat": {
      "indicators": ["malicious-domain.com"],
      "description": "New phishing campaign targeting Indian banks"
    }
  }
  */
});

// Security updates
socket.on('security_update', (data) => {
  /*
  {
    "type": "app_vulnerability",
    "affected_apps": ["com.example.app"],
    "severity": "critical",
    "patch_available": true
  }
  */
});
```

## Database Schema

### PostgreSQL Tables

#### Threats Table
```sql
CREATE TABLE threats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL, -- phishing, malware, scam, etc.
    indicators JSONB NOT NULL, -- URLs, domains, IPs, file hashes
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    source VARCHAR(100) NOT NULL, -- virustotal, manual, ml_pipeline
    tags TEXT[],
    description TEXT,
    first_seen TIMESTAMP NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMP NOT NULL DEFAULT NOW(),
    ttl INTEGER DEFAULT 86400, -- Time to live in seconds
    status VARCHAR(20) DEFAULT 'active', -- active, expired, false_positive
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_threats_type ON threats(type);
CREATE INDEX idx_threats_risk_score ON threats(risk_score DESC);
CREATE INDEX idx_threats_first_seen ON threats(first_seen DESC);
CREATE INDEX idx_threats_indicators ON threats USING GIN(indicators);
```

#### Devices Table
```sql
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    platform VARCHAR(20) NOT NULL, -- android, ios
    os_version VARCHAR(50),
    app_version VARCHAR(20),
    last_seen TIMESTAMP DEFAULT NOW(),
    security_score INTEGER,
    risk_level VARCHAR(20), -- low, medium, high, critical
    configuration JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Security Assessments Table
```sql
CREATE TABLE security_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES devices(id),
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    risk_level VARCHAR(20),
    findings JSONB NOT NULL,
    recommendations JSONB,
    assessment_data JSONB, -- Raw assessment data
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Threat Intelligence Sources Table
```sql
CREATE TABLE threat_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- api, feed, manual
    endpoint VARCHAR(500),
    api_key_encrypted TEXT,
    last_sync TIMESTAMP,
    sync_frequency INTEGER DEFAULT 3600, -- seconds
    status VARCHAR(20) DEFAULT 'active',
    configuration JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Redis Cache Structure

#### Threat Cache
```
threat:url:{url_hash} -> {threat_data} [TTL: 1 hour]
threat:domain:{domain} -> {threat_data} [TTL: 1 hour]
threat:ip:{ip} -> {threat_data} [TTL: 1 hour]
```

#### Rate Limiting
```
ratelimit:{api_key}:{endpoint} -> {request_count} [TTL: 1 minute]
```

#### Real-time Data
```
device:{device_id}:alerts -> List of active alerts
device:{device_id}:session -> Current session data
```

## Security Considerations

### 1. Authentication & Authorization
- **JWT Tokens**: Short-lived access tokens (15 minutes)
- **Refresh Tokens**: Longer-lived tokens for renewal (7 days)
- **API Keys**: For service-to-service communication
- **Device Fingerprinting**: Additional security layer

### 2. Data Protection
- **Encryption at Rest**: AES-256 for sensitive data
- **Encryption in Transit**: TLS 1.3 for all communications
- **Data Anonymization**: Remove PII from threat intelligence
- **GDPR Compliance**: Data retention and deletion policies

### 3. Rate Limiting
```
- Free Tier: 1000 requests/hour per device
- Premium Tier: 10000 requests/hour per device
- Burst Protection: 10 requests/second
```

### 4. Input Validation
- **URL Validation**: Prevent SSRF attacks
- **Request Size Limits**: Max 10MB per request
- **Content Type Validation**: JSON/form data only

## Deployment Architecture

### Cloud Infrastructure (AWS/GCP/Azure)

#### Production Environment
```yaml
# Kubernetes Deployment Example
apiVersion: v1
kind: Namespace
metadata:
  name: pocketshield-prod

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: threat-api
  namespace: pocketshield-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: threat-api
  template:
    metadata:
      labels:
        app: threat-api
    spec:
      containers:
      - name: api
        image: pocketshield/threat-api:v1.0.0
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10

---
apiVersion: v1
kind: Service
metadata:
  name: threat-api-service
  namespace: pocketshield-prod
spec:
  selector:
    app: threat-api
  ports:
  - port: 80
    targetPort: 8000
  type: LoadBalancer
```

#### Auto-scaling Configuration
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: threat-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: threat-api
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Monitoring & Observability

#### Metrics Collection (Prometheus)
```yaml
# Key metrics to monitor
- threat_api_requests_total
- threat_api_request_duration_seconds
- threat_analysis_queue_size
- threat_database_size
- device_registrations_total
- websocket_connections_active
```

#### Log Structure (JSON)
```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "level": "INFO",
  "service": "threat-api",
  "correlation_id": "req-123456",
  "device_id": "device-uuid",
  "endpoint": "/threat/analyze/url",
  "method": "POST",
  "status_code": 200,
  "response_time_ms": 150,
  "threat_count": 5,
  "high_risk_count": 1
}
```

## Performance Optimization

### 1. Caching Strategy
- **Redis**: Hot threat data, API responses
- **CDN**: Static content, threat intelligence feeds
- **Database**: Query result caching

### 2. Async Processing
- **Background Jobs**: Heavy ML analysis, threat feed updates
- **Queue System**: Redis/RabbitMQ for job processing
- **Batch Processing**: Bulk threat analysis

### 3. Database Optimization
- **Read Replicas**: Distribute read load
- **Partitioning**: Time-based partitioning for threat data
- **Indexing**: Optimized indexes for common queries

## Integration Examples

### Mobile App Integration (React Native)
```javascript
// threat-intelligence-client.js
import io from 'socket.io-client';

class ThreatIntelligenceClient {
  constructor(apiUrl, apiKey) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.socket = null;
  }

  // Initialize WebSocket connection
  connect(deviceId, authToken) {
    this.socket = io(this.apiUrl, {
      auth: {
        token: authToken,
        device_id: deviceId,
        api_key: this.apiKey
      }
    });

    this.socket.on('threat_alert', this.handleThreatAlert);
    this.socket.on('security_update', this.handleSecurityUpdate);
  }

  // Analyze URLs for threats
  async analyzeUrls(urls, context = {}) {
    try {
      const response = await fetch(`${this.apiUrl}/threat/analyze/url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({
          urls,
          context: {
            source: context.source || 'manual',
            timestamp: new Date().toISOString(),
            ...context
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('URL analysis failed:', error);
      throw error;
    }
  }

  // Real-time threat alert handler
  handleThreatAlert = (alert) => {
    // Show user notification
    this.showNotification({
      title: 'Security Alert',
      message: alert.threat.description,
      severity: alert.severity
    });

    // Update local threat database
    this.updateLocalThreats(alert.threat);
  };

  // Security update handler
  handleSecurityUpdate = (update) => {
    if (update.type === 'app_vulnerability') {
      // Check if user has affected apps
      this.checkAffectedApps(update.affected_apps);
    }
  };
}

export default ThreatIntelligenceClient;
```

### Usage in Mobile App
```javascript
// In your React Native app
import ThreatIntelligenceClient from './threat-intelligence-client';

const threatClient = new ThreatIntelligenceClient(
  'https://api.pocketshield.security/v1',
  'your-api-key'
);

// Initialize on app start
useEffect(() => {
  threatClient.connect(deviceId, authToken);
  
  return () => {
    threatClient.disconnect();
  };
}, []);

// Use in URL scanner component
const scanUrls = async (urls) => {
  try {
    const results = await threatClient.analyzeUrls(urls, {
      source: 'user_input',
      context_app: 'message_scanner'
    });
    
    // Process results
    results.results.forEach(result => {
      if (result.risk_score > 70) {
        showWarning(`Dangerous URL detected: ${result.url}`);
      }
    });
  } catch (error) {
    console.error('Threat analysis failed:', error);
  }
};
```

## Cost Optimization

### 1. Tiered Pricing Model
- **Free Tier**: 1000 requests/month, basic threat intelligence
- **Premium Tier**: 100K requests/month, real-time alerts, advanced ML
- **Enterprise Tier**: Unlimited requests, custom integrations, SLA

### 2. Resource Management
- **Auto-scaling**: Scale based on demand
- **Spot Instances**: Use for non-critical background processing
- **Reserved Instances**: For baseline capacity

### 3. Data Lifecycle Management
- **Hot Data**: Recent threats (Redis + PostgreSQL)
- **Warm Data**: Historical threats (PostgreSQL)
- **Cold Data**: Archived data (AWS S3/Google Cloud Storage)

## Future Enhancements

### 1. AI/ML Improvements
- **Deep Learning Models**: Advanced threat pattern recognition
- **Behavioral Analysis**: User behavior anomaly detection
- **Predictive Analytics**: Threat trend prediction

### 2. Global Expansion
- **Regional Deployment**: Edge locations for reduced latency
- **Localized Threats**: Region-specific threat intelligence
- **Compliance**: GDPR, CCPA, Indian IT Act compliance

### 3. Advanced Features
- **Threat Hunting**: Proactive threat discovery
- **Incident Response**: Automated response workflows
- **Threat Sharing**: Community-driven threat intelligence

This architecture provides a robust, scalable foundation for real-time threat intelligence that can grow with your user base while maintaining high performance and security standards.

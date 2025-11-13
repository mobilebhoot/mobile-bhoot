-- PocketShield Threat Intelligence Database Schema
-- Initial migration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (for future enterprise features)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    organization VARCHAR(255),
    api_tier VARCHAR(50) DEFAULT 'free', -- free, premium, enterprise
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Devices table
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    platform VARCHAR(20) NOT NULL, -- android, ios
    os_version VARCHAR(50),
    app_version VARCHAR(20),
    last_seen TIMESTAMP DEFAULT NOW(),
    security_score INTEGER CHECK (security_score >= 0 AND security_score <= 100),
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    configuration JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for devices
CREATE INDEX idx_devices_device_id ON devices(device_id);
CREATE INDEX idx_devices_user_id ON devices(user_id);
CREATE INDEX idx_devices_platform ON devices(platform);
CREATE INDEX idx_devices_last_seen ON devices(last_seen DESC);

-- Threat Intelligence Sources table
CREATE TABLE threat_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- api, feed, manual, ml_pipeline
    endpoint VARCHAR(500),
    api_key_encrypted TEXT,
    last_sync TIMESTAMP,
    sync_frequency INTEGER DEFAULT 3600, -- seconds
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
    configuration JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Threats table (main threat intelligence data)
CREATE TABLE threats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL, -- phishing, malware, scam, suspicious, etc.
    indicators JSONB NOT NULL, -- URLs, domains, IPs, file hashes, app packages
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    source_id UUID REFERENCES threat_sources(id),
    source_name VARCHAR(100) NOT NULL, -- virustotal, manual, ml_pipeline, etc.
    tags TEXT[], -- geographic regions, threat categories, etc.
    description TEXT,
    technical_details JSONB, -- IOCs, YARA rules, etc.
    first_seen TIMESTAMP NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMP NOT NULL DEFAULT NOW(),
    ttl INTEGER DEFAULT 86400, -- Time to live in seconds (0 = permanent)
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'false_positive', 'under_review')),
    false_positive_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for threats
CREATE INDEX idx_threats_type ON threats(type);
CREATE INDEX idx_threats_risk_score ON threats(risk_score DESC);
CREATE INDEX idx_threats_source_name ON threats(source_name);
CREATE INDEX idx_threats_first_seen ON threats(first_seen DESC);
CREATE INDEX idx_threats_last_seen ON threats(last_seen DESC);
CREATE INDEX idx_threats_status ON threats(status);
CREATE INDEX idx_threats_indicators ON threats USING GIN(indicators);
CREATE INDEX idx_threats_tags ON threats USING GIN(tags);

-- Partitioning for threats table by date (monthly partitions)
-- CREATE TABLE threats_y2024m01 PARTITION OF threats
-- FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Security Assessments table
CREATE TABLE security_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    findings JSONB NOT NULL,
    recommendations JSONB,
    assessment_data JSONB, -- Raw assessment data for analysis
    assessment_version VARCHAR(20) DEFAULT '1.0', -- Track assessment algorithm version
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for security assessments
CREATE INDEX idx_assessments_device_id ON security_assessments(device_id);
CREATE INDEX idx_assessments_risk_level ON security_assessments(risk_level);
CREATE INDEX idx_assessments_created_at ON security_assessments(created_at DESC);

-- URL Analysis Results table (for analytics and caching)
CREATE TABLE url_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url_hash VARCHAR(64) NOT NULL, -- MD5 hash of URL for privacy
    url TEXT NOT NULL, -- Store original URL for debugging (consider encryption)
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    classification VARCHAR(50), -- safe, suspicious, malicious
    threats JSONB,
    context JSONB, -- Request context (source, app, etc.)
    processing_time_ms INTEGER,
    cache_hit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for URL analyses
CREATE INDEX idx_url_analyses_url_hash ON url_analyses(url_hash);
CREATE INDEX idx_url_analyses_device_id ON url_analyses(device_id);
CREATE INDEX idx_url_analyses_classification ON url_analyses(classification);
CREATE INDEX idx_url_analyses_risk_score ON url_analyses(risk_score DESC);
CREATE INDEX idx_url_analyses_created_at ON url_analyses(created_at DESC);

-- App Analysis Results table
CREATE TABLE app_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_name VARCHAR(255) NOT NULL,
    version VARCHAR(50),
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    classification VARCHAR(50),
    analysis_results JSONB NOT NULL,
    permissions_analyzed TEXT[],
    vulnerabilities JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for app analyses
CREATE INDEX idx_app_analyses_package_name ON app_analyses(package_name);
CREATE INDEX idx_app_analyses_device_id ON app_analyses(device_id);
CREATE INDEX idx_app_analyses_classification ON app_analyses(classification);
CREATE INDEX idx_app_analyses_created_at ON app_analyses(created_at DESC);

-- Incident Reports table
CREATE TABLE incident_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    type VARCHAR(100) NOT NULL, -- phishing_attempt, malware_detected, etc.
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
    details JSONB NOT NULL,
    evidence JSONB,
    assignee VARCHAR(255), -- For manual investigation
    resolution_notes TEXT,
    auto_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

-- Create indexes for incident reports
CREATE INDEX idx_incident_reports_device_id ON incident_reports(device_id);
CREATE INDEX idx_incident_reports_type ON incident_reports(type);
CREATE INDEX idx_incident_reports_severity ON incident_reports(severity);
CREATE INDEX idx_incident_reports_status ON incident_reports(status);
CREATE INDEX idx_incident_reports_created_at ON incident_reports(created_at DESC);

-- Behavioral Analysis Events table
CREATE TABLE behavior_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL, -- app_install, network_access, permission_request, etc.
    event_data JSONB NOT NULL,
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    anomaly_detected BOOLEAN DEFAULT FALSE,
    context JSONB, -- Additional context about the event
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for behavior events
CREATE INDEX idx_behavior_events_device_id ON behavior_events(device_id);
CREATE INDEX idx_behavior_events_type ON behavior_events(event_type);
CREATE INDEX idx_behavior_events_risk_score ON behavior_events(risk_score DESC);
CREATE INDEX idx_behavior_events_anomaly ON behavior_events(anomaly_detected);
CREATE INDEX idx_behavior_events_created_at ON behavior_events(created_at DESC);

-- API Usage Stats table (for rate limiting and analytics)
CREATE TABLE api_usage_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for API usage stats
CREATE INDEX idx_api_usage_device_id ON api_usage_stats(device_id);
CREATE INDEX idx_api_usage_endpoint ON api_usage_stats(endpoint);
CREATE INDEX idx_api_usage_created_at ON api_usage_stats(created_at DESC);

-- Real-time Alerts table
CREATE TABLE real_time_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    alert_type VARCHAR(100) NOT NULL, -- new_threat, security_update, critical_vulnerability
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    alert_data JSONB,
    delivered BOOLEAN DEFAULT FALSE,
    delivery_method VARCHAR(50), -- websocket, push_notification, email
    created_at TIMESTAMP DEFAULT NOW(),
    delivered_at TIMESTAMP
);

-- Create indexes for real-time alerts
CREATE INDEX idx_alerts_device_id ON real_time_alerts(device_id);
CREATE INDEX idx_alerts_type ON real_time_alerts(alert_type);
CREATE INDEX idx_alerts_severity ON real_time_alerts(severity);
CREATE INDEX idx_alerts_delivered ON real_time_alerts(delivered);
CREATE INDEX idx_alerts_created_at ON real_time_alerts(created_at DESC);

-- Threat Intelligence Feed Subscriptions
CREATE TABLE feed_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    threat_types TEXT[] NOT NULL, -- Array of threat types to subscribe to
    geographic_regions TEXT[], -- Array of regions of interest
    risk_threshold INTEGER DEFAULT 50, -- Minimum risk score for alerts
    delivery_method VARCHAR(50) DEFAULT 'websocket',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for feed subscriptions
CREATE INDEX idx_feed_subs_device_id ON feed_subscriptions(device_id);
CREATE INDEX idx_feed_subs_active ON feed_subscriptions(is_active);

-- Machine Learning Models Metadata
CREATE TABLE ml_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    version VARCHAR(50) NOT NULL,
    model_type VARCHAR(50) NOT NULL, -- threat_detection, behavioral_analysis, etc.
    framework VARCHAR(50), -- tensorflow, pytorch, scikit-learn
    accuracy_metrics JSONB,
    training_data_info JSONB,
    deployment_status VARCHAR(50) DEFAULT 'training',
    model_path TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    deployed_at TIMESTAMP
);

-- System Configuration table
CREATE TABLE system_config (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default configuration
INSERT INTO system_config (key, value, description) VALUES
('threat_feed_sync_interval', '3600', 'Interval in seconds for syncing external threat feeds'),
('ml_model_update_interval', '86400', 'Interval in seconds for checking ML model updates'),
('max_api_requests_per_hour', '10000', 'Maximum API requests per hour per device (premium tier)'),
('threat_retention_days', '90', 'Number of days to retain threat intelligence data'),
('default_risk_threshold', '50', 'Default risk score threshold for alerts');

-- Functions for common operations

-- Function to clean up expired threats
CREATE OR REPLACE FUNCTION cleanup_expired_threats()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM threats 
    WHERE status = 'active' 
    AND ttl > 0 
    AND first_seen + INTERVAL '1 second' * ttl < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update device last seen timestamp
CREATE OR REPLACE FUNCTION update_device_last_seen(device_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE devices 
    SET last_seen = NOW(), updated_at = NOW()
    WHERE id = device_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate device security score
CREATE OR REPLACE FUNCTION calculate_device_security_score(device_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    latest_assessment security_assessments%ROWTYPE;
    score INTEGER := 100;
BEGIN
    -- Get latest security assessment
    SELECT * INTO latest_assessment
    FROM security_assessments 
    WHERE device_id = device_uuid 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF FOUND THEN
        score := latest_assessment.overall_score;
    END IF;
    
    -- Update device security score
    UPDATE devices 
    SET security_score = score, updated_at = NOW()
    WHERE id = device_uuid;
    
    RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_threats_updated_at BEFORE UPDATE ON threats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_threat_sources_updated_at BEFORE UPDATE ON threat_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incident_reports_updated_at BEFORE UPDATE ON incident_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feed_subscriptions_updated_at BEFORE UPDATE ON feed_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries

-- Active threats view
CREATE VIEW active_threats AS
SELECT 
    id,
    type,
    indicators,
    risk_score,
    confidence,
    source_name,
    tags,
    description,
    first_seen,
    last_seen,
    (CASE 
        WHEN ttl = 0 THEN NULL 
        ELSE first_seen + INTERVAL '1 second' * ttl 
    END) as expires_at
FROM threats 
WHERE status = 'active' 
AND (ttl = 0 OR first_seen + INTERVAL '1 second' * ttl > NOW());

-- Device security summary view
CREATE VIEW device_security_summary AS
SELECT 
    d.device_id,
    d.platform,
    d.os_version,
    d.security_score,
    d.risk_level,
    d.last_seen,
    sa.overall_score as latest_assessment_score,
    sa.created_at as latest_assessment_date,
    COUNT(DISTINCT ir.id) as open_incidents
FROM devices d
LEFT JOIN security_assessments sa ON d.id = sa.device_id
LEFT JOIN incident_reports ir ON d.id = ir.device_id AND ir.status = 'open'
WHERE d.is_active = TRUE
GROUP BY d.id, d.device_id, d.platform, d.os_version, d.security_score, d.risk_level, d.last_seen, sa.overall_score, sa.created_at;

-- High-risk threats view
CREATE VIEW high_risk_threats AS
SELECT *
FROM active_threats
WHERE risk_score >= 70
ORDER BY risk_score DESC, first_seen DESC;

-- Grant permissions (adjust as needed for your deployment)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pocketshield_api;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO pocketshield_api;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO pocketshield_api;

"""
PocketShield Threat Intelligence API
Main FastAPI application with core threat intelligence endpoints
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter
import redis.asyncio as redis
import asyncpg
import asyncio
import jwt
import hashlib
import json
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, HttpUrl, validator
import uuid
import logging
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pydantic Models
class ThreatAnalysisRequest(BaseModel):
    urls: List[HttpUrl]
    context: Optional[Dict[str, Any]] = {}
    
    @validator('urls')
    def validate_urls(cls, v):
        if len(v) > 100:  # Limit to 100 URLs per request
            raise ValueError('Maximum 100 URLs allowed per request')
        return v

class AppAnalysisRequest(BaseModel):
    apps: List[Dict[str, Any]]
    
    class Config:
        schema_extra = {
            "example": {
                "apps": [
                    {
                        "package_name": "com.example.app",
                        "version": "1.2.3",
                        "permissions": ["CAMERA", "LOCATION"],
                        "install_source": "play_store"
                    }
                ]
            }
        }

class DeviceAssessmentRequest(BaseModel):
    device_info: Dict[str, Any]
    
    class Config:
        schema_extra = {
            "example": {
                "device_info": {
                    "os": "android",
                    "version": "13",
                    "security_patch": "2024-01-01",
                    "rooted": False,
                    "installed_apps": [],
                    "network_info": {}
                }
            }
        }

class ThreatReportRequest(BaseModel):
    type: str
    details: Dict[str, Any]
    evidence: Optional[Dict[str, Any]] = {}

class BehaviorAnalysisRequest(BaseModel):
    events: List[Dict[str, Any]]

# Response Models
class ThreatResult(BaseModel):
    url: str
    risk_score: int
    classification: str
    threats: List[Dict[str, Any]]
    reputation: Optional[Dict[str, Any]] = None
    recommendations: List[str]

class ThreatAnalysisResponse(BaseModel):
    job_id: str
    results: List[ThreatResult]

class SecurityAssessmentResponse(BaseModel):
    overall_score: int
    risk_level: str
    findings: List[Dict[str, Any]]
    recommendations: List[str]

# Database connection
class DatabaseManager:
    def __init__(self):
        self.pool = None
        
    async def connect(self):
        self.pool = await asyncpg.create_pool(
            "postgresql://user:password@localhost/pocketshield",
            min_size=10,
            max_size=20
        )
        
    async def disconnect(self):
        if self.pool:
            await self.pool.close()
            
    async def execute_query(self, query: str, *args):
        async with self.pool.acquire() as connection:
            return await connection.fetch(query, *args)
            
    async def execute_one(self, query: str, *args):
        async with self.pool.acquire() as connection:
            return await connection.fetchrow(query, *args)

# Redis connection
class CacheManager:
    def __init__(self):
        self.redis = None
        
    async def connect(self):
        self.redis = redis.Redis(
            host='localhost',
            port=6379,
            decode_responses=True
        )
        
    async def disconnect(self):
        if self.redis:
            await self.redis.close()
            
    async def get(self, key: str):
        return await self.redis.get(key)
        
    async def set(self, key: str, value: str, ttl: int = 3600):
        await self.redis.setex(key, ttl, value)
        
    async def delete(self, key: str):
        await self.redis.delete(key)

# Global instances
db_manager = DatabaseManager()
cache_manager = CacheManager()

# Security
security = HTTPBearer()
JWT_SECRET = "your-secret-key"  # Use environment variable in production
JWT_ALGORITHM = "HS256"

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        device_id = payload.get("device_id")
        if not device_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return device_id
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Threat Intelligence Service
class ThreatIntelligenceService:
    def __init__(self, db_manager: DatabaseManager, cache_manager: CacheManager):
        self.db = db_manager
        self.cache = cache_manager
        
    async def analyze_urls(self, urls: List[str], context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze URLs for threats"""
        job_id = str(uuid.uuid4())
        results = []
        
        for url in urls:
            url_str = str(url)
            url_hash = hashlib.md5(url_str.encode()).hexdigest()
            
            # Check cache first
            cached_result = await self.cache.get(f"threat:url:{url_hash}")
            if cached_result:
                results.append(json.loads(cached_result))
                continue
                
            # Perform threat analysis
            result = await self._analyze_single_url(url_str, context)
            
            # Cache result
            await self.cache.set(
                f"threat:url:{url_hash}",
                json.dumps(result),
                ttl=3600  # 1 hour
            )
            
            results.append(result)
            
        return {
            "job_id": job_id,
            "results": results
        }
        
    async def _analyze_single_url(self, url: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze a single URL for threats"""
        # Initialize result
        result = {
            "url": url,
            "risk_score": 0,
            "classification": "safe",
            "threats": [],
            "recommendations": []
        }
        
        # Domain analysis
        domain_threats = await self._check_domain_reputation(url)
        result["threats"].extend(domain_threats)
        
        # Pattern matching
        pattern_threats = await self._check_malicious_patterns(url)
        result["threats"].extend(pattern_threats)
        
        # Calculate risk score
        result["risk_score"] = self._calculate_risk_score(result["threats"])
        
        # Determine classification
        if result["risk_score"] >= 80:
            result["classification"] = "malicious"
        elif result["risk_score"] >= 50:
            result["classification"] = "suspicious"
        else:
            result["classification"] = "safe"
            
        # Generate recommendations
        result["recommendations"] = self._generate_recommendations(result)
        
        # Store in database for analytics
        await self._store_analysis_result(result, context)
        
        return result
        
    async def _check_domain_reputation(self, url: str) -> List[Dict[str, Any]]:
        """Check domain reputation against threat database"""
        threats = []
        
        # Extract domain from URL
        from urllib.parse import urlparse
        domain = urlparse(url).netloc
        
        # Query threat database
        query = """
        SELECT type, risk_score, confidence, description, tags
        FROM threats 
        WHERE indicators->>'domains' ? $1 
        AND status = 'active'
        AND (ttl = 0 OR first_seen + INTERVAL '1 second' * ttl > NOW())
        ORDER BY risk_score DESC
        """
        
        rows = await self.db.execute_query(query, domain)
        
        for row in rows:
            threats.append({
                "type": row["type"],
                "confidence": float(row["confidence"]),
                "description": row["description"],
                "tags": row["tags"]
            })
            
        return threats
        
    async def _check_malicious_patterns(self, url: str) -> List[Dict[str, Any]]:
        """Check URL against malicious patterns"""
        threats = []
        
        # Common phishing patterns
        phishing_patterns = [
            r'(secure|verify|update).*account',
            r'(bank|payment).*urgent',
            r'click.*here.*immediately',
            r'suspended.*account',
            r'verify.*identity'
        ]
        
        import re
        for pattern in phishing_patterns:
            if re.search(pattern, url.lower()):
                threats.append({
                    "type": "phishing",
                    "confidence": 0.7,
                    "description": f"URL matches phishing pattern: {pattern}",
                    "tags": ["pattern_match", "phishing"]
                })
                
        return threats
        
    def _calculate_risk_score(self, threats: List[Dict[str, Any]]) -> int:
        """Calculate overall risk score based on threats"""
        if not threats:
            return 0
            
        # Weight threats by confidence and type
        score = 0
        for threat in threats:
            type_weight = {
                "malware": 40,
                "phishing": 35,
                "scam": 30,
                "suspicious": 20
            }.get(threat["type"], 10)
            
            confidence = threat.get("confidence", 0.5)
            score += int(type_weight * confidence)
            
        return min(score, 100)  # Cap at 100
        
    def _generate_recommendations(self, result: Dict[str, Any]) -> List[str]:
        """Generate security recommendations based on analysis"""
        recommendations = []
        
        if result["risk_score"] >= 80:
            recommendations.extend([
                "Block access to this URL immediately",
                "Report to security team",
                "Scan device for malware"
            ])
        elif result["risk_score"] >= 50:
            recommendations.extend([
                "Proceed with caution",
                "Verify URL authenticity",
                "Do not enter personal information"
            ])
        else:
            recommendations.append("URL appears safe")
            
        return recommendations
        
    async def _store_analysis_result(self, result: Dict[str, Any], context: Dict[str, Any]):
        """Store analysis result for analytics"""
        query = """
        INSERT INTO url_analyses (url, risk_score, classification, threats, context, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        """
        
        await self.db.execute_query(
            query,
            result["url"],
            result["risk_score"],
            result["classification"],
            json.dumps(result["threats"]),
            json.dumps(context)
        )

# App startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await db_manager.connect()
    await cache_manager.connect()
    await FastAPILimiter.init(cache_manager.redis)
    
    yield
    
    # Shutdown
    await db_manager.disconnect()
    await cache_manager.disconnect()

# FastAPI app
app = FastAPI(
    title="PocketShield Threat Intelligence API",
    description="Real-time threat intelligence and security analysis",
    version="1.0.0",
    lifespan=lifespan
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.pocketshield.security"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["api.pocketshield.security", "*.pocketshield.security"]
)

# Initialize service
threat_service = ThreatIntelligenceService(db_manager, cache_manager)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

# Authentication endpoints
@app.post("/auth/register")
async def register_device(device_info: Dict[str, Any]):
    """Register a new device"""
    device_id = str(uuid.uuid4())
    
    # Store device info
    query = """
    INSERT INTO devices (device_id, platform, os_version, app_version, configuration, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    """
    
    await db_manager.execute_query(
        query,
        device_id,
        device_info.get("platform"),
        device_info.get("os_version"),
        device_info.get("app_version"),
        json.dumps(device_info)
    )
    
    # Generate JWT token
    token_payload = {
        "device_id": device_id,
        "exp": datetime.utcnow() + timedelta(days=30)
    }
    
    token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return {
        "device_id": device_id,
        "access_token": token,
        "token_type": "bearer",
        "expires_in": 2592000  # 30 days
    }

# Threat Intelligence endpoints
@app.post("/threat/analyze/url", 
          response_model=ThreatAnalysisResponse,
          dependencies=[Depends(RateLimiter(times=100, seconds=60))])
async def analyze_urls(
    request: ThreatAnalysisRequest,
    device_id: str = Depends(verify_token)
):
    """Analyze URLs for threats"""
    try:
        # Convert URLs to strings
        urls = [str(url) for url in request.urls]
        
        # Perform analysis
        result = await threat_service.analyze_urls(urls, request.context)
        
        logger.info(f"Analyzed {len(urls)} URLs for device {device_id}")
        
        return result
        
    except Exception as e:
        logger.error(f"URL analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Analysis failed")

@app.post("/threat/analyze/app")
async def analyze_apps(
    request: AppAnalysisRequest,
    device_id: str = Depends(verify_token)
):
    """Analyze mobile applications for security risks"""
    results = []
    
    for app in request.apps:
        # Mock app analysis - replace with actual implementation
        risk_score = 25  # Default low risk
        classification = "low_risk"
        
        # Check against known malicious apps
        if app["package_name"] in ["com.malicious.app", "com.suspicious.app"]:
            risk_score = 85
            classification = "high_risk"
            
        result = {
            "package_name": app["package_name"],
            "risk_score": risk_score,
            "classification": classification,
            "analysis": {
                "permissions_risk": 15,
                "reputation_risk": 10,
                "behavior_risk": 0
            },
            "vulnerabilities": [],
            "updates_available": True,
            "recommendations": ["Update to latest version"]
        }
        
        results.append(result)
    
    return {"results": results}

@app.get("/threat/feed")
async def get_threat_feed(
    types: Optional[str] = None,
    since: Optional[datetime] = None,
    limit: int = 100,
    device_id: str = Depends(verify_token)
):
    """Get real-time threat intelligence feed"""
    
    # Build query based on parameters
    conditions = ["status = 'active'"]
    params = []
    
    if types:
        threat_types = types.split(',')
        conditions.append(f"type = ANY($1)")
        params.append(threat_types)
        
    if since:
        conditions.append(f"first_seen >= ${len(params) + 1}")
        params.append(since)
    
    # Add pagination
    conditions.append(f"ORDER BY first_seen DESC LIMIT ${len(params) + 1}")
    params.append(limit)
    
    query = f"""
    SELECT id, type, indicators, risk_score, first_seen, tags, description
    FROM threats 
    WHERE {' AND '.join(conditions[:-1])}
    {conditions[-1]}
    """
    
    rows = await db_manager.execute_query(query, *params)
    
    threats = []
    for row in rows:
        threats.append({
            "id": str(row["id"]),
            "type": row["type"],
            "indicators": row["indicators"],
            "risk_score": row["risk_score"],
            "first_seen": row["first_seen"].isoformat(),
            "tags": row["tags"],
            "description": row["description"],
            "ttl": 3600
        })
    
    return {
        "threats": threats,
        "pagination": {
            "has_more": len(threats) == limit,
            "next_cursor": threats[-1]["id"] if threats else None
        }
    }

@app.post("/device/assess", response_model=SecurityAssessmentResponse)
async def assess_device_security(
    request: DeviceAssessmentRequest,
    device_id: str = Depends(verify_token)
):
    """Assess device security posture"""
    device_info = request.device_info
    
    # Mock assessment - replace with actual implementation
    findings = []
    overall_score = 75
    
    # OS Security Check
    if device_info.get("rooted", False):
        findings.append({
            "category": "os_security",
            "score": 30,
            "issues": ["Device is rooted/jailbroken"],
            "severity": "high"
        })
        overall_score -= 30
    
    # Security Patch Check
    security_patch = device_info.get("security_patch")
    if security_patch:
        from datetime import datetime
        patch_date = datetime.fromisoformat(security_patch)
        days_old = (datetime.now() - patch_date).days
        
        if days_old > 90:
            findings.append({
                "category": "os_security",
                "score": 60,
                "issues": [f"Security patch is {days_old} days old"],
                "severity": "medium"
            })
            overall_score -= 15
    
    # Determine risk level
    if overall_score >= 80:
        risk_level = "low"
    elif overall_score >= 60:
        risk_level = "medium"
    else:
        risk_level = "high"
    
    # Store assessment
    query = """
    INSERT INTO security_assessments (device_id, overall_score, risk_level, findings, created_at)
    VALUES ((SELECT id FROM devices WHERE device_id = $1), $2, $3, $4, NOW())
    """
    
    await db_manager.execute_query(
        query,
        device_id,
        overall_score,
        risk_level,
        json.dumps(findings)
    )
    
    return {
        "overall_score": overall_score,
        "risk_level": risk_level,
        "findings": findings,
        "recommendations": [
            "Keep OS and apps updated",
            "Enable automatic security updates",
            "Avoid installing apps from unknown sources"
        ]
    }

@app.post("/incident/report")
async def report_incident(
    request: ThreatReportRequest,
    background_tasks: BackgroundTasks,
    device_id: str = Depends(verify_token)
):
    """Report a security incident"""
    
    incident_id = str(uuid.uuid4())
    
    # Store incident report
    query = """
    INSERT INTO incident_reports (id, device_id, type, details, evidence, created_at)
    VALUES ($1, (SELECT id FROM devices WHERE device_id = $2), $3, $4, $5, NOW())
    """
    
    await db_manager.execute_query(
        query,
        incident_id,
        device_id,
        request.type,
        json.dumps(request.details),
        json.dumps(request.evidence)
    )
    
    # Process incident in background
    background_tasks.add_task(process_incident_report, incident_id, request)
    
    return {
        "incident_id": incident_id,
        "status": "received",
        "message": "Thank you for the report. We will investigate this incident."
    }

@app.post("/behavior/analyze")
async def analyze_behavior(
    request: BehaviorAnalysisRequest,
    device_id: str = Depends(verify_token)
):
    """Analyze user behavior for anomalies"""
    
    # Mock behavioral analysis
    anomalies = []
    risk_score = 10  # Default low risk
    
    # Check for suspicious patterns
    for event in request.events:
        if event["type"] == "app_install":
            package = event["details"].get("package", "")
            if "suspicious" in package.lower():
                anomalies.append({
                    "type": "suspicious_app_install",
                    "description": f"Suspicious app installed: {package}",
                    "risk_score": 40
                })
                risk_score += 40
                
        elif event["type"] == "network_access":
            destination = event["details"].get("destination", "")
            if any(domain in destination for domain in ["suspicious-domain.com", "malware-site.org"]):
                anomalies.append({
                    "type": "malicious_network_access",
                    "description": f"Access to suspicious domain: {destination}",
                    "risk_score": 60
                })
                risk_score += 60
    
    return {
        "risk_score": min(risk_score, 100),
        "anomalies": anomalies,
        "recommendations": [
            "Review recent app installations",
            "Check network connections",
            "Run security scan"
        ] if anomalies else ["Behavior appears normal"]
    }

# Background task for processing incident reports
async def process_incident_report(incident_id: str, report: ThreatReportRequest):
    """Process incident report in background"""
    logger.info(f"Processing incident report {incident_id}")
    
    # Here you would implement:
    # 1. Analyze the reported threat
    # 2. Update threat database if new threat
    # 3. Notify other users if widespread threat
    # 4. Generate response actions
    
    await asyncio.sleep(5)  # Simulate processing time
    logger.info(f"Incident report {incident_id} processed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

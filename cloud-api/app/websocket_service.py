"""
PocketShield Real-time WebSocket Service
Handles real-time threat intelligence updates and device communication
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Set, Optional, Any
import jwt
from fastapi import WebSocket, WebSocketDisconnect, HTTPException
from fastapi.security import HTTPBearer
import redis.asyncio as redis
import uuid
from dataclasses import dataclass, asdict
from enum import Enum

logger = logging.getLogger(__name__)

class AlertSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AlertType(Enum):
    NEW_THREAT = "new_threat"
    SECURITY_UPDATE = "security_update"
    APP_VULNERABILITY = "app_vulnerability"
    DEVICE_COMPROMISE = "device_compromise"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    SYSTEM_MAINTENANCE = "system_maintenance"

@dataclass
class WebSocketMessage:
    """Standardized WebSocket message format"""
    message_id: str
    message_type: str
    timestamp: str
    data: Dict[str, Any]
    device_id: Optional[str] = None
    
    def to_json(self) -> str:
        return json.dumps(asdict(self))

@dataclass
class ThreatAlert:
    """Real-time threat alert structure"""
    alert_id: str
    alert_type: AlertType
    severity: AlertSeverity
    title: str
    description: str
    indicators: Dict[str, List[str]]  # URLs, domains, IPs, etc.
    affected_regions: List[str]
    threat_tags: List[str]
    action_required: bool
    expires_at: Optional[str] = None
    created_at: str = ""
    
    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.utcnow().isoformat()

@dataclass
class ConnectionInfo:
    """WebSocket connection information"""
    device_id: str
    websocket: WebSocket
    connected_at: datetime
    last_ping: datetime
    subscriptions: Set[str]  # Threat types subscribed to
    risk_threshold: int  # Minimum risk score for alerts
    geographic_regions: List[str]  # Regions of interest

class WebSocketManager:
    """Manages WebSocket connections and real-time communications"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.active_connections: Dict[str, ConnectionInfo] = {}
        self.device_to_connection: Dict[str, str] = {}  # device_id -> connection_id
        self.jwt_secret = "your-jwt-secret"  # Use environment variable
        self.jwt_algorithm = "HS256"
        
        # Background tasks
        self._cleanup_task = None
        self._heartbeat_task = None
        
    async def start_background_tasks(self):
        """Start background maintenance tasks"""
        self._cleanup_task = asyncio.create_task(self._cleanup_stale_connections())
        self._heartbeat_task = asyncio.create_task(self._heartbeat_monitor())
        
    async def stop_background_tasks(self):
        """Stop background maintenance tasks"""
        if self._cleanup_task:
            self._cleanup_task.cancel()
        if self._heartbeat_task:
            self._heartbeat_task.cancel()
    
    async def authenticate_connection(self, websocket: WebSocket, token: str) -> str:
        """Authenticate WebSocket connection and return device_id"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            device_id = payload.get("device_id")
            
            if not device_id:
                await websocket.close(code=4001, reason="Invalid token: missing device_id")
                return None
                
            # Verify device exists in database (implement as needed)
            # device_exists = await self._verify_device_exists(device_id)
            # if not device_exists:
            #     await websocket.close(code=4002, reason="Device not found")
            #     return None
                
            return device_id
            
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {e}")
            await websocket.close(code=4001, reason="Invalid token")
            return None
    
    async def connect(self, websocket: WebSocket, device_id: str, subscriptions: Set[str] = None) -> str:
        """Establish new WebSocket connection"""
        connection_id = str(uuid.uuid4())
        
        # Accept WebSocket connection
        await websocket.accept()
        
        # Disconnect existing connection for this device (if any)
        if device_id in self.device_to_connection:
            await self.disconnect_device(device_id)
        
        # Create connection info
        connection_info = ConnectionInfo(
            device_id=device_id,
            websocket=websocket,
            connected_at=datetime.utcnow(),
            last_ping=datetime.utcnow(),
            subscriptions=subscriptions or {"phishing", "malware", "scam"},
            risk_threshold=50,  # Default threshold
            geographic_regions=["IN"]  # Default to India
        )
        
        # Store connection
        self.active_connections[connection_id] = connection_info
        self.device_to_connection[device_id] = connection_id
        
        # Send welcome message
        welcome_msg = WebSocketMessage(
            message_id=str(uuid.uuid4()),
            message_type="connection_established",
            timestamp=datetime.utcnow().isoformat(),
            device_id=device_id,
            data={
                "connection_id": connection_id,
                "subscriptions": list(subscriptions or []),
                "server_time": datetime.utcnow().isoformat()
            }
        )
        
        await self._send_message(websocket, welcome_msg)
        
        # Store connection info in Redis for clustering
        await self.redis.setex(
            f"ws_connection:{connection_id}",
            3600,  # 1 hour TTL
            json.dumps({
                "device_id": device_id,
                "connected_at": connection_info.connected_at.isoformat(),
                "subscriptions": list(connection_info.subscriptions)
            })
        )
        
        logger.info(f"WebSocket connected: device_id={device_id}, connection_id={connection_id}")
        return connection_id
    
    async def disconnect(self, connection_id: str):
        """Disconnect specific connection"""
        if connection_id not in self.active_connections:
            return
            
        connection = self.active_connections[connection_id]
        device_id = connection.device_id
        
        # Close WebSocket
        try:
            await connection.websocket.close()
        except Exception as e:
            logger.warning(f"Error closing WebSocket: {e}")
        
        # Remove from active connections
        del self.active_connections[connection_id]
        
        # Remove device mapping
        if device_id in self.device_to_connection:
            del self.device_to_connection[device_id]
        
        # Remove from Redis
        await self.redis.delete(f"ws_connection:{connection_id}")
        
        logger.info(f"WebSocket disconnected: device_id={device_id}, connection_id={connection_id}")
    
    async def disconnect_device(self, device_id: str):
        """Disconnect all connections for a specific device"""
        if device_id in self.device_to_connection:
            connection_id = self.device_to_connection[device_id]
            await self.disconnect(connection_id)
    
    async def send_threat_alert(self, alert: ThreatAlert, target_devices: List[str] = None):
        """Send threat alert to connected devices"""
        message = WebSocketMessage(
            message_id=str(uuid.uuid4()),
            message_type="threat_alert",
            timestamp=datetime.utcnow().isoformat(),
            data={
                "alert": asdict(alert),
                "priority": "high" if alert.severity in [AlertSeverity.HIGH, AlertSeverity.CRITICAL] else "normal"
            }
        )
        
        # Determine target connections
        target_connections = []
        
        if target_devices:
            # Send to specific devices
            for device_id in target_devices:
                if device_id in self.device_to_connection:
                    connection_id = self.device_to_connection[device_id]
                    if connection_id in self.active_connections:
                        target_connections.append(self.active_connections[connection_id])
        else:
            # Send to all matching connections
            for connection in self.active_connections.values():
                if self._should_receive_alert(connection, alert):
                    target_connections.append(connection)
        
        # Send alerts
        sent_count = 0
        for connection in target_connections:
            try:
                message.device_id = connection.device_id
                await self._send_message(connection.websocket, message)
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send alert to device {connection.device_id}: {e}")
                # Remove failed connection
                asyncio.create_task(self.disconnect(
                    next(cid for cid, conn in self.active_connections.items() if conn == connection)
                ))
        
        logger.info(f"Sent threat alert {alert.alert_id} to {sent_count} devices")
        return sent_count
    
    async def send_security_update(self, update_data: Dict[str, Any], target_devices: List[str] = None):
        """Send security update notification"""
        message = WebSocketMessage(
            message_id=str(uuid.uuid4()),
            message_type="security_update",
            timestamp=datetime.utcnow().isoformat(),
            data=update_data
        )
        
        sent_count = 0
        target_connections = []
        
        if target_devices:
            for device_id in target_devices:
                if device_id in self.device_to_connection:
                    connection_id = self.device_to_connection[device_id]
                    if connection_id in self.active_connections:
                        target_connections.append(self.active_connections[connection_id])
        else:
            target_connections = list(self.active_connections.values())
        
        for connection in target_connections:
            try:
                message.device_id = connection.device_id
                await self._send_message(connection.websocket, message)
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send update to device {connection.device_id}: {e}")
        
        return sent_count
    
    async def handle_client_message(self, connection_id: str, message_data: dict):
        """Handle incoming message from client"""
        if connection_id not in self.active_connections:
            return
            
        connection = self.active_connections[connection_id]
        message_type = message_data.get("type")
        
        # Update last ping time
        connection.last_ping = datetime.utcnow()
        
        if message_type == "ping":
            # Respond with pong
            pong_msg = WebSocketMessage(
                message_id=str(uuid.uuid4()),
                message_type="pong",
                timestamp=datetime.utcnow().isoformat(),
                device_id=connection.device_id,
                data={"server_time": datetime.utcnow().isoformat()}
            )
            await self._send_message(connection.websocket, pong_msg)
            
        elif message_type == "subscribe":
            # Update subscriptions
            new_subscriptions = set(message_data.get("threat_types", []))
            connection.subscriptions.update(new_subscriptions)
            
            # Update risk threshold if provided
            if "risk_threshold" in message_data:
                connection.risk_threshold = message_data["risk_threshold"]
            
            # Acknowledge subscription
            ack_msg = WebSocketMessage(
                message_id=str(uuid.uuid4()),
                message_type="subscription_updated",
                timestamp=datetime.utcnow().isoformat(),
                device_id=connection.device_id,
                data={
                    "subscriptions": list(connection.subscriptions),
                    "risk_threshold": connection.risk_threshold
                }
            )
            await self._send_message(connection.websocket, ack_msg)
            
        elif message_type == "unsubscribe":
            # Remove subscriptions
            remove_subscriptions = set(message_data.get("threat_types", []))
            connection.subscriptions -= remove_subscriptions
            
        elif message_type == "report_threat":
            # Handle threat report from client
            await self._handle_threat_report(connection, message_data.get("data", {}))
            
        else:
            logger.warning(f"Unknown message type from {connection.device_id}: {message_type}")
    
    async def broadcast_system_message(self, message: str, message_type: str = "system_announcement"):
        """Broadcast system message to all connected devices"""
        broadcast_msg = WebSocketMessage(
            message_id=str(uuid.uuid4()),
            message_type=message_type,
            timestamp=datetime.utcnow().isoformat(),
            data={
                "message": message,
                "broadcast": True
            }
        )
        
        sent_count = 0
        failed_connections = []
        
        for connection_id, connection in self.active_connections.items():
            try:
                broadcast_msg.device_id = connection.device_id
                await self._send_message(connection.websocket, broadcast_msg)
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to broadcast to {connection.device_id}: {e}")
                failed_connections.append(connection_id)
        
        # Clean up failed connections
        for connection_id in failed_connections:
            asyncio.create_task(self.disconnect(connection_id))
        
        logger.info(f"Broadcast message sent to {sent_count} devices")
        return sent_count
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        now = datetime.utcnow()
        active_count = len(self.active_connections)
        
        # Count by subscription type
        subscription_counts = {}
        stale_connections = 0
        
        for connection in self.active_connections.values():
            # Count subscriptions
            for subscription in connection.subscriptions:
                subscription_counts[subscription] = subscription_counts.get(subscription, 0) + 1
            
            # Check for stale connections (no ping in 5 minutes)
            if (now - connection.last_ping).total_seconds() > 300:
                stale_connections += 1
        
        return {
            "total_connections": active_count,
            "subscription_counts": subscription_counts,
            "stale_connections": stale_connections,
            "uptime_seconds": (now - datetime.utcnow()).total_seconds()
        }
    
    async def _send_message(self, websocket: WebSocket, message: WebSocketMessage):
        """Send message to WebSocket connection"""
        try:
            await websocket.send_text(message.to_json())
        except Exception as e:
            logger.error(f"Failed to send WebSocket message: {e}")
            raise
    
    def _should_receive_alert(self, connection: ConnectionInfo, alert: ThreatAlert) -> bool:
        """Determine if connection should receive this alert"""
        # Check threat type subscription
        if alert.alert_type.value not in connection.subscriptions:
            return False
        
        # Check risk threshold
        # For alerts, we don't have a direct risk score, so we use severity
        severity_scores = {
            AlertSeverity.LOW: 25,
            AlertSeverity.MEDIUM: 50,
            AlertSeverity.HIGH: 75,
            AlertSeverity.CRITICAL: 95
        }
        
        if severity_scores.get(alert.severity, 0) < connection.risk_threshold:
            return False
        
        # Check geographic relevance
        if alert.affected_regions and connection.geographic_regions:
            if not set(alert.affected_regions) & set(connection.geographic_regions):
                return False
        
        return True
    
    async def _handle_threat_report(self, connection: ConnectionInfo, report_data: Dict[str, Any]):
        """Handle threat report from client"""
        try:
            # Store report in Redis for processing
            report_id = str(uuid.uuid4())
            report = {
                "report_id": report_id,
                "device_id": connection.device_id,
                "report_data": report_data,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            await self.redis.lpush("threat_reports", json.dumps(report))
            
            # Acknowledge receipt
            ack_msg = WebSocketMessage(
                message_id=str(uuid.uuid4()),
                message_type="report_acknowledged",
                timestamp=datetime.utcnow().isoformat(),
                device_id=connection.device_id,
                data={"report_id": report_id}
            )
            
            await self._send_message(connection.websocket, ack_msg)
            logger.info(f"Threat report received from {connection.device_id}: {report_id}")
            
        except Exception as e:
            logger.error(f"Failed to handle threat report: {e}")
    
    async def _cleanup_stale_connections(self):
        """Background task to clean up stale connections"""
        while True:
            try:
                await asyncio.sleep(60)  # Run every minute
                
                now = datetime.utcnow()
                stale_connections = []
                
                for connection_id, connection in self.active_connections.items():
                    # Consider connection stale if no ping in 5 minutes
                    if (now - connection.last_ping).total_seconds() > 300:
                        stale_connections.append(connection_id)
                
                # Disconnect stale connections
                for connection_id in stale_connections:
                    logger.info(f"Cleaning up stale connection: {connection_id}")
                    await self.disconnect(connection_id)
                    
            except Exception as e:
                logger.error(f"Error in cleanup task: {e}")
    
    async def _heartbeat_monitor(self):
        """Background task to send heartbeat pings"""
        while True:
            try:
                await asyncio.sleep(30)  # Send heartbeat every 30 seconds
                
                ping_msg = WebSocketMessage(
                    message_id=str(uuid.uuid4()),
                    message_type="server_ping",
                    timestamp=datetime.utcnow().isoformat(),
                    data={"server_time": datetime.utcnow().isoformat()}
                )
                
                failed_connections = []
                
                for connection_id, connection in self.active_connections.items():
                    try:
                        ping_msg.device_id = connection.device_id
                        await self._send_message(connection.websocket, ping_msg)
                    except Exception as e:
                        logger.warning(f"Heartbeat failed for {connection.device_id}: {e}")
                        failed_connections.append(connection_id)
                
                # Clean up failed connections
                for connection_id in failed_connections:
                    asyncio.create_task(self.disconnect(connection_id))
                    
            except Exception as e:
                logger.error(f"Error in heartbeat monitor: {e}")

# Global WebSocket manager instance
ws_manager: Optional[WebSocketManager] = None

def get_websocket_manager() -> WebSocketManager:
    """Get global WebSocket manager instance"""
    global ws_manager
    if ws_manager is None:
        # Initialize with Redis connection
        redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)
        ws_manager = WebSocketManager(redis_client)
    return ws_manager

# Helper functions for creating common alerts

async def create_phishing_alert(
    indicators: Dict[str, List[str]],
    description: str,
    affected_regions: List[str] = None
) -> ThreatAlert:
    """Create a phishing threat alert"""
    return ThreatAlert(
        alert_id=str(uuid.uuid4()),
        alert_type=AlertType.NEW_THREAT,
        severity=AlertSeverity.HIGH,
        title="New Phishing Threat Detected",
        description=description,
        indicators=indicators,
        affected_regions=affected_regions or ["IN"],
        threat_tags=["phishing", "social_engineering"],
        action_required=True
    )

async def create_app_vulnerability_alert(
    app_packages: List[str],
    vulnerability_description: str,
    severity: AlertSeverity = AlertSeverity.MEDIUM
) -> ThreatAlert:
    """Create an app vulnerability alert"""
    return ThreatAlert(
        alert_id=str(uuid.uuid4()),
        alert_type=AlertType.APP_VULNERABILITY,
        severity=severity,
        title="App Vulnerability Detected",
        description=vulnerability_description,
        indicators={"app_packages": app_packages},
        affected_regions=["global"],
        threat_tags=["vulnerability", "app_security"],
        action_required=True
    )

async def create_system_maintenance_alert(
    message: str,
    scheduled_time: datetime
) -> ThreatAlert:
    """Create a system maintenance alert"""
    return ThreatAlert(
        alert_id=str(uuid.uuid4()),
        alert_type=AlertType.SYSTEM_MAINTENANCE,
        severity=AlertSeverity.LOW,
        title="Scheduled System Maintenance",
        description=message,
        indicators={},
        affected_regions=["global"],
        threat_tags=["maintenance", "system"],
        action_required=False,
        expires_at=scheduled_time.isoformat()
    )

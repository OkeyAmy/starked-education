# Swarm Learning API Documentation

## Overview

The Swarm Learning API provides endpoints for managing decentralized AI agent swarms that collaborate and learn together without central coordination, enabling emergent intelligence and decentralized knowledge discovery.

## Base URL
```
/api/swarm-learning
```

## Authentication

All endpoints require JWT authentication except the health check endpoint. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### System Management

#### Initialize Swarm Learning System
```http
POST /api/swarm-learning/initialize
Authorization: Bearer <token>
Content-Type: application/json

{
  "config": {
    "coordinator": {
      "minAgents": 3,
      "maxAgents": 100,
      "convergenceThreshold": 0.1
    },
    "communication": {
      "encryptionEnabled": true,
      "authenticationEnabled": true
    },
    "network": {
      "topologyType": "small_world",
      "initialConnections": 3
    },
    "analytics": {
      "metricsRetentionPeriod": 86400000,
      "aggregationInterval": 60000
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Swarm learning system initialized successfully",
  "data": {
    "systemId": "swarm-12345",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Shutdown Swarm Learning System
```http
POST /api/swarm-learning/shutdown
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Swarm learning system shutdown successfully"
}
```

#### Health Check
```http
GET /api/swarm-learning/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "swarm-learning"
}
```

### Swarm Management

#### Create New Swarm
```http
POST /api/swarm-learning/swarms
Authorization: Bearer <token>
Content-Type: application/json

{
  "taskDefinition": {
    "type": "classification",
    "description": "Image classification task",
    "complexity": "medium",
    "dataset": "image_dataset_v1",
    "objectives": ["accuracy", "efficiency", "collaboration"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Swarm created successfully",
  "data": {
    "swarmId": "swarm-abc123",
    "taskId": "task-456",
    "status": "initialized",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Start Swarm Learning
```http
POST /api/swarm-learning/swarms/{taskId}/start
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Swarm learning started",
  "data": {
    "taskId": "task-456",
    "status": "learning",
    "startedAt": "2024-01-01T00:00:00.000Z",
    "estimatedDuration": 3600000
  }
}
```

#### Get Swarm Status
```http
GET /api/swarm-learning/swarms/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalSwarms": 5,
      "activeSwarms": 3,
      "totalAgents": 25,
      "averagePerformance": 0.85
    },
    "swarms": [
      {
        "swarmId": "swarm-abc123",
        "taskId": "task-456",
        "status": "learning",
        "agentCount": 8,
        "convergence": 0.72,
        "performance": 0.89
      }
    ]
  }
}
```

### Agent Management

#### Register New Agent
```http
POST /api/swarm-learning/agents
Authorization: Bearer <token>
Content-Type: application/json

{
  "capabilities": {
    "computation": 0.8,
    "communication": 0.7,
    "specialization": "general",
    "resources": {
      "cpu": 4,
      "memory": "8GB",
      "storage": "100GB"
    }
  },
  "position": {
    "x": 10.5,
    "y": 20.3,
    "z": 0
  },
  "preferences": {
    "taskTypes": ["classification", "optimization"],
    "collaborationStyle": "active"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Agent registered successfully",
  "data": {
    "agentId": "agent-def789",
    "status": "active",
    "capabilities": {
      "computation": 0.8,
      "communication": 0.7,
      "specialization": "general"
    },
    "registeredAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Get Agent Details
```http
GET /api/swarm-learning/agents/{agentId}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "agentId": "agent-def789",
    "status": "active",
    "capabilities": {
      "computation": 0.8,
      "communication": 0.7,
      "specialization": "general"
    },
    "performance": {
      "contributions": 15,
      "accuracy": 0.92,
      "reliability": 0.95,
      "reputation": 4.2
    },
    "connections": ["agent-ghi012", "agent-jkl345"],
    "lastActive": "2024-01-01T00:00:00.000Z",
    "knowledgeAreas": ["classification", "pattern_recognition"]
  }
}
```

### Task Management

#### Get Task Details
```http
GET /api/swarm-learning/tasks/{taskId}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "taskId": "task-456",
    "type": "classification",
    "description": "Image classification task",
    "status": "learning",
    "progress": 0.65,
    "agents": ["agent-def789", "agent-ghi012"],
    "performance": {
      "accuracy": 0.87,
      "convergence": 0.72,
      "efficiency": 0.91
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "estimatedCompletion": "2024-01-01T01:00:00.000Z"
  }
}
```

### Emergent Behavior Analysis

#### Get Emergent Behaviors
```http
GET /api/swarm-learning/behaviors
Authorization: Bearer <token>
```

**Query Parameters:**
- `type` (optional): Filter by behavior type
- `confidence` (optional): Minimum confidence threshold
- `limit` (optional): Maximum number of behaviors to return

**Response:**
```json
{
  "success": true,
  "data": {
    "behaviors": [
      {
        "id": "behavior-123",
        "type": "collaborative_learning",
        "description": "Agents spontaneously forming learning groups",
        "confidence": 0.85,
        "frequency": 12,
        "impact": "positive",
        "participants": ["agent-def789", "agent-ghi012"],
        "firstObserved": "2024-01-01T00:30:00.000Z",
        "lastObserved": "2024-01-01T00:45:00.000Z"
      }
    ],
    "summary": {
      "totalBehaviors": 8,
      "positiveBehaviors": 6,
      "negativeBehaviors": 2,
      "averageConfidence": 0.78
    }
  }
}
```

### Analytics and Monitoring

#### Get Analytics Data
```http
GET /api/swarm-learning/analytics
Authorization: Bearer <token>
```

**Query Parameters:**
- `timeRange` (optional): Time range for data (1h, 24h, 7d, 30d)
- `metrics` (optional): Specific metrics to include
- `aggregation` (optional): Aggregation level (raw, hourly, daily)

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalAgents": 25,
      "activeSwarms": 3,
      "collectiveIntelligence": 0.87,
      "averageConvergence": 0.72,
      "networkEfficiency": 0.91
    },
    "trends": {
      "performance": [
        {"timestamp": "2024-01-01T00:00:00.000Z", "value": 0.82},
        {"timestamp": "2024-01-01T01:00:00.000Z", "value": 0.85}
      ],
      "convergence": [
        {"timestamp": "2024-01-01T00:00:00.000Z", "value": 0.68},
        {"timestamp": "2024-01-01T01:00:00.000Z", "value": 0.72}
      ]
    },
    "topPerformers": [
      {
        "agentId": "agent-def789",
        "score": 0.94,
        "contributions": 15,
        "specialization": "classification"
      }
    ]
  }
}
```

#### Generate Analytics Report
```http
GET /api/swarm-learning/analytics/report
Authorization: Bearer <token>
```

**Query Parameters:**
- `format` (optional): Report format (json, pdf, csv)
- `timeRange` (optional): Time range for report
- `sections` (optional): Report sections to include

**Response:**
```json
{
  "success": true,
  "data": {
    "reportId": "report-789",
    "format": "json",
    "generatedAt": "2024-01-01T00:00:00.000Z",
    "timeRange": "24h",
    "sections": ["overview", "performance", "behaviors", "network"],
    "downloadUrl": "/api/swarm-learning/analytics/export/report-789"
  }
}
```

#### Export Analytics Data
```http
GET /api/swarm-learning/analytics/export
Authorization: Bearer <token>
```

**Query Parameters:**
- `format` (required): Export format (json, csv)
- `timeRange` (optional): Time range for data
- `metrics` (optional): Specific metrics to export

**Response:**
```json
{
  "success": true,
  "data": {
    "exportId": "export-456",
    "format": "csv",
    "size": "2.5MB",
    "records": 1500,
    "downloadUrl": "/api/swarm-learning/analytics/download/export-456",
    "expiresAt": "2024-01-02T00:00:00.000Z"
  }
}
```

### Alert Management

#### Get System Alerts
```http
GET /api/swarm-learning/alerts
Authorization: Bearer <token>
```

**Query Parameters:**
- `severity` (optional): Filter by severity level
- `status` (optional): Filter by status (active, acknowledged, resolved)
- `limit` (optional): Maximum number of alerts

**Response:**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "alert-123",
        "type": "performance",
        "severity": "warning",
        "message": "Swarm convergence rate below threshold",
        "details": {
          "currentValue": 0.45,
          "threshold": 0.5,
          "swarmId": "swarm-abc123"
        },
        "status": "active",
        "createdAt": "2024-01-01T00:30:00.000Z",
        "acknowledgedAt": null
      }
    ],
    "summary": {
      "totalAlerts": 5,
      "activeAlerts": 3,
      "criticalAlerts": 1
    }
  }
}
```

#### Acknowledge Alert
```http
POST /api/swarm-learning/alerts/{alertId}/acknowledge
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Alert acknowledged successfully",
  "data": {
    "alertId": "alert-123",
    "status": "acknowledged",
    "acknowledgedAt": "2024-01-01T00:45:00.000Z"
  }
}
```

### Configuration Management

#### Update Configuration
```http
PUT /api/swarm-learning/configuration
Authorization: Bearer <token>
Content-Type: application/json

{
  "coordinator": {
    "minAgents": 5,
    "maxAgents": 200,
    "convergenceThreshold": 0.05
  },
  "network": {
    "reorganizationInterval": 60000,
    "topologyType": "scale_free"
  },
  "analytics": {
    "aggregationInterval": 30000,
    "alertThresholds": {
      "lowPerformance": 0.6
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Configuration updated successfully",
  "data": {
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "changes": [
      {
        "parameter": "coordinator.minAgents",
        "oldValue": 3,
        "newValue": 5
      }
    ]
  }
}
```

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error description",
  "details": "Additional error details (in development mode)"
}
```

### Common Error Codes

- `400` - Bad Request: Invalid input parameters
- `401` - Unauthorized: Missing or invalid authentication token
- `403` - Forbidden: Insufficient permissions
- `404` - Not Found: Resource not found
- `429` - Too Many Requests: Rate limit exceeded
- `500` - Internal Server Error: Server-side error

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **System Management Endpoints**: 10 requests per 15 minutes
- **Agent Operations**: 30 requests per minute
- **Analytics Endpoints**: 60 requests per minute
- **Other Endpoints**: 100 requests per minute

## WebSocket Events

Real-time events are available through WebSocket connections:

### Connection
```
ws://localhost:3001/api/swarm-learning/events
```

### Event Types
- `swarm_initialized`: New swarm created
- `agent_registered`: New agent joined
- `learning_started`: Learning process initiated
- `swarm_converged`: Swarm reached convergence
- `emergent_behavior`: New emergent behavior detected
- `performance_alert`: Performance threshold breach
- `network_reorganized`: Network topology changed

### Event Format
```json
{
  "type": "swarm_initialized",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "swarmId": "swarm-abc123",
    "taskId": "task-456"
  }
}
```

## SDK Examples

### JavaScript/Node.js
```javascript
const SwarmLearningAPI = require('./swarm-learning-sdk');

const client = new SwarmLearningAPI({
  baseURL: 'http://localhost:3001/api/swarm-learning',
  token: 'your-jwt-token'
});

// Initialize swarm system
await client.initialize({
  coordinator: { minAgents: 3, maxAgents: 100 }
});

// Create swarm
const swarm = await client.createSwarm({
  taskDefinition: {
    type: 'classification',
    description: 'Test task'
  }
});

// Register agent
const agent = await client.registerAgent({
  capabilities: { computation: 0.8, communication: 0.7 }
});

// Start learning
await client.startSwarmLearning(swarm.swarmId);

// Get analytics
const analytics = await client.getAnalytics({ timeRange: '24h' });
```

### Python
```python
from swarm_learning_sdk import SwarmLearningClient

client = SwarmLearningClient(
    base_url='http://localhost:3001/api/swarm-learning',
    token='your-jwt-token'
)

# Initialize swarm system
client.initialize({
    'coordinator': {'minAgents': 3, 'maxAgents': 100}
})

# Create swarm
swarm = client.create_swarm({
    'task_definition': {
        'type': 'classification',
        'description': 'Test task'
    }
})

# Register agent
agent = client.register_agent({
    'capabilities': {'computation': 0.8, 'communication': 0.7}
})

# Start learning
client.start_swarm_learning(swarm['swarm_id'])

# Get analytics
analytics = client.get_analytics(time_range='24h')
```

## Performance Considerations

- **Concurrent Requests**: The system supports up to 1000 concurrent requests
- **Response Times**: Average response time is <100ms for most endpoints
- **Data Retention**: Analytics data is retained for 24 hours by default
- **Scalability**: System scales linearly with swarm size up to 1000 agents

## Security Notes

- All communications use HTTPS in production
- JWT tokens expire after 24 hours
- Sensitive operations require admin privileges
- Rate limiting prevents abuse
- All inputs are validated and sanitized

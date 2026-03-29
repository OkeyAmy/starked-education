# Federated Learning API Documentation

## Overview

The Federated Learning API provides privacy-preserving machine learning capabilities that enable multiple institutions to collaboratively train models without sharing raw data. This implementation includes secure aggregation, differential privacy, model validation, and comprehensive analytics.

## Base URL

```
http://localhost:3001/api/federated-learning
```

## Authentication

All endpoints require authentication using the standard authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Core Concepts

### Privacy Guarantees
- **Differential Privacy**: Mathematical guarantees that individual data points cannot be identified
- **Secure Aggregation**: Homomorphic encryption ensures model updates remain private
- **Zero-Knowledge Proofs**: Verify computations without revealing underlying data

### Model Training Flow
1. Initialize a federated learning session
2. Register participating institutions
3. Start training rounds
4. Participants submit encrypted model updates
5. Server aggregates updates securely
6. Process repeats with improved global model

## Endpoints

### Session Management

#### Initialize Session
```http
POST /sessions
```

Initialize a new federated learning session with model architecture.

**Request Body:**
```json
{
  "modelArchitecture": {
    "layers": [
      {
        "name": "dense1",
        "size": 128,
        "activation": "relu"
      },
      {
        "name": "dense2", 
        "size": 64,
        "activation": "sigmoid"
      }
    ]
  },
  "initialWeights": {
    "dense1": [0.1, 0.2, ...],
    "dense2": [0.3, 0.4, ...]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid-string",
    "model": {
      "id": "uuid-string",
      "architecture": {...},
      "weights": {...},
      "version": 0,
      "timestamp": "2024-01-01T00:00:00.000Z"
    },
    "publicParameters": {
      "publicKey": {
        "n": "big-number",
        "g": "big-number"
      },
      "keySize": 2048
    }
  }
}
```

#### Get Session Status
```http
GET /sessions/{sessionId}/status
```

Retrieve current session statistics and analytics.

**Response:**
```json
{
  "success": true,
  "data": {
    "session": {
      "participants": 5,
      "currentRound": 3,
      "activeRound": "aggregating",
      "modelVersion": 3,
      "privacyBudgetUsed": 1.5
    },
    "analytics": {
      "realTime": {...},
      "summary": {...},
      "participants": {...}
    },
    "modelHistory": [...]
  }
}
```

### Participant Management

#### Register Participant
```http
POST /participants
```

Register a new institution to participate in federated learning.

**Request Body:**
```json
{
  "institutionId": "university-123",
  "endpoint": "https://university.example.com/fl-endpoint",
  "publicKey": "rsa-public-key-string",
  "dataInfo": {
    "features": 1000,
    "samples": 10000,
    "dataType": "student_performance",
    "sensitiveAttributes": ["gender", "ethnicity", "age"]
  },
  "reputation": 0.95
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "participantId": "uuid-string",
    "publicParameters": {
      "publicKey": {...},
      "keySize": 2048
    }
  }
}
```

#### Get Participants
```http
GET /participants
```

List all registered participants.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-string",
      "institutionId": "university-123",
      "status": "active",
      "reputation": 0.95,
      "registeredAt": "2024-01-01T00:00:00.000Z",
      "lastActive": "2024-01-01T12:00:00.000Z",
      "contributionCount": 15
    }
  ]
}
```

### Round Management

#### Start Round
```http
POST /rounds
```

Initiate a new federated learning round.

**Request Body:**
```json
{
  "aggregationMethod": "fedavg",
  "epsilon": 0.1,
  "delta": 1e-5,
  "clipNorm": 1.0,
  "timeoutMinutes": 30
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "round": {
      "id": "uuid-string",
      "roundNumber": 1,
      "status": "active",
      "startTime": "2024-01-01T00:00:00.000Z",
      "participants": [],
      "privacyParams": {
        "epsilon": 0.1,
        "delta": 1e-5,
        "clipNorm": 1.0
      }
    },
    "globalModel": {...}
  }
}
```

#### Submit Model Update
```http
POST /participants/{participantId}/updates
```

Submit encrypted model update from a participant.

**Request Body:**
```json
{
  "weights": {
    "dense1": {
      "ciphertext": "encrypted-weight-1",
      "randomness": "randomness-1"
    },
    "dense2": {
      "ciphertext": "encrypted-weight-2", 
      "randomness": "randomness-2"
    }
  },
  "dataSize": 1000,
  "accuracy": 0.85,
  "loss": 0.3,
  "privacyParams": {
    "epsilon": 0.1,
    "mechanism": "gaussian"
  },
  "validationData": {
    "features": [[...], [...]],
    "labels": [0, 1, 0, 1],
    "sensitiveAttributes": ["male", "female", "male", "female"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "received",
    "roundId": "uuid-string",
    "validation": {
      "participantId": "uuid-string",
      "passed": true,
      "warnings": [],
      "errors": [],
      "metrics": {
        "accuracy": 0.85,
        "fairness": 0.92,
        "quality": {...}
      }
    }
  }
}
```

#### Get Round History
```http
GET /rounds/history?limit=50&offset=0
```

Retrieve historical round data.

**Response:**
```json
{
  "success": true,
  "data": {
    "rounds": [
      {
        "round": 1,
        "participants": 5,
        "timestamp": "2024-01-01T00:00:00.000Z",
        "accuracy": 0.82,
        "privacySpent": 0.1
      }
    ],
    "total": 10,
    "offset": 0,
    "limit": 50
  }
}
```

### Model Management

#### Get Model Versions
```http
GET /models/versions?limit=50&offset=0&sortBy=timestamp&sortOrder=desc
```

List all model versions with pagination and sorting.

**Response:**
```json
{
  "success": true,
  "data": {
    "versions": [
      {
        "id": "uuid-string",
        "versionNumber": 3,
        "timestamp": "2024-01-01T00:00:00.000Z",
        "metadata": {
          "accuracy": 0.85,
          "description": "After round 3 aggregation",
          "author": "system",
          "tags": ["federated-learning", "round-3"]
        },
        "status": "active"
      }
    ],
    "total": 10,
    "offset": 0,
    "limit": 50
  }
}
```

#### Rollback Model
```http
POST /models/rollback/{versionId}
```

Rollback to a previous model version.

**Request Body:**
```json
{
  "reason": "Performance degradation detected",
  "performedBy": "admin-user"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "fromVersion": "version-3-id",
    "toVersion": "version-2-id",
    "reason": "Performance degradation detected",
    "performedBy": "admin-user",
    "metadata": {
      "previousAccuracy": 0.85,
      "newAccuracy": 0.82,
      "accuracyDelta": -0.03
    }
  }
}
```

#### Compare Models
```http
GET /models/compare?versionId1=v1&versionId2=v2
```

Compare two model versions.

**Response:**
```json
{
  "success": true,
  "data": {
    "version1": {...},
    "version2": {...},
    "differences": {
      "accuracyDelta": 0.05,
      "lossDelta": -0.1,
      "sizeDelta": 1024,
      "roundsDelta": 2,
      "participantDelta": 1
    },
    "relationship": "parent"
  }
}
```

### Analytics

#### Get Analytics Dashboard
```http
GET /analytics
```

Retrieve comprehensive analytics data.

**Response:**
```json
{
  "success": true,
  "data": {
    "realTime": {
      "activeParticipants": 5,
      "currentRound": {...},
      "globalAccuracy": 0.85,
      "privacyBudgetUsed": 1.5,
      "averageFairness": 0.92,
      "systemHealth": "healthy"
    },
    "summary": {
      "totalParticipants": 10,
      "totalRounds": 15,
      "averageAccuracy": 0.83,
      "systemUptime": 86400
    },
    "trends": {
      "accuracyOverTime": [...],
      "participationOverTime": [...],
      "privacyBudgetOverTime": [...]
    }
  }
}
```

#### Export Analytics
```http
GET /analytics/export?format=csv
```

Export analytics data in specified format.

**Query Parameters:**
- `format`: `json` or `csv` (default: `json`)

**Response:** File download with analytics data.

### Privacy Management

#### Get Privacy Status
```http
GET /privacy/status
```

Retrieve current privacy budget and compliance status.

**Response:**
```json
{
  "success": true,
  "data": {
    "budget": {
      "totalBudget": 2.0,
      "spentBudget": 1.5,
      "remainingBudget": 0.5,
      "budgetUtilization": 75,
      "queryCount": 15
    },
    "report": {
      "summary": {...},
      "mechanismUsage": {
        "laplace": 8,
        "gaussian": 7
      },
      "complianceStatus": "compliant"
    }
  }
}
```

#### Reset Privacy Budget
```http
POST /privacy/reset-budget
```

Reset the privacy budget (admin only).

**Request Body:**
```json
{
  "newBudget": 2.0
}
```

### Validation

#### Validate Model Update
```http
POST /validation/validate
```

Validate a model update before submission.

**Request Body:**
```json
{
  "modelUpdate": {
    "weights": {...},
    "dataSize": 1000
  },
  "participantInfo": {
    "id": "uuid-string",
    "institutionId": "university-123",
    "reputation": 0.95
  },
  "validationData": {
    "features": [[...], [...]],
    "labels": [0, 1, 0, 1],
    "sensitiveAttributes": ["male", "female", "male", "female"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "participantId": "uuid-string",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "passed": true,
    "warnings": ["Low dataset size"],
    "errors": [],
    "metrics": {
      "accuracy": 0.85,
      "fairness": 0.92,
      "quality": {...},
      "performance": {...}
    }
  }
}
```

#### Get Validation Statistics
```http
GET /validation/stats
```

Retrieve validation statistics and trends.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalValidations": 100,
    "passedValidations": 95,
    "failedValidations": 5,
    "passRate": 0.95,
    "averageAccuracy": 0.83,
    "averageFairness": 0.91,
    "recentValidations": [...]
  }
}
```

### System Health

#### Get System Health
```http
GET /health
```

Check the health of all federated learning components.

**Response:**
```json
{
  "success": true,
  "data": {
    "coordinator": {
      "active": true,
      "participants": 5,
      "currentRound": 3,
      "activeRound": true
    },
    "secureAggregation": {
      "active": true,
      "keySize": 2048
    },
    "differentialPrivacy": {
      "active": true,
      "budgetStatus": {...}
    },
    "modelValidator": {
      "active": true,
      "validationCount": 100
    },
    "analyticsDashboard": {
      "active": true,
      "realTimeMetrics": {...}
    },
    "modelVersioning": {
      "active": true,
      "versionCount": 10,
      "activeVersion": true
    },
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information (in development mode)"
}
```

Common HTTP status codes:
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing/invalid token)
- `404` - Not Found (resource doesn't exist)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Rate Limiting

Sensitive operations have rate limiting applied:
- Session initialization: 10 requests per 15 minutes
- Model rollback: 10 requests per 15 minutes
- Model updates: 30 requests per minute

## Privacy Considerations

### Data Protection
- Raw data never leaves institutional boundaries
- Only encrypted model updates are transmitted
- Differential privacy provides mathematical privacy guarantees

### Compliance
- GDPR compliant through privacy-by-design
- HIPAA compliant for healthcare applications
- Educational data protection (FERPA) compliant

### Security Measures
- End-to-end encryption for all communications
- Zero-knowledge proofs for verification
- Secure multi-party computation for aggregation

## Integration Examples

### JavaScript Client Example

```javascript
// Initialize session
const sessionResponse = await fetch('/api/federated-learning/sessions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    modelArchitecture: {
      layers: [
        { name: 'dense1', size: 128 },
        { name: 'dense2', size: 64 }
      ]
    }
  })
});

const { data } = await sessionResponse.json();
const { sessionId, publicParameters } = data;

// Register participant
const participantResponse = await fetch('/api/federated-learning/participants', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    institutionId: 'university-123',
    endpoint: 'https://university.example.com/fl',
    publicKey: 'public-key',
    dataInfo: {
      features: 1000,
      samples: 10000
    }
  })
});

// Submit model update
const updateResponse = await fetch(`/api/federated-learning/participants/${participantId}/updates`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    weights: encryptedWeights,
    dataSize: 1000,
    accuracy: 0.85,
    privacyParams: {
      epsilon: 0.1,
      mechanism: 'gaussian'
    }
  })
});
```

## Monitoring and Debugging

### Logging
All operations are logged with appropriate levels:
- `INFO`: Normal operations
- `WARN`: Potential issues
- `ERROR`: Failed operations

### Metrics
Key metrics to monitor:
- Model accuracy trends
- Privacy budget utilization
- Participant engagement
- System health indicators

### Alerts
Automatic alerts for:
- Privacy budget exhaustion (>90%)
- Accuracy degradation (>10% drop)
- Low participation (<3 participants)
- System component failures

## Best Practices

1. **Privacy Budget Management**: Monitor epsilon usage carefully
2. **Model Validation**: Always validate updates before aggregation
3. **Fairness Monitoring**: Regularly check for bias in model performance
4. **Version Control**: Use model versioning for rollback capabilities
5. **Security**: Keep encryption keys secure and rotate regularly
6. **Monitoring**: Set up alerts for system health and privacy compliance

## Support

For technical support and questions:
- Check system health endpoint first
- Review logs for error details
- Monitor privacy budget status
- Contact system administrator for persistent issues

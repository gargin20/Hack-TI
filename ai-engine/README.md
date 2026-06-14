# 🧠 LifeTwin AI Analytics Engine

> Intelligent prediction and behavioral analytics microservice for the LifeTwin platform.

Built with **Flask**, **scikit-learn**, **pandas**, and **numpy** — designed as a standalone AI microservice that communicates with the Node.js backend via REST API.

---

## 📐 Architecture

```
Client (React)  →  Node.js Backend :5001  →  Flask AI Engine :5050
                        ↕                          ↕
                     MongoDB                   ML Models
```

The Flask AI server runs independently on **port 5050**. The Node.js backend (port 5001) acts as a gateway — the client never calls Flask directly.

---

## 📁 Project Structure

```
ai-engine/
├── app/
│   ├── __init__.py            # Flask app factory
│   ├── config.py              # Environment-based configuration
│   ├── routes/
│   │   ├── health.py          # GET /api/health
│   │   └── predictions.py     # Prediction & analysis endpoints
│   ├── models/
│   │   ├── burnout_model.py   # Burnout risk prediction (RandomForest)
│   │   └── productivity_model.py  # Productivity scoring (GradientBoosting)
│   ├── analytics/
│   │   └── correlation.py     # Behavioral correlation analysis
│   ├── predictions/
│   │   └── engine.py          # Prediction orchestrator (singleton)
│   └── utils/
│       ├── validators.py      # Input validation
│       └── transformers.py    # Data preprocessing
├── tests/
│   └── test_predictions.py    # Endpoint integration tests
├── .env.example               # Environment variable template
├── requirements.txt           # Python dependencies
├── run.py                     # Server entry point
└── README.md                  # You are here
```

---

## 🚀 Quick Start

### 1. Create Virtual Environment

```bash
cd ai-engine
python -m venv venv
```

### 2. Activate Virtual Environment

**Windows (PowerShell):**
```powershell
.\venv\Scripts\Activate.ps1
```

**Windows (CMD):**
```cmd
.\venv\Scripts\activate.bat
```

**macOS / Linux:**
```bash
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment

```bash
cp .env.example .env
# Edit .env if needed (defaults work for development)
```

### 5. Run the Server

```bash
python run.py
```

The server starts on `http://localhost:5050`. Models are auto-trained on first startup.

### 6. Run Tests

```bash
python -m pytest tests/ -v
```

---

## 📡 API Reference

### Health Check

```http
GET /api/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "uptime_seconds": 42.5,
    "environment": "development",
    "models_loaded": {
      "burnout_model": true,
      "productivity_model": true
    }
  }
}
```

---

### Burnout Prediction

```http
POST /api/predict/burnout
Content-Type: application/json
```

**Request Body:**
```json
{
  "hours_worked": 12,
  "sleep_hours": 5,
  "stress_level": 8,
  "breaks_taken": 1,
  "screen_time": 10,
  "social_interactions": 2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "risk_level": "high",
    "risk_score": 0.73,
    "confidence": 0.73,
    "contributing_factors": [
      {"factor": "stress_level", "importance": 0.28, "value": 8},
      {"factor": "hours_worked", "importance": 0.22, "value": 12}
    ],
    "recommendations": [
      "Consider reducing daily work hours — currently above healthy threshold",
      "Prioritize getting 7-8 hours of sleep nightly"
    ]
  },
  "message": "Burnout prediction completed successfully"
}
```

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `hours_worked` | number | 0-24 | Daily hours worked |
| `sleep_hours` | number | 0-24 | Hours of sleep |
| `stress_level` | number | 1-10 | Self-reported stress (1=low, 10=high) |
| `breaks_taken` | number | 0-20 | Number of breaks taken |
| `screen_time` | number | 0-24 | Hours of screen time |
| `social_interactions` | number | 0-50 | Number of social interactions |

---

### Productivity Scoring

```http
POST /api/predict/productivity
Content-Type: application/json
```

**Request Body:**
```json
{
  "tasks_completed": 8,
  "focus_time_hours": 5.5,
  "meetings_count": 2,
  "deep_work_ratio": 0.7,
  "interruptions": 3
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "productivity_score": 78.5,
    "category": "high",
    "breakdown": {
      "tasks_completed": 32.0,
      "focus_time_hours": 44.0,
      "meetings_count": -6.0,
      "deep_work_ratio": 17.5,
      "interruptions": -6.0
    },
    "recommendations": [
      "Maintain your current focus time — you're doing well",
      "Try to reduce interruptions for deeper flow states"
    ]
  },
  "message": "Productivity prediction completed successfully"
}
```

---

### Behavioral Correlation Analysis

```http
POST /api/analyze/correlation
Content-Type: application/json
```

**Request Body:**
```json
{
  "data": [
    {"sleep_hours": 7, "stress_level": 3, "productivity": 85},
    {"sleep_hours": 5, "stress_level": 8, "productivity": 45},
    {"sleep_hours": 8, "stress_level": 2, "productivity": 90},
    {"sleep_hours": 6, "stress_level": 6, "productivity": 60},
    {"sleep_hours": 7.5, "stress_level": 4, "productivity": 75}
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "correlation_matrix": {
      "sleep_hours": {"sleep_hours": 1.0, "stress_level": -0.95, "productivity": 0.97},
      "stress_level": {"sleep_hours": -0.95, "stress_level": 1.0, "productivity": -0.98},
      "productivity": {"sleep_hours": 0.97, "stress_level": -0.98, "productivity": 1.0}
    },
    "strong_correlations": [
      {"variables": ["sleep_hours", "productivity"], "coefficient": 0.97, "strength": "very strong"}
    ],
    "insights": [
      "There is a very strong positive correlation (r=0.97) between sleep_hours and productivity"
    ]
  },
  "message": "Correlation analysis completed successfully"
}
```

---

## 🔗 Node.js ↔ Flask Integration

Your Node.js backend communicates with the Flask AI Engine via internal HTTP requests. Here's how to set it up:

### Step 1: Install axios (if not already installed)

```bash
cd server
npm install axios
```

### Step 2: Create an AI Service Module

Create `server/utils/aiService.js`:

```javascript
import axios from 'axios';

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:5050';

class AIService {
  /**
   * Check if the AI Engine is running
   */
  static async healthCheck() {
    try {
      const response = await axios.get(`${AI_ENGINE_URL}/api/health`);
      return response.data;
    } catch (error) {
      console.error('AI Engine health check failed:', error.message);
      return { success: false, error: 'AI Engine unreachable' };
    }
  }

  /**
   * Predict burnout risk for a user
   * @param {Object} behavioralData - User's behavioral metrics
   */
  static async predictBurnout(behavioralData) {
    try {
      const response = await axios.post(
        `${AI_ENGINE_URL}/api/predict/burnout`,
        behavioralData
      );
      return response.data;
    } catch (error) {
      console.error('Burnout prediction failed:', error.message);
      throw new Error('AI prediction service unavailable');
    }
  }

  /**
   * Score user productivity
   * @param {Object} activityData - User's activity metrics
   */
  static async scoreProductivity(activityData) {
    try {
      const response = await axios.post(
        `${AI_ENGINE_URL}/api/predict/productivity`,
        activityData
      );
      return response.data;
    } catch (error) {
      console.error('Productivity scoring failed:', error.message);
      throw new Error('AI prediction service unavailable');
    }
  }

  /**
   * Analyze behavioral correlations
   * @param {Array} dataPoints - Array of observation objects
   */
  static async analyzeCorrelations(dataPoints) {
    try {
      const response = await axios.post(
        `${AI_ENGINE_URL}/api/analyze/correlation`,
        { data: dataPoints }
      );
      return response.data;
    } catch (error) {
      console.error('Correlation analysis failed:', error.message);
      throw new Error('AI analysis service unavailable');
    }
  }
}

export default AIService;
```

### Step 3: Use in Your Node.js Controllers

```javascript
import AIService from '../utils/aiService.js';

// Example: In a user analytics controller
export const getUserBurnoutRisk = async (req, res) => {
  try {
    // Fetch user's behavioral data from MongoDB
    const userData = await UserMetrics.findOne({ userId: req.user.id });

    // Send to AI Engine for prediction
    const prediction = await AIService.predictBurnout({
      hours_worked: userData.hoursWorked,
      sleep_hours: userData.sleepHours,
      stress_level: userData.stressLevel,
      breaks_taken: userData.breaksTaken,
      screen_time: userData.screenTime,
      social_interactions: userData.socialInteractions,
    });

    return res.status(200).json({
      success: true,
      data: prediction.data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
```

### Step 4: Add AI_ENGINE_URL to your .env

```env
# In server/.env
AI_ENGINE_URL=http://localhost:5050
```

---

## 🏗️ Production Deployment

For production, use **gunicorn** instead of the Flask dev server:

```bash
gunicorn -w 4 -b 0.0.0.0:5050 "app:create_app()"
```

| Flag | Description |
|------|-------------|
| `-w 4` | 4 worker processes |
| `-b 0.0.0.0:5050` | Bind to all interfaces on port 5050 |

---

## 🧪 Running Tests

```bash
# Run all tests with verbose output
python -m pytest tests/ -v

# Run a specific test
python -m pytest tests/test_predictions.py::test_burnout_prediction -v

# Run with coverage (install pytest-cov first)
pip install pytest-cov
python -m pytest tests/ --cov=app --cov-report=term-missing
```

---

## 📝 Adding New Models

1. Create a new model class in `app/models/` following the pattern in `burnout_model.py`
2. Register it in `app/predictions/engine.py`
3. Add a new route in `app/routes/predictions.py`
4. Add input validation in `app/utils/validators.py`
5. Write tests in `tests/`

---

## 📄 License

MIT — Part of the LifeTwin project.

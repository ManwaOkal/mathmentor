# MathMentor API Usage Guide

## Base URL
```
http://localhost:8000  # Development
https://your-domain.com  # Production
```

## Authentication

Currently, user authentication is simplified. Include user ID in the `Authorization` header:
```
Authorization: Bearer {user_id}
```

In production, this should be a JWT token from Supabase Auth.

## Endpoints

### 1. Ask Question

Answer a student's question using RAG.

**POST** `/api/ask-question`

**Request Body:**
```json
{
  "question": "How do I solve quadratic equations?",
  "concept_id": "optional-uuid"
}
```

**Response:**
```json
{
  "answer": "Quadratic equations can be solved using...",
  "context_used": true,
  "skill_level": "intermediate"
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/api/ask-question \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer user-123" \
  -d '{"question": "Explain the Pythagorean theorem"}'
```

---

### 2. Explain Concept

Get a detailed explanation of a math concept.

**POST** `/api/explain-concept`

**Request Body:**
```json
{
  "concept_name": "Quadratic Equations",
  "concept_id": "optional-uuid"
}
```

**Response:**
```json
{
  "explanation": "Quadratic equations are...",
  "concept_name": "Quadratic Equations",
  "skill_level": "intermediate"
}
```

---

### 3. Solve Problem

Get step-by-step solution for a math problem.

**POST** `/api/solve-problem`

**Request Body:**
```json
{
  "problem": "Solve for x: x² - 5x + 6 = 0",
  "concept_id": "optional-uuid"
}
```

**Response:**
```json
{
  "solution": "Step 1: Factor the equation...",
  "problem": "Solve for x: x² - 5x + 6 = 0",
  "skill_level": "intermediate"
}
```

---

### 4. Get Hint

Get a hint for a problem at different levels.

**POST** `/api/get-hint`

**Request Body:**
```json
{
  "problem": "Solve for x: x² - 5x + 6 = 0",
  "attempt": "I tried factoring but got stuck",
  "hint_level": 1,
  "concept_id": "optional-uuid"
}
```

**hint_level**: 1 (gentle nudge), 2 (more specific), 3 (detailed guidance)

**Response:**
```json
{
  "hint": "Try looking for two numbers that multiply to 6...",
  "hint_level": 1,
  "problem": "Solve for x: x² - 5x + 6 = 0"
}
```

---

### 5. Generate Practice Problems

Generate practice problems for a concept.

**POST** `/api/generate-practice`

**Request Body:**
```json
{
  "concept_name": "Quadratic Equations",
  "difficulty": "intermediate",
  "num_problems": 3,
  "concept_id": "optional-uuid"
}
```

**Response:**
```json
{
  "problems": "Problem 1: Solve x² + 3x - 4 = 0\nSolution: ...",
  "concept_name": "Quadratic Equations",
  "difficulty": "intermediate",
  "num_problems": 3
}
```

---

### 6. Get Progress

Get student's learning progress.

**GET** `/api/progress`

**Headers:**
```
Authorization: Bearer {user_id}
```

**Response:**
```json
{
  "total_concepts_studied": 5,
  "mastered": 2,
  "in_progress": 2,
  "not_started": 0,
  "concepts": [...]
}
```

---

### 7. Get Recommendations

Get recommended concepts to study next.

**GET** `/api/recommendations?limit=5`

**Headers:**
```
Authorization: Bearer {user_id}
```

**Response:**
```json
{
  "recommendations": [
    {
      "concept_id": "...",
      "name": "Trigonometric Functions",
      "difficulty": "intermediate",
      ...
    }
  ]
}
```

---

### 8. Get Concept Details

Get details about a specific concept.

**GET** `/api/concept/{concept_id}`

**Response:**
```json
{
  "concept_id": "...",
  "name": "Quadratic Equations",
  "description": "...",
  "difficulty": "intermediate",
  "topic_category": "algebra",
  ...
}
```

---

### 9. List Concepts

List all math concepts, optionally filtered by topic.

**GET** `/api/concepts?topic=algebra`

**Response:**
```json
{
  "concepts": [
    {
      "concept_id": "...",
      "name": "Quadratic Equations",
      ...
    }
  ]
}
```

---

## Error Responses

All endpoints may return errors in this format:

```json
{
  "detail": "Error message here"
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

---

## Python Example

```python
import requests

BASE_URL = "http://localhost:8000"
USER_ID = "your-user-id"

# Ask a question
response = requests.post(
    f"{BASE_URL}/api/ask-question",
    json={"question": "How do I solve quadratic equations?"},
    headers={"Authorization": f"Bearer {USER_ID}"}
)
print(response.json()["answer"])

# Get progress
response = requests.get(
    f"{BASE_URL}/api/progress",
    headers={"Authorization": f"Bearer {USER_ID}"}
)
print(response.json())
```

---

## JavaScript Example

```javascript
const BASE_URL = 'http://localhost:8000';
const USER_ID = 'your-user-id';

// Ask a question
const response = await fetch(`${BASE_URL}/api/ask-question`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${USER_ID}`
  },
  body: JSON.stringify({
    question: 'How do I solve quadratic equations?'
  })
});

const data = await response.json();
console.log(data.answer);
```

---

## Interactive API Documentation

When the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

These provide interactive documentation where you can test endpoints directly.
















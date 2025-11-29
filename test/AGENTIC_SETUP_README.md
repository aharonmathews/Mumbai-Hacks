# Playfinity Agentic Test Environment - Setup Guide

## 🎯 Overview

This document describes the agentic testing environment created for Playfinity, which includes comprehensive analytics tracking and the foundation for Thompson Sampling-based adaptive learning.

## ✅ What Has Been Implemented

### 1. Backend Infrastructure

#### Configuration Files

- **`test/back_end/config/settings.py`**: Core configuration including OpenRouter API, Firebase paths, CORS, and analytics settings
- **`test/back_end/config/firebase_config.py`**: Firebase initialization using the same credentials as main project
- **`test/back_end/utils/helpers.py`**: Helper functions for JSON extraction and data processing

#### Services

- **`test/back_end/services/analytics_service.py`**: Comprehensive analytics tracking service that:
  - Saves game session data to Firebase
  - Calculates aggregate statistics (total sessions, accuracy, time spent, etc.)
  - Computes performance scores for Thompson Sampling
  - Tracks all Tier 1-4 parameters

#### Models

- **`test/back_end/models/schemas.py`**: Pydantic models for:
  - GameAnalytics (complete session data)
  - Game generation requests
  - Image analysis requests

#### API Endpoints (in `main.py`)

- `POST /save-analytics`: Save game session analytics
- `GET /user-stats/{user_email}`: Get aggregate user statistics
- `GET /recent-sessions/{user_email}`: Get recent game sessions
- `GET /performance-scores/{user_email}`: Get performance scores for adaptive learning

### 2. Frontend Infrastructure

#### Hooks

- **`test/front_end/src/hooks/useGameAnalytics.ts`**: React hook that tracks all game analytics parameters:

**Tier 1 Parameters (Already Tracked)**

- ✅ Correct answers
- ✅ Total questions
- ✅ Accuracy rate
- ✅ Time spent
- ✅ Game completion status

**Tier 2 Parameters (Derivable)**

- ✅ Consecutive errors
- ✅ Max consecutive errors
- ✅ Average time per question
- ✅ Questions skipped
- ✅ Rage quit detection

**Tier 4 Parameters (User Behavior)**

- ✅ Help/hint usage count
- ✅ Tab switches (visibility change tracking)
- ✅ Total idle time
- ✅ Max idle time (>30 seconds threshold)

#### Context

- **`test/front_end/src/contexts/UserContext.tsx`**: Simplified user context for test environment
  - Default test user (test@playfinity.com)
  - Stores user in localStorage
  - No Firebase dependency for testing

## 🐛 BalloonMathQuiz Bug Fix

### The Problem

The second question's answer was always marked wrong due to **stale closure** in the collision handler. The `currentQuestion` variable was captured in the closure when the handler was set up, so it never updated when moving to the next question.

### The Solution

Use a **ref** to store the current question instead of relying on closure:

```typescript
// Add this ref near other refs
const currentQuestionRef = useRef(QUESTIONS[currentQuestionIndex]);

// Update ref whenever question changes
useEffect(() => {
  currentQuestionRef.current = QUESTIONS[currentQuestionIndex];
  console.log(`📍 Question ${currentQuestionIndex + 1}/${QUESTIONS.length}`);
  console.log(`   Answer: ${currentQuestionRef.current.answer}`);
}, [currentQuestionIndex, QUESTIONS]);

// In collision handler, use the ref:
const setupCollisionHandler = (engine: Matter.Engine) => {
  Matter.Events.on(engine, "collisionStart", (event) => {
    event.pairs.forEach((pair) => {
      // ... balloon detection code ...
      if (balloonBody) {
        const balloonValue = parseInt(balloonBody.label.split("-")[1], 10);
        // 🔑 Use ref instead of closure variable
        const correctAnswer = parseInt(
          currentQuestionRef.current.answer.toString(),
          10
        );
        const isCorrect = balloonValue === correctAnswer;
        // ... rest of code ...
      }
    });
  });
};
```

## 📊 How to Integrate Analytics into Games

### Step 1: Import the hook

```typescript
import { useGameAnalytics } from "../../hooks/useGameAnalytics";
import { useUser } from "../../contexts/UserContext";
```

### Step 2: Initialize in component

```typescript
function MyGame() {
  const { user } = useUser();
  const analytics = useGameAnalytics(
    "game_type_name", // e.g., "balloon_math", "general_knowledge", "spelling"
    "topic_name", // e.g., "Mathematics"
    user?.email,
    user?.disability
  );

  // ... rest of component
}
```

### Step 3: Track answers

```typescript
// When user answers a question
analytics.trackAnswer(isCorrect, wasSkipped, usedHint);
```

### Step 4: Track hint usage

```typescript
// When user clicks a hint button
analytics.trackHintUsage();
```

### Step 5: Mark completion

```typescript
// When game is successfully completed
analytics.markCompleted();
```

### Step 6: Save analytics

```typescript
// When game ends (automatically saved on unmount if rage quit)
analytics.saveAnalytics();

// Or force save with rage quit flag
analytics.saveAnalytics(true); // for rage quit
```

### Step 7: Display stats (optional)

```typescript
<div className="stats-display">
  <p>Accuracy: {analytics.stats.accuracyRate.toFixed(0)}%</p>
  <p>
    Correct: {analytics.stats.correctAnswers}/{analytics.stats.totalQuestions}
  </p>
  <p>Consecutive Errors: {analytics.stats.consecutiveErrors}</p>
</div>
```

## 🔧 Implementation Steps for Each Game

### BalloonMathQuiz

1. Add the currentQuestionRef fix (see above)
2. Import useGameAnalytics and useUser hooks
3. Initialize analytics at component start
4. Track each answer in `handleHit` function
5. Mark completed when all questions are answered
6. Save analytics on game end

### GeneralKnowledgeGame

1. Import hooks
2. Initialize analytics
3. Track answers when option is selected
4. Track hint usage if hints are available
5. Mark completed when quiz finishes
6. Save analytics

### SpellingGame

1. Import hooks
2. Initialize analytics
3. Track each letter attempt as an answer
4. Track hint usage for letter reveals
5. Mark completed when all letters mastered
6. Save analytics

## 🚀 Thompson Sampling Foundation

The analytics service includes `calculate_game_performance_scores()` which computes a composite performance score for each game type based on:

- **Accuracy** (40% weight)
- **Completion Rate** (30% weight)
- **Engagement** (30% weight - inverse of rage quits)

This can be used for adaptive game selection:

```typescript
// Future implementation
const selectNextGame = async () => {
  const response = await fetch(
    `http://localhost:8000/performance-scores/${userEmail}`
  );
  const { scores } = await response.json();

  // Thompson Sampling algorithm would use these scores
  // to balance exploration vs exploitation
  // Higher scores = better performance = higher probability of selection
};
```

## 📝 Firebase Data Structure

```
users/
  {userEmail}/
    game_analytics/
      {sessionId}/
        - user_email
        - game_type
        - topic
        - correct_answers
        - total_questions
        - accuracy_rate
        - time_spent_seconds
        - game_completed
        - consecutive_errors
        - max_consecutive_errors
        - questions_skipped
        - rage_quit
        - help_hint_count
        - tab_switches
        - total_idle_time_seconds
        - max_idle_time_seconds
        - session_start
        - session_end
        - disability_type
        - question_details[]

    aggregate_stats/
      {gameType}/
        - total_sessions
        - total_questions
        - total_correct
        - total_time_seconds
        - total_completions
        - total_rage_quits
        - total_help_usage
        - average_accuracy
        - average_time_per_session
        - last_played
```

## 🧪 Testing the Environment

### 1. Start Backend

```powershell
cd test\back_end
python -m uvicorn main:app --reload --port 8000
```

### 2. Start Frontend

```powershell
cd test\front_end
npm install  # if not already installed
npm run dev
```

### 3. Test Analytics

1. Play a complete game
2. Check browser console for analytics logs
3. Check Firebase console for saved data
4. Test API endpoints:
   ```
   GET http://localhost:8000/user-stats/test@playfinity.com
   GET http://localhost:8000/performance-scores/test@playfinity.com
   ```

## 🎯 Next Steps

To fully implement agentic features:

1. **Fix BalloonMathQuiz** using the ref solution above
2. **Integrate analytics into all 3 games**
3. **Test end-to-end** to ensure data flows to Firebase
4. **Implement Thompson Sampling algorithm** for adaptive game selection
5. **Add difficulty adaptation** based on performance scores
6. **Create dashboard** to visualize analytics data

## 🔑 Key Files to Modify

### For Bug Fix

- `test/front_end/src/components/games/BalloonMathQuiz.tsx` (add ref solution)

### For Analytics Integration

- `test/front_end/src/components/games/BalloonMathQuiz.tsx`
- `test/front_end/src/components/games/GeneralKnowledgeGame.tsx`
- `test/front_end/src/components/games/SpellingGame.tsx`

### Environment File

Create `.env` in `test/back_end/`:

```
OPENROUTER_API_KEY=your_key_here
FIREBASE_CREDENTIALS_PATH=../../my_project.json
```

## 📚 Dependencies Required

All dependencies should already be in the package.json/requirements files from the main project. No additional installations needed.

## ✨ Features Ready for Thompson Sampling

Once analytics are integrated and data is collected, you can implement:

1. **Multi-Armed Bandit** - Select games based on performance
2. **Difficulty Adaptation** - Adjust question difficulty based on accuracy
3. **Personalized Learning Paths** - Route students through optimal game sequences
4. **Early Intervention** - Detect frustration (consecutive errors, rage quits) and adapt
5. **Engagement Optimization** - Reduce idle time and tab switches through better game design

---

**Status**: ✅ Backend complete, ✅ Frontend infrastructure complete, ⏳ Game integration pending

**Next Action**: Integrate analytics hooks into the three games and fix BalloonMathQuiz bug.

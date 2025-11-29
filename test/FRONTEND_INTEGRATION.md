# 🤖 Frontend Integration Guide - Agentic Features

## Quick Start: Using the Agentic System

### 1. Get Personalized Game Sequence

```typescript
// In Homepage or GameSelectionPage
import { useEffect, useState } from "react";
import { useUser } from "../contexts/UserContext";

export default function Homepage() {
  const { user } = useUser();
  const [gameSequence, setGameSequence] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOptimalSequence() {
      try {
        const response = await fetch(
          `http://localhost:8001/optimal-game-sequence/${user.email}?disability_type=${user.disability}`
        );
        const data = await response.json();

        if (data.success) {
          setGameSequence(data.game_sequence);
          console.log("🤖 Agentic game order:", data.game_sequence);
        }
      } catch (error) {
        console.error("Error fetching optimal sequence:", error);
        // Fallback to default order
        setGameSequence(getDefaultSequence());
      } finally {
        setLoading(false);
      }
    }

    if (user?.email) {
      fetchOptimalSequence();
    }
  }, [user]);

  return (
    <div className="min-h-screen">
      <h1>Your Personalized Games</h1>
      <p className="text-sm text-gray-600">
        🤖 Order optimized by AI based on your progress
      </p>

      {loading ? (
        <div>Loading optimal game sequence...</div>
      ) : (
        <div className="grid gap-6">
          {gameSequence.map((game, index) => (
            <GameCard
              key={game.game_type}
              gameType={game.game_type}
              priority={game.priority}
              difficulty={game.difficulty}
              estimatedReward={game.estimated_reward}
              reason={game.reason}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GameCard({ gameType, priority, difficulty, estimatedReward, reason }) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">
            {priority === 1 && "🥇"}
            {priority === 2 && "🥈"}
            {priority === 3 && "🥉"}
            {getGameName(gameType)}
          </h3>
          <p className="text-sm text-gray-600">{reason}</p>
        </div>
        <div className="text-right">
          <div
            className={`px-3 py-1 rounded-full text-sm ${getDifficultyColor(
              difficulty
            )}`}
          >
            {difficulty}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            AI Score: {(estimatedReward * 100).toFixed(0)}%
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### 2. Real-Time Difficulty Adjustment (In-Game)

```typescript
// In BalloonMathQuiz.tsx or GeneralKnowledgeGame.tsx
import { useGameAnalytics } from "../hooks/useGameAnalytics";
import { useState, useEffect } from "react";

function BalloonMathQuiz({ topic, onGameComplete }) {
  const { user } = useUser();
  const analytics = useGameAnalytics(
    "balloon_math",
    topic,
    user.email,
    user.disability
  );

  const [questions, setQuestions] = useState([]);
  const [currentDifficulty, setCurrentDifficulty] = useState("medium");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // 🤖 AGENTIC: Fetch adaptive difficulty on load
  useEffect(() => {
    async function fetchAdaptiveDifficulty() {
      const response = await fetch(
        `http://localhost:8001/adaptive-difficulty/${user.email}/balloon_math`
      );
      const data = await response.json();

      if (data.success) {
        setCurrentDifficulty(data.difficulty);
        console.log("🤖 Starting difficulty:", data.difficulty);
      }
    }

    fetchAdaptiveDifficulty();
  }, [user.email]);

  // 🤖 AGENTIC: Real-time difficulty adjustment between questions
  useEffect(() => {
    async function adjustDifficulty() {
      if (currentQuestionIndex === 0) return; // Skip first question

      const currentPerformance =
        analytics.stats.correct_answers / analytics.stats.total_questions;

      const response = await fetch(
        `http://localhost:8001/real-time-difficulty/${user.email}/balloon_math?` +
          `topic=${topic}&current_performance=${currentPerformance}`
      );
      const data = await response.json();

      if (data.success && data.recommended_difficulty !== currentDifficulty) {
        setCurrentDifficulty(data.recommended_difficulty);
        console.log(
          `🤖 Difficulty adjusted: ${currentDifficulty} → ${data.recommended_difficulty}` +
            ` (performance: ${(currentPerformance * 100).toFixed(0)}%)`
        );
      }
    }

    adjustDifficulty();
  }, [currentQuestionIndex]);

  // Use difficulty to fetch appropriate questions
  useEffect(() => {
    async function loadQuestions() {
      const response = await fetch(
        `http://localhost:8001/get-math-questions/${topic}?` +
          `age_group=10&difficulty=${currentDifficulty}`
      );
      const data = await response.json();

      if (data.success) {
        setQuestions(data.questions);
      }
    }

    loadQuestions();
  }, [topic, currentDifficulty]);

  return (
    <div className="game-container">
      <div className="difficulty-indicator">
        <span className={`badge ${getDifficultyColor(currentDifficulty)}`}>
          {currentDifficulty.toUpperCase()}
        </span>
        <span className="text-xs text-gray-500">🤖 AI-Adjusted</span>
      </div>

      {/* Rest of your game UI */}
    </div>
  );
}
```

---

### 3. Complete Analytics Integration (With Auto Thompson Sampling Update)

```typescript
// In any game component
import { useGameAnalytics } from "../hooks/useGameAnalytics";
import { useUser } from "../contexts/UserContext";

function GameComponent({ topic, onGameComplete }) {
  const { user } = useUser();
  const analytics = useGameAnalytics(
    "balloon_math", // game type
    topic,
    user.email,
    user.disability
  );

  const handleAnswerSubmit = (isCorrect: boolean, timeTaken: number) => {
    // Track the answer
    analytics.trackAnswer(isCorrect, timeTaken, false, false);
  };

  const handleHintClick = () => {
    // Track hint usage
    analytics.trackHintUsage();
  };

  const handleGameComplete = async () => {
    // Mark as completed
    analytics.markCompleted();

    // Save analytics (automatically updates Thompson Sampling!)
    const success = await analytics.saveAnalytics();

    if (success) {
      console.log("✅ Analytics saved successfully");
      console.log("🤖 Thompson Sampling updated automatically");
      console.log("📊 Stats:", analytics.stats);
    }

    // Navigate to next game or home
    onGameComplete();
  };

  return (
    <div>
      {/* Game UI */}
      <button onClick={handleHintClick}>💡 Get Hint</button>

      {/* Analytics Dashboard (optional) */}
      <div className="analytics-panel">
        <h4>Your Progress</h4>
        <div>Accuracy: {(analytics.stats.accuracy_rate * 100).toFixed(0)}%</div>
        <div>Time: {analytics.stats.time_spent_seconds}s</div>
        <div>Consecutive Errors: {analytics.stats.consecutive_errors}</div>
        <div>Hints Used: {analytics.stats.help_hint_count}</div>
      </div>
    </div>
  );
}
```

---

### 4. Show Personalized Difficulty Badge

```typescript
// GameCard component showing AI-recommended difficulty
function GameCard({ gameType }) {
  const { user } = useUser();
  const [difficulty, setDifficulty] = useState("medium");

  useEffect(() => {
    fetch(`http://localhost:8001/adaptive-difficulty/${user.email}/${gameType}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDifficulty(data.difficulty);
        }
      });
  }, [user.email, gameType]);

  return (
    <div className="game-card">
      <h3>{getGameName(gameType)}</h3>
      <div className={`difficulty-badge ${difficulty}`}>
        🤖 {difficulty.toUpperCase()}
      </div>
      <p className="text-xs text-gray-500">
        Personalized difficulty based on your progress
      </p>
    </div>
  );
}
```

---

## 🎨 Visual Indicators

### Difficulty Colors

```css
/* Add to your CSS */
.difficulty-badge.easy {
  background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
  color: #065f46;
}

.difficulty-badge.medium {
  background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
  color: #78350f;
}

.difficulty-badge.hard {
  background: linear-gradient(135deg, #ff7675 0%, #d63031 100%);
  color: #fff;
}

.agentic-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 12px;
  font-size: 12px;
  color: #4f46e5;
}

.agentic-indicator::before {
  content: "🤖";
}
```

---

## 📊 Analytics Dashboard Example

```typescript
function AnalyticsDashboard() {
  const { user } = useUser();
  const [stats, setStats] = useState(null);
  const [thompsonParams, setThompsonParams] = useState(null);

  useEffect(() => {
    // Fetch aggregate stats
    fetch(`http://localhost:8001/user-stats/${user.email}`)
      .then((res) => res.json())
      .then((data) => setStats(data.stats));

    // Fetch performance scores (Thompson Sampling)
    fetch(`http://localhost:8001/performance-scores/${user.email}`)
      .then((res) => res.json())
      .then((data) => setThompsonParams(data.scores));
  }, [user.email]);

  return (
    <div className="analytics-dashboard">
      <h2>🤖 AI Learning Progress</h2>

      {thompsonParams && (
        <div className="thompson-sampling-viz">
          <h3>Game Performance (AI Model)</h3>
          {Object.entries(thompsonParams).map(([game, score]) => (
            <div key={game} className="progress-bar">
              <span>{game}</span>
              <div className="bar">
                <div className="fill" style={{ width: `${score * 100}%` }} />
              </div>
              <span>{(score * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}

      {stats && (
        <div className="aggregate-stats">
          <h3>Overall Stats</h3>
          {Object.entries(stats).map(([gameType, gameStats]) => (
            <StatCard key={gameType} gameType={gameType} stats={gameStats} />
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 🚀 Complete Integration Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. USER LOADS HOMEPAGE                                  │
│    ↓                                                     │
│    Frontend: useEffect → fetch /optimal-game-sequence   │
│    Backend: Thompson Sampling calculates best order     │
│    Frontend: Display games in personalized order        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. USER SELECTS GAME (e.g., Balloon Math)               │
│    ↓                                                     │
│    Frontend: fetch /adaptive-difficulty                 │
│    Backend: Analyzes last 5 sessions → returns "hard"   │
│    Frontend: Loads questions with hard difficulty       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. USER PLAYS GAME                                       │
│    ↓                                                     │
│    useGameAnalytics tracks all 15 parameters:           │
│    - Correct answers ✓                                  │
│    - Time spent ✓                                       │
│    - Consecutive errors ✓                               │
│    - Tab switches ✓                                     │
│    - Idle time ✓                                        │
│    - Hint usage ✓                                       │
│                                                          │
│    After each question:                                 │
│    → fetch /real-time-difficulty?current_performance    │
│    → Adjust difficulty if needed                        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 4. USER COMPLETES GAME                                   │
│    ↓                                                     │
│    analytics.markCompleted()                            │
│    analytics.saveAnalytics() → POST /save-analytics     │
│    Backend:                                             │
│      1. Save analytics to Firebase ✓                    │
│      2. Update aggregate stats ✓                        │
│      3. 🤖 Update Thompson Sampling (automatic) ✓       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 5. NEXT TIME USER LOGS IN                               │
│    ↓                                                     │
│    Game order is AUTOMATICALLY different!               │
│    Based on updated Thompson Sampling parameters        │
│    🤖 FULLY AGENTIC - NO MANUAL INTERVENTION           │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways

1. **One-Line Integration**: Just call `/optimal-game-sequence` to get personalized order
2. **Automatic Learning**: Thompson Sampling updates happen automatically when you save analytics
3. **Real-Time Adaptation**: Call `/real-time-difficulty` between questions to adjust on-the-fly
4. **No Extra Work**: The `useGameAnalytics` hook already tracks everything you need

The system is **plug-and-play agentic AI**! 🚀

# Quick Implementation Guide - Code Changes Required

## 🔥 CRITICAL BUG FIX - BalloonMathQuiz

### Location: `test/front_end/src/components/games/BalloonMathQuiz.tsx`

### Change 1: Add imports at top

```typescript
import { useGameAnalytics } from "../../hooks/useGameAnalytics";
import { useUser } from "../../contexts/UserContext";
```

### Change 2: Add these lines inside the component (around line 180-190)

```typescript
function BalloonMathQuiz({ topic, mathQuestions = null, onGameComplete }: GameProps) {
  // ADD THESE TWO LINES:
  const { user } = useUser();
  const analytics = useGameAnalytics("balloon_math", topic || "Mathematics", user?.email, user?.disability);

  // ADD THIS REF (put it with other refs):
  const currentQuestionRef = useRef(QUESTIONS[currentQuestionIndex]);
```

### Change 3: Add effect to update ref (around line 240)

```typescript
// ADD THIS ENTIRE useEffect:
useEffect(() => {
  currentQuestionRef.current = QUESTIONS[currentQuestionIndex];
}, [currentQuestionIndex, QUESTIONS]);
```

### Change 4: Fix collision handler (around line 600-640)

**FIND THIS CODE:**

```typescript
const balloonValueStr = balloonBody.label.split("-")[1];
const balloonValue = parseInt(balloonValueStr);
const correctAnswer = parseInt(currentQuestion.answer.toString());
const isCorrect = balloonValue === correctAnswer;
```

**REPLACE WITH:**

```typescript
const balloonValueStr = balloonBody.label.split("-")[1];
const balloonValue = parseInt(balloonValueStr, 10);
// 🔑 FIX: Use ref instead of stale closure
const correctAnswer = parseInt(
  currentQuestionRef.current.answer.toString(),
  10
);
const isCorrect = balloonValue === correctAnswer;
```

### Change 5: Add analytics tracking in handleHit (around line 680-720)

**FIND THE LINE:**

```typescript
const handleHit = (balloonBody: Matter.Body, isCorrect: boolean) => {
```

**ADD RIGHT AFTER THE EXPLOSION:**

```typescript
createExplosion(...);

// ADD THIS LINE:
analytics.trackAnswer(isCorrect);
```

**FIND THE GAME COMPLETION SECTION (around line 740):**

```typescript
if (nextIndex >= QUESTIONS.length) {
  console.log("🎉🎉🎉 ALL QUESTIONS COMPLETED!");
  setGameState("won");
  // ADD THESE TWO LINES:
  analytics.markCompleted();
  analytics.saveAnalytics();
  setIsTransitioning(false);
}
```

**FIND THE GAME LOST SECTION:**

```typescript
} else {
  console.log("❌❌❌ WRONG ANSWER!");
  setMessage("Wrong!");
  setTimeout(() => {
    setGameState("lost");
    // ADD THIS LINE:
    analytics.saveAnalytics();
    setIsTransitioning(false);
  }, 1500);
}
```

### Change 6: Add stats display (optional - add in JSX around line 1050)

```tsx
{
  /* Add this right after QuestionDisplay */
}
<div className="absolute top-8 right-8 bg-white/90 rounded-xl p-4 shadow-lg z-10">
  <div className="text-sm font-semibold text-gray-700">
    Progress: {currentQuestionIndex + 1}/{QUESTIONS.length}
  </div>
  <div className="text-sm text-gray-600">
    Accuracy: {analytics.stats.accuracyRate.toFixed(0)}%
  </div>
  <div className="text-sm text-gray-600">
    Correct: {analytics.stats.correctAnswers}
  </div>
</div>;
```

---

## 📝 GENERAL KNOWLEDGE GAME

### Location: `test/front_end/src/components/games/GeneralKnowledgeGame.tsx`

### Change 1: Add imports

```typescript
import { useGameAnalytics } from "../../hooks/useGameAnalytics";
import { useUser } from "../../contexts/UserContext";
```

### Change 2: Initialize analytics

```typescript
function GeneralKnowledgeGame({ topic, onGameComplete, questions, gameData }: GameProps) {
  const { user } = useUser();
  const analytics = useGameAnalytics("general_knowledge", topic, user?.email, user?.disability);
```

### Change 3: Track answer when option is selected

**FIND WHERE USER SELECTS AN ANSWER (usually in handleAnswerClick or similar):**

```typescript
const handleAnswerClick = (selectedOption: string) => {
  const isCorrect = selectedOption === currentQuestion.correct_answer;

  // ADD THIS LINE:
  analytics.trackAnswer(isCorrect);

  // ... rest of your logic
};
```

### Change 4: Mark completed and save

**FIND WHERE QUIZ ENDS:**

```typescript
// When quiz completes successfully
if (allQuestionsAnswered) {
  analytics.markCompleted();
  analytics.saveAnalytics();
}

// When quiz exits early
analytics.saveAnalytics(true); // rage quit
```

---

## ✏️ SPELLING GAME

### Location: `test/front_end/src/components/games/SpellingGame.tsx`

### Change 1: Add imports

```typescript
import { useGameAnalytics } from "../../hooks/useGameAnalytics";
import { useUser } from "../../contexts/UserContext";
```

### Change 2: Initialize analytics

```typescript
function SpellingGame({ topic, onGameComplete, word }: Props) {
  const { user } = useUser();
  const analytics = useGameAnalytics("spelling", topic, user?.email, user?.disability);
```

### Change 3: Track letter attempts

**FIND WHERE LETTER IS CHECKED:**

```typescript
const handleLetterClick = (letter: string) => {
  const isCorrect = checkIfCorrectLetter(letter);

  // ADD THIS LINE:
  analytics.trackAnswer(isCorrect, false, false);

  // ... rest of logic
};
```

### Change 4: Track hint usage (if applicable)

```typescript
const showHint = () => {
  analytics.trackHintUsage();
  // ... show hint logic
};
```

### Change 5: Mark completed and save

```typescript
// When all letters are mastered
if (allLettersMastered) {
  analytics.markCompleted();
  analytics.saveAnalytics();
}
```

---

## 🌐 BACKEND ENVIRONMENT FILE

### Create: `test/back_end/.env`

```env
OPENROUTER_API_KEY=your_openrouter_key_here
FIREBASE_CREDENTIALS_PATH=../../my_project.json
```

---

## ✅ TESTING CHECKLIST

After making these changes:

1. [ ] Backend starts without errors: `cd test/back_end && python -m uvicorn main:app --reload`
2. [ ] Frontend compiles: `cd test/front_end && npm run dev`
3. [ ] Play BalloonMathQuiz - second question answer works correctly
4. [ ] Check browser console - see analytics logs
5. [ ] Complete a game - check Firebase for session data
6. [ ] Test API: `curl http://localhost:8000/user-stats/test@playfinity.com`
7. [ ] Verify rage quit tracking by closing game mid-play

---

## 🚨 COMMON ISSUES

### Issue: "Cannot find module './hooks/useGameAnalytics'"

**Solution**: Make sure the hooks folder exists and the file was created correctly.

### Issue: "Firebase not initialized"

**Solution**: Check that `my_project.json` exists in the root directory and the path in `.env` is correct.

### Issue: "CORS error"

**Solution**: Make sure backend is running on port 8000 and frontend on 5173 (or update CORS_ORIGINS in settings.py).

### Issue: "Analytics not saving to Firebase"

**Solution**: Check browser network tab for failed POST requests. Verify backend logs for errors.

---

## 📊 VERIFY IT WORKS

After a game session, check Firebase:

```
users/
  test@playfinity.com/
    game_analytics/
      {timestamp}_{random}/
        ✓ correct_answers
        ✓ total_questions
        ✓ accuracy_rate
        ✓ time_spent_seconds
        ✓ consecutive_errors
        ✓ tab_switches
        ✓ total_idle_time_seconds
        ... (all other fields)
```

Check backend API:

```bash
curl http://localhost:8000/user-stats/test@playfinity.com
curl http://localhost:8000/performance-scores/test@playfinity.com
```

Both should return JSON with analytics data.

---

**Estimated Time**: 30-45 minutes for all changes
**Difficulty**: Moderate (mostly copy-paste with some understanding of where to place code)

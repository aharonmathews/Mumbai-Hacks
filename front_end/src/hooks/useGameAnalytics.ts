import { useState, useEffect, useRef, useCallback } from "react";

export interface QuestionDetail {
  questionNumber: number;
  isCorrect: boolean;
  timeSpent: number;
  wasSkipped: boolean;
  usedHint: boolean;
}

export interface GameAnalyticsStats {
  correctAnswers: number;
  totalQuestions: number;
  accuracyRate: number;
  timeSpentSeconds: number;
  gameCompleted: boolean;
  consecutiveErrors: number;
  maxConsecutiveErrors: number;
  averageTimePerQuestion: number;
  questionsSkipped: number;
  rageQuit: boolean;
  helpHintCount: number;
  replayCount: number;
  tabSwitches: number;
  totalIdleTimeSeconds: number;
  maxIdleTimeSeconds: number;
}

export function useGameAnalytics(
  gameType: string,
  topic: string,
  userEmail: string = "test@playfinity.com",
  disabilityType: string = "None"
) {
  // Session tracking
  const sessionIdRef = useRef(
    `${gameType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );
  const sessionStartRef = useRef(new Date());
  const lastActivityRef = useRef(new Date());

  // Question-level tracking
  const questionDetailsRef = useRef<QuestionDetail[]>([]);
  const currentQuestionStartRef = useRef<Date | null>(null);

  // Analytics state
  const [stats, setStats] = useState<GameAnalyticsStats>({
    correctAnswers: 0,
    totalQuestions: 0,
    accuracyRate: 0,
    timeSpentSeconds: 0,
    gameCompleted: false,
    consecutiveErrors: 0,
    maxConsecutiveErrors: 0,
    averageTimePerQuestion: 0,
    questionsSkipped: 0,
    rageQuit: false,
    helpHintCount: 0,
    replayCount: 0,
    tabSwitches: 0,
    totalIdleTimeSeconds: 0,
    maxIdleTimeSeconds: 0,
  });

  // Idle time tracking
  const idleStartRef = useRef<Date | null>(null);
  const currentIdleTimeRef = useRef(0);

  // Track tab visibility changes (Tier 4: Tab Switches)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab switched away - start idle timer
        idleStartRef.current = new Date();
      } else {
        // Tab became active - stop idle timer
        if (idleStartRef.current) {
          const idleSeconds =
            (new Date().getTime() - idleStartRef.current.getTime()) / 1000;
          currentIdleTimeRef.current += idleSeconds;

          setStats((prev) => ({
            ...prev,
            tabSwitches: prev.tabSwitches + 1,
            totalIdleTimeSeconds: prev.totalIdleTimeSeconds + idleSeconds,
            maxIdleTimeSeconds: Math.max(prev.maxIdleTimeSeconds, idleSeconds),
          }));

          idleStartRef.current = null;
        }
        lastActivityRef.current = new Date();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Track idle time during active tab (>30 seconds without interaction)
  useEffect(() => {
    let idleCheckInterval: NodeJS.Timeout;

    const checkIdle = () => {
      const now = new Date();
      const timeSinceLastActivity =
        (now.getTime() - lastActivityRef.current.getTime()) / 1000;

      if (timeSinceLastActivity > 30 && !idleStartRef.current) {
        // Start tracking idle time
        idleStartRef.current = new Date(
          lastActivityRef.current.getTime() + 30000
        ); // 30 seconds after last activity
      }

      if (idleStartRef.current && timeSinceLastActivity > 30) {
        // Update idle time
        const idleSeconds =
          (now.getTime() - idleStartRef.current.getTime()) / 1000;
        currentIdleTimeRef.current = idleSeconds;

        setStats((prev) => ({
          ...prev,
          totalIdleTimeSeconds:
            prev.totalIdleTimeSeconds -
            prev.maxIdleTimeSeconds +
            Math.max(prev.maxIdleTimeSeconds, idleSeconds),
          maxIdleTimeSeconds: Math.max(prev.maxIdleTimeSeconds, idleSeconds),
        }));
      }
    };

    idleCheckInterval = setInterval(checkIdle, 5000); // Check every 5 seconds

    return () => clearInterval(idleCheckInterval);
  }, []);

  // Start tracking a new question
  const startQuestion = useCallback(() => {
    currentQuestionStartRef.current = new Date();
    lastActivityRef.current = new Date();

    // Reset idle tracking for new question
    if (idleStartRef.current) {
      idleStartRef.current = null;
    }
  }, []);

  // Track an answer
  const trackAnswer = useCallback(
    (
      isCorrect: boolean,
      wasSkipped: boolean = false,
      usedHint: boolean = false
    ) => {
      lastActivityRef.current = new Date();

      const timeSpent = currentQuestionStartRef.current
        ? (new Date().getTime() - currentQuestionStartRef.current.getTime()) /
          1000
        : 0;

      // Record question details
      questionDetailsRef.current.push({
        questionNumber: stats.totalQuestions + 1,
        isCorrect,
        timeSpent,
        wasSkipped,
        usedHint,
      });

      setStats((prev) => {
        const newTotalQuestions = prev.totalQuestions + 1;
        const newCorrectAnswers = isCorrect
          ? prev.correctAnswers + 1
          : prev.correctAnswers;
        const newConsecutiveErrors = isCorrect ? 0 : prev.consecutiveErrors + 1;
        const newQuestionsSkipped = wasSkipped
          ? prev.questionsSkipped + 1
          : prev.questionsSkipped;

        return {
          ...prev,
          correctAnswers: newCorrectAnswers,
          totalQuestions: newTotalQuestions,
          accuracyRate:
            newTotalQuestions > 0 ? newCorrectAnswers / newTotalQuestions : 0,
          consecutiveErrors: newConsecutiveErrors,
          maxConsecutiveErrors: Math.max(
            prev.maxConsecutiveErrors,
            newConsecutiveErrors
          ),
          questionsSkipped: newQuestionsSkipped,
          averageTimePerQuestion:
            (prev.averageTimePerQuestion * prev.totalQuestions + timeSpent) /
            newTotalQuestions,
        };
      });

      // Reset for next question
      currentQuestionStartRef.current = null;
    },
    [stats.totalQuestions]
  );

  // Track hint usage
  const trackHintUsage = useCallback(() => {
    lastActivityRef.current = new Date();

    setStats((prev) => ({
      ...prev,
      helpHintCount: prev.helpHintCount + 1,
    }));
  }, []);

  // Mark game as completed
  const markCompleted = useCallback(() => {
    lastActivityRef.current = new Date();

    setStats((prev) => ({
      ...prev,
      gameCompleted: true,
      rageQuit: false,
    }));
  }, []);

  // Save analytics to backend
  const saveAnalytics = useCallback(
    async (forceRageQuit: boolean = false) => {
      const sessionEnd = new Date();
      const timeSpentSeconds =
        (sessionEnd.getTime() - sessionStartRef.current.getTime()) / 1000;

      // Determine if this was a rage quit
      const isRageQuit =
        forceRageQuit || (!stats.gameCompleted && stats.totalQuestions > 0);

      const analyticsData = {
        user_email: userEmail,
        game_type: gameType,
        topic: topic,
        session_id: sessionIdRef.current,

        // Tier 1: Basic metrics
        correct_answers: stats.correctAnswers,
        total_questions: stats.totalQuestions,
        accuracy_rate: stats.accuracyRate,
        time_spent_seconds: timeSpentSeconds,
        game_completed: stats.gameCompleted,

        // Tier 2: Derivable metrics
        consecutive_errors: stats.consecutiveErrors,
        max_consecutive_errors: stats.maxConsecutiveErrors,
        average_time_per_question: stats.averageTimePerQuestion,
        questions_skipped: stats.questionsSkipped,
        rage_quit: isRageQuit,

        // Tier 4: Behavior patterns
        help_hint_count: stats.helpHintCount,
        replay_count: stats.replayCount,
        tab_switches: stats.tabSwitches,
        total_idle_time_seconds: stats.totalIdleTimeSeconds,
        max_idle_time_seconds: stats.maxIdleTimeSeconds,

        // Timestamps
        session_start: sessionStartRef.current.toISOString(),
        session_end: sessionEnd.toISOString(),

        // Additional context
        disability_type: disabilityType,

        // Question-level details
        question_details: questionDetailsRef.current,
      };

      try {
        const response = await fetch("http://localhost:8001/save-analytics", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(analyticsData),
        });

        if (response.ok) {
          console.log("✅ Analytics saved successfully");
          console.log("📊 Analytics data:", analyticsData);
        } else {
          console.error("❌ Failed to save analytics:", await response.text());
        }
      } catch (error) {
        console.error("❌ Error saving analytics:", error);
      }
    },
    [
      gameType,
      topic,
      userEmail,
      disabilityType,
      stats.correctAnswers,
      stats.totalQuestions,
      stats.accuracyRate,
      stats.gameCompleted,
      stats.consecutiveErrors,
      stats.maxConsecutiveErrors,
      stats.averageTimePerQuestion,
      stats.questionsSkipped,
      stats.helpHintCount,
      stats.replayCount,
      stats.tabSwitches,
      stats.totalIdleTimeSeconds,
      stats.maxIdleTimeSeconds,
    ]
  );

  // Auto-save on unmount (handles rage quits)
  useEffect(() => {
    return () => {
      if (stats.totalQuestions > 0 && !stats.gameCompleted) {
        saveAnalytics(true); // This is a rage quit
      }
    };
  }, [stats.totalQuestions, stats.gameCompleted, saveAnalytics]);

  return {
    stats,
    startQuestion,
    trackAnswer,
    trackHintUsage,
    markCompleted,
    saveAnalytics,
  };
}

import { useState, useEffect, useCallback } from "react";
import { useUser } from "../contexts/UserContext";

interface GameSequenceItem {
  game_type: string;
  position: number;
  expected_reward: number;
  confidence: number;
  total_plays: number;
  success_rate: number;
}

interface DifficultyAdjustment {
  baseline_difficulty: string;
  current_performance: number;
  adjustment: string;
  new_difficulty: string;
  reasoning: string;
}

export function useAgenticFeatures() {
  const { user } = useUser();
  const [optimalSequence, setOptimalSequence] = useState<GameSequenceItem[]>(
    []
  );
  const [currentDifficulty, setCurrentDifficulty] = useState<string>("medium");
  const [loading, setLoading] = useState(false);

  // 🤖 AGENTIC: Fetch optimal game sequence
  const fetchOptimalSequence = useCallback(async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      const response = await fetch(
        `http://127.0.0.1:8001/optimal-game-sequence/${
          user.email
        }?disability_type=${user.disability || "None"}`
      );

      if (!response.ok) throw new Error("Failed to fetch sequence");

      const data = await response.json();
      setOptimalSequence(data.sequence || []);

      console.log("🤖 Loaded optimal game sequence:", data.sequence);
    } catch (error) {
      console.error("Error fetching optimal sequence:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 🤖 AGENTIC: Get adaptive difficulty for a game
  const getAdaptiveDifficulty = useCallback(
    async (gameType: string) => {
      if (!user?.email) return "medium";

      try {
        const response = await fetch(
          `http://127.0.0.1:8001/adaptive-difficulty/${user.email}/${gameType}`
        );

        if (!response.ok) throw new Error("Failed to fetch difficulty");

        const data = await response.json();
        setCurrentDifficulty(data.difficulty);

        console.log(
          `🤖 Adaptive difficulty for ${gameType}: ${data.difficulty}`
        );
        return data.difficulty;
      } catch (error) {
        console.error("Error fetching adaptive difficulty:", error);
        return "medium";
      }
    },
    [user]
  );

  // 🤖 AGENTIC: Get real-time difficulty adjustment
  const getRealtimeDifficultyAdjustment = useCallback(
    async (
      gameType: string,
      topic: string,
      currentPerformance: number
    ): Promise<DifficultyAdjustment | null> => {
      if (!user?.email) return null;

      try {
        const response = await fetch(
          `http://127.0.0.1:8001/real-time-difficulty/${user.email}/${gameType}?topic=${topic}&current_performance=${currentPerformance}`
        );

        if (!response.ok) throw new Error("Failed to get adjustment");

        const data = await response.json();

        console.log(
          `🤖 Real-time adjustment: ${data.adjustment} (${data.reasoning})`
        );
        return data;
      } catch (error) {
        console.error("Error getting real-time adjustment:", error);
        return null;
      }
    },
    [user]
  );

  // Load optimal sequence on mount
  useEffect(() => {
    fetchOptimalSequence();
  }, [fetchOptimalSequence]);

  return {
    optimalSequence,
    currentDifficulty,
    loading,
    fetchOptimalSequence,
    getAdaptiveDifficulty,
    getRealtimeDifficultyAdjustment,
  };
}

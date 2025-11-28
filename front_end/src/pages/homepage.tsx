import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "../contexts/UserContext";

interface GameSequenceItem {
  game_type: string;
  position: number;
  expected_reward: number;
  confidence: number;
  total_plays: number;
  success_rate: number;
  difficulty: string;
  question_count: number;
}

export default function Homepage() {
  const { user } = useUser();
  const [gameSequence, setGameSequence] = useState<GameSequenceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOptimalSequence() {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `http://127.0.0.1:8001/optimal-game-sequence/${
            user.email
          }?disability_type=${user.disability || "None"}`
        );

        if (!response.ok) throw new Error("Failed to fetch sequence");

        const data = await response.json();
        console.log("🤖 Thompson Sampling Sequence:", data);

        setGameSequence(data.sequence || []);
      } catch (error) {
        console.error("Error fetching game sequence:", error);
        // Fallback to default order
        setGameSequence([
          {
            game_type: "spelling",
            position: 1,
            expected_reward: 0.5,
            confidence: 0.0,
            total_plays: 0,
            success_rate: 0.5,
            difficulty: "medium",
            question_count: 6,
          },
          {
            game_type: "balloon_math",
            position: 2,
            expected_reward: 0.5,
            confidence: 0.0,
            total_plays: 0,
            success_rate: 0.5,
            difficulty: "medium",
            question_count: 5,
          },
          {
            game_type: "general_knowledge",
            position: 3,
            expected_reward: 0.5,
            confidence: 0.0,
            total_plays: 0,
            success_rate: 0.5,
            difficulty: "medium",
            question_count: 5,
          },
        ]);
      } finally {
        setLoading(false);
      }
    }

    fetchOptimalSequence();
  }, [user]);

  const gameRoutes: Record<string, string> = {
    spelling: "/spelling",
    balloon_math: "/balloon",
    general_knowledge: "/quiz",
  };

  const gameIcons: Record<string, string> = {
    spelling: "✍️",
    balloon_math: "🎈",
    general_knowledge: "🧠",
  };

  const gameNames: Record<string, string> = {
    spelling: "Spelling",
    balloon_math: "Balloon Math",
    general_knowledge: "Quiz",
  };

  const difficultyColors: Record<string, string> = {
    easy: "bg-green-100 text-green-800 border-green-300",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
    hard: "bg-red-100 text-red-800 border-red-300",
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">🤖 Calculating optimal game order...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-indigo-50 p-6">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Playfinity
          </h1>
          <p className="text-lg text-gray-600">
            🤖 Personalized for {user?.name} ({user?.disability})
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Games ordered by AI based on your performance
          </p>
        </div>

        {gameSequence.length > 0 && (
          <div className="mb-8 p-6 bg-blue-50 rounded-2xl border border-blue-200">
            <h3 className="text-lg font-bold text-blue-900 mb-2 flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              Agentic Learning Active
            </h3>
            <p className="text-sm text-blue-800">
              Your games are personalized using Thompson Sampling AI. The order
              and difficulty adapt to maximize your learning!
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {gameSequence.map((game, index) => (
            <Link
              key={game.game_type}
              to={gameRoutes[game.game_type] || "/"}
              state={{
                difficulty: game.difficulty,
                questionCount: game.question_count,
                topic: "animals", // You can make this dynamic
              }}
              className="group relative bg-white/90 backdrop-blur-xl rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-indigo-200/50"
            >
              {/* Priority Badge */}
              <div className="absolute top-4 right-4 bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg">
                {game.position}
              </div>

              {/* Game Icon */}
              <div className="text-6xl mb-4 text-center">
                {gameIcons[game.game_type]}
              </div>

              {/* Game Name */}
              <h3 className="text-2xl font-bold text-center mb-3 text-gray-800">
                {gameNames[game.game_type]}
              </h3>

              {/* AI Recommendations */}
              <div className="space-y-2">
                {/* Difficulty */}
                <div className="text-center">
                  <span
                    className={`inline-block px-4 py-2 rounded-full text-sm font-semibold border ${
                      difficultyColors[game.difficulty]
                    }`}
                  >
                    🤖 {game.difficulty.toUpperCase()} ({game.question_count}{" "}
                    questions)
                  </span>
                </div>

                {/* Performance Stats */}
                <div className="pt-3 border-t border-gray-200 space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Success Rate:</span>
                    <span className="font-semibold">
                      {(game.success_rate * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Confidence:</span>
                    <span className="font-semibold">
                      {(game.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Plays:</span>
                    <span className="font-semibold">{game.total_plays}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center text-sm text-gray-600 space-y-2">
          <p className="flex items-center justify-center gap-2">
            <span className="text-xl">💡</span>
            Game order updates automatically after each session
          </p>
          <p className="flex items-center justify-center gap-2">
            <span className="text-xl">🎯</span>
            Difficulty adapts based on your recent performance
          </p>
          <p className="flex items-center justify-center gap-2">
            <span className="text-xl">📊</span>
            Question count adjusts to your skill level
          </p>
        </div>
      </div>
    </div>
  );
}

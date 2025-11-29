import React, { useState } from "react";
import { useGameAnalytics } from "../../hooks/useGameAnalytics";
import { useUser } from "../../contexts/UserContext";

// --- INTERFACES --- //
interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: string;
}

interface GameProps {
  topic: string;
  onGameComplete: () => void;
  // ✅ FIX: Accept questions directly OR through gameData
  questions?: QuizQuestion[];
  gameData?: {
    questions: QuizQuestion[];
    instructions?: string;
  } | null;
}

// --- FALLBACK DATA --- //
const fallbackQuestions = [
  {
    question: `What do you know about this topic?`,
    options: ["A lot", "A little", "Nothing", "Everything"],
    correct_answer: "A little",
  },
  {
    question: `How would you describe this topic?`,
    options: ["Interesting", "Boring", "Complex", "Simple"],
    correct_answer: "Interesting",
  },
  {
    question: `Where might you encounter this topic?`,
    options: ["Everywhere", "School", "Work", "Home"],
    correct_answer: "School",
  },
];

// --- GAME COMPONENT --- //
function GeneralKnowledgeGame({
  topic,
  onGameComplete,
  questions,
  gameData,
}: GameProps) {
  // ✅ FIX: Process quiz data from multiple sources
  const processQuizData = () => {
    const { user } = useUser();
    const analytics = useGameAnalytics(
      "general_knowledge",
      topic,
      user?.email || "test@playfinity.com",
      user?.disability
    );
    // Try direct questions prop first
    let sourceQuestions = questions;

    // Fall back to gameData.questions
    if (!sourceQuestions && gameData?.questions) {
      sourceQuestions = gameData.questions;
    }

    // ✅ DEBUG: Log what we received
    console.log("🔍 GeneralKnowledgeGame Debug:", {
      topic,
      directQuestions: questions?.length || 0,
      gameDataQuestions: gameData?.questions?.length || 0,
      finalSource: sourceQuestions?.length || 0,
      sourceQuestions: sourceQuestions?.slice(0, 2), // Preview first 2 questions
    });

    if (!sourceQuestions || sourceQuestions.length === 0) {
      console.log("🎯 Using fallback questions for topic:", topic);
      return fallbackQuestions.map((q) => ({
        question: q.question.replace("this topic", topic),
        options: q.options,
        correctIndex: q.options.indexOf(q.correct_answer),
      }));
    }

    console.log(
      "✅ Using provided questions:",
      sourceQuestions.length,
      "questions"
    );

    return sourceQuestions.map((q) => {
      // Find the correct answer index
      const correctIndex = q.options.indexOf(q.correct_answer);

      // ✅ DEBUG: Log each question processing
      console.log("📝 Processing question:", {
        question: q.question.substring(0, 50) + "...",
        options: q.options,
        correct_answer: q.correct_answer,
        correctIndex,
      });

      return {
        question: q.question,
        options: q.options,
        correctIndex: correctIndex >= 0 ? correctIndex : 0, // Fallback to first option if not found
      };
    });
  };

  // Game state
  const [questionsData] = useState(processQuizData());
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  // Player animation state
  const [playerRow, setPlayerRow] = useState(0);
  const [playerCol, setPlayerCol] = useState<number | null>(null);
  const [anim, setAnim] = useState("idle");
  const [correctBuildings, setCorrectBuildings] = useState(
    Array(questionsData.length).fill(null)
  );
  const [wronglySelectedBuilding, setWronglySelectedBuilding] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [jumpPosition, setJumpPosition] = useState<{
    row: number;
    col: number;
  } | null>(null);

  // Function to reset the game state for a retry
  function resetGame() {
    setCurrent(0);
    setScore(0);
    setSelected(null);
    setShowResult(false);
    setPlayerRow(0);
    setPlayerCol(null);
    setAnim("idle");
    setCorrectBuildings(Array(questionsData.length).fill(null));
    setShowPopup(false);
    setWronglySelectedBuilding(null);
    setJumpPosition(null);
  }

  // Handle user's answer selection
  function handleSelect(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
    const q = questionsData[current];
    const isCorrect = q.options[idx] === q.correct_answer;

    console.log(
      `🎯 Question ${current + 1}: Selected option ${idx}, Correct: ${
        questionsData[current].correctIndex
      }, Result: ${isCorrect ? "Correct" : "Wrong"}`
    );

    if (isCorrect) {
      // --- Stage 1: Jump ---
      setAnim("jump");
      // Set temporary jump target without triggering world scroll
      setJumpPosition({ row: current + 1, col: idx });

      // --- Stage 2: Scroll & Finalize ---
      setTimeout(() => {
        setAnim("idle");
        // Update the real player row, which triggers the world scroll
        setPlayerRow(current + 1);
        setPlayerCol(idx);
        setScore((s) => s + 1);
        setCorrectBuildings((prev) => {
          const updated = [...prev];
          updated[current] = idx;
          return updated;
        });
        // Clear the temporary jump position, player now tracks the scrolled building
        setJumpPosition(null);

        // --- Stage 3: Next Question ---
        setTimeout(() => {
          if (current < questionsData.length - 1) {
            setCurrent((c) => c + 1);
            setSelected(null);
          } else {
            setShowResult(true);
          }
        }, 500); // Wait for scroll to finish
      }, 500); // Duration of jump
    } else {
      // --- Stage 1: Jump to wrong building ---
      setAnim("jump");
      setJumpPosition({ row: current + 1, col: idx }); // Jump to wrong building

      setTimeout(() => {
        // --- Stage 2: Land and prepare to fall ---
        setPlayerRow(current + 1); // Officially move player to the wrong spot
        setPlayerCol(idx);
        setJumpPosition(null);
        setWronglySelectedBuilding({ row: current, col: idx });

        setTimeout(() => {
          // A brief pause on the building
          setAnim("fall");
          // --- Stage 3: Fall ---
          setTimeout(() => {
            setPlayerRow(0); // Reset player's logical position
            setAnim("idle");
            setShowPopup(true);
          }, 700); // Fall duration
        }, 200);
      }, 500); // Jump duration
    }
  }

  // Layout Constants
  const BUILDING_WIDTH = 150;
  const LEVEL_HEIGHT = 110;
  const PERSON_SIZE = 32;

  // Show loading state if no questions
  if (!questionsData || questionsData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-sky-100 p-4">
        <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-700">
            Loading Quiz...
          </h2>
          <div className="text-gray-600">Preparing questions for {topic}</div>
        </div>
      </div>
    );
  }

  // Final result screen
  if (showResult) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-sky-100 p-4">
        <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-2xl p-8 text-center">
          <h2 className="text-3xl font-bold mb-4 text-indigo-700">
            🎯 {topic} Quiz Completed!
          </h2>
          <div className="text-xl mb-6 text-gray-700">
            Your Score:{" "}
            <span className="font-bold text-2xl text-green-600">{score}</span> /{" "}
            {questionsData.length}
          </div>
          <div className="mb-6 text-gray-600">
            {score === questionsData.length
              ? "🏆 Perfect Score!"
              : score >= questionsData.length * 0.8
              ? "🌟 Excellent Work!"
              : score >= questionsData.length * 0.6
              ? "👍 Good Job!"
              : "📚 Keep Learning!"}
          </div>
          <button
            onClick={onGameComplete}
            className="rounded-lg bg-green-600 text-white px-8 py-3 font-semibold text-lg hover:bg-green-700 transition-transform hover:scale-105 shadow-lg"
          >
            Complete Quiz Game
          </button>
        </div>
      </div>
    );
  }

  const nextIdx = current + 1;
  if (nextIdx >= questionsData.length) {
    // 🤖 ADD THESE LINES
    analytics.markCompleted();
    analytics.saveAnalytics();

    setShowResult(true);
  }

  // Main game view
  return (
    <div className="w-full h-screen bg-gradient-to-b from-sky-200 to-sky-400 flex flex-col items-center justify-between p-4 overflow-hidden relative">
      <style>
        {`
            .building-fall {
                transition: transform 0.7s cubic-bezier(0.6, -0.28, 0.735, 0.045);
                transform: translateY(100vh) rotate(-15deg) !important;
            }
        `}
      </style>

      {/* --- DYNAMIC ELEMENTS (Popups, Player) --- */}

      {/* Wrong answer popup */}
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center text-center max-w-md">
            <span className="text-5xl mb-3">💀</span>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              You fell! Game Over.
            </h2>
            <div className="text-gray-600 mb-4">
              The correct answer was:{" "}
              <span className="font-bold text-green-600">
                {
                  questionsData[current]?.options[
                    questionsData[current]?.correctIndex
                  ]
                }
              </span>
            </div>
            <div className="flex gap-4 mt-2">
              <button
                onClick={resetGame}
                className="rounded-lg bg-yellow-500 text-white px-5 py-2 shadow-md hover:bg-yellow-600 transition-transform hover:scale-105"
              >
                🔄 Retry Quiz
              </button>
              <button
                onClick={onGameComplete}
                className="rounded-lg bg-indigo-600 text-white px-5 py-2 shadow-md hover:bg-indigo-700 transition-transform hover:scale-105"
              >
                🏠 Back to Games
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player Character */}
      {(() => {
        if (showPopup || showResult) return null;

        let horizontalOffset = 0;
        let verticalLevel = 20; // Default to ground level
        let fallClass = anim === "fall" ? "building-fall" : "";

        const activePosition = jumpPosition || {
          row: playerRow,
          col: playerCol,
        };
        const scrollOffset = playerRow > 1 ? (playerRow - 1) * LEVEL_HEIGHT : 0;

        if (activePosition.row > 0 && activePosition.col !== null) {
          const options = questionsData[activePosition.row - 1]?.options || [];
          const numOptions = options.length;
          if (numOptions > 0) {
            horizontalOffset =
              (activePosition.col - (numOptions - 1) / 2) *
              (BUILDING_WIDTH + 24);
          }

          const buildingBottom = (activePosition.row - 1) * LEVEL_HEIGHT + 20;
          const buildingHeight = 100;
          const buildingNaturalTop = buildingBottom + buildingHeight;

          // Use the REAL playerRow for scroll offset, but the JUMP position for the target building
          verticalLevel = buildingNaturalTop - scrollOffset;
        }

        return (
          <div
            className={`absolute transition-all duration-500 ease-out flex flex-col items-center ${fallClass}`}
            style={{
              bottom: verticalLevel,
              left: `calc(50% + ${horizontalOffset}px)`,
              transform: "translateX(-50%)",
              zIndex: 20,
              filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.3))",
              transitionProperty: "bottom, left",
            }}
          >
            <span style={{ fontSize: PERSON_SIZE }}>
              {anim === "fall" ? "💀" : "🧑‍🚀"}
            </span>
          </div>
        );
      })()}

      {/* --- STATIC UI ELEMENTS --- */}

      {/* Top Section: Question and Score */}
      <div className="w-full max-w-5xl bg-white/70 backdrop-blur-sm p-4 rounded-xl shadow-lg text-center z-10">
        <h2 className="text-sm font-semibold text-indigo-600 mb-2">
          🎯 {topic} Quiz Challenge
        </h2>
        <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">
          {questionsData[current]?.question || "Quiz Complete!"}
        </h3>
        <div className="flex items-center justify-center gap-10 mt-2">
          <div className="text-md text-gray-600">
            Question {current + 1} of {questionsData.length}
          </div>
          <div className="text-md font-medium text-indigo-600">
            Score: {score}
          </div>
        </div>
      </div>

      {/* Game Area: Buildings */}
      <div
        className="absolute bottom-0 w-full transition-transform duration-500 ease-out"
        style={{
          height: `${questionsData.length * LEVEL_HEIGHT + 240}px`,
          transform: `translateY(${
            playerRow > 1 ? (playerRow - 1) * LEVEL_HEIGHT : 0
          }px)`,
        }}
      >
        {/* Ground */}
        <div className="absolute bottom-0 left-0 right-0 h-5 bg-green-700 z-0" />
        <div className="absolute bottom-5 left-0 right-0 h-5 bg-green-600 z-0" />

        {/* Render all rows of buildings */}
        {[...Array(questionsData.length)].map((_, rowIdx) => {
          const options = questionsData[rowIdx]?.options || [];

          return (
            <div
              key={rowIdx}
              className="absolute w-full"
              style={{
                bottom: rowIdx * LEVEL_HEIGHT + 20,
                height: "100px",
                zIndex: rowIdx === current ? 10 : 2,
              }}
            >
              {options.map((option, optionIdx) => {
                const isCurrentRow = rowIdx === current;
                const isPlatform =
                  rowIdx === current - 1 &&
                  correctBuildings[rowIdx] === optionIdx;

                if (!isCurrentRow && !isPlatform) return null;

                let buildingClass = "transition-all duration-300 absolute";
                const isSelected = selected === optionIdx && isCurrentRow;
                const isCorrect =
                  questionsData[current]?.correctIndex === optionIdx;

                if (
                  wronglySelectedBuilding &&
                  wronglySelectedBuilding.row === rowIdx &&
                  wronglySelectedBuilding.col === optionIdx
                ) {
                  buildingClass += " building-fall";
                }

                return (
                  <div
                    key={optionIdx}
                    onClick={() => isCurrentRow && handleSelect(optionIdx)}
                    className={`${buildingClass} ${
                      isCurrentRow && selected === null
                        ? "cursor-pointer hover:scale-105"
                        : "cursor-default"
                    }`}
                    style={{
                      width: BUILDING_WIDTH,
                      height: 100,
                      background: isSelected
                        ? isCorrect
                          ? "#d1fae5"
                          : "#fee2e2"
                        : isPlatform
                        ? "#a7f3d0"
                        : "#e0e7ff",
                      border: `3px solid ${
                        isSelected
                          ? isCorrect
                            ? "#10b981"
                            : "#ef4444"
                          : isPlatform
                          ? "#059669"
                          : "#6366f1"
                      }`,
                      borderRadius: "8px 8px 0 0",
                      boxShadow: `0 4px 16px ${
                        isSelected
                          ? isCorrect
                            ? "rgba(16,185,129,0.3)"
                            : "rgba(239,68,68,0.3)"
                          : isPlatform
                          ? "rgba(34,197,94,0.2)"
                          : "rgba(99,102,241,0.2)"
                      }`,
                      left: `calc(50% + ${
                        (optionIdx - (options.length - 1) / 2) *
                        (BUILDING_WIDTH + 24)
                      }px)`,
                      transform: "translateX(-50%)",
                    }}
                  >
                    <div
                      className="h-full flex items-center justify-center font-semibold text-indigo-900 text-center p-2 text-sm md:text-base"
                      style={{ wordBreak: "break-word" }}
                    >
                      {isPlatform ? "✅" : option}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { GeneralKnowledgeGame };
export default GeneralKnowledgeGame;

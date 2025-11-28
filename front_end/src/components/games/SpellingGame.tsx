import { useMemo, useState, useEffect } from "react";
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useGameAnalytics } from "../../hooks/useGameAnalytics";
import { useUser } from "../../contexts/UserContext";

type Props = {
  topic: string;
  onGameComplete?: () => void;
  word?: string;
};

// Mirror reflections: [left_mirror, right_mirror, bottom_mirror]
const MIRROR_MAP: Record<string, string[]> = {
  A: ["∀", "A", "ɐ"],
  B: ["ᗺ", "B", "𐐒"],
  C: ["Ↄ", "C", "ɔ"],
  D: ["ꓷ", "D", "◖"],
  E: ["Ǝ", "E", "ɘ"],
  F: ["ᖵ", "F", "Ⅎ"],
  G: ["⅁", "G", "ɓ"],
  H: ["H", "H", "H"],
  I: ["I", "I", "I"],
  J: ["ᒐ", "J", "ſ"],
  K: ["ꓘ", "K", "ʞ"],
  L: ["⅃", "L", "˩"],
  M: ["W", "M", "W"],
  N: ["ᴎ", "N", "u"],
  O: ["O", "O", "O"],
  P: ["q", "P", "d"],
  Q: ["Q", "Q", "Q"],
  R: ["ᴿ", "R", "ɹ"],
  S: ["Ƨ", "S", "s"],
  T: ["⊥", "T", "┴"],
  U: ["∩", "U", "n"],
  V: ["Λ", "V", "ʌ"],
  W: ["M", "W", "M"],
  X: ["X", "X", "X"],
  Y: ["⅄", "Y", "ʎ"],
  Z: ["Z", "Z", "Z"],
};

const REQUIRED_COUNT = 5;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function SpellingGame({
  topic,
  onGameComplete,
  word: providedWord,
}: Props) {
  // 🤖 ADD THESE LINES:
  const { user } = useUser();
  const analytics = useGameAnalytics(
    "spelling",
    topic,
    user?.email || "test@playfinity.com",
    user?.disability
  );

  // Get disability-specific theme
  const getTheme = () => {
    const baseTheme = {
      animations: "transition-all duration-500 ease-in-out",
      shadow: "shadow-2xl drop-shadow-lg",
      glow: "drop-shadow-[0_0_20px_rgba(139,92,246,0.3)]",
    };

    switch (user?.disability) {
      case "ADHD":
        return {
          ...baseTheme,
          bg: "bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100",
          cardBg: "bg-white/95 backdrop-blur-xl border border-emerald-200/50",
          textPrimary: "text-emerald-900",
          textSecondary: "text-emerald-700",
          accent: "text-teal-600",
          button:
            "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white",
          buttonSecondary:
            "bg-gradient-to-r from-emerald-100 to-teal-100 hover:from-emerald-200 hover:to-teal-200 text-emerald-800 border-3 border-emerald-400",
          progress: "bg-gradient-to-r from-emerald-500 to-teal-500",
          correct: "text-emerald-700 bg-emerald-100",
          wrong: "text-red-600 bg-red-50",
          letterDisplay:
            "bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200",
          glow: "drop-shadow-[0_0_25px_rgba(16,185,129,0.4)]",
          fontSize: "text-lg",
          focusRing: "focus:ring-4 focus:ring-emerald-300",
        };
      case "Dyslexia":
        return {
          ...baseTheme,
          bg: "bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100",
          cardBg: "bg-white/95 backdrop-blur-xl border border-blue-200/50",
          textPrimary: "text-blue-900",
          textSecondary: "text-blue-700",
          accent: "text-indigo-600",
          button:
            "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white",
          buttonSecondary:
            "bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-800 border-3 border-blue-400",
          progress: "bg-gradient-to-r from-blue-500 to-indigo-500",
          correct: "text-blue-700 bg-blue-100",
          wrong: "text-red-600 bg-red-50",
          letterDisplay:
            "bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200",
          glow: "drop-shadow-[0_0_25px_rgba(59,130,246,0.4)]",
          fontSize: "text-lg",
          focusRing: "focus:ring-4 focus:ring-blue-300",
        };
      case "Visual":
        return {
          ...baseTheme,
          bg: "bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-100",
          cardBg: "bg-white/98 backdrop-blur-xl border border-amber-300/70",
          textPrimary: "text-gray-900",
          textSecondary: "text-gray-800",
          accent: "text-amber-700",
          button:
            "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white",
          buttonSecondary:
            "bg-gradient-to-r from-amber-100 to-orange-100 hover:from-amber-200 hover:to-orange-200 text-amber-800 border-3 border-amber-400",
          progress: "bg-gradient-to-r from-amber-500 to-orange-500",
          correct: "text-amber-700 bg-amber-100",
          wrong: "text-red-700 bg-red-100",
          letterDisplay:
            "bg-gradient-to-br from-amber-50 to-orange-50 border-3 border-amber-300",
          glow: "drop-shadow-[0_0_30px_rgba(245,158,11,0.5)]",
          fontSize: "text-2xl",
          focusRing: "focus:ring-6 focus:ring-amber-400",
        };
      case "Autism":
        return {
          ...baseTheme,
          bg: "bg-gradient-to-br from-slate-100 via-gray-50 to-zinc-100",
          cardBg: "bg-white/95 backdrop-blur-xl border border-slate-200/50",
          textPrimary: "text-slate-900",
          textSecondary: "text-slate-700",
          accent: "text-gray-600",
          button:
            "bg-gradient-to-r from-slate-600 to-gray-600 hover:from-slate-700 hover:to-gray-700 text-white",
          buttonSecondary:
            "bg-gradient-to-r from-slate-100 to-gray-100 hover:from-slate-200 hover:to-gray-200 text-slate-800 border-3 border-slate-400",
          progress: "bg-gradient-to-r from-slate-600 to-gray-600",
          correct: "text-slate-700 bg-slate-100",
          wrong: "text-red-600 bg-red-50",
          letterDisplay:
            "bg-gradient-to-br from-slate-50 to-gray-50 border-2 border-slate-200",
          glow: "drop-shadow-[0_0_25px_rgba(100,116,139,0.4)]",
          fontSize: "text-lg",
          focusRing: "focus:ring-4 focus:ring-slate-300",
        };
      default:
        return {
          ...baseTheme,
          bg: "bg-gradient-to-br from-violet-100 via-purple-50 to-fuchsia-100",
          cardBg: "bg-white/95 backdrop-blur-xl border border-violet-200/50",
          textPrimary: "text-violet-900",
          textSecondary: "text-violet-700",
          accent: "text-purple-600",
          button:
            "bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white",
          buttonSecondary:
            "bg-gradient-to-r from-violet-100 to-purple-100 hover:from-violet-200 hover:to-purple-200 text-violet-800 border-3 border-violet-400",
          progress: "bg-gradient-to-r from-violet-500 to-purple-500",
          correct: "text-violet-700 bg-violet-100",
          wrong: "text-red-600 bg-red-50",
          letterDisplay:
            "bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200",
          glow: "drop-shadow-[0_0_25px_rgba(139,92,246,0.4)]",
          fontSize: "text-lg",
          focusRing: "focus:ring-4 focus:ring-violet-300",
        };
    }
  };

  const theme = getTheme();

  const gameWord = useMemo(() => {
    if (providedWord) {
      return providedWord.toUpperCase().replace(/[^A-Z]/g, "");
    }
    return (topic || "TOPIC").toUpperCase().replace(/[^A-Z]/g, "");
  }, [topic, providedWord]);

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<null | "correct" | "wrong">(null);
  const [message, setMessage] = useState<string>("");
  const [letterCounts, setLetterCounts] = useState<Record<string, any>>({});

  const currentChar = gameWord[index] || "";

  const options = useMemo(() => {
    if (!currentChar) return [];
    const mirrors = MIRROR_MAP[currentChar] || [
      currentChar,
      currentChar,
      currentChar,
    ];
    const opts = [currentChar, ...mirrors];
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    return opts;
  }, [currentChar]);

  useEffect(() => {
    if (user?.email) {
      const userRef = doc(db, "users", user.email);
      const lettersCollectionRef = collection(userRef, "mastered_letters");

      const unsubscribe = onSnapshot(lettersCollectionRef, (snapshot) => {
        const counts: Record<string, any> = {};
        snapshot.forEach((doc) => {
          counts[doc.id] = doc.data();
        });
        setLetterCounts(counts);
      });

      return () => unsubscribe();
    }
  }, [user?.email]);

  // FIND the handlePick function and ADD analytics tracking:
  function handlePick(choice: string) {
    if (feedback) return;

    const isCorrect = choice === currentChar;

    // 🤖 ADD THIS LINE:
    analytics.trackAnswer(isCorrect);

    if (isCorrect) {
      setFeedback("correct");
      setScore((s) => s + 1);
      setMessage(`Correct! "${currentChar}"`);

      // Update Firebase mastered letters...
      if (user?.email) {
        const userRef = doc(db, "users", user.email);
        const letterRef = doc(
          collection(userRef, "mastered_letters"),
          currentChar
        );

        getDoc(letterRef)
          .then((docSnap) => {
            const currentCount = docSnap.exists()
              ? docSnap.data().spelling_count || 0
              : 0;
            setDoc(
              letterRef,
              {
                spelling_count: currentCount + 1,
                last_practiced: new Date(),
              },
              { merge: true }
            );
          })
          .catch((error) => {
            console.error("❌ Error updating spelling progress:", error);
          });
      }

      setTimeout(() => {
        const nextIdx = index + 1;
        if (nextIdx >= gameWord.length) {
          setMessage("🎉 Word Complete!");
          setFeedback(null);

          // 🤖 ADD THESE LINES:
          analytics.markCompleted();
          analytics.saveAnalytics();

          setTimeout(() => {
            if (onGameComplete) onGameComplete();
          }, 1500);
        } else {
          setIndex(nextIdx);
          setFeedback(null);
          setMessage("");
        }
      }, 800);
    } else {
      setFeedback("wrong");
      setMessage(`Try again!`);
      setTimeout(() => {
        setFeedback(null);
        setMessage("");
      }, 800);
    }
  }

  if (!gameWord) {
    return (
      <div className={`text-sm ${theme.textSecondary} text-center p-8`}>
        <div className="text-4xl mb-4">📝</div>
        No word available for spelling.
      </div>
    );
  }

  const progress = gameWord.length
    ? Math.round(((index + 1) / gameWord.length) * 100)
    : 0;

  // FIXED: Calculate spelling mastery using spelling_count instead of total count
  const spellingMasteredLettersCount = Object.values(letterCounts).filter(
    (letterData) => (letterData.spelling_count || 0) >= REQUIRED_COUNT
  ).length;
  const totalLetters = 26;
  const spellingMasteryProgress = Math.round(
    (spellingMasteredLettersCount / totalLetters) * 100
  );

  return (
    <div className={`min-h-[80vh] ${theme.bg} p-6 rounded-3xl ${theme.shadow}`}>
      <div
        className={`${theme.cardBg} rounded-2xl p-8 ${theme.shadow} backdrop-blur-xl`}
      >
        {/* Elegant Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-4xl animate-bounce">📝</span>
            <h1
              className={`text-3xl font-bold ${theme.textPrimary} ${theme.glow}`}
            >
              Spelling Mastery
            </h1>
            <span
              className="text-4xl animate-bounce"
              style={{ animationDelay: "0.2s" }}
            >
              ✨
            </span>
          </div>
          <p className={`${theme.textSecondary} ${theme.fontSize} font-medium`}>
            Master the art of perfect spelling with {topic}
          </p>
        </div>

        {/* Luxurious Progress Section */}
        <div className="flex items-center justify-center gap-8 mb-8">
          <div
            className={`px-6 py-3 rounded-full ${theme.letterDisplay} ${theme.shadow}`}
          >
            <span
              className={`${theme.textSecondary} ${theme.fontSize} font-medium`}
            >
              Letter {index + 1} of {gameWord.length}
            </span>
          </div>
          <div
            className={`px-6 py-3 rounded-full ${theme.letterDisplay} ${theme.shadow}`}
          >
            <span className={`${theme.accent} ${theme.fontSize} font-bold`}>
              Score: {score} ⭐
            </span>
          </div>
        </div>

        {/* Enhanced Progress Bar */}
        <div className="mb-8">
          <div className="relative">
            <div className="h-4 bg-gray-200/50 rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full ${theme.progress} ${theme.animations} relative overflow-hidden`}
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
            <div
              className={`text-center mt-2 ${theme.textSecondary} text-sm font-medium`}
            >
              {progress}% Complete
            </div>
          </div>
        </div>

        {/* FIXED: Spelling Mastery Progress Bar */}
        <div className="mb-8">
          <h3
            className={`text-xl font-semibold mb-2 text-center ${theme.textPrimary}`}
          >
            Spelling Mastery Progress
          </h3>
          <div className="relative">
            <div className="h-6 bg-gray-200/50 rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full bg-blue-500 ${theme.animations} relative overflow-hidden`}
                style={{ width: `${spellingMasteryProgress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
            <div
              className={`text-center mt-2 ${theme.textSecondary} text-sm font-medium`}
            >
              {spellingMasteredLettersCount} of {totalLetters} letters mastered
              in spelling ({spellingMasteryProgress}%)
            </div>
          </div>
        </div>

        {/* Premium Topic Display */}
        <div className="text-center mb-8">
          <div
            className={`inline-block px-8 py-4 ${theme.letterDisplay} rounded-2xl ${theme.shadow} border-2`}
          >
            <p className={`${theme.textSecondary} text-sm font-medium mb-2`}>
              Spelling Challenge for:
            </p>
            <h2 className={`text-2xl font-bold ${theme.accent} mb-4`}>
              {topic}
            </h2>

            {/* Elegant Word Display */}
            <div className="flex justify-center items-center gap-2 flex-wrap">
              {gameWord.split("").map((char, idx) => (
                <div
                  key={idx}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold ${
                    theme.animations
                  } ${
                    idx === index
                      ? `${theme.accent} bg-white ${theme.shadow} scale-110 animate-pulse`
                      : idx < index
                      ? `${theme.correct} ${theme.shadow}`
                      : `${theme.textSecondary} bg-gray-100 ${theme.shadow}`
                  }`}
                >
                  {idx < index ? char : idx === index ? "?" : "_"}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Majestic Current Letter Display */}
        <div className="text-center mb-8">
          <div
            className={`inline-block p-8 ${theme.letterDisplay} rounded-3xl ${theme.shadow} ${theme.glow} border-2`}
          >
            <p
              className={`${theme.textSecondary} ${theme.fontSize} font-medium mb-4`}
            >
              Identify this letter:
            </p>
            <div
              className={`text-8xl font-bold ${theme.animations} ${
                feedback === "correct"
                  ? `${theme.correct} animate-bounce`
                  : feedback === "wrong"
                  ? `${theme.wrong} animate-shake`
                  : theme.textPrimary
              }`}
            >
              {currentChar}
            </div>
          </div>
        </div>

        {/* Feedback Message */}
        {message && (
          <div className="text-center mb-8">
            <div
              className={`inline-block px-8 py-4 rounded-2xl ${theme.shadow} ${
                theme.animations
              } ${
                feedback === "correct"
                  ? `${theme.correct} border-2 border-green-300 animate-pulse`
                  : `${theme.wrong} border-2 border-red-300 animate-bounce`
              }`}
            >
              <span className={`${theme.fontSize} font-bold`}>{message}</span>
            </div>
          </div>
        )}

        {/* Instruction Text */}
        <div className="text-center mb-8">
          <p
            className={`${theme.textSecondary} ${theme.fontSize} font-medium italic`}
          >
            Choose the character that perfectly matches the letter above
          </p>
        </div>

        {/* Luxurious Option Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 justify-center max-w-4xl mx-auto">
          {options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handlePick(opt)}
              disabled={feedback === "correct"}
              className={`
                relative group overflow-hidden rounded-xl
                ${theme.shadow} ${theme.animations} ${theme.focusRing}
                ${
                  feedback === "correct"
                    ? "cursor-not-allowed opacity-75"
                    : "hover:scale-105 active:scale-95 transform"
                }
                ${
                  opt === currentChar
                    ? theme.button
                    : "bg-gradient-to-br from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 text-gray-800 border-2 border-gray-200"
                }
                h-20 w-20 text-4xl font-bold flex items-center justify-center
                transition-all duration-300 ease-in-out
              `}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
              <div className="relative z-10 p-6 flex items-center justify-center">
                <span className="font-bold drop-shadow-sm">{opt}</span>
              </div>
              {feedback !== "correct" && (
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/10 rounded-xl transition-opacity"></div>
              )}
            </button>
          ))}
        </div>

        {/* FIXED: Individual Letter Progress Bars Section - Using spelling_count */}
        <div className="mt-12 mb-8">
          <h3
            className={`text-xl font-semibold mb-4 text-center ${theme.textPrimary}`}
          >
            Spelling Letter Progress
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {ALPHABET.map((letter) => {
              const letterData = letterCounts[letter] || {};
              const spellingCount = letterData.spelling_count || 0;
              const drawingCount = letterData.drawing_count || 0;
              const spellingProgress = Math.round(
                (spellingCount / REQUIRED_COUNT) * 100
              );
              const isSpellingMastered = spellingCount >= REQUIRED_COUNT;
              const barColor = isSpellingMastered
                ? "bg-blue-500"
                : "bg-blue-300";

              return (
                <div key={letter} className="flex flex-col items-center">
                  <div className={`flex items-center gap-2 mb-1`}>
                    <span className={`text-lg font-bold ${theme.textPrimary}`}>
                      {letter}
                    </span>
                    {isSpellingMastered && (
                      <span className="text-blue-500 font-bold">📝✅</span>
                    )}
                  </div>
                  <div className="w-full h-2 bg-gray-200/50 rounded-full overflow-hidden shadow-inner relative">
                    <div
                      className={`h-full ${barColor} ${theme.animations}`}
                      style={{ width: `${Math.min(100, spellingProgress)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-center mt-1">
                    <div className={`font-semibold ${theme.textPrimary}`}>
                      {spellingProgress}%
                    </div>
                    <div className={`${theme.textSecondary} text-xs`}>
                      📝{spellingCount}/{REQUIRED_COUNT}
                    </div>
                    {drawingCount > 0 && (
                      <div className={`${theme.textSecondary} text-xs`}>
                        🎨{drawingCount}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Accessibility Info */}
        {user?.disability && (
          <div className="mt-8 text-center">
            <div
              className={`inline-block px-6 py-3 bg-white/60 rounded-full ${theme.shadow}`}
            >
              <span className={`${theme.textSecondary} text-sm font-medium`}>
                🎯 Optimized for {user.disability} learning
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

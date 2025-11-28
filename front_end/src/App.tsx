import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import Homepage from "./pages/homepage";
import BalloonMathQuiz from "./components/games/BalloonMathQuiz";
import GeneralKnowledgeGame from "./components/games/GeneralKnowledgeGame";
import { SpellingGame } from "./components/games/SpellingGame";

function App() {
  return (
    <div className="min-h-screen">
      <header className="w-full bg-white/90 shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg">Playfinity</Link>
          <nav className="flex gap-3">
            <Link to="/" className="text-sm text-gray-700 hover:underline">Home</Link>
            <Link to="/spelling" className="text-sm text-gray-700 hover:underline">Spelling</Link>
            <Link to="/balloon" className="text-sm text-gray-700 hover:underline">Balloon</Link>
            <Link to="/quiz" className="text-sm text-gray-700 hover:underline">Quiz</Link>
          </nav>
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/spelling" element={<SpellingGame topic="Animals" onGameComplete={() => { window.location.href = "/"; }} />} />
          <Route path="/balloon" element={<BalloonMathQuiz onGameComplete={() => { window.location.href = "/"; }} />} />
          <Route path="/quiz" element={<GeneralKnowledgeGame topic="General Knowledge" onGameComplete={() => { window.location.href = "/"; }} />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
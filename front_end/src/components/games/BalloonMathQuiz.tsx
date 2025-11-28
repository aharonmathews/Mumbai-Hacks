/// <reference path="../../types/matter-js.d.ts" />
import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useGameAnalytics } from "../../hooks/useGameAnalytics";
import { useUser } from "../../contexts/UserContext";
import Matter from "matter-js";

interface GameProps {
  topic?: string;
  mathQuestions?: Array<{
    question: string;
    answer: number;
    options: number[];
  }>;
  onGameComplete?: () => void;
}

// --- Helper Functions & Constants ---
function shuffleArray<T>(array: T[]): T[] {
  return [...array].sort(() => Math.random() - 0.5);
}

// Default fallback questions
const generateDefaultQuestion = () => {
  const num1 = Math.floor(Math.random() * 9) + 2;
  const num2 = Math.floor(Math.random() * 9) + 2;
  const answer = num1 * num2;
  const options = new Set([answer]);
  while (options.size < 4) {
    const wrongOption = answer + (Math.floor(Math.random() * 10) - 5);
    if (wrongOption !== answer && wrongOption > 0) {
      options.add(wrongOption);
    }
  }
  return {
    question: `${num1} × ${num2} = ?`,
    answer: answer,
    options: shuffleArray(Array.from(options)),
  };
};

const CATEGORY_BALLOON = 0x0001;
const CATEGORY_PROJECTILE = 0x0002;

// --- React Components ---
const QuestionDisplay = ({ text }: { text: string }) => (
  <div
    className="absolute top-2 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-md p-3 rounded-xl border border-indigo-500/50 shadow-lg shadow-indigo-500/20 z-30 max-w-[90%]"
    role="alert"
    aria-live="polite"
  >
    <h2
      className="text-sm md:text-lg font-bold text-white tracking-wider font-mono select-none text-center leading-tight"
      style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
    >
      {text}
    </h2>
  </div>
);

const GameMessage = ({
  message,
  color,
}: {
  message: string | null;
  color: string;
}) => (
  <AnimatePresence>
    {message && (
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1.2 }}
        exit={{ opacity: 0, scale: 0.5 }}
        transition={{ duration: 0.5, type: "spring" }}
        role="alert"
        aria-live="assertive"
      >
        <h1
          className={`text-6xl md:text-8xl font-extrabold ${color} select-none`}
          style={{
            textShadow:
              "0 0 15px currentColor, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000",
          }}
        >
          {message}
        </h1>
      </motion.div>
    )}
  </AnimatePresence>
);

const GameOverModal = ({ onRestart }: { onRestart: () => void }) => (
  <motion.div
    className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    <motion.div
      className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl text-center shadow-2xl shadow-red-500/20 border-2 border-red-500 w-11/12 max-w-md"
      initial={{ scale: 0.5, y: 50 }}
      animate={{ scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <h2 className="text-4xl font-bold text-red-400 mb-2 select-none">
        💥 BOOM! 💥
      </h2>
      <p className="text-lg text-gray-300 mb-8 select-none">
        That wasn't the right answer.
      </p>
      <button
        onClick={onRestart}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg text-lg transition-all transform hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-400 focus:ring-opacity-50"
      >
        Try Again
      </button>
    </motion.div>
  </motion.div>
);

const GameCompleteModal = ({
  onRestart,
  onGameComplete,
}: {
  onRestart: () => void;
  onGameComplete?: () => void;
}) => (
  <motion.div
    className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    <motion.div
      className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl text-center shadow-2xl shadow-green-500/20 border-2 border-green-500 w-11/12 max-w-md"
      initial={{ scale: 0.5, y: 50 }}
      animate={{ scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: "spring" }}
      >
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-bold text-green-400 mb-2 select-none">
          Amazing Work!
        </h2>
        <p className="text-lg text-gray-300 mb-8 select-none">
          You've completed all the math challenges!
        </p>
      </motion.div>

      <div className="flex gap-4">
        <button
          onClick={onRestart}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg text-lg transition-all transform hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-400 focus:ring-opacity-50"
        >
          Play Again
        </button>
        {onGameComplete && (
          <button
            onClick={onGameComplete}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg text-lg transition-all transform hover:scale-105 hover:shadow-lg hover:shadow-green-500/50 focus:outline-none focus:ring-4 focus:ring-green-400 focus:ring-opacity-50"
          >
            Continue
          </button>
        )}
      </div>
    </motion.div>
  </motion.div>
);

// --- Main Game Component ---
const BalloonMathQuiz: React.FC<GameProps> = ({
  topic,
  mathQuestions,
  onGameComplete,
}) => {
  // 🤖 AGENTIC: Initialize analytics tracking
  const { user } = useUser();
  const analytics = useGameAnalytics(
    "balloon_math",
    topic || "Math",
    user?.email || "test@playfinity.com",
    user?.disability
  );

  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef(Matter.Engine.create());
  const runnerRef = useRef(Matter.Runner.create());
  const renderRef = useRef<Matter.Render | null>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const trajectoryPointsRef = useRef<Matter.Vector[]>([]);
  const balloonBodiesRef = useRef<Matter.Body[]>([]);
  const particlesRef = useRef<any[]>([]);
  const projectileRef = useRef<Matter.Body | null>(null);

  // ✅ CRITICAL FIX: Process Firebase data with extensive debugging
  const QUESTIONS = React.useMemo(() => {
    console.log("🔥🔥🔥 RAW FIREBASE DATA RECEIVED:");
    console.log("mathQuestions:", mathQuestions);

    if (mathQuestions && mathQuestions.length > 0) {
      console.log("🔥 Processing Firebase Questions:");
      const processedQuestions = mathQuestions.map((q, index) => {
        // ✅ Ensure answer and options are numbers
        const answer =
          typeof q.answer === "string" ? parseInt(q.answer) : q.answer;
        const options = q.options.map((opt) =>
          typeof opt === "string" ? parseInt(opt) : opt
        );

        console.log(`   Question ${index + 1}:`);
        console.log(`     Raw Question:`, q);
        console.log(
          `     Processed Answer: ${answer} (type: ${typeof answer})`
        );
        console.log(
          `     Processed Options: ${JSON.stringify(options)} (types: ${options
            .map((o) => typeof o)
            .join(", ")})`
        );

        return {
          question: q.question,
          answer: answer,
          options: options,
        };
      });

      console.log("✅ Final processed questions:", processedQuestions);
      return processedQuestions;
    }

    console.log("⚠️ No Firebase questions provided, using default questions");
    return Array.from({ length: 3 }, generateDefaultQuestion);
  }, [mathQuestions]);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [gameState, setGameState] = useState("playing");
  const [isShooting, setIsShooting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [message, setMessage] = useState<string | null>(null);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);

  // ✅ Get current question properly
  const currentQuestion = QUESTIONS[currentQuestionIndex];

  // ✅ ULTRA DEBUG LOGGING
  console.log(`\n🎈🎈🎈 CURRENT GAME STATE:
    🔢 Total Questions: ${QUESTIONS.length}
    📍 Current Index: ${currentQuestionIndex}
    ❓ Current Question Text: "${currentQuestion?.question}"
    ✅ Current Answer: ${
      currentQuestion?.answer
    } (type: ${typeof currentQuestion?.answer})
    🎯 Current Options: [${currentQuestion?.options?.join(", ")}]
    🎯 Options Types: [${currentQuestion?.options
      ?.map((o) => typeof o)
      .join(", ")}]
    🎮 Game State: ${gameState}
    🏹 Is Shooting: ${isShooting}
    🔄 Is Transitioning: ${isTransitioning}
    📊 Correct Count: ${correctAnswersCount}
  `);

  const createExplosion = (x: number, y: number, color: string, count = 20) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const velocity = 2 + Math.random() * 4;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 1,
        color,
      });
    }
  };

  const removeProjectile = () => {
    if (projectileRef.current) {
      console.log("🗑️ Removing projectile from world");
      Matter.Composite.remove(engineRef.current.world, projectileRef.current);
      projectileRef.current = null;
    }
  };

  const removeBalloon = (balloonBody: Matter.Body) => {
    console.log(`💥 Removing balloon: ${balloonBody.label}`);
    Matter.Composite.remove(engineRef.current.world, balloonBody);
    balloonBodiesRef.current = balloonBodiesRef.current.filter(
      (balloon) => balloon.id !== balloonBody.id
    );
  };

  const setupMatterJS = () => {
    const engine = engineRef.current;
    engine.world.gravity.y = 0;

    const render = Matter.Render.create({
      element: sceneRef.current!,
      engine: engine,
      options: {
        width: dimensions.width,
        height: dimensions.height,
        wireframes: false,
        background: "transparent",
      },
    });
    renderRef.current = render;

    Matter.Events.on(render, "afterRender", () => {
      const ctx = render.canvas.getContext("2d")!;

      // Draw trajectory
      if (trajectoryPointsRef.current.length > 1 && !isShooting) {
        ctx.save();
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        trajectoryPointsRef.current.forEach((point, i) => {
          if (i === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
        ctx.restore();
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.02;
        particle.vy += 0.1;

        if (particle.life > 0) {
          ctx.save();
          ctx.fillStyle = particle.color;
          ctx.globalAlpha = particle.life;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          return true;
        }
        return false;
      });

      // ✅ Draw numbers on balloons
      balloonBodiesRef.current.forEach((balloon) => {
        const balloonValue = parseInt(balloon.label.split("-")[1]);

        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.font = "bold 24px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.strokeText(
          balloonValue.toString(),
          balloon.position.x,
          balloon.position.y
        );
        ctx.fillText(
          balloonValue.toString(),
          balloon.position.x,
          balloon.position.y
        );
        ctx.restore();
      });

      // Draw shooter
      const shooterPos = {
        x: dimensions.width / 2,
        y: dimensions.height - 100,
      };
      ctx.save();
      ctx.fillStyle = "#10b981";
      ctx.strokeStyle = "#065f46";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(shooterPos.x, shooterPos.y, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.fillText("🎯", shooterPos.x, shooterPos.y);
      ctx.restore();
    });

    const wallOptions = { isStatic: true, render: { visible: false } };
    Matter.Composite.add(engine.world, [
      Matter.Bodies.rectangle(
        dimensions.width / 2,
        -25,
        dimensions.width,
        50,
        wallOptions
      ),
      Matter.Bodies.rectangle(
        dimensions.width / 2,
        dimensions.height + 25,
        dimensions.width,
        50,
        wallOptions
      ),
      Matter.Bodies.rectangle(
        -25,
        dimensions.height / 2,
        50,
        dimensions.height,
        wallOptions
      ),
      Matter.Bodies.rectangle(
        dimensions.width + 25,
        dimensions.height / 2,
        50,
        dimensions.height,
        wallOptions
      ),
    ]);

    Matter.Render.run(render);
    Matter.Runner.run(runnerRef.current, engine);

    setupEventListeners(render.canvas);
    setupCollisionHandler(engine);
  };

  const addBalloons = (questionData: { options: number[]; answer: number }) => {
    if (!questionData || !questionData.options) {
      console.error("❌ No question data provided to addBalloons");
      return;
    }

    console.log(
      `\n🎈🎈🎈 ADDING BALLOONS FOR QUESTION ${currentQuestionIndex + 1}:`
    );
    console.log(`   📝 Question Text: "${currentQuestion?.question}"`);
    console.log(
      `   ✅ Expected Answer: ${
        questionData.answer
      } (type: ${typeof questionData.answer})`
    );
    console.log(
      `   🎯 Available Options: [${questionData.options.join(", ")}]`
    );
    console.log(
      `   🔍 Option Types: [${questionData.options
        .map((o) => typeof o)
        .join(", ")}]`
    );

    const engine = engineRef.current;
    const balloonColors = ["#ef4444", "#f97316", "#84cc16", "#3b82f6"];

    const numericOptions = questionData.options.map((opt, i) => {
      let num: number;
      if (typeof opt === "string") {
        num = parseInt(opt);
        console.log(
          `   🔄 Converting option ${i}: "${opt}" (string) -> ${num} (number)`
        );
      } else if (typeof opt === "number") {
        num = opt;
        console.log(`   ✅ Option ${i} already number: ${num}`);
      } else {
        console.error(`   ❌ Invalid option ${i}:`, opt);
        num = 0;
      }
      return num;
    });

    console.log(`   🎯 Final Numeric Options: [${numericOptions.join(", ")}]`);

    const balloonBodies = numericOptions.map((option, index) => {
      const spacing = dimensions.width / (numericOptions.length + 1);
      const x = spacing * (index + 1);
      const y =
        dimensions.height * 0.3 + Math.random() * (dimensions.height * 0.2);

      const balloon = Matter.Bodies.circle(x, y, 60, {
        label: `balloon-${option}`,
        render: {
          fillStyle: balloonColors[index % balloonColors.length],
          strokeStyle: "#000000",
          lineWidth: 2,
        },
        collisionFilter: {
          category: CATEGORY_BALLOON,
          mask: CATEGORY_PROJECTILE,
        },
        isStatic: true,
      });

      console.log(
        `   ✅ Created balloon ${index + 1}: value=${option}, label="${
          balloon.label
        }"`
      );
      return balloon;
    });

    // Clear existing balloons
    balloonBodiesRef.current.forEach((body) => {
      Matter.Composite.remove(engine.world, body);
    });

    Matter.Composite.add(engine.world, balloonBodies);
    balloonBodiesRef.current = balloonBodies;

    console.log(
      `✅ Successfully added ${balloonBodies.length} balloons to world`
    );
    console.log(
      `   🏷️ All Balloon Labels: [${balloonBodies
        .map((b) => b.label)
        .join(", ")}]`
    );

    // ✅ VALIDATION: Check if answer exists in options
    const answerExists = numericOptions.includes(questionData.answer);
    console.log(
      `   🎯 Answer Validation: Does ${questionData.answer} exist in options? ${answerExists}`
    );
    if (!answerExists) {
      console.error(
        `❌❌❌ CRITICAL ERROR: Answer ${
          questionData.answer
        } not found in options [${numericOptions.join(", ")}]`
      );
    }
  };

  const setupEventListeners = (canvas: HTMLCanvasElement) => {
    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mousePosRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      drawTrajectory();
    };

    const handleMouseUp = () => shoot();

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);

    const updateTrajectory = () => {
      drawTrajectory();
      requestAnimationFrame(updateTrajectory);
    };
    updateTrajectory();
  };

  const drawTrajectory = () => {
    const engine = engineRef.current;
    const world = engine.world;
    const shooterPos = { x: dimensions.width / 2, y: dimensions.height - 100 };
    const angle = Math.atan2(
      mousePosRef.current.y - shooterPos.y,
      mousePosRef.current.x - shooterPos.x
    );

    const points = [shooterPos];
    const allBodies = Matter.Composite.allBodies(world);
    let currentPos = { ...shooterPos };
    let currentAngle = angle;

    for (let i = 0; i < 8; i++) {
      currentPos = {
        x: currentPos.x + Math.cos(currentAngle) * 100,
        y: currentPos.y + Math.sin(currentAngle) * 100,
      };

      const collision = allBodies.find((body) => {
        if (body.isStatic && body.render.visible === false) {
          const distance = Math.sqrt(
            Math.pow(currentPos.x - body.position.x, 2) +
              Math.pow(currentPos.y - body.position.y, 2)
          );
          return distance < 50;
        }
        return false;
      });

      if (collision) {
        if (
          collision.position.y < 50 ||
          collision.position.y > dimensions.height - 50
        ) {
          currentAngle = -currentAngle;
        } else {
          currentAngle = Math.PI - currentAngle;
        }
      }

      points.push({ ...currentPos });
    }
    trajectoryPointsRef.current = points;
  };

  const setupCollisionHandler = (engine: Matter.Engine) => {
    Matter.Events.on(
      engine,
      "collisionStart",
      (event: Matter.IEventCollision<Matter.Engine>) => {
        event.pairs.forEach((pair) => {
          const { bodyA, bodyB } = pair;
          let balloonBody: Matter.Body | null = null;
          let projectileBody: Matter.Body | null = null;

          if (
            bodyA.label.startsWith("balloon-") &&
            bodyB.label === "projectile"
          ) {
            balloonBody = bodyA;
            projectileBody = bodyB;
          } else if (
            bodyB.label.startsWith("balloon-") &&
            bodyA.label === "projectile"
          ) {
            balloonBody = bodyB;
            projectileBody = bodyA;
          }

          if (balloonBody && projectileBody) {
            const balloonValueStr = balloonBody.label.split("-")[1];
            const balloonValue = parseInt(balloonValueStr);
            const correctAnswer = parseInt(currentQuestion.answer.toString());
            const isCorrect = balloonValue === correctAnswer;

            console.log(`\n🎯🎯🎯 COLLISION DETECTION ULTRA DEBUG:`);
            console.log(`   🎈 Balloon Full Label: "${balloonBody.label}"`);
            console.log(`   🔍 Extracted Value String: "${balloonValueStr}"`);
            console.log(
              `   🔢 Balloon Value (parsed): ${balloonValue} (type: ${typeof balloonValue})`
            );
            console.log(
              `   ✅ Current Question Answer: ${
                currentQuestion.answer
              } (type: ${typeof currentQuestion.answer})`
            );
            console.log(
              `   🔄 Correct Answer (parsed): ${correctAnswer} (type: ${typeof correctAnswer})`
            );
            console.log(
              `   🎯 Comparison: ${balloonValue} === ${correctAnswer} = ${isCorrect}`
            );
            console.log(
              `   📍 Question Index: ${currentQuestionIndex + 1}/${
                QUESTIONS.length
              }`
            );
            console.log(`   🎮 Game State: ${gameState}`);

            if (isNaN(balloonValue)) {
              console.error(
                `❌ Invalid balloon value: "${balloonValueStr}" -> ${balloonValue}`
              );
              return;
            }
            if (isNaN(correctAnswer)) {
              console.error(
                `❌ Invalid correct answer: ${currentQuestion.answer} -> ${correctAnswer}`
              );
              return;
            }

            handleHit(balloonBody, isCorrect);
          }
        });
      }
    );
  };

  // ✅ COMPLETELY FIXED: The main issue was here - race conditions and duplicate calls
  const handleHit = (balloonBody: Matter.Body, isCorrect: boolean) => {
    // ✅ CRITICAL: Check if we're already processing or game is not in playing state
    if (isTransitioning || gameState !== "playing") {
      console.log(
        `🔄 Ignoring hit - isTransitioning: ${isTransitioning}, gameState: ${gameState}`
      );
      return;
    }

    console.log(`\n💥💥💥 HIT PROCESSING STARTED:`);
    console.log(
      `   📍 Question Index: ${currentQuestionIndex + 1}/${QUESTIONS.length}`
    );
    console.log(`   ✅ Is Correct: ${isCorrect}`);
    console.log(`   🎮 Game State: ${gameState}`);

    // ✅ IMMEDIATELY set transitioning to prevent duplicate hits
    setIsTransitioning(true);

    // Remove projectile and balloon immediately
    removeProjectile();
    removeBalloon(balloonBody);

    // Create explosion effect
    createExplosion(
      balloonBody.position.x,
      balloonBody.position.y,
      balloonBody.render.fillStyle as string,
      40
    );

    analytics.trackAnswer(isCorrect);

    if (isCorrect) {
      console.log(`✅✅✅ CORRECT ANSWER! Processing progression...`);

      setMessage("Correct!");
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      // Update correct answers count
      const newCorrectCount = correctAnswersCount + 1;
      setCorrectAnswersCount(newCorrectCount);

      // ✅ FIXED: Use the updated count for progression logic
      setTimeout(() => {
        setMessage(null);

        const nextIndex = currentQuestionIndex + 1;
        console.log(`🔄 QUESTION PROGRESSION LOGIC:`);
        console.log(`   📍 Current Index: ${currentQuestionIndex}`);
        console.log(`   ➡️ Next Index: ${nextIndex}`);
        console.log(`   📊 Total Questions: ${QUESTIONS.length}`);
        console.log(
          `   🏁 Will Complete Game: ${nextIndex >= QUESTIONS.length}`
        );
        console.log(`   ✅ New Correct Count: ${newCorrectCount}`);

        if (nextIndex >= QUESTIONS.length) {
          console.log("🎉🎉🎉 ALL QUESTIONS COMPLETED!");

          analytics.markCompleted();
          analytics.saveAnalytics();
          setGameState("won");
          setIsTransitioning(false);
        } else {
          console.log(
            `⏭️ MOVING TO QUESTION ${nextIndex + 1}/${QUESTIONS.length}`
          );
          setCurrentQuestionIndex(nextIndex);
          // ✅ CRITICAL: Reset states after updating question index
          setIsShooting(false);
          setIsTransitioning(false);
        }
      }, 1500);
    } else {
      console.log("❌❌❌ WRONG ANSWER!");
      setMessage("Wrong!");

      // ✅ FIXED: Only set to lost after message timeout
      setTimeout(() => {
        setGameState("lost");
        setIsTransitioning(false);
      }, 1500);
    }
  };

  const shoot = () => {
    if (isShooting || gameState !== "playing" || isTransitioning) {
      console.log(
        `🚫 Cannot shoot: isShooting=${isShooting}, gameState=${gameState}, isTransitioning=${isTransitioning}`
      );
      return;
    }

    console.log("🎯 Shooting projectile...");
    setIsShooting(true);
    trajectoryPointsRef.current = [];
    const engine = engineRef.current;
    const shooterPos = { x: dimensions.width / 2, y: dimensions.height - 100 };
    const angle = Math.atan2(
      mousePosRef.current.y - shooterPos.y,
      mousePosRef.current.x - shooterPos.x
    );

    const projectile = Matter.Bodies.circle(shooterPos.x, shooterPos.y, 20, {
      label: "projectile",
      render: {
        fillStyle: "#facc15",
        strokeStyle: "#000000",
        lineWidth: 2,
      },
      collisionFilter: {
        category: CATEGORY_PROJECTILE,
        mask: CATEGORY_BALLOON | 0xffff,
      },
      friction: 0.05,
      frictionAir: 0.001,
      restitution: 0.8,
      density: 0.01,
    });
    projectileRef.current = projectile;

    Matter.Body.setVelocity(projectile, {
      x: Math.cos(angle) * 30,
      y: Math.sin(angle) * 30,
    });
    Matter.Composite.add(engine.world, projectile);

    setTimeout(() => {
      if (isShooting && projectileRef.current && gameState === "playing") {
        console.log("⏰ Projectile timeout - resetting");
        removeProjectile();
        setIsShooting(false);
      }
    }, 5000);
  };

  const clearWorld = (clearStatic = false) => {
    const engine = engineRef.current;
    removeProjectile();

    balloonBodiesRef.current.forEach((body) => {
      Matter.Composite.remove(engine.world, body);
    });
    balloonBodiesRef.current = [];

    if (clearStatic) {
      Matter.Composite.allBodies(engine.world).forEach((body: Matter.Body) => {
        if (!body.isStatic || clearStatic) {
          Matter.Composite.remove(engine.world, body);
        }
      });
    }
  };

  const handleRestart = () => {
    console.log("🔄 Restarting game...");
    clearWorld(true);
    setCurrentQuestionIndex(0);
    setCorrectAnswersCount(0);
    setGameState("playing");
    setIsShooting(false);
    setIsTransitioning(false);
    setMessage(null);
    engineRef.current.world.gravity.y = 0;

    const wallOptions = { isStatic: true, render: { visible: false } };
    Matter.Composite.add(engineRef.current.world, [
      Matter.Bodies.rectangle(
        dimensions.width / 2,
        -25,
        dimensions.width,
        50,
        wallOptions
      ),
      Matter.Bodies.rectangle(
        dimensions.width / 2,
        dimensions.height + 25,
        dimensions.width,
        50,
        wallOptions
      ),
      Matter.Bodies.rectangle(
        -25,
        dimensions.height / 2,
        50,
        dimensions.height,
        wallOptions
      ),
      Matter.Bodies.rectangle(
        dimensions.width + 25,
        dimensions.height / 2,
        50,
        dimensions.height,
        wallOptions
      ),
    ]);
  };

  const handleGameComplete = () => {
    console.log("🎯 Game completed! Calling onGameComplete...");
    if (onGameComplete) {
      onGameComplete();
    }
  };

  // ✅ FIXED: Only setup balloons when in proper state
  useEffect(() => {
    console.log(`\n🔄🔄🔄 useEffect - Question Setup:`);
    console.log(`   🎮 Game State: ${gameState}`);
    console.log(`   📍 Question Index: ${currentQuestionIndex}`);
    console.log(`   🏹 Is Shooting: ${isShooting}`);
    console.log(`   🔄 Is Transitioning: ${isTransitioning}`);

    // ✅ ONLY setup balloons if game is playing and not in any busy state
    if (
      gameState === "playing" &&
      !isShooting &&
      !isTransitioning &&
      currentQuestion
    ) {
      console.log(
        `🎈 SETTING UP BALLOONS FOR QUESTION ${currentQuestionIndex + 1}:`
      );
      console.log(`   📝 Question: "${currentQuestion.question}"`);
      console.log(
        `   ✅ Answer: ${
          currentQuestion.answer
        } (${typeof currentQuestion.answer})`
      );
      console.log(
        `   🎯 Options: [${currentQuestion.options.join(
          ", "
        )}] (${currentQuestion.options.map((o) => typeof o).join(", ")})`
      );

      removeProjectile();

      setTimeout(() => {
        addBalloons({
          options: currentQuestion.options,
          answer: currentQuestion.answer,
        });
      }, 100);
    } else {
      console.log(`🚫 NOT setting up balloons - conditions not met`);
    }
  }, [
    currentQuestionIndex,
    gameState,
    isShooting,
    isTransitioning,
    currentQuestion,
  ]);

  useEffect(() => {
    const updateSize = () => {
      const container = sceneRef.current?.parentElement;
      if (container) {
        const width = Math.min(container.offsetWidth - 32, 1200);
        const height = Math.min(container.offsetHeight - 32, 800);
        setDimensions({
          width: Math.max(width, 1000),
          height: Math.max(height, 700),
        });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    setupMatterJS();

    return () => {
      window.removeEventListener("resize", updateSize);
      if (renderRef.current) {
        Matter.Render.stop(renderRef.current);
        Matter.Engine.clear(engineRef.current);
        renderRef.current.canvas.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (!renderRef.current) return;

    renderRef.current.bounds.max.x = dimensions.width;
    renderRef.current.bounds.max.y = dimensions.height;
    renderRef.current.options.width = dimensions.width;
    renderRef.current.options.height = dimensions.height;
    renderRef.current.canvas.width = dimensions.width;
    renderRef.current.canvas.height = dimensions.height;

    clearWorld(true);

    const wallOptions = { isStatic: true, render: { visible: false } };
    Matter.Composite.add(engineRef.current.world, [
      Matter.Bodies.rectangle(
        dimensions.width / 2,
        -25,
        dimensions.width,
        50,
        wallOptions
      ),
      Matter.Bodies.rectangle(
        dimensions.width / 2,
        dimensions.height + 25,
        dimensions.width,
        50,
        wallOptions
      ),
      Matter.Bodies.rectangle(
        -25,
        dimensions.height / 2,
        50,
        dimensions.height,
        wallOptions
      ),
      Matter.Bodies.rectangle(
        dimensions.width + 25,
        dimensions.height / 2,
        50,
        dimensions.height,
        wallOptions
      ),
    ]);

    if (gameState === "playing" && currentQuestion && !isTransitioning) {
      setTimeout(() => {
        addBalloons({
          options: currentQuestion.options,
          answer: currentQuestion.answer,
        });
      }, 100);
    }
  }, [dimensions]);

  return (
    <div className="font-sans w-full bg-gray-900 text-white flex flex-col items-center justify-center p-2 overflow-hidden relative min-h-[900px]">
      {/* Game Status */}
      <div className="absolute top-2 right-2 z-20">
        <div className="bg-gray-900/50 backdrop-blur-md p-2 rounded-lg border border-indigo-500/50">
          <div className="text-white text-xs font-mono">
            Question {currentQuestionIndex + 1} of {QUESTIONS.length}
          </div>
          <div className="text-indigo-300 text-xs">
            Correct: {correctAnswersCount}
          </div>
        </div>
      </div>

      {/* Question Display */}
      {gameState === "playing" && currentQuestion && (
        <QuestionDisplay text={currentQuestion.question} />
      )}

      {/* Physics Scene */}
      <div
        ref={sceneRef}
        className="relative border-2 border-indigo-500/30 rounded-xl overflow-hidden mt-16"
        style={{
          width: dimensions.width,
          height: dimensions.height,
          minWidth: "1000px",
          minHeight: "700px",
        }}
      />

      {/* Instructions */}
      {gameState === "playing" &&
        !isShooting &&
        !isTransitioning &&
        currentQuestion && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20">
            <div className="bg-gray-900/90 backdrop-blur-md p-2 rounded-lg border border-indigo-500/50">
              <p className="text-white text-sm font-mono text-center">
                🎯 Click to Shoot! Hit the balloon with:{" "}
                <strong>{currentQuestion.answer}</strong>
              </p>
            </div>
          </div>
        )}

      {/* Game Messages */}
      <GameMessage
        message={message}
        color={message === "Correct!" ? "text-green-400" : "text-red-400"}
      />

      {/* Game States */}
      {gameState === "lost" && <GameOverModal onRestart={handleRestart} />}
      {gameState === "won" && (
        <GameCompleteModal
          onRestart={handleRestart}
          onGameComplete={handleGameComplete}
        />
      )}
    </div>
  );
};

export default BalloonMathQuiz;

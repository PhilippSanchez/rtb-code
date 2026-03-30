"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Level = 1 | 2 | 3;
type Group = "A" | "B";

interface LevelMeta {
  label: string;
  difficulty: "Easy" | "Medium" | "Hard";
  accentColor: string;
  codeDigit: string;
}

const LEVEL_META: Record<Level, LevelMeta> = {
  1: {
    label: "Level 01",
    difficulty: "Easy",
    accentColor: "#4ade80",
    codeDigit: "4",
  },
  2: {
    label: "Level 02",
    difficulty: "Medium",
    accentColor: "#fb923c",
    codeDigit: "7",
  },
  3: {
    label: "Level 03",
    difficulty: "Hard",
    accentColor: "#f87171",
    codeDigit: "2",
  },
};

// Fictional language lexicon (used in Group B):
// VELUN = perform/greeting  KODREL = stance/execute   NAVO = signal/wave
// STORVEK = arm/hand        ORNA = ear/shoulder       NALVEK = bow/nod
// STIREN = right            DRAVOK = left             SEKVAL = stand/feet
// TORBAK = extend/forward   ZOKREL = clap             VELKOR = touch
// VORTAN = exit/forward     DRAKMOR = corner

const TASKS: Record<Group, Record<Level, string[]>> = {
  A: {
    1: [
      "Raise your right hand above your head.",
      "Turn around completely (360°).",
      "Touch the nearest wall with your open palm.",
    ],
    2: [
      "Stand up, take two steps forward, clap once, and return to your seat.",
      "Place your right hand flat on your left knee and hold for 3 seconds.",
      "Fetch any object from across the room and place it on the table in front of you.",
    ],
    3: [
      "Touch your right ear with your left hand, then bow slightly.",
      "Stand with feet shoulder-width apart, extend both arms forward, then turn left.",
      "Find a red object in the room and bring it to the researcher.",
    ],
  },
  B: {
    1: [
      "Raise your right hand above your head.",
      "Turn around completely (360°).",
      "Touch the nearest wall with your open palm.",
    ],
    2: [
      "Stand up, take KODREL steps forward, clap once, and return to your VORTAN.",
      "Place your NAVO hand flat on your left knee and hold for VELUN seconds.",
      "VELKOR a NAVO STORVEK from the DRAKMOR and INTOVA it to your VORTAN.",
    ],
    3: [
      "VELUN KODREL: VELKOR STIREN ORNA, NALVEK slowly.",
      "SEKVAL, STORVEK TORBAK TORBAK, ZOKREL once, VELKOR VORTAN.",
      "VELKOR DRAKMOR red STORVEK, INTOVA VELUN.",
    ],
  },
};

const TOTAL_TIME = 60;
const SECRET_CODE = "472";

export default function Terminal() {
  const [screen, setScreen] = useState<"briefing" | "group-select" | "mission">(
    "briefing",
  );
  const [group, setGroup] = useState<Group | null>(null);
  const [activeLevel, setActiveLevel] = useState<Level>(1);
  const [completed, setCompleted] = useState<Record<Level, boolean[]>>({
    1: [false, false, false],
    2: [false, false, false],
    3: [false, false, false],
  });
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [timeUp, setTimeUp] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeFeedback, setCodeFeedback] = useState<"ok" | "err" | null>(null);
  const alarmRef = useRef<HTMLAudioElement | null>(null);
  const timerSoundRef = useRef<HTMLAudioElement | null>(null);
  const heartbeatRef = useRef<HTMLAudioElement | null>(null);
  const sessionDate = useRef(new Date());

  const started = screen === "mission";

  // Timer only runs from Level 2 onwards
  useEffect(() => {
    if (!started || timeUp || activeLevel < 2) return;
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          setTimeUp(true);
          new Audio("/sounds/failed.mp3").play().catch(() => {});
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [started, timeUp, activeLevel]);

  // Play timer sound from Level 2 onwards; stop on timeUp
  useEffect(() => {
    if (activeLevel >= 2 && started && !timeUp) {
      const audio = new Audio("/sounds/timer.mp3");
      audio.loop = true;
      audio.volume = 0.4;
      timerSoundRef.current = audio;
      audio.play().catch(() => {});
    } else {
      timerSoundRef.current?.pause();
      timerSoundRef.current = null;
    }
    return () => {
      timerSoundRef.current?.pause();
      timerSoundRef.current = null;
    };
  }, [activeLevel, started, timeUp]);

  // Heartbeat when red flash triggers (≤15s remaining)
  useEffect(() => {
    if (activeLevel >= 2 && timeLeft <= 15 && timeLeft > 0 && started) {
      if (!heartbeatRef.current) {
        const audio = new Audio("/sounds/heartbeat.mp3");
        audio.loop = true;
        audio.volume = 0.7;
        heartbeatRef.current = audio;
        audio.play().catch(() => {});
      }
    } else {
      heartbeatRef.current?.pause();
      heartbeatRef.current = null;
    }
    return () => {
      heartbeatRef.current?.pause();
      heartbeatRef.current = null;
    };
  }, [activeLevel, timeLeft, started]);

  // Play alarm sound when Level 3 is reached; stop on timeUp or success
  useEffect(() => {
    if (activeLevel === 3 && started && !timeUp) {
      const audio = new Audio("/sounds/alarm.mp3");
      audio.loop = true;
      audio.volume = 0.6;
      alarmRef.current = audio;
      audio.play().catch(() => {});
    } else {
      alarmRef.current?.pause();
      alarmRef.current = null;
    }
    return () => {
      alarmRef.current?.pause();
      alarmRef.current = null;
    };
  }, [activeLevel, started, timeUp]);

  const levelDone = (l: Level) => completed[l].every(Boolean);
  const allDone = ([1, 2, 3] as Level[]).every(levelDone);

  useEffect(() => {
    if (completed[activeLevel].every(Boolean) && activeLevel < 3) {
      const t = setTimeout(() => setActiveLevel((l) => (l + 1) as Level), 700);
      return () => clearTimeout(t);
    }
  }, [completed, activeLevel]);

  function toggleTask(level: Level, idx: number) {
    if (!started || timeUp) return;
    setCompleted((prev) => {
      const next = [...prev[level]];
      next[idx] = !next[idx];
      return { ...prev, [level]: next };
    });
  }

  function checkCode() {
    const correct = codeInput.trim() === SECRET_CODE;
    if (correct) {
      alarmRef.current?.pause();
      alarmRef.current = null;
      timerSoundRef.current?.pause();
      timerSoundRef.current = null;
      heartbeatRef.current?.pause();
      heartbeatRef.current = null;
      new Audio("/sounds/success.mp3").play().catch(() => {});
    }
    setCodeFeedback(correct ? "ok" : "err");
  }

  function reset() {
    alarmRef.current?.pause();
    alarmRef.current = null;
    timerSoundRef.current?.pause();
    timerSoundRef.current = null;
    heartbeatRef.current?.pause();
    heartbeatRef.current = null;
    setScreen("briefing");
    setGroup(null);
    setActiveLevel(1);
    setCompleted({
      1: [false, false, false],
      2: [false, false, false],
      3: [false, false, false],
    });
    setTimeLeft(TOTAL_TIME);
    setTimeUp(false);
    setCodeInput("");
    setCodeFeedback(null);
  }

  function startMission(g: Group) {
    sessionDate.current = new Date();
    setGroup(g);
    setScreen("mission");
  }

  async function exportPDF(succeeded: boolean) {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    const timeUsedSec = TOTAL_TIME - timeLeft;
    const timeUsedStr =
      activeLevel < 2
        ? "N/A (timer starts at Level 2)"
        : `${Math.floor(timeUsedSec / 60)}:${(timeUsedSec % 60).toString().padStart(2, "0")} / 1:00`;

    const totalTasks = ([1, 2, 3] as Level[]).reduce(
      (sum, l) => sum + completed[l].filter(Boolean).length,
      0,
    );

    const dateStr = sessionDate.current.toLocaleString("de-DE");

    // ── Colours ──────────────────────────────────────────────────────────────
    const BG = [8, 12, 20] as [number, number, number];
    const CARD = [13, 18, 32] as [number, number, number];
    const ACCENT = succeeded
      ? ([74, 222, 128] as [number, number, number])
      : ([248, 113, 113] as [number, number, number]);
    const MUTED = [71, 85, 105] as [number, number, number];
    const TEXT = [226, 232, 240] as [number, number, number];

    const W = 210,
      H = 297;

    // ── Background ───────────────────────────────────────────────────────────
    doc.setFillColor(...BG);
    doc.rect(0, 0, W, H, "F");

    // ── Header bar ───────────────────────────────────────────────────────────
    doc.setFillColor(...CARD);
    doc.rect(0, 0, W, 28, "F");

    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...ACCENT);
    doc.text("RTB PROTOCOL", 14, 11);

    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`SESSION REPORT  ·  ${dateStr}`, 14, 18);

    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`GROUP-${group}`, W - 14, 11, { align: "right" });

    // ── Status banner ────────────────────────────────────────────────────────
    doc.setFillColor(...ACCENT);
    doc.rect(0, 28, W, 22, "F");

    doc.setFont("courier", "bold");
    doc.setFontSize(16);
    doc.setTextColor(
      succeeded ? 8 : 255,
      succeeded ? 12 : 255,
      succeeded ? 20 : 255,
    );
    doc.text(
      succeeded ? "✓  MISSION SUCCEEDED" : "✗  MISSION FAILED",
      W / 2,
      42,
      { align: "center" },
    );

    // ── Summary cards ────────────────────────────────────────────────────────
    const cardY = 62;
    const cardH = 28;
    const cards = [
      { label: "GROUP", value: `Group ${group}` },
      { label: "RESULT", value: succeeded ? "Succeeded" : "Failed" },
      { label: "TASKS COMPLETED", value: `${totalTasks} / 9` },
      { label: "TIME USED", value: timeUsedStr },
    ];

    cards.forEach((c, i) => {
      const x = 14 + i * 46;
      doc.setFillColor(...CARD);
      doc.roundedRect(x, cardY, 42, cardH, 2, 2, "F");
      doc.setFont("courier", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      doc.text(c.label, x + 4, cardY + 8);
      doc.setFont("courier", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...TEXT);
      doc.text(c.value, x + 4, cardY + 19);
    });

    // ── Level breakdown ──────────────────────────────────────────────────────
    let y = 104;
    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("LEVEL BREAKDOWN", 14, y);

    y += 6;
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.3);
    doc.line(14, y, W - 14, y);

    ([1, 2, 3] as Level[]).forEach((l) => {
      y += 10;
      const doneCount = completed[l].filter(Boolean).length;
      const allComplete = doneCount === 3;

      doc.setFillColor(...CARD);
      doc.roundedRect(14, y - 5, W - 28, 34, 2, 2, "F");

      // Level label
      doc.setFont("courier", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...(allComplete ? ACCENT : MUTED));
      doc.text(
        `LEVEL 0${l}  —  ${LEVEL_META[l].difficulty.toUpperCase()}`,
        20,
        y + 3,
      );

      // Progress bar track
      const barX = 20,
        barY = y + 8,
        barW = W - 56,
        barH2 = 3;
      doc.setFillColor(30, 41, 59);
      doc.roundedRect(barX, barY, barW, barH2, 1, 1, "F");
      doc.setFillColor(
        ...(allComplete
          ? ACCENT
          : ([251, 146, 60] as [number, number, number])),
      );
      doc.roundedRect(barX, barY, barW * (doneCount / 3), barH2, 1, 1, "F");

      // Count
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...TEXT);
      doc.text(`${doneCount} / 3 tasks`, W - 20, y + 3, { align: "right" });

      // Individual tasks
      TASKS[group as Group][l].forEach((task, idx) => {
        const done = completed[l][idx];
        const taskY = y + 16 + idx * 5;
        doc.setFont("courier", "normal");
        doc.setFontSize(7);
        doc.setTextColor(
          done ? ACCENT[0] : MUTED[0],
          done ? ACCENT[1] : MUTED[1],
          done ? ACCENT[2] : MUTED[2],
        );
        doc.text(`${done ? "▣" : "▢"}  ${task}`, 22, taskY);
      });

      y += 34;
    });

    // ── Footer ───────────────────────────────────────────────────────────────
    doc.setFillColor(...CARD);
    doc.rect(0, H - 14, W, 14, "F");
    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text("RTB Protocol  ·  Confidential Research Document", 14, H - 5);
    doc.text(`Generated ${dateStr}`, W - 14, H - 5, { align: "right" });

    doc.save(`RTB_Group${group}_${succeeded ? "SUCCESS" : "FAILED"}.pdf`);
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  const timerPct = timeLeft / TOTAL_TIME;
  const timerColor =
    timeLeft <= 15 ? "#f87171" : timeLeft <= 30 ? "#fb923c" : "#38bdf8";
  const accent = LEVEL_META[activeLevel].accentColor;
  const tasks = group ? TASKS[group][activeLevel] : TASKS.A[activeLevel];

  // ─── Briefing screen ────────────────────────────────────────────────────────
  if (screen === "briefing") {
    return (
      <div
        style={{
          height: "100dvh",
          background: "#080c14",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
          overflow: "hidden",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            maxWidth: 420,
            width: "100%",
            padding: "0 1.5rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.25em",
              color: "#38bdf8",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            RTB — Protocol v1.0
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#e2e8f0",
              margin: "0 0 16px",
              letterSpacing: "0.05em",
            }}
          >
            MISSION BRIEFING
          </h1>
          <div
            style={{
              width: 48,
              height: 2,
              background: "#38bdf8",
              margin: "0 auto 24px",
              borderRadius: 2,
            }}
          />
          <p
            style={{
              fontSize: 13,
              color: "#94a3b8",
              lineHeight: 1.8,
              marginBottom: 32,
            }}
          >
            Complete{" "}
            <span style={{ color: "#e2e8f0", fontWeight: 600 }}>3 levels</span>{" "}
            of physical tasks within{" "}
            <span style={{ color: "#e2e8f0", fontWeight: 600 }}>3 minutes</span>
            .<br />
            Each completed level unlocks one digit of the exit code.
            <br />
            Enter the full code to escape.
          </p>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setScreen("group-select")}
            style={{
              padding: "14px 48px",
              background: "transparent",
              color: "#38bdf8",
              border: "1px solid #38bdf8",
              borderRadius: 4,
              fontFamily: "monospace",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            Continue →
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ─── Group selection screen ──────────────────────────────────────────────────
  if (screen === "group-select") {
    return (
      <div
        style={{
          height: "100dvh",
          background: "#080c14",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
          overflow: "hidden",
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ maxWidth: 480, width: "100%", padding: "0 1.5rem" }}
        >
          <button
            onClick={() => setScreen("briefing")}
            style={{
              background: "none",
              border: "none",
              color: "#475569",
              fontFamily: "monospace",
              fontSize: 11,
              cursor: "pointer",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginBottom: 32,
              padding: 0,
            }}
          >
            ← Back
          </button>

          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.25em",
              color: "#38bdf8",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Step 2 of 2
          </div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#e2e8f0",
              margin: "0 0 8px",
            }}
          >
            Select Group
          </h2>
          <p
            style={{
              fontSize: 12,
              color: "#475569",
              marginBottom: 28,
              lineHeight: 1.7,
            }}
          >
            Choose the participant&apos;s assigned group. This determines the
            language difficulty of the tasks.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(["A", "B"] as Group[]).map((g) => (
              <motion.button
                key={g}
                whileHover={{ x: 4, borderColor: "#38bdf8" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => startMission(g)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 20,
                  padding: "20px 22px",
                  background: "#0d1220",
                  border: "1px solid #1e293b",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontFamily: "monospace",
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: "#38bdf8",
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  {g}
                </span>
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#e2e8f0",
                      marginBottom: 6,
                      letterSpacing: "0.05em",
                    }}
                  >
                    Group {g}
                  </div>
                  {g === "A" ? (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                        lineHeight: 1.7,
                      }}
                    >
                      <span style={{ color: "#4ade80" }}>L1</span> English
                      &nbsp;·&nbsp;
                      <span style={{ color: "#fb923c" }}>L2</span> English
                      &nbsp;·&nbsp;
                      <span style={{ color: "#f87171" }}>L3</span> English +
                      fictional terms
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                        lineHeight: 1.7,
                      }}
                    >
                      <span style={{ color: "#4ade80" }}>L1</span> English
                      &nbsp;·&nbsp;
                      <span style={{ color: "#fb923c" }}>L2</span> English +
                      fictional words &nbsp;·&nbsp;
                      <span style={{ color: "#f87171" }}>L3</span> Fictional — 1
                      word English
                    </div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Success screen ─────────────────────────────────────────────────────────
  if (codeFeedback === "ok") {
    return (
      <div
        style={{
          height: "100dvh",
          background: "#080c14",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
          overflow: "hidden",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            maxWidth: 420,
            width: "100%",
            padding: "0 1.5rem",
            textAlign: "center",
          }}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4, ease: "easeOut" }}
            style={{ fontSize: 56, marginBottom: 24 }}
          >
            ✓
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.25em",
                color: "#4ade80",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Access granted
            </div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#e2e8f0",
                margin: "0 0 12px",
                letterSpacing: "0.05em",
              }}
            >
              EXIT UNLOCKED
            </h1>
            <div
              style={{
                width: 48,
                height: 2,
                background: "#4ade80",
                margin: "0 auto 24px",
                borderRadius: 2,
              }}
            />
            <p
              style={{
                fontSize: 13,
                color: "#64748b",
                lineHeight: 1.8,
                marginBottom: 32,
              }}
            >
              All levels cleared. The exit code was accepted.
              <br />
              Group{" "}
              <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
                {group}
              </span>{" "}
              — mission complete.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => exportPDF(true)}
                style={{
                  padding: "12px 32px",
                  background: "#4ade80",
                  color: "#080c14",
                  border: "none",
                  borderRadius: 4,
                  fontFamily: "monospace",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                ↓ Export PDF
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={reset}
                style={{
                  padding: "12px 32px",
                  background: "transparent",
                  color: "#4ade80",
                  border: "1px solid #4ade80",
                  borderRadius: 4,
                  fontFamily: "monospace",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
              >
                ↺ New session
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ─── Time's up screen ───────────────────────────────────────────────────────
  if (timeUp) {
    return (
      <div
        style={{
          height: "100dvh",
          background: "#080c14",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
          overflow: "hidden",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          style={{
            maxWidth: 380,
            width: "100%",
            padding: "2.5rem",
            border: "1px solid #f87171",
            borderRadius: 8,
            textAlign: "center",
            background: "#0d0f1a",
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.2em",
              color: "#f87171",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            System failure
          </div>
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              color: "#f87171",
              marginBottom: 8,
              letterSpacing: "0.05em",
            }}
          >
            0:00
          </div>
          <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 24 }}>
            Levels cleared:{" "}
            <span style={{ color: "#e2e8f0" }}>
              {([1, 2, 3] as Level[]).filter(levelDone).length} / 3
            </span>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => exportPDF(false)}
              style={{
                padding: "10px 24px",
                background: "#f87171",
                border: "none",
                borderRadius: 4,
                fontFamily: "monospace",
                color: "#080c14",
                cursor: "pointer",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              ↓ Export PDF
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={reset}
              style={{
                padding: "10px 24px",
                background: "transparent",
                border: "1px solid #f87171",
                borderRadius: 4,
                fontFamily: "monospace",
                color: "#f87171",
                cursor: "pointer",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontSize: 13,
              }}
            >
              Retry
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Mission screen ─────────────────────────────────────────────────────────
  return (
    <div
      style={{
        height: "100dvh",
        background: "#080c14",
        fontFamily: "monospace",
        padding: "1.25rem 1.5rem",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Red flash overlay — triggers at ≤15 seconds */}
      <AnimatePresence>
        {activeLevel >= 2 && timeLeft <= 15 && !timeUp && (
          <motion.div
            key="flash"
            animate={{ opacity: [0, 0.18, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "fixed",
              inset: 0,
              background: "#f87171",
              pointerEvents: "none",
              zIndex: 50,
            }}
          />
        )}
      </AnimatePresence>

      <div
        style={{
          maxWidth: 700,
          width: "100%",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          minHeight: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 14,
              letterSpacing: "0.2em",
              color: "#38bdf8",
              textTransform: "uppercase",
            }}
          >
            RTB Protocol
          </span>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <span
              style={{
                fontSize: 14,
                color: "#38bdf844",
                letterSpacing: "0.1em",
              }}
            >
              GRP-{group}
            </span>
            <span
              style={{ fontSize: 14, color: "#475569", letterSpacing: "0.1em" }}
            >
              {([1, 2, 3] as Level[]).filter(levelDone).length}/3 cleared
            </span>
          </div>
        </div>

        {/* Timer — only visible from Level 2 */}
        <div
          style={{
            textAlign: "center",
            visibility: activeLevel >= 2 ? "visible" : "hidden",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "#475569",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Time remaining
          </div>
          <motion.div
            key={timerStr}
            initial={{ opacity: 0.6, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: timerColor,
              letterSpacing: "0.05em",
              lineHeight: 1,
              marginBottom: 8,
            }}
          >
            {timerStr}
          </motion.div>
          <div
            style={{
              height: 4,
              background: "#1e293b",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <motion.div
              animate={{ width: `${timerPct * 100}%`, background: timerColor }}
              transition={{ duration: 0.8, ease: "linear" }}
              style={{ height: "100%", borderRadius: 2 }}
            />
          </div>
        </div>

        {/* Exit code */}
        <div
          style={{
            background: "#0d1220",
            border: "1px solid #1e293b",
            borderRadius: 10,
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: "#475569",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            Exit code
          </span>
          <div style={{ display: "flex", gap: 20 }}>
            {([1, 2, 3] as Level[]).map((l) => (
              <motion.span
                key={l}
                animate={{
                  color: levelDone(l) ? LEVEL_META[l].accentColor : "#334155",
                }}
                transition={{ duration: 0.4 }}
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  minWidth: 28,
                  textAlign: "center",
                }}
              >
                {levelDone(l) ? LEVEL_META[l].codeDigit : "?"}
              </motion.span>
            ))}
          </div>
        </div>

        {/* Level tabs */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {([1, 2, 3] as Level[]).map((n) => (
            <motion.button
              key={n}
              onClick={() => setActiveLevel(n)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              animate={{
                borderColor:
                  activeLevel === n
                    ? LEVEL_META[n].accentColor
                    : levelDone(n)
                      ? "#22c55e44"
                      : "#1e293b",
                color:
                  activeLevel === n
                    ? LEVEL_META[n].accentColor
                    : levelDone(n)
                      ? "#4ade80"
                      : "#475569",
              }}
              style={{
                flex: 1,
                padding: "12px 0",
                cursor: "pointer",
                border: "1px solid",
                borderRadius: 8,
                background: activeLevel === n ? "#0d1220" : "transparent",
                fontFamily: "monospace",
                fontWeight: 600,
                fontSize: 16,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              L{n.toString().padStart(2, "0")} {levelDone(n) ? "✓" : ""}
            </motion.button>
          ))}
        </div>

        {/* Task panel — grows to fill remaining space */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeLevel}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{
              background: "#0d1220",
              border: "1px solid #1e293b",
              borderRadius: 10,
              padding: "1.25rem 1.5rem",
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: "#475569",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                }}
              >
                {LEVEL_META[activeLevel].label}
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: accent,
                  letterSpacing: "0.12em",
                  fontWeight: 600,
                }}
              >
                {LEVEL_META[activeLevel].difficulty}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                flex: 1,
                minHeight: 0,
              }}
            >
              {tasks.map((task, idx) => {
                const done = completed[activeLevel][idx];
                return (
                  <motion.div
                    key={idx}
                    onClick={() => toggleTask(activeLevel, idx)}
                    whileHover={{ x: 3 }}
                    animate={{
                      background: done ? `${accent}14` : "#0a0f1c",
                      borderColor: done ? `${accent}55` : "#1e293b",
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: "0 20px",
                      borderRadius: 8,
                      cursor: "pointer",
                      border: "1px solid",
                      flex: 1,
                    }}
                  >
                    <motion.span
                      animate={{ color: done ? accent : "#334155" }}
                      style={{ fontSize: 22, flexShrink: 0 }}
                    >
                      {done ? "▣" : "▢"}
                    </motion.span>
                    <span
                      style={{
                        fontSize: 18,
                        lineHeight: 1.5,
                        color: done ? accent : "#ffffff",
                        textDecoration: done ? "line-through" : "none",
                      }}
                    >
                      {task}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            <AnimatePresence>
              {levelDone(activeLevel) && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 10 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  style={{
                    padding: "12px 20px",
                    borderRadius: 8,
                    background: `${accent}18`,
                    border: `1px solid ${accent}44`,
                    color: accent,
                    fontSize: 16,
                    fontWeight: 600,
                    textAlign: "center",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  Code digit: {LEVEL_META[activeLevel].codeDigit}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {/* Final code entry */}
        <AnimatePresence>
          {allDone && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: "#0d1220",
                border: "1px solid #38bdf855",
                borderRadius: 10,
                padding: "1rem 1.5rem",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: "#38bdf8",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Enter Exit Code
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: codeFeedback ? 10 : 0,
                }}
              >
                <input
                  value={codeInput}
                  onChange={(e) => {
                    setCodeInput(e.target.value);
                    setCodeFeedback(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && checkCode()}
                  placeholder="---"
                  maxLength={3}
                  style={{
                    flex: 1,
                    padding: "12px 20px",
                    background: "#0a0f1c",
                    border: "1px solid #1e293b",
                    borderRadius: 8,
                    fontFamily: "monospace",
                    fontSize: 28,
                    letterSpacing: "0.4em",
                    textAlign: "center",
                    color: "#38bdf8",
                    outline: "none",
                  }}
                  autoComplete="off"
                  spellCheck={false}
                />
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={checkCode}
                  style={{
                    padding: "12px 22px",
                    background: "transparent",
                    border: "1px solid #38bdf8",
                    borderRadius: 8,
                    color: "#38bdf8",
                    fontFamily: "monospace",
                    fontSize: 22,
                    cursor: "pointer",
                  }}
                >
                  ↵
                </motion.button>
              </div>
              <AnimatePresence>
                {codeFeedback === "err" && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                      padding: "10px 16px",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      background: "#f8717118",
                      border: "1px solid #f8717155",
                      color: "#f87171",
                      textAlign: "center",
                      letterSpacing: "0.08em",
                    }}
                  >
                    ✗ INVALID CODE — CHECK DIGITS
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reset */}
        <motion.button
          whileHover={{ color: "#94a3b8" }}
          onClick={reset}
          style={{
            width: "100%",
            padding: "8px 0",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontFamily: "monospace",
            fontSize: 13,
            color: "#334155",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            flexShrink: 0,
          }}
        >
          ↺ Reset
        </motion.button>
      </div>
    </div>
  );
}

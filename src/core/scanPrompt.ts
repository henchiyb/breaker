import fs from "node:fs/promises";
import { riskyPatterns } from "../checks/riskyPatterns";
import { checkUserInputSafety } from "../checks/userInputSafety";
import { lengthWarning } from "../checks/lengthCheck";
import { openEndedPatterns } from "../checks/openEndedPartterns";

export interface ScanReport {
  risky: string[];
  open: string[];
  userInputSafety?: string | null;
  lengthWarning?: string;
  score: number; // 0‑100 (higher = safer)
}

export async function scanPrompt(src: string): Promise<ScanReport> {
  const text = await load(src);

  const risky = matchAny(text, riskyPatterns);
  const open = matchAny(text, openEndedPatterns);
  const safety = checkUserInputSafety(text);
  const lenWarn = lengthWarning(text);

  console.log({ risky, open, safety, lenWarn });
  const score = computeScore({ risky, open, safety, lenWarn });

  return {
    risky,
    open,
    userInputSafety: safety,
    lengthWarning: lenWarn,
    score,
  };
}

async function load(s: string) {
  try {
    await fs.access(s);
    return fs.readFile(s, "utf-8");
  } catch {
    return s;
  }
}
const matchAny = (t: string, pats: RegExp[]) => pats.filter(p => p.test(t)).map(p => p.source);

function computeScore({
  risky,
  open,
  safety,
  lenWarn,
}: {
  risky: string[];
  open: string[];
  safety?: string | null;
  lenWarn?: string;
}) {
  let score = 100;
  // risky patterns: 15 points each, max 60
  const riskyDeduction = Math.min(60, risky.length * 15);
  score -= riskyDeduction;
  // open-ended patterns: 5 points each, max 30
  const openDeduction = Math.min(30, open.length * 5);
  score -= openDeduction;
  // user-input safety warning
  if (safety) score -= 20;
  // length warning
  if (lenWarn) score -= 10;
  return Math.max(score, 0);
}

import { Challenge } from "./challenges";

const CHALLENGES: Challenge[] = [
  {
    type: "TURN_LEFT",
    instruction: "Turn your head LEFT",
    requiredFrames: 12,
    timeoutMs: 8000,
  },
  {
    type: "TURN_RIGHT",
    instruction: "Turn your head RIGHT",
    requiredFrames: 12,
    timeoutMs: 8000,
  },
  {
    type: "BLINK_TWICE",
    instruction: "Blink twice naturally",
    requiredFrames: 8,
    timeoutMs: 6000,
  },
  {
    type: "SMILE_HOLD",
    instruction: "Smile and hold for 2 seconds",
    requiredFrames: 15,
    timeoutMs: 7000,
  },
];

export function generateRandomChallenge(): Challenge {
  const index = Math.floor(Math.random() * CHALLENGES.length);
  return CHALLENGES[index];
}

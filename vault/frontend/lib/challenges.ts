export type ChallengeType =
  | "TURN_LEFT"
  | "TURN_RIGHT"
  | "BLINK_TWICE"
  | "SMILE_HOLD";

export interface Challenge {
  type: ChallengeType;
  instruction: string;
  requiredFrames: number; // ✅ unified
  timeoutMs: number;
}

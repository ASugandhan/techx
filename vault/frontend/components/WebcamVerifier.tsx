'use client'

import { useEffect, useRef, useState, useCallback } from "react"
import Webcam from "react-webcam"
import { Camera } from "@mediapipe/camera_utils"
import { FaceMesh, Results as FaceMeshResults } from "@mediapipe/face_mesh"
import { Hands, Results as HandsResults } from "@mediapipe/hands"

type VerificationStep = "FACE" | "BLINK" | "HEAD" | "GESTURE" | "COMPLETE"

type HeadTask = "TURN_LEFT" | "TURN_RIGHT" | "LOOK_UP" | "LOOK_DOWN" | "TILT_LEFT" | "TILT_RIGHT"
type HandTask = "THUMBS_UP" | "OPEN_PALM" | "CLOSED_FIST" | "VICTORY" | "POINTING_UP"

const HEAD_TASKS: HeadTask[] = ["TURN_LEFT", "TURN_RIGHT", "LOOK_UP", "LOOK_DOWN", "TILT_LEFT", "TILT_RIGHT"]
const HAND_TASKS: HandTask[] = ["THUMBS_UP", "OPEN_PALM", "CLOSED_FIST", "VICTORY", "POINTING_UP"]

export default function WebcamVerifier({ onVerified }: { onVerified: (score: number) => void }) {
  const webcamRef = useRef<Webcam>(null)
  const [step, setStep] = useState<VerificationStep>("FACE")
  const [message, setMessage] = useState("Initializing models...")
  const [debug, setDebug] = useState<string>("")
  const [score, setScore] = useState(100)
  const [cameraReady, setCameraReady] = useState(false)

  // Random Tasks
  const [targetHeadTask, setTargetHeadTask] = useState<HeadTask>("TURN_LEFT")
  const [targetHandTask, setTargetHandTask] = useState<HandTask>("THUMBS_UP")

  // Step state tracking
  const [faceDetectedTime, setFaceDetectedTime] = useState<number>(0)
  const [blinkCount, setBlinkCount] = useState(0)
  const [startTime, setStartTime] = useState<number>(0)
  const [modelsLoaded, setModelsLoaded] = useState({ face: false, hands: false })

  // Configs
  const BLINK_THRESHOLD = 0.25
  const REQUIRED_BLINKS = 1
  const REQUIRED_FACE_TIME = 2000 // ms

  // Mutable refs
  const stepRef = useRef<VerificationStep>("FACE")
  const blinkRef = useRef(0)
  const faceTimeRef = useRef(0)
  const cameraRef = useRef<Camera | null>(null)

  // Face consistency tracking
  const initialFaceSignature = useRef<{ eyeDistance: number; faceWidth: number } | null>(null)
  const FACE_TOLERANCE = 0.35 // 35% tolerance for face size variation (allows laptop movement/distance changes)

  // Reset function
  const resetTest = useCallback(() => {
    setStep("FACE")
    setMessage("Position your face in the frame")
    setScore(100)
    setFaceDetectedTime(0)
    setBlinkCount(0)
    setStartTime(0)
    faceTimeRef.current = 0
    blinkRef.current = 0
    initialFaceSignature.current = null

    // Pick new random tasks
    setTargetHeadTask(pickRandom(HEAD_TASKS))
    setTargetHandTask(pickRandom(HAND_TASKS))
  }, [])

  // Random selection helper
  const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

  useEffect(() => {
    stepRef.current = step
  }, [step])

  useEffect(() => {
    if (modelsLoaded.face && modelsLoaded.hands && step === "FACE") {
      setMessage("Position your face in the frame")
    }
  }, [modelsLoaded, step])

  const getEAR = (landmarks: any, eyeIndices: number[]) => {
    const dist = (p1: any, p2: any) => Math.hypot(p1.x - p2.x, p1.y - p2.y)
    const top = landmarks[eyeIndices[2]]
    const bottom = landmarks[eyeIndices[3]]
    const inner = landmarks[eyeIndices[0]]
    const outer = landmarks[eyeIndices[1]]
    return dist(top, bottom) / dist(inner, outer)
  }

  const handleFaceResults = useCallback((results: FaceMeshResults) => {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      if (stepRef.current === "FACE" && modelsLoaded.face) {
        setMessage("No face detected")
        faceTimeRef.current = 0
      }
      return
    }

    const landmarks = results.multiFaceLandmarks[0]

    // Calculate face signature for consistency checking
    const leftEye = landmarks[33]
    const rightEye = landmarks[263]
    const leftFace = landmarks[234]
    const rightFace = landmarks[454]

    const eyeDistance = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y)
    const faceWidth = Math.hypot(rightFace.x - leftFace.x, rightFace.y - leftFace.y)

    // Check face consistency (prevent face switching)
    // Skip during HEAD and GESTURE steps where movement is expected
    if (initialFaceSignature.current && stepRef.current !== "HEAD" && stepRef.current !== "GESTURE") {
      const eyeDistDiff = Math.abs(eyeDistance - initialFaceSignature.current.eyeDistance) / initialFaceSignature.current.eyeDistance
      const faceWidthDiff = Math.abs(faceWidth - initialFaceSignature.current.faceWidth) / initialFaceSignature.current.faceWidth

      if (eyeDistDiff > FACE_TOLERANCE || faceWidthDiff > FACE_TOLERANCE) {
        setStep("COMPLETE")
        setMessage("⚠️ Different person detected! Test failed.")
        setScore(0)
        // Don't call onVerified for failed tests (score < 75)
        // The parent component should handle this based on score
        return
      }
    }

    // 1. FACE DETECTION
    if (stepRef.current === "FACE") {
      if (faceTimeRef.current === 0) {
        faceTimeRef.current = Date.now()
        if (startTime === 0) setStartTime(Date.now())
        // Store initial face signature
        initialFaceSignature.current = { eyeDistance, faceWidth }
      }

      const elapsed = Date.now() - faceTimeRef.current
      const remaining = Math.max(0, Math.ceil((REQUIRED_FACE_TIME - elapsed) / 1000))
      setMessage(`Hold steady... ${remaining}s`)

      if (elapsed > REQUIRED_FACE_TIME) {
        setStep("BLINK")
        setMessage("Blink your eyes!")
        setFaceDetectedTime(Date.now())
      }
    }

    // 2. BLINK DETECTION
    if (stepRef.current === "BLINK") {
      const leftIndices = [33, 133, 159, 145]
      const rightIndices = [362, 263, 386, 374]
      const leftEAR = getEAR(landmarks, leftIndices)
      const rightEAR = getEAR(landmarks, rightIndices)
      const avgEAR = (leftEAR + rightEAR) / 2

      if (avgEAR < BLINK_THRESHOLD) {
        if (blinkRef.current < REQUIRED_BLINKS) {
          blinkRef.current += 1
          setBlinkCount(blinkRef.current)
          if (blinkRef.current >= REQUIRED_BLINKS) {
            const nextTask = pickRandom(HEAD_TASKS)
            setTargetHeadTask(nextTask)
            setTimeout(() => {
              setStep("HEAD")
              setMessage(`Perform: ${nextTask.replace("_", " ")}`)
            }, 500)
          }
        }
      }
    }

    // 3. HEAD MOVEMENT
    if (stepRef.current === "HEAD") {
      // Landmarks: 1=NoseTip, 33=LeftEyeInner, 263=RightEyeInner, 152=Chin, 10=TopHead
      const nose = landmarks[1]
      const leftEye = landmarks[33]
      const rightEye = landmarks[263]

      let detected = false
      const yawSensitivity = 0.1
      const pitchSensitivity = 0.05
      const rollSensitivity = 0.05

      // Calculate face center (midpoint between eyes) for Yaw
      const filesCenter = (leftEye.x + rightEye.x) / 2

      // Calculate eye level for Pitch
      const eyeLevel = (leftEye.y + rightEye.y) / 2

      // Yaw: Nose x vs Center x
      // Pitch: Nose y vs Eye Level y (Nose should be below eyes)
      // Roll: Left Eye y vs Right Eye y

      switch (targetHeadTask) {
        case "TURN_LEFT":
          // MIRRORED: User turns LEFT -> Nose moves RIGHT in image (x increases)
          if (nose.x > filesCenter + yawSensitivity) detected = true
          break
        case "TURN_RIGHT":
          // MIRRORED: User turns RIGHT -> Nose moves LEFT in image (x decreases)
          if (nose.x < filesCenter - yawSensitivity) detected = true
          break
        case "LOOK_UP":
          // Nose moves UP (Y decreases)
          if (nose.y < eyeLevel + 0.02) detected = true
          break
        case "LOOK_DOWN":
          if (nose.y > eyeLevel + 0.15) detected = true
          break
        case "TILT_LEFT":
          // MIRRORED: User tilts LEFT (left ear down) -> RIGHT eye appears lower (higher Y)
          if (rightEye.y > leftEye.y + rollSensitivity) detected = true
          break
        case "TILT_RIGHT":
          // MIRRORED: User tilts RIGHT (right ear down) -> LEFT eye appears lower (higher Y)
          if (leftEye.y > rightEye.y + rollSensitivity) detected = true
          break
      }

      if (detected) {
        const nextHandTask = pickRandom(HAND_TASKS)
        setTargetHandTask(nextHandTask)
        setStep("GESTURE")
        setMessage(`Gesture: ${nextHandTask.replace("_", " ")}`)
      }
    }

  }, [modelsLoaded.face, targetHeadTask])

  const handleHandResults = useCallback((results: HandsResults) => {
    if (stepRef.current !== "GESTURE") return

    if (results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0]
      const tips = [4, 8, 12, 16, 20].map(i => landmarks[i])
      const pips = [3, 6, 10, 14, 18].map(i => landmarks[i]) // PIP joints (knuckles roughly)
      // 3 is Thumb IP, 6 is Index PIP...

      const isFingerExtended = (idx: number) => {
        // Index 0 is Thumb. Thumb extension is tricky.
        // For others: Tip Y < PIP Y (assuming hand is upright)
        if (idx === 0) {
          // Thumb extended if tip is far from index base (5)? 
          // Or simply x distance for side thumb?
          const tip = landmarks[4]
          const ip = landmarks[3]
          const mcp = landmarks[2]
          return Math.hypot(tip.x - mcp.x, tip.y - mcp.y) > 0.1 // heuristic
        }
        return tips[idx].y < pips[idx].y
      }

      let detected = false
      const thumb = isFingerExtended(0)
      const index = isFingerExtended(1)
      const middle = isFingerExtended(2)
      const ring = isFingerExtended(3)
      const pinky = isFingerExtended(4)

      // Refined thumb check for Thumbs Up: Tip is above IP
      const thumbTip = landmarks[4]
      const indexTip = landmarks[8]
      // Thumbs Up: Thumb tip is highest (lowest Y)
      const isThumbsUpPose = thumbTip.y < indexTip.y && !index && !middle && !ring && !pinky

      switch (targetHandTask) {
        case "THUMBS_UP":
          if (isThumbsUpPose) detected = true
          break
        case "OPEN_PALM":
          if (index && middle && ring && pinky) detected = true
          break
        case "CLOSED_FIST":
          if (!index && !middle && !ring && !pinky) detected = true
          break
        case "VICTORY":
          if (index && middle && !ring && !pinky) detected = true
          break
        case "POINTING_UP":
          if (index && !middle && !ring && !pinky) detected = true
          break
      }

      if (detected) {
        setStep("COMPLETE")
        setMessage("Verified!")

        const timeTaken = (Date.now() - startTime) / 1000
        let finalScore = 100
        // Relaxed scoring: < 10s = 100, else deduct 5 points per second
        if (timeTaken > 10) {
          finalScore = Math.max(50, 100 - Math.floor(timeTaken - 10) * 5)
        }
        setScore(finalScore)

        // Only redirect if score >= 75 (passing threshold)
        if (finalScore >= 75) {
          onVerified(finalScore)
        } else {
          setMessage("Test completed but score too low. Please try again.")
        }
      }
    }
  }, [startTime, onVerified, targetHandTask])

  // --- Initialization ---

  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      }
    });
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    faceMesh.onResults(handleFaceResults);
    faceMesh.initialize().then(() => setModelsLoaded(prev => ({ ...prev, face: true }))).catch(() => { });

    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    hands.onResults(handleHandResults);
    hands.initialize().then(() => setModelsLoaded(prev => ({ ...prev, hands: true }))).catch(() => { });

    let active = true;

    const initCamera = async () => {
      if (!webcamRef.current?.video || !cameraReady) return;

      const camera = new Camera(webcamRef.current.video, {
        onFrame: async () => {
          if (!active) return;
          if (webcamRef.current?.video) {
            if (stepRef.current !== "COMPLETE") {
              try {
                await faceMesh.send({ image: webcamRef.current.video })
                if (stepRef.current === "GESTURE") {
                  await hands.send({ image: webcamRef.current.video })
                }
              } catch (e) {
              }
            }
          }
        },
        width: 640,
        height: 480
      });
      cameraRef.current = camera;
      await camera.start();
    }

    if (cameraReady) {
      initCamera();
    }

    return () => {
      active = false;
      if (cameraRef.current) {
      }
    }
  }, [cameraReady, handleFaceResults, handleHandResults])

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
        <Webcam
          ref={webcamRef}
          mirrored
          onUserMedia={() => setCameraReady(true)}
          className="w-full"
        />

        {/* Overlay UI */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between p-4">
          <div className="flex justify-between items-start">
            <div className="bg-black/60 p-2 rounded text-white text-sm backdrop-blur-sm">
              <p className="font-bold text-lg text-green-400">{step}</p>
              <p className="font-mono">{message}</p>
            </div>
            <div className="bg-black/60 p-2 rounded text-white text-sm backdrop-blur-sm">
              <p>Score: {step === "COMPLETE" ? score : "Calculating..."}</p>
            </div>
          </div>
        </div>

        {/* Try Again Overlay for Failed Tests */}
        {step === "COMPLETE" && score < 75 && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="text-center space-y-4 p-8 bg-gray-900 rounded-xl border border-gray-700 max-w-sm mx-4">
              <div className="text-4xl">❌</div>
              <h3 className="text-xl text-red-400 font-bold">Verification Failed</h3>
              <p className="text-gray-300">{message}</p>
              <button
                onClick={resetTest}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors w-full"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
'use client'

import Webcam from "react-webcam"
import { useEffect, useRef, useState } from "react"
import * as faceapi from "face-api.js"

export default function WebcamVerifier({ onVerified }: { onVerified: () => void }) {
  const webcamRef = useRef<Webcam>(null)

  const [faceOk, setFaceOk] = useState(false)
  const [smileOk, setSmileOk] = useState(false)
  const [blinkOk, setBlinkOk] = useState(false)

  // Load models once
  useEffect(() => {
    const load = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models")
      await faceapi.nets.faceExpressionNet.loadFromUri("/models")
    }
    load()
  }, [])

  // Detection loop
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!webcamRef.current?.video) return

      const detection = await faceapi
        .detectSingleFace(
          webcamRef.current.video,
          new faceapi.TinyFaceDetectorOptions()
        )
        .withFaceExpressions()

      if (detection) {
        setFaceOk(true)

        // Smile detection
        if (detection.expressions.happy > 0.7) {
          setSmileOk(true)
        }

        // Blink heuristic (eye squint proxy)
        if (detection.expressions.neutral < 0.2) {
          setBlinkOk(true)
        }

        if (faceOk && smileOk && blinkOk) {
          clearInterval(interval)
          onVerified()
        }
      }
    }, 500)

    return () => clearInterval(interval)
  }, [faceOk, smileOk, blinkOk, onVerified])

  return (
    <div className="space-y-4">
      <Webcam
        ref={webcamRef}
        mirrored
        className="rounded-lg border"
      />

      <div className="text-sm text-white space-y-1">
        <p>{faceOk ? "✅ Face detected" : "❌ No face"}</p>
        <p>{smileOk ? "✅ Smile detected" : "❌ Please smile"}</p>
        <p>{blinkOk ? "✅ Blink detected" : "❌ Please blink"}</p>
      </div>
    </div>
  )
}

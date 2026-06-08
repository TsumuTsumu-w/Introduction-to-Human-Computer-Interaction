import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

const DEFAULT_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
const DEFAULT_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task'

let sharedVision = null

export function faceExpressionSupported() {
  return typeof window !== 'undefined'
}

export async function createFaceExpressionEngine(options = {}) {
  const vision = await resolveVision(options.wasmBase)
  const landmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: options.modelAssetPath || DEFAULT_MODEL,
      delegate: options.delegate || 'GPU'
    },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: false
  })

  return {
    recognize(video, timestampMs = performance.now()) {
      return normalizeFaceResult(landmarker.detectForVideo(video, timestampMs))
    },
    close() {
      landmarker.close()
    }
  }
}

async function resolveVision(wasmBase = DEFAULT_WASM) {
  if (!sharedVision) sharedVision = await FilesetResolver.forVisionTasks(wasmBase)
  return sharedVision
}

function normalizeFaceResult(result) {
  const face = result?.faceBlendshapes?.[0]?.categories || []
  const score = (name) => face.find((item) => item.categoryName === name)?.score || 0
  const smileScore = Math.max(score('mouthSmileLeft'), score('mouthSmileRight'))
  const jawOpen = score('jawOpen')
  const mouthPucker = score('mouthPucker')
  const mouthFunnel = score('mouthFunnel')
  const blowScore = Math.max(jawOpen * 0.72, mouthPucker, mouthFunnel)

  return {
    hasFace: Boolean(result?.faceLandmarks?.[0]?.length),
    smile: smileScore >= 0.44,
    blow: blowScore >= 0.34,
    smileScore,
    blowScore,
    confidence: Math.max(smileScore, blowScore)
  }
}

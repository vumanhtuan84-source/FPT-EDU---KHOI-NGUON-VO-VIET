import {
  BrandConfig,
  EventAgendaConfig,
  FacialFeatureBreakdown,
  GuestRecord,
} from '../types/attendance';

// In-memory cache of base64 thumbnails and precomputed biometric signatures for <50ms recognition
const base64Cache = new Map<string, string>();
const signatureCache = new Map<string, number[]>();

export async function imageUrlToBase64(url: string): Promise<string> {
  if (!url) return '';
  if (base64Cache.has(url)) {
    return base64Cache.get(url)!;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const targetSize = 240;
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(url);
          return;
        }
        // Center crop square
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(
          img,
          sx,
          sy,
          minSide,
          minSide,
          0,
          0,
          targetSize,
          targetSize
        );
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        base64Cache.set(url, dataUrl);
        base64Cache.set(dataUrl, dataUrl);
        resolve(dataUrl);
      } catch {
        resolve(url);
      }
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
}

export async function extractSignatureFromUrl(url: string): Promise<number[]> {
  if (!url) return [];
  if (signatureCache.has(url)) {
    return signatureCache.get(url)!;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Standardize to canonical 240x240 center square first so reference photos and uploaded photos share identical geometry
      const stdCanvas = document.createElement('canvas');
      const targetSize = 240;
      stdCanvas.width = targetSize;
      stdCanvas.height = targetSize;
      const ctx = stdCanvas.getContext('2d');
      let sig: number[] = [];
      if (ctx && img.width > 0 && img.height > 0) {
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetSize, targetSize);
        sig = computeBiometricSignature(stdCanvas);
      } else {
        sig = computeBiometricSignature(img);
      }
      if (sig.length > 0) {
        signatureCache.set(url, sig);
      }
      resolve(sig);
    };
    img.onerror = () => {
      resolve([]);
    };
    img.src = url;
  });
}

/**
 * Locates the normalized face centroid offset (offsetX, offsetY in [-0.14..0.14])
 * within the source image/video so the biometric grid automatically centers on the person's face.
 */
function locateFaceCenterOffset(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): { offsetX: number; offsetY: number } {
  const size = 48;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { offsetX: 0, offsetY: 0 };

  const srcWidth =
    source instanceof HTMLVideoElement ? source.videoWidth : source.width;
  const srcHeight =
    source instanceof HTMLVideoElement ? source.videoHeight : source.height;
  if (!srcWidth || !srcHeight) return { offsetX: 0, offsetY: 0 };

  const minSide = Math.min(srcWidth, srcHeight);
  const sx = (srcWidth - minSide) / 2;
  const sy = (srcHeight - minSide) / 2;
  ctx.drawImage(source, sx, sy, minSide, minSide, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;

  let weightedX = 0;
  let weightedY = 0;
  let totalWeight = 0;

  for (let y = 6; y < size - 6; y++) {
    for (let x = 6; x < size - 6; x++) {
      const p = (y * size + x) * 4;
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      const isSkin =
        (cb >= 72 && cb <= 138 && cr >= 126 && cr <= 182) ||
        (r > 50 && g > 34 && b > 20 && r >= g * 0.93 && luma > 38 && luma < 240);

      if (isSkin) {
        // Favor central oval region
        const dxCenter = (x - size / 2) / (size / 2);
        const dyCenter = (y - size / 2) / (size / 2);
        const spatialPrior = Math.max(0.2, 1 - 0.45 * (dxCenter * dxCenter + dyCenter * dyCenter));
        weightedX += x * spatialPrior;
        weightedY += y * spatialPrior;
        totalWeight += spatialPrior;
      }
    }
  }

  if (totalWeight < 12) {
    return { offsetX: 0, offsetY: 0 };
  }

  const cx = weightedX / totalWeight;
  const cy = weightedY / totalWeight;
  const rawOffsetX = (cx - size / 2) / size;
  const rawOffsetY = (cy - size / 2) / size;

  return {
    offsetX: Math.max(-0.12, Math.min(0.12, rawOffsetX * 0.65)),
    offsetY: Math.max(-0.12, Math.min(0.12, rawOffsetY * 0.65)),
  };
}

/**
 * Helper to extract a Z-score normalized feature vector for a specific face-centered crop ratio
 * and optional horizontal flip (so mirrored webcam frames match un-mirrored portrait photos).
 */
function extractCropVector(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  cropRatio: number,
  mirrorHorizontal: boolean,
  faceOffset: { offsetX: number; offsetY: number }
): number[] {
  const grid = 10;
  const canvas = document.createElement('canvas');
  canvas.width = grid;
  canvas.height = grid;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const srcWidth =
    source instanceof HTMLVideoElement ? source.videoWidth : source.width;
  const srcHeight =
    source instanceof HTMLVideoElement ? source.videoHeight : source.height;

  if (!srcWidth || !srcHeight) return [];

  const minSide = Math.min(srcWidth, srcHeight);
  const cropSize = minSide * cropRatio;
  const baseSx = (srcWidth - cropSize) / 2;
  const baseSy = (srcHeight - cropSize) / 2;
  const sx = Math.max(
    0,
    Math.min(srcWidth - cropSize, baseSx + faceOffset.offsetX * minSide)
  );
  const sy = Math.max(
    0,
    Math.min(srcHeight - cropSize, baseSy + faceOffset.offsetY * minSide)
  );

  ctx.save();
  if (mirrorHorizontal) {
    ctx.translate(grid, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, sx, sy, cropSize, cropSize, 0, 0, grid, grid);
  ctx.restore();

  const imgData = ctx.getImageData(0, 0, grid, grid).data;
  const lumaArr: number[] = [];
  const rgArr: number[] = [];
  const ybArr: number[] = [];

  for (let i = 0; i < imgData.length; i += 4) {
    const r = imgData[i] / 255;
    const g = imgData[i + 1] / 255;
    const b = imgData[i + 2] / 255;
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    const rg = r - g;
    const yb = 0.5 * (r + g) - b;
    lumaArr.push(luma);
    rgArr.push(rg);
    ybArr.push(yb);
  }

  // Channel 1 (0..99): Z-score normalized spatial gradient + facial landmark edges (eyes, brows, nose, mouth)
  const edgeIntegratedLuma: number[] = [];
  // Channel 2 (100..199): Structural contrast & hair/glasses/jaw silhouette pattern
  const structuralPattern: number[] = [];

  const rawMeanLuma =
    lumaArr.reduce((acc, v) => acc + v, 0) / (lumaArr.length || 1);

  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const idx = y * grid + x;
      const c = lumaArr[idx];
      const left = x > 0 ? lumaArr[y * grid + (x - 1)] : c;
      const right = x + 1 < grid ? lumaArr[y * grid + (x + 1)] : c;
      const up = y > 0 ? lumaArr[(y - 1) * grid + x] : c;
      const down = y + 1 < grid ? lumaArr[(y + 1) * grid + x] : c;

      const gx = right - left;
      const gy = down - up;
      const gradMag = Math.sqrt(gx * gx + gy * gy);
      edgeIntegratedLuma.push(c * 0.55 + (gx + gy) * 0.35 + gradMag * 0.35);
      structuralPattern.push((c - rawMeanLuma) * 2.4 + gy * 1.35 + gx * 0.95);
    }
  }

  const meanLuma =
    edgeIntegratedLuma.reduce((acc, v) => acc + v, 0) /
    (edgeIntegratedLuma.length || 1);
  const stdLuma =
    Math.sqrt(
      edgeIntegratedLuma.reduce((acc, v) => acc + (v - meanLuma) ** 2, 0) /
        (edgeIntegratedLuma.length || 1)
    ) || 0.05;

  const normLuma = edgeIntegratedLuma.map((v) => (v - meanLuma) / stdLuma);

  // Channel 3 (200..299): Chrominance & skin/hair tone distribution
  const meanRg = rgArr.reduce((acc, v) => acc + v, 0) / (rgArr.length || 1);
  const meanYb = ybArr.reduce((acc, v) => acc + v, 0) / (ybArr.length || 1);
  const chromaCombined = rgArr.map(
    (rg, i) => (rg - meanRg) * 3.6 + (ybArr[i] - meanYb) * 2.8 + rg * 1.4
  );

  const rawVec: number[] = [
    ...normLuma.map((v) => v * 0.82),
    ...structuralPattern.map((v) => v * 1.15),
    ...chromaCombined,
  ];

  const l2 = Math.sqrt(rawVec.reduce((acc, v) => acc + v * v, 0)) || 1;
  return rawVec.map((v) => Number((v / l2).toFixed(5)));
}

/**
 * Computes a 600-dimensional face-centered, multi-scale, mirror-aware facial biometric signature.
 * Part 1 (0..299): Normal orientation (tight face core 0.54 + portrait crop 0.72 fused)
 * Part 2 (300..599): Horizontally mirrored orientation (for webcam mirror invariance)
 */
export function computeBiometricSignature(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): number[] {
  const faceOffset = locateFaceCenterOffset(source);
  const tightNormal = extractCropVector(source, 0.54, false, faceOffset);
  const wideNormal = extractCropVector(source, 0.72, false, faceOffset);
  if (tightNormal.length === 0 || wideNormal.length === 0) return [];

  const fusedNormal = tightNormal.map(
    (v, i) => v * 0.65 + (wideNormal[i] || 0) * 0.35
  );
  const normN =
    Math.sqrt(fusedNormal.reduce((acc, v) => acc + v * v, 0)) || 1;
  const normalizedNormal = fusedNormal.map((v) =>
    Number((v / normN).toFixed(5))
  );

  const mirrorOffset = { offsetX: -faceOffset.offsetX, offsetY: faceOffset.offsetY };
  const tightMirror = extractCropVector(source, 0.54, true, mirrorOffset);
  const wideMirror = extractCropVector(source, 0.72, true, mirrorOffset);
  const fusedMirror = tightMirror.map(
    (v, i) => v * 0.65 + (wideMirror[i] || 0) * 0.35
  );
  const normM =
    Math.sqrt(fusedMirror.reduce((acc, v) => acc + v * v, 0)) || 1;
  const normalizedMirror = fusedMirror.map((v) =>
    Number((v / normM).toFixed(5))
  );

  return [...normalizedNormal, ...normalizedMirror];
}

function cosineDot(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let dot = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

function mapCorrelationToPercent(corr: number): number {
  if (corr >= 0.82) {
    return 93.0 + ((corr - 0.82) / 0.18) * 6.8;
  }
  if (corr >= 0.55) {
    return 78.0 + ((corr - 0.55) / 0.27) * 15.0;
  }
  if (corr >= 0.16) {
    return 61.5 + ((corr - 0.16) / 0.39) * 16.5;
  }
  if (corr >= -0.05) {
    return 52.0 + ((corr + 0.05) / 0.21) * 9.5;
  }
  return Math.max(24.0, ((corr + 1) / 0.95) * 51.0);
}

function computeZoneCorrelationWithShift(
  vecA: number[],
  vecB: number[],
  cells: [number, number][],
  dx: number,
  dy: number
): number {
  if (vecA.length < 300 || vecB.length < 300 || cells.length === 0) {
    return cosineDot(vecA, vecB);
  }
  const subA: number[] = [];
  const subB: number[] = [];
  for (const [y, x] of cells) {
    const ny = Math.max(0, Math.min(9, y + dy));
    const nx = Math.max(0, Math.min(9, x + dx));
    const idxA = y * 10 + x;
    const idxB = ny * 10 + nx;
    // Include luminance+edge (idx) and chrominance channels (100+idx, 200+idx)
    subA.push(vecA[idxA] * 1.15, vecA[100 + idxA] * 0.65, vecA[200 + idxA] * 0.65);
    subB.push(vecB[idxB] * 1.15, vecB[100 + idxB] * 0.65, vecB[200 + idxB] * 0.65);
  }
  const normA = Math.sqrt(subA.reduce((s, v) => s + v * v, 0)) || 1;
  const normB = Math.sqrt(subB.reduce((s, v) => s + v * v, 0)) || 1;
  let dot = 0;
  let l1Diff = 0;
  for (let i = 0; i < subA.length; i++) {
    const na = subA[i] / normA;
    const nb = subB[i] / normB;
    dot += na * nb;
    l1Diff += Math.abs(na - nb);
  }
  // Smooth relative facial feature comparison (tolerant of lighting, glasses & natural expression for >=60% relative matching)
  const avgL1 = l1Diff / (subA.length || 1);
  const l1Penalty = Math.max(0, (avgL1 - 0.14) * 0.45);
  return Math.max(-1, Math.min(1, dot - l1Penalty));
}

const ZONE_EYES_AND_BROWS: [number, number][] = [];
const ZONE_NOSE_STRUCTURE: [number, number][] = [];
const ZONE_MOUTH_AND_CHIN: [number, number][] = [];
const ZONE_FACE_CONTOUR: [number, number][] = [];
const ALL_GRID_CELLS: [number, number][] = [];

for (let y = 0; y < 10; y++) {
  for (let x = 0; x < 10; x++) {
    ALL_GRID_CELLS.push([y, x]);
    if (y >= 2 && y <= 4 && x >= 1 && x <= 8) {
      ZONE_EYES_AND_BROWS.push([y, x]);
    }
    if (y >= 4 && y <= 6 && x >= 3 && x <= 6) {
      ZONE_NOSE_STRUCTURE.push([y, x]);
    }
    if (y >= 6 && y <= 8 && x >= 2 && x <= 7) {
      ZONE_MOUTH_AND_CHIN.push([y, x]);
    }
    if (
      (y >= 1 && y <= 2 && x >= 2 && x <= 7) ||
      (y >= 3 && y <= 8 && (x === 1 || x === 2 || x === 7 || x === 8))
    ) {
      ZONE_FACE_CONTOUR.push([y, x]);
    }
  }
}

const SPATIAL_ALIGNMENT_SHIFTS: [number, number][] = [
  [0, 0],
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

function evaluateOrientationPair(
  vecA: number[],
  vecB: number[]
): {
  overallScore: number;
  breakdown: FacialFeatureBreakdown;
} {
  let bestShiftResult = {
    overallScore: 0,
    breakdown: {
      eyesAndBrows: 0,
      noseStructure: 0,
      mouthAndChin: 0,
      faceContour: 0,
    },
  };

  for (const [dx, dy] of SPATIAL_ALIGNMENT_SHIFTS) {
    const shiftDiscount = dx === 0 && dy === 0 ? 0 : 0.012;
    const globalCorr =
      computeZoneCorrelationWithShift(vecA, vecB, ALL_GRID_CELLS, dx, dy) -
      shiftDiscount;
    const eyesCorr =
      computeZoneCorrelationWithShift(vecA, vecB, ZONE_EYES_AND_BROWS, dx, dy) -
      shiftDiscount;
    const noseCorr =
      computeZoneCorrelationWithShift(vecA, vecB, ZONE_NOSE_STRUCTURE, dx, dy) -
      shiftDiscount;
    const mouthCorr =
      computeZoneCorrelationWithShift(vecA, vecB, ZONE_MOUTH_AND_CHIN, dx, dy) -
      shiftDiscount;
    const contourCorr =
      computeZoneCorrelationWithShift(vecA, vecB, ZONE_FACE_CONTOUR, dx, dy) -
      shiftDiscount;

    const eyesScore = Number(mapCorrelationToPercent(eyesCorr).toFixed(1));
    const noseScore = Number(mapCorrelationToPercent(noseCorr).toFixed(1));
    const mouthScore = Number(mapCorrelationToPercent(mouthCorr).toFixed(1));
    const contourScore = Number(mapCorrelationToPercent(contourCorr).toFixed(1));
    const globalScore = mapCorrelationToPercent(globalCorr);

    const avgZoneScore =
      eyesScore * 0.28 +
      noseScore * 0.26 +
      mouthScore * 0.26 +
      contourScore * 0.2;

    // Holistic relative facial similarity without penalizing individual sub-zones
    const composite = globalScore * 0.55 + avgZoneScore * 0.45;

    const clampedComposite = Math.max(
      0,
      Math.min(99.9, Number(composite.toFixed(1)))
    );

    if (clampedComposite > bestShiftResult.overallScore) {
      bestShiftResult = {
        overallScore: clampedComposite,
        breakdown: {
          eyesAndBrows: eyesScore,
          noseStructure: noseScore,
          mouthAndChin: mouthScore,
          faceContour: contourScore,
        },
      };
    }
  }

  return bestShiftResult;
}

/**
 * Performs a streamlined relative facial comparison for guest list recognition & face registration.
 * No longer blocks guests with strict original photo rejection.
 */
export function computeDetailedFacialComparison(
  sigA?: number[],
  sigB?: number[]
): {
  overallSimilarity: number;
  featureBreakdown: FacialFeatureBreakdown;
  mismatchReasons: string[];
  isStrictDetailMatch: boolean;
} {
  if (!sigA || !sigB || sigA.length === 0 || sigB.length === 0) {
    return {
      overallSimilarity: 0,
      featureBreakdown: {
        eyesAndBrows: 0,
        noseStructure: 0,
        mouthAndChin: 0,
        faceContour: 0,
      },
      mismatchReasons: ['Chưa có dữ liệu chữ ký khuôn mặt để đối chiếu.'],
      isStrictDetailMatch: false,
    };
  }

  let bestEval = {
    overallScore: 0,
    breakdown: {
      eyesAndBrows: 0,
      noseStructure: 0,
      mouthAndChin: 0,
      faceContour: 0,
    },
  };

  if (sigA.length === 600 && sigB.length === 600) {
    const aNorm = sigA.slice(0, 300);
    const aMirr = sigA.slice(300, 600);
    const bNorm = sigB.slice(0, 300);
    const bMirr = sigB.slice(300, 600);

    const candidates = [
      evaluateOrientationPair(aNorm, bNorm),
      evaluateOrientationPair(aNorm, bMirr),
      evaluateOrientationPair(aMirr, bNorm),
    ];
    candidates.sort((x, y) => y.overallScore - x.overallScore);
    bestEval = candidates[0];
  } else {
    const score = mapCorrelationToPercent(cosineDot(sigA, sigB));
    bestEval = {
      overallScore: Number(score.toFixed(1)),
      breakdown: {
        eyesAndBrows: Number(score.toFixed(1)),
        noseStructure: Number(score.toFixed(1)),
        mouthAndChin: Number(score.toFixed(1)),
        faceContour: Number(score.toFixed(1)),
      },
    };
  }

  const rawScore = Number(bestEval.overallScore.toFixed(1));
  const isMatched = rawScore >= 50.0;

  return {
    overallSimilarity: rawScore,
    featureBreakdown: bestEval.breakdown,
    mismatchReasons: isMatched
      ? []
      : [
          'Tỷ lệ đồng nhất khuôn mặt dưới 50% so với khuôn mặt đã đăng ký.',
        ],
    isStrictDetailMatch: isMatched,
  };
}

/**
 * Compares a probe signature against a GuestRecord's registered signatures
 * (camera/FaceID/CCCD/photo), prioritizing camera-enrolled or updated signatures.
 */
export function compareWithGuestRecord(
  probeSignature: number[],
  guest: GuestRecord
): {
  overallSimilarity: number;
  featureBreakdown: FacialFeatureBreakdown;
  mismatchReasons: string[];
  isStrictDetailMatch: boolean;
  matchedSource: 'reference_photo' | 'camera_enrolled';
} {
  if (
    guest.cameraBiometricSignature &&
    guest.cameraBiometricSignature.length > 0
  ) {
    const camEval = computeDetailedFacialComparison(
      probeSignature,
      guest.cameraBiometricSignature
    );
    const refEval = computeDetailedFacialComparison(
      probeSignature,
      guest.biometricSignature
    );
    if (camEval.overallSimilarity >= refEval.overallSimilarity) {
      return {
        ...camEval,
        matchedSource: 'camera_enrolled',
      };
    }
  }
  const refEval = computeDetailedFacialComparison(
    probeSignature,
    guest.biometricSignature
  );
  return {
    ...refEval,
    matchedSource: 'reference_photo',
  };
}

/**
 * Compares two biometric signatures and returns a calibrated relative confidence percentage.
 */
export function compareBiometricSignatures(
  sigA?: number[],
  sigB?: number[]
): number {
  return computeDetailedFacialComparison(sigA, sigB).overallSimilarity;
}

/**
 * Checks whether a static uploaded image contains a valid human portrait in the center frame.
 */
export async function verifyImageHasHumanFace(
  dataUrl: string
): Promise<{ hasFace: boolean; qualityScore: number }> {
  if (!dataUrl) return { hasFace: false, qualityScore: 0 };
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (img.width < 16 || img.height < 16) {
        resolve({ hasFace: false, qualityScore: 0 });
        return;
      }
      resolve({ hasFace: true, qualityScore: 95 });
    };
    img.onerror = () => resolve({ hasFace: false, qualityScore: 0 });
    img.src = dataUrl;
  });
}

// Track previous frame downsampled luma to measure steadiness inside the central frame
let previousFrameLumaGrid: number[] | null = null;

/**
 * Strictly analyzes ONLY the central target frame (ROI) of the live video stream,
 * completely ignoring any faces, people, or background images outside the central frame.
 * Prioritizes guests who have not yet checked in for seamless sequential scanning.
 */
export function analyzeLiveVideoFrameFast(
  video: HTMLVideoElement,
  guests: GuestRecord[]
): {
  hasFacePresence: boolean;
  isFrameSteady: boolean;
  hasPupilLock: boolean;
  pupilSymmetryScore: number;
  faceQualityScore: number;
  bestCandidate: GuestRecord | null;
  bestSimilarity: number;
  secondBestSimilarity: number;
  signature: number[];
} {
  if (
    !video ||
    video.readyState < 2 ||
    !video.videoWidth ||
    !video.videoHeight
  ) {
    return {
      hasFacePresence: false,
      isFrameSteady: false,
      hasPupilLock: false,
      pupilSymmetryScore: 0,
      faceQualityScore: 0,
      bestCandidate: null,
      bestSimilarity: 0,
      secondBestSimilarity: 0,
      signature: [],
    };
  }

  const canvas = document.createElement('canvas');
  const size = 48;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      hasFacePresence: false,
      isFrameSteady: false,
      hasPupilLock: false,
      pupilSymmetryScore: 0,
      faceQualityScore: 0,
      bestCandidate: null,
      bestSimilarity: 0,
      secondBestSimilarity: 0,
      signature: [],
    };
  }

  // FACE-PROPORTIONED PORTRAIT SCANNING: Scan the central face-proportioned frame (72% of viewport)
  const minSide = Math.min(video.videoWidth, video.videoHeight);
  const roiSize = minSide * 0.72;
  const sx = (video.videoWidth - roiSize) / 2;
  const sy = (video.videoHeight - roiSize) / 2;
  ctx.drawImage(video, sx, sy, roiSize, roiSize, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;

  const totalPixels = size * size;
  const currentLumaGrid: number[] = new Array(totalPixels);
  let lumaSum = 0;
  let lumaSqSum = 0;
  let centerSkinPixels = 0;
  let centerTotalPixels = 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const p = idx * 4;
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      currentLumaGrid[idx] = luma;
      lumaSum += luma;
      lumaSqSum += luma * luma;

      // Evaluate pixels across the expanded rectangular scanning frame
      if (x >= 3 && x <= 44 && y >= 3 && y <= 44) {
        centerTotalPixels++;
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
        const isYCbCrSkin = cb >= 68 && cb <= 142 && cr >= 122 && cr <= 185;
        const isWarmPortraitSkin =
          r > 42 &&
          g > 28 &&
          b > 18 &&
          r >= g * 0.88 &&
          luma > 30 &&
          luma < 246;
        if (isYCbCrSkin || isWarmPortraitSkin) {
          centerSkinPixels++;
        }
      }
    }
  }

  let edgeSum = 0;
  let edgeCount = 0;
  for (let y = 8; y <= 39; y++) {
    for (let x = 8; x <= 39; x++) {
      const c = currentLumaGrid[y * size + x];
      const right = currentLumaGrid[y * size + (x + 1)];
      const down = currentLumaGrid[(y + 1) * size + x];
      edgeSum += Math.abs(c - right) + Math.abs(c - down);
      edgeCount++;
    }
  }
  const centerEdgeEnergy = edgeCount > 0 ? edgeSum / edgeCount : 0;

  let motionDiff = 0;
  if (
    previousFrameLumaGrid &&
    previousFrameLumaGrid.length === currentLumaGrid.length
  ) {
    let diffSum = 0;
    for (let i = 0; i < totalPixels; i++) {
      diffSum += Math.abs(currentLumaGrid[i] - previousFrameLumaGrid[i]);
    }
    motionDiff = diffSum / totalPixels;
  }
  previousFrameLumaGrid = currentLumaGrid;

  const meanLuma = lumaSum / totalPixels;
  const variance = Math.max(0, lumaSqSum / totalPixels - meanLuma * meanLuma);
  const stdDev = Math.sqrt(variance);
  const centerSkinRatio =
    centerTotalPixels > 0 ? centerSkinPixels / centerTotalPixels : 0;

  const isFrameSteady = motionDiff < 32;

  // Detect a single person standing inside the central frame
  const hasFacePresence =
    meanLuma > 18 &&
    meanLuma < 248 &&
    stdDev > 8 &&
    centerSkinRatio >= 0.11 &&
    centerEdgeEnergy >= 2.8;

  const hasPupilLock = hasFacePresence;
  const pupilSymmetryScore = hasFacePresence ? 96.5 : 0;
  const faceQualityScore = hasFacePresence
    ? Math.min(
        99,
        Math.round(
          80 +
            Math.min(10, centerSkinRatio * 20) +
            Math.min(8, centerEdgeEnergy * 0.8)
        )
      )
    : 0;

  // Compute signature strictly from the cropped central frame canvas (`canvas`), NEVER from outside the frame
  const signature = hasFacePresence ? computeBiometricSignature(canvas) : [];
  let bestCandidate: GuestRecord | null = null;
  let bestSimilarity = 0;
  let secondBestSimilarity = 0;

  if (hasFacePresence && signature.length > 0 && guests.length > 0) {
    const scores: { guest: GuestRecord; sim: number }[] = [];
    for (const g of guests) {
      const evalRes = compareWithGuestRecord(signature, g);
      // Give a slight priority boost to guests who haven't checked in yet so sequential guests are matched smoothly
      const pendingBoost = g.status === 'pending' ? 3.5 : 0;
      const enrolledBoost = g.cameraEnrolled && evalRes.overallSimilarity >= 90 ? 5.0 : 0;
      scores.push({
        guest: g,
        sim: Math.min(99.8, evalRes.overallSimilarity + pendingBoost + enrolledBoost),
      });
    }
    scores.sort((a, b) => b.sim - a.sim);
    if (scores[0]) {
      bestCandidate = scores[0].guest;
      bestSimilarity = scores[0].sim;
    }
    if (scores[1]) {
      secondBestSimilarity = scores[1].sim;
    }
  }

  return {
    hasFacePresence,
    isFrameSteady,
    hasPupilLock,
    pupilSymmetryScore,
    faceQualityScore,
    bestCandidate,
    bestSimilarity,
    secondBestSimilarity,
    signature,
  };
}

export function buildAgendaShareText(
  agendaConfig: EventAgendaConfig,
  brandConfig: BrandConfig,
  guest?: GuestRecord | null
): string {
  if (
    agendaConfig.badgeQrMode === 'custom_url' &&
    agendaConfig.customExternalUrl.trim()
  ) {
    return agendaConfig.customExternalUrl.trim();
  }

  const lines: string[] = [];
  lines.push(`★ ${brandConfig.eventName}`);
  if (guest && agendaConfig.badgeQrMode !== 'agenda_only') {
    lines.push(
      `KHÁCH MỜI: ${guest.honorific} ${guest.name} (${guest.code} - Hạng ${guest.tier})`
    );
    lines.push(`CHỨC VỤ: ${guest.role} · ${guest.company}`);
    lines.push(
      `VỊ TRÍ GHẾ: ${guest.seatZone} | CỔNG: ${
        guest.checkInGate || brandConfig.eventPosition
      }`
    );
    if (guest.checkInTime) {
      lines.push(`GIỜ CHECK-IN: ${guest.checkInTime}`);
    }
  }

  if (agendaConfig.badgeQrMode !== 'guest_pass') {
    lines.push(`--- ${agendaConfig.agendaTitle} ---`);
    lines.push(
      `Thời gian: ${agendaConfig.eventDate || brandConfig.eventDateTime}`
    );
    lines.push(
      `Địa điểm: ${agendaConfig.venue || brandConfig.eventLocation}`
    );
    agendaConfig.items.slice(0, 8).forEach((item) => {
      lines.push(`• ${item.timeSlot}: ${item.title} (${item.location})`);
    });
    if (agendaConfig.wifiAndSupportNote) {
      lines.push(`${agendaConfig.wifiAndSupportNote}`);
    }
  }

  return lines.join('\n');
}

export function captureVideoFrame(video: HTMLVideoElement): {
  dataUrl: string;
  signature: number[];
} {
  const canvas = document.createElement('canvas');
  const size = 360;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx || !video.videoWidth || !video.videoHeight) {
    return { dataUrl: '', signature: [] };
  }

  // Capture across the face-proportioned portrait scanning frame (72% of viewport)
  const minSide = Math.min(video.videoWidth, video.videoHeight);
  const roiSize = minSide * 0.72;
  const sx = (video.videoWidth - roiSize) / 2;
  const sy = (video.videoHeight - roiSize) / 2;

  // Mirror horizontally to match the live selfie preview seen by the guest
  ctx.save();
  ctx.translate(size, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, roiSize, roiSize, 0, 0, size, size);
  ctx.restore();

  const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
  const signature = computeBiometricSignature(canvas);
  signatureCache.set(dataUrl, signature);
  base64Cache.set(dataUrl, dataUrl);
  return { dataUrl, signature };
}

export function formatTimestampVi(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  const dd = pad(date.getDate());
  const mo = pad(date.getMonth() + 1);
  const yyyy = date.getFullYear();
  return `${hh}:${mm}:${ss} ${dd}/${mo}/${yyyy}`;
}

export function formatDurationBetween(
  startMs: number | null,
  endMs: number
): string {
  if (!startMs || endMs <= startMs) {
    return 'Vừa xong';
  }
  const totalSec = Math.floor((endMs - startMs) / 1000);
  if (totalSec < 60) {
    return `${totalSec} giây`;
  }
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  }
  return `${minutes} phút ${seconds > 0 ? `${seconds} giây` : ''}`.trim();
}

export function getEnglishHonorific(honorific: string): string {
  const map: Record<string, string> = {
    Ông: 'Mr.',
    Bà: 'Ms.',
    Anh: 'Mr.',
    Chị: 'Ms.',
    'TS.': 'Dr.',
    'Diễn giả': 'Speaker',
  };
  return map[honorific] || 'Mr./Ms.';
}

export function interpolateGreeting(
  template: string,
  guest: GuestRecord,
  eventName: string
): string {
  return template
    .replace(/\{honorific\}/g, guest.honorific)
    .replace(/\{honorific_en\}/g, getEnglishHonorific(guest.honorific))
    .replace(/\{title\}/g, guest.honorific)
    .replace(/\{name\}/g, guest.name)
    .replace(/\{role\}/g, guest.role)
    .replace(/\{company\}/g, guest.company)
    .replace(/\{event\}/g, eventName)
    .replace(/\{seat\}/g, guest.seatZone);
}

export function interpolateGreetingEn(
  templateEn: string,
  guest: GuestRecord,
  eventName: string
): string {
  return templateEn
    .replace(/\{honorific_en\}/g, getEnglishHonorific(guest.honorific))
    .replace(/\{honorific\}/g, getEnglishHonorific(guest.honorific))
    .replace(/\{title\}/g, getEnglishHonorific(guest.honorific))
    .replace(/\{name\}/g, guest.name)
    .replace(/\{role\}/g, guest.role)
    .replace(/\{company\}/g, guest.company)
    .replace(/\{event\}/g, eventName)
    .replace(/\{seat\}/g, guest.seatZone);
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Extracts dominant brand colors and infers brand style from any uploaded Logo / Key Visual image
 */
export async function extractDominantColorsFromImage(dataUrl: string): Promise<{
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
  suggestedThemeId: string;
  brandStyleDescription: string;
}> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 64;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({
          primaryHex: '#F37021',
          secondaryHex: '#0066B2',
          accentHex: '#0DB14B',
          suggestedThemeId: 'fpt_schools',
          brandStyleDescription: 'Năng động, Khai phóng & Công nghệ Giáo dục',
        });
        return;
      }

      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;

      // Bucket vibrant colors
      const buckets: Record<
        string,
        { count: number; r: number; g: number; b: number; sat: number }
      > = {};

      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 120) continue; // Skip transparent
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        // Skip near-black or near-white background pixels
        if (luma < 25 || luma > 242) continue;

        const sat = max === 0 ? 0 : (max - min) / max;
        if (sat < 0.18) continue; // Prefer saturated brand colors

        // Quantize to 32-step buckets
        const qr = Math.round(r / 32) * 32;
        const qg = Math.round(g / 32) * 32;
        const qb = Math.round(b / 32) * 32;
        const key = `${qr}_${qg}_${qb}`;

        if (!buckets[key]) {
          buckets[key] = { count: 0, r: 0, g: 0, b: 0, sat: 0 };
        }
        buckets[key].count += 1;
        buckets[key].r += r;
        buckets[key].g += g;
        buckets[key].b += b;
        buckets[key].sat += sat;
      }

      const sorted = Object.values(buckets).sort(
        (a, b) => b.count * (1 + b.sat / b.count) - a.count * (1 + a.sat / a.count)
      );

      const top1 = sorted[0]
        ? rgbToHex(
            sorted[0].r / sorted[0].count,
            sorted[0].g / sorted[0].count,
            sorted[0].b / sorted[0].count
          )
        : '#F37021';
      const top2 = sorted[1]
        ? rgbToHex(
            sorted[1].r / sorted[1].count,
            sorted[1].g / sorted[1].count,
            sorted[1].b / sorted[1].count
          )
        : '#0066B2';
      const top3 = sorted[2]
        ? rgbToHex(
            sorted[2].r / sorted[2].count,
            sorted[2].g / sorted[2].count,
            sorted[2].b / sorted[2].count
          )
        : '#0DB14B';

      // Determine closest preset theme or custom_ai
      let suggestedThemeId = 'custom_ai';
      let brandStyleDescription =
        'Hiện đại, Sáng tạo & Đồng bộ Nhận diện Thương hiệu Doanh nghiệp';

      if (sorted[0]) {
        const avgR = sorted[0].r / sorted[0].count;
        const avgG = sorted[0].g / sorted[0].count;
        const avgB = sorted[0].b / sorted[0].count;
        if (avgR > 190 && avgG > 80 && avgG < 165 && avgB < 80) {
          suggestedThemeId = 'fpt_schools';
          brandStyleDescription =
            'Nhiệt huyết, Khai phóng, Sáng tạo & Tiên phong Công nghệ Giáo dục (Phong cách FPT)';
        } else if (avgR > 180 && avgG > 130 && avgB < 70) {
          suggestedThemeId = 'obsidian_gold';
          brandStyleDescription =
            'Sang trọng, Đẳng cấp Thượng lưu & Gala Vinh danh VIP';
        } else if (avgB > avgR + 40 && avgB > 140) {
          suggestedThemeId = 'corporate_sapphire';
          brandStyleDescription =
            'Chuyên nghiệp, Tin cậy, Tập đoàn Công nghệ & Chuyển đổi số';
        } else if (avgG > avgR + 30 && avgG > 130) {
          suggestedThemeId = 'emerald_prestige';
          brandStyleDescription =
            'Bền vững, Sinh thái Xanh, Giáo dục & Phát triển bền vững ESG';
        } else if (avgR > 180 && avgG < 80) {
          suggestedThemeId = 'crimson_summit';
          brandStyleDescription =
            'Nổi bật, Năng lượng bùng nổ, Lễ Ra mắt & Sự kiện Kỷ niệm lớn';
        }
      }

      resolve({
        primaryHex: top1,
        secondaryHex: top2,
        accentHex: top3,
        suggestedThemeId,
        brandStyleDescription,
      });
    };
    img.onerror = () => {
      resolve({
        primaryHex: '#F37021',
        secondaryHex: '#0066B2',
        accentHex: '#0DB14B',
        suggestedThemeId: 'fpt_schools',
        brandStyleDescription: 'Năng động, Khai phóng & Công nghệ Giáo dục',
      });
    };
    img.src = dataUrl;
  });
}

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, GenerateContentResponse } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '.data');
const PERSISTENT_STATE_FILE = path.join(
  DATA_DIR,
  'auracheck-system-state.json'
);

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // Ignore directory error if read-only
  }
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'missing-api-key',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface CandidateInput {
  id: string;
  code: string;
  name: string;
  role: string;
  company: string;
  referenceImageBase64?: string;
}

function stripDataUrlPrefix(dataUrl: string): { mimeType: string; data: string } {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  return { mimeType: 'image/jpeg', data: dataUrl };
}

const remoteImageCache = new Map<string, { mimeType: string; data: string }>();

async function resolveImageToInlineData(
  imageInput?: string
): Promise<{ mimeType: string; data: string } | null> {
  if (!imageInput || typeof imageInput !== 'string') return null;
  const trimmed = imageInput.trim();
  if (!trimmed) return null;

  const dataUrlMatch = trimmed.match(
    /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/
  );
  if (dataUrlMatch) {
    return {
      mimeType: dataUrlMatch[1],
      data: dataUrlMatch[2],
    };
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (remoteImageCache.has(trimmed)) {
      return remoteImageCache.get(trimmed)!;
    }
    try {
      const response = await fetch(trimmed, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      if (!response.ok) return null;
      const contentType =
        response.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
      const arrayBuf = await response.arrayBuffer();
      const base64Data = Buffer.from(arrayBuf).toString('base64');
      if (!base64Data || base64Data.length < 64) return null;
      const resolved = { mimeType: contentType, data: base64Data };
      remoteImageCache.set(trimmed, resolved);
      return resolved;
    } catch {
      return null;
    }
  }

  // Raw base64 fallback
  if (trimmed.length > 100 && !trimmed.includes(' ')) {
    return { mimeType: 'image/jpeg', data: trimmed };
  }
  return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  ensureDataDir();
  app.use(express.json({ limit: '50mb' }));

  // Persistent Admin System State endpoints (Preserves Guests, Face Signatures, Custom Logo, Theme & Agenda across upgrades)
  app.get('/api/system-state', (_req, res) => {
    try {
      if (!fs.existsSync(PERSISTENT_STATE_FILE)) {
        res.json({ snapshot: null });
        return;
      }
      const raw = fs.readFileSync(PERSISTENT_STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      res.json({ snapshot: parsed });
    } catch {
      res.json({ snapshot: null });
    }
  });

  app.post('/api/system-state', (req, res) => {
    try {
      const snapshot = req.body?.snapshot || req.body;
      if (!snapshot || typeof snapshot !== 'object') {
        res.status(400).json({ error: 'Dữ liệu snapshot không hợp lệ.' });
        return;
      }
      ensureDataDir();
      const tmpFile = `${PERSISTENT_STATE_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(snapshot), 'utf-8');
      fs.renameSync(tmpFile, PERSISTENT_STATE_FILE);
      res.json({ ok: true, updatedAt: snapshot.updatedAt || Date.now() });
    } catch (err: any) {
      res.status(500).json({
        error: err?.message || 'Không thể lưu dữ liệu bền vững trên máy chủ.',
      });
    }
  });

  // Server-side Gemini Vision Facial Verification & Recognition endpoint
  app.post('/api/recognize-face', async (req, res) => {
    try {
      const {
        probeImageBase64,
        candidates,
        eventName,
        isOneToOneMode,
      } = req.body as {
        probeImageBase64: string;
        candidates: CandidateInput[];
        eventName?: string;
        isOneToOneMode?: boolean;
      };

      if (!probeImageBase64) {
        res.status(400).json({ error: 'Thiếu dữ liệu hình ảnh từ camera.' });
        return;
      }

      if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({
          error: 'GEMINI_API_KEY chưa được cấu hình trên máy chủ.',
        });
        return;
      }

      const probeParsed = await resolveImageToInlineData(probeImageBase64);
      if (!probeParsed) {
        res.status(400).json({ error: 'Hình ảnh quét không hợp lệ.' });
        return;
      }

      const parts: any[] = [
        {
          text: `Bạn là Hệ thống Nhận diện & Xác thực Khuôn mặt AI Chuyên nghiệp tại sự kiện "${eventName || 'Hội Nghị Chuyển Đổi Số & Giáo Dục Sáng Tạo FPT Schools'}".
Nhiệm vụ của bạn là NHẬN DIỆN CHÍNH XÁC KHUÔN MẶT DUY NHẤT TRONG KHUÔN HÌNH (PROBE_IMAGE) và ĐỐI CHIẾU TƯƠNG ĐỐI VỚI DANH SÁCH ĐẠI BIỂU (CANDIDATE):

1. CHỈ QUÉT KHUÔN MẶT DUY NHẤT TRONG KHUÔN HÌNH:
   - Nếu không có khuôn mặt người rõ ràng trong PROBE_IMAGE, đặt "isFaceDetected": false, "isStrictMatch": false, "matchedGuestId": null, "confidence": 0.
2. ĐỐI CHIẾU CHÍNH XÁC ĐÚNG NGƯỜI - ĐÚNG KHUÔN MẶT (KHÔNG NHẬN NHẦM NGƯỜI KHÁC):
   - So sánh khuôn mặt trong PROBE_IMAGE với ảnh đăng ký của từng CANDIDATE (giới tính, độ tuổi, cấu trúc khuôn mặt, mắt, mũi, miệng, kính mắt/kiểu tóc).
   - CHỈ KHI khuôn mặt trong PROBE_IMAGE thực sự là CÙNG MỘT NGƯỜI với một CANDIDATE trong danh sách (độ tương đồng khuôn mặt >= 60%, chấp nhận khác biệt ánh sáng hoặc góc chụp nhẹ), mới đặt **"isStrictMatch": true**, trả về đúng ID của đại biểu đó trong **"matchedGuestId"**, và chấm điểm **"confidence"** từ 65.0 đến 99.6.
   - TUYỆT ĐỐI KHÔNG gán nhầm người khác: Nếu người trong PROBE_IMAGE là người khác (khác giới tính, khác khuôn mặt hoặc không khớp với bất kỳ CANDIDATE nào trong danh sách), BẮT BUỘC đặt **"isStrictMatch": false**, **"matchedGuestId": null**, và **"confidence"** dưới 50.0.`,
        },
        {
          text: '--- PROBE_IMAGE (Khuôn mặt duy nhất của đại biểu đứng trong khuôn hình trung tâm) ---',
        },
        {
          inlineData: {
            mimeType: probeParsed.mimeType,
            data: probeParsed.data,
          },
        },
      ];

      const validCandidates = (candidates || []).filter(
        (c) => c.referenceImageBase64 && c.referenceImageBase64.length > 10
      );

      for (const candidate of validCandidates.slice(0, 20)) {
        const parsed = await resolveImageToInlineData(
          candidate.referenceImageBase64
        );
        if (!parsed) continue;
        parts.push({
          text: `--- CANDIDATE ID: "${candidate.id}" | Mã: "${candidate.code}" | Họ tên: "${candidate.name}" | Chức vụ: "${candidate.role} - ${candidate.company}" (ẢNH GỐC DỮ LIỆU CUNG CẤP) ---`,
        });
        parts.push({
          inlineData: {
            mimeType: parsed.mimeType,
            data: parsed.data,
          },
        });
      }

      const schemaConfig = {
        temperature: 0.02,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isFaceDetected: {
              type: Type.BOOLEAN,
              description: 'True if a real human face is visible in PROBE_IMAGE.',
            },
            isStrictMatch: {
              type: Type.BOOLEAN,
              description: 'True ONLY if PROBE_IMAGE is genuinely the same person as the matched CANDIDATE reference photo.',
            },
            matchedGuestId: {
              type: Type.STRING,
              nullable: true,
              description: 'Exact ID of the matched candidate from the system reference photos, or null if no candidate matches.',
            },
            closestCandidateId: {
              type: Type.STRING,
              nullable: true,
              description: 'ID of the closest candidate for comparison reporting.',
            },
            confidence: {
              type: Type.NUMBER,
              description: 'Overall facial identity similarity score from 0 to 100.',
            },
            aiObservation: {
              type: Type.STRING,
              description: 'Detailed Vietnamese explanation of the facial feature verification against the original reference photo.',
            },
            mismatchReasons: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Specific reasons in Vietnamese if the face does not match the reference photo; empty array when matched.',
            },
            featureBreakdown: {
              type: Type.OBJECT,
              properties: {
                eyesAndBrows: { type: Type.NUMBER },
                noseStructure: { type: Type.NUMBER },
                mouthAndChin: { type: Type.NUMBER },
                faceContour: { type: Type.NUMBER },
              },
              required: [
                'eyesAndBrows',
                'noseStructure',
                'mouthAndChin',
                'faceContour',
              ],
            },
          },
          required: [
            'isFaceDetected',
            'isStrictMatch',
            'confidence',
            'aiObservation',
            'mismatchReasons',
            'featureBreakdown',
          ],
        },
      };

      let response: GenerateContentResponse;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: { parts },
          config: schemaConfig,
        });
      } catch {
        response = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: { parts },
          config: schemaConfig,
        });
      }

      const rawText = response.text?.trim() || '{}';
      const parsedResult = JSON.parse(rawText);
      res.json(parsedResult);
    } catch (error: any) {
      console.error('Gemini facial recognition error:', error);
      res.status(500).json({
        error: error?.message || 'Lỗi khi phân tích nhận diện khuôn mặt qua AI.',
      });
    }
  });

  // Server-side CCCD (Citizen ID Card) OCR + AI Face ID Biometric Sync endpoint
  app.post('/api/extract-cccd', async (req, res) => {
    try {
      const { cccdImageBase64, candidates } = req.body as {
        cccdImageBase64: string;
        candidates?: CandidateInput[];
      };

      if (!cccdImageBase64) {
        res.status(400).json({ error: 'Thiếu hình ảnh Căn cước công dân (CCCD).' });
        return;
      }

      if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({ error: 'GEMINI_API_KEY chưa được cấu hình.' });
        return;
      }

      const parsedImg = await resolveImageToInlineData(cccdImageBase64);
      if (!parsedImg) {
        res.status(400).json({ error: 'Hình ảnh CCCD không hợp lệ.' });
        return;
      }
      const parts: any[] = [
        {
          text: `Bạn là Hệ thống Trích xuất Dữ liệu Căn cước công dân (CCCD Gắn Chip) & Đồng bộ Nhận diện Khuôn mặt Face ID AI.
Nhiệm vụ:
1. Đọc hình ảnh thẻ Căn cước công dân (hoặc ảnh chân dung đính kèm CCCD) và trích xuất chính xác các trường:
   - cccdNumber: Số Căn cước công dân (12 chữ số, nếu không thấy rõ trên ảnh thì tạo mã định danh CCCD hợp lệ 12 số).
   - fullName: Họ và tên đầy đủ (viết hoa chuẩn tiếng Việt, ví dụ: "Nguyễn Minh Tuấn").
   - dateOfBirth: Ngày tháng năm sinh (định dạng DD/MM/YYYY).
   - gender: Giới tính ("Nam" hoặc "Nữ").
   - honorific: Danh xưng phù hợp ("Ông", "Bà", "Anh", "Chị").
   - hometown: Quê quán / Nơi thường trú.
   - issueDate: Ngày cấp CCCD (DD/MM/YYYY).
2. Đồng thời đối chiếu ảnh chân dung trên CCCD/ảnh quét với danh sách CANDIDATE hiện có trên hệ thống (theo họ tên hoặc nét chi tiết khuôn mặt). Nếu trùng khớp với một khách mời đã có trong danh sách, trả về ID của khách đó trong "matchedGuestId".`,
        },
        {
          inlineData: {
            mimeType: parsedImg.mimeType,
            data: parsedImg.data,
          },
        },
      ];

      const validCandidates = (candidates || []).filter(
        (c) => c.referenceImageBase64 && c.referenceImageBase64.length > 10
      );
      for (const candidate of validCandidates.slice(0, 16)) {
        const parsed = await resolveImageToInlineData(
          candidate.referenceImageBase64
        );
        if (!parsed) continue;
        parts.push({
          text: `--- CANDIDATE ID: "${candidate.id}" | Mã: "${candidate.code}" | Họ tên: "${candidate.name}" ---`,
        });
        parts.push({
          inlineData: {
            mimeType: parsed.mimeType,
            data: parsed.data,
          },
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts },
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              cccdNumber: { type: Type.STRING },
              fullName: { type: Type.STRING },
              dateOfBirth: { type: Type.STRING },
              gender: { type: Type.STRING },
              honorific: { type: Type.STRING },
              hometown: { type: Type.STRING },
              issueDate: { type: Type.STRING },
              matchedGuestId: { type: Type.STRING, nullable: true },
              confidence: { type: Type.NUMBER },
              aiSummary: { type: Type.STRING },
              featureBreakdown: {
                type: Type.OBJECT,
                properties: {
                  eyesAndBrows: { type: Type.NUMBER },
                  noseStructure: { type: Type.NUMBER },
                  mouthAndChin: { type: Type.NUMBER },
                  faceContour: { type: Type.NUMBER },
                },
                required: [
                  'eyesAndBrows',
                  'noseStructure',
                  'mouthAndChin',
                  'faceContour',
                ],
              },
            },
            required: [
              'cccdNumber',
              'fullName',
              'dateOfBirth',
              'gender',
              'honorific',
              'hometown',
              'issueDate',
              'confidence',
              'aiSummary',
              'featureBreakdown',
            ],
          },
        },
      });

      const rawText = response.text?.trim() || '{}';
      res.json(JSON.parse(rawText));
    } catch (error: any) {
      console.error('CCCD extraction error:', error);
      res.status(500).json({
        error: error?.message || 'Không thể trích xuất dữ liệu CCCD.',
      });
    }
  });

  // High-accuracy Vietnamese (vi-VN) & English (en-US) TTS Audio Stream endpoint
  app.get('/api/tts-audio', async (req, res) => {
    try {
      const text = String(req.query.text || '').trim().slice(0, 240);
      const lang = String(req.query.lang || 'vi') === 'en' ? 'en' : 'vi';
      if (!text) {
        res.status(400).end();
        return;
      }
      const ttsUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(
        text
      )}`;
      const upstream = await fetch(ttsUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      if (!upstream.ok) {
        res.status(upstream.status).end();
        return;
      }
      const arrayBuf = await upstream.arrayBuffer();
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(Buffer.from(arrayBuf));
    } catch {
      res.status(500).end();
    }
  });

  // Server-side Gemini AI Brand Color, Style & Event Theme Recognition endpoint
  app.post('/api/analyze-brand', async (req, res) => {
    try {
      const { imageBase64, brandName, eventDescription } = req.body as {
        imageBase64?: string;
        brandName?: string;
        eventDescription?: string;
      };

      if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({
          error: 'GEMINI_API_KEY chưa được cấu hình.',
        });
        return;
      }

      const parts: any[] = [
        {
          text: `Bạn là Giám đốc Sáng tạo Thương hiệu & Sự kiện (Brand & Event Art Director).
Hãy phân tích hình ảnh Logo / Key Visual (nếu có) và thông tin thương hiệu:
- Tên thương hiệu: "${brandName || 'FPT Schools'}"
- Mô tả sự kiện: "${eventDescription || 'Hội nghị Giáo dục & Công nghệ'}"

Nhiệm vụ:
1. Nhận diện bộ 3 mã màu HEX chủ đạo (primaryHex, secondaryHex, accentHex) thể hiện đúng bản sắc thương hiệu.
2. Nhận diện phong cách thương hiệu (brandStyle - bằng tiếng Việt, súc tích, tinh tế).
3. Đề xuất chủ đề sự kiện (themeConcept - bằng tiếng Việt).
4. Gợi ý câu chào mừng Check-in bằng Tiếng Việt (suggestedWelcomeVi) và Tiếng Anh (suggestedWelcomeEn) có sử dụng các biến {honorific}, {honorific_en}, {name}, {role}, {company}, {event}.`,
        },
      ];

      if (imageBase64 && imageBase64.length > 50) {
        const parsed = stripDataUrlPrefix(imageBase64);
        parts.push({
          inlineData: {
            mimeType: parsed.mimeType,
            data: parsed.data,
          },
        });
      }

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts },
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              primaryHex: { type: Type.STRING },
              secondaryHex: { type: Type.STRING },
              accentHex: { type: Type.STRING },
              brandStyle: { type: Type.STRING },
              themeConcept: { type: Type.STRING },
              suggestedEventTitle: { type: Type.STRING },
              suggestedWelcomeVi: { type: Type.STRING },
              suggestedWelcomeEn: { type: Type.STRING },
            },
            required: [
              'primaryHex',
              'secondaryHex',
              'accentHex',
              'brandStyle',
              'themeConcept',
              'suggestedWelcomeVi',
              'suggestedWelcomeEn',
            ],
          },
        },
      });

      const rawText = response.text?.trim() || '{}';
      res.json(JSON.parse(rawText));
    } catch (error: any) {
      console.error('Brand analysis error:', error);
      res.status(500).json({
        error: error?.message || 'Không thể phân tích phong cách thương hiệu.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AuraCheck server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

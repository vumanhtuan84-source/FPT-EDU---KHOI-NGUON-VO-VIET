import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  BadgeQrContentMode,
  BrandConfig,
  BrandThemePreset,
  EventAgendaConfig,
  GuestRecord,
  INITIAL_AGENDA_CONFIG,
} from '../types/attendance';
import {
  FourEventLogosBar,
  LoadedFourLogos,
  drawFourLogosCenteredInBox,
  drawFourLogosRowOnCanvas,
  getActiveFourEventLogoUrls,
  openFourLogosManagerModal,
} from './FptSchoolsLogo';
import {
  buildAgendaShareText,
  formatTimestampVi,
  interpolateGreeting,
} from '../utils/biometrics';
import {
  Check,
  Download,
  Edit3,
  IdCard,
  Image as ImageIcon,
  ListChecks,
  Printer,
  QrCode,
  Sparkles,
  X,
} from 'lucide-react';

interface GuestCardExportModalProps {
  isOpen: boolean;
  guest: GuestRecord | null;
  brandConfig: BrandConfig;
  activeTheme: BrandThemePreset;
  agendaConfig?: EventAgendaConfig;
  onClose: () => void;
  onSaveGuestContent?: (updatedGuest: GuestRecord) => void;
  onOpenAgendaBuilder?: () => void;
}

const VI_FONT_STACK =
  '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/**
 * Normalizes Vietnamese Unicode to NFC and collapses extra spaces so Canvas never
 * renders decomposed combining marks with wide gaps or baseline jumps ("nhảy chữ, chữ bị cách xa").
 */
function cleanViText(raw: string | undefined | null): string {
  return String(raw || '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
}

function resetCanvasTypography(ctx: CanvasRenderingContext2D) {
  const anyCtx = ctx as any;
  if ('letterSpacing' in anyCtx) {
    anyCtx.letterSpacing = '0px';
  }
  if ('wordSpacing' in anyCtx) {
    anyCtx.wordSpacing = '0px';
  }
  ctx.textBaseline = 'alphabetic';
}

/**
 * Automatically fits a single line of Vietnamese text into `maxWidth` by scaling font size
 * smoothly between `maxFontSize` and `minFontSize`, truncating cleanly at a word boundary if needed.
 */
function drawFittedSingleLine(
  ctx: CanvasRenderingContext2D,
  rawText: string,
  x: number,
  y: number,
  maxWidth: number,
  maxFontSize: number,
  minFontSize: number,
  fontWeight: number | string = 700
) {
  resetCanvasTypography(ctx);
  const text = cleanViText(rawText);
  if (!text) return;

  let size = maxFontSize;
  while (size > minFontSize) {
    ctx.font = `${fontWeight} ${size}px ${VI_FONT_STACK}`;
    if (ctx.measureText(text).width <= maxWidth) {
      break;
    }
    size -= 1;
  }

  ctx.font = `${fontWeight} ${size}px ${VI_FONT_STACK}`;
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, y);
    return;
  }

  // Word-boundary safe truncation
  const words = text.split(' ');
  let fitted = '';
  for (let i = 0; i < words.length; i++) {
    const candidate = fitted ? `${fitted} ${words[i]}` : words[i];
    if (ctx.measureText(`${candidate}...`).width > maxWidth && i > 0) {
      break;
    }
    fitted = candidate;
  }
  ctx.fillText(`${fitted}...`, x, y);
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  rawText: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 3
): number {
  resetCanvasTypography(ctx);
  const clean = cleanViText(rawText);
  if (!clean) return y;

  const words = clean.split(' ');
  let line = '';
  let currentY = y;
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line ? `${line} ${words[n]}` : words[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      lineCount++;
      if (lineCount >= maxLines) {
        ctx.fillText(`${line.trim()}...`, x, currentY);
        return currentY + lineHeight;
      }
      ctx.fillText(line.trim(), x, currentY);
      line = words[n];
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line.trim()) {
    ctx.fillText(line.trim(), x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export const GuestCardExportModal: React.FC<GuestCardExportModalProps> = ({
  isOpen,
  guest,
  brandConfig,
  activeTheme,
  agendaConfig = INITIAL_AGENDA_CONFIG,
  onClose,
  onSaveGuestContent,
  onOpenAgendaBuilder,
}) => {
  const [exportMode, setExportMode] = useState<'checkin_card' | 'id_badge'>(
    'id_badge'
  );
  const [isEditingContent, setIsEditingContent] = useState<boolean>(false);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);
  const [badgePreviewDataUrl, setBadgePreviewDataUrl] = useState<string>('');
  const [logoRevision, setLogoRevision] = useState<number>(0);

  useEffect(() => {
    const handleLogoUpdate = () => setLogoRevision((prev) => prev + 1);
    window.addEventListener('auracheck-logos-updated', handleLogoUpdate);
    return () =>
      window.removeEventListener('auracheck-logos-updated', handleLogoUpdate);
  }, []);

  // Editable content state for both canvas cards
  const [draftGuest, setDraftGuest] = useState<GuestRecord | null>(guest);
  const [customEventTitle, setCustomEventTitle] = useState<string>(
    brandConfig.eventName
  );
  const [customVenueText, setCustomVenueText] = useState<string>(
    brandConfig.eventLocation
  );
  const [customDateTimeText, setCustomDateTimeText] = useState<string>(
    brandConfig.eventDateTime
  );
  const [customBadgeHeader] = useState<string>(
    'THẺ ĐẠI BIỂU & CHỨNG NHẬN THAM DỰ SỰ KIỆN'
  );
  const [qrModeOverride, setQrModeOverride] = useState<BadgeQrContentMode>(
    agendaConfig.badgeQrMode || 'guest_and_agenda'
  );
  const [customQrTextOverride, setCustomQrTextOverride] = useState<string>(
    agendaConfig.customExternalUrl || ''
  );
  const [showQrOnCard, setShowQrOnCard] = useState<boolean>(
    agendaConfig.showQrOnCheckinCard ?? true
  );
  const [showQrOnBadge, setShowQrOnBadge] = useState<boolean>(
    agendaConfig.showQrOnIdBadge ?? true
  );

  const checkinCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const badgeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (guest && isOpen) {
      const defaultMsgVi =
        guest.customGreeting ||
        interpolateGreeting(
          brandConfig.welcomeTemplate,
          guest,
          brandConfig.eventName
        );
      setDraftGuest({
        ...guest,
        checkInGate: guest.checkInGate || brandConfig.eventPosition,
        checkInTime: guest.checkInTime || formatTimestampVi(new Date()),
        customGreeting: defaultMsgVi,
        adminNotes:
          guest.adminNotes ||
          'Đại biểu Danh dự · Đón tiếp tại Sảnh VIP & Khu vực Hội trường chính',
      });
      setCustomEventTitle(brandConfig.eventName);
      setCustomVenueText(brandConfig.eventLocation);
      setCustomDateTimeText(brandConfig.eventDateTime);
      setQrModeOverride(agendaConfig.badgeQrMode || 'guest_and_agenda');
      setCustomQrTextOverride(agendaConfig.customExternalUrl || '');
      setShowQrOnCard(agendaConfig.showQrOnCheckinCard ?? true);
      setShowQrOnBadge(agendaConfig.showQrOnIdBadge ?? true);
      setSavedNotice(false);
    }
  }, [guest, brandConfig, agendaConfig, isOpen]);

  // Neon Purple & Royal Gold Design Tokens
  const neonPurpleMain = '#A855F7';
  const neonPurpleLight = '#C084FC';
  const neonFuchsia = '#D946EF';
  const vovinamGold = '#F5B324';

  const activeGuest = draftGuest || guest;

  useEffect(() => {
    if (!isOpen || !activeGuest) return;

    let isCancelled = false;

    const loadImg = (src: string): Promise<HTMLImageElement | null> =>
      new Promise((resolve) => {
        if (!src) {
          resolve(null);
          return;
        }
        const img = new Image();
        const isRemoteUrl = /^https?:\/\//i.test(src);
        if (isRemoteUrl) {
          img.crossOrigin = 'anonymous';
        }
        img.onload = () => resolve(img);
        img.onerror = () => {
          if (isRemoteUrl) {
            const fallbackImg = new Image();
            fallbackImg.onload = () => resolve(fallbackImg);
            fallbackImg.onerror = () => resolve(null);
            fallbackImg.src = src;
          } else {
            resolve(null);
          }
        };
        img.src = src;
      });

    (async () => {
      // Ensure web fonts with Vietnamese glyphs are 100% ready before Canvas drawing
      if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
        try {
          await (document as any).fonts.ready;
        } catch {
          // Ignore font load warning
        }
      }

      const activeFourLogoUrls = getActiveFourEventLogoUrls();

      const qrPayload = buildAgendaShareText(
        {
          ...agendaConfig,
          badgeQrMode: qrModeOverride,
          customExternalUrl: customQrTextOverride,
        },
        brandConfig,
        activeGuest
      );

      let qrDataUrl = '';
      try {
        qrDataUrl = await QRCode.toDataURL(qrPayload || activeGuest.code, {
          width: 340,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#1E0938',
            light: '#FFFFFF',
          },
        });
      } catch {
        qrDataUrl = '';
      }

      const [
        portraitImg,
        customLogoImg,
        qrImg,
        fptEduImg,
        vovinamShieldImg,
        federationImg,
        voViet2026Img,
      ] = await Promise.all([
        loadImg(activeGuest.originalAvatarUrl || activeGuest.avatarUrl),
        loadImg(brandConfig.customLogoUrl || ''),
        loadImg(qrDataUrl),
        loadImg(activeFourLogoUrls.fptEducation),
        loadImg(activeFourLogoUrls.vovinamShield),
        loadImg(activeFourLogoUrls.fptVovinamFederation),
        loadImg(activeFourLogoUrls.khoiNguonVoViet2026),
      ]);

      if (isCancelled) return;

      const loadedFourLogos: LoadedFourLogos = {
        fptEduImg,
        vovinamShieldImg,
        federationImg,
        voViet2026Img,
      };

      // =========================================================================
      // 1. Draw Check-in Welcome Card (1600 x 900) — Neon Purple Stage & Balanced 4-Logo Header
      // =========================================================================
      if (checkinCanvasRef.current) {
        const canvas = checkinCanvasRef.current;
        canvas.width = 1600;
        canvas.height = 900;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          resetCanvasTypography(ctx);

          // Deep Cosmic Neon Purple Background
          const bgGrad = ctx.createLinearGradient(0, 0, 1600, 900);
          bgGrad.addColorStop(0, '#0C041A');
          bgGrad.addColorStop(0.5, '#190A33');
          bgGrad.addColorStop(1, '#090314');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, 1600, 900);

          // Artistic Neon Purple & Fuchsia Ambient Glows
          const glow1 = ctx.createRadialGradient(1320, 160, 20, 1320, 160, 560);
          glow1.addColorStop(0, 'rgba(168, 85, 247, 0.32)');
          glow1.addColorStop(1, 'transparent');
          ctx.fillStyle = glow1;
          ctx.fillRect(0, 0, 1600, 900);

          const glow2 = ctx.createRadialGradient(260, 760, 20, 260, 760, 520);
          glow2.addColorStop(0, 'rgba(217, 70, 239, 0.24)');
          glow2.addColorStop(1, 'transparent');
          ctx.fillStyle = glow2;
          ctx.fillRect(0, 0, 1600, 900);

          // Top 4-Segment Neon Purple & Gold Ribbon
          ctx.fillStyle = '#9333EA';
          ctx.fillRect(0, 0, 400, 12);
          ctx.fillStyle = neonFuchsia;
          ctx.fillRect(400, 0, 400, 12);
          ctx.fillStyle = vovinamGold;
          ctx.fillRect(800, 0, 400, 12);
          ctx.fillStyle = neonPurpleLight;
          ctx.fillRect(1200, 0, 400, 12);

          // Outer Neon Purple Border Frame
          ctx.strokeStyle = 'rgba(192, 132, 252, 0.55)';
          ctx.lineWidth = 2.5;
          drawRoundedRect(ctx, 36, 36, 1528, 828, 24);
          ctx.stroke();

          // Top-left Ceremonial Royal Purple & 24K Gold Plaque for the 4 Official Event Logos
          const logoDockGrad = ctx.createLinearGradient(72, 52, 832, 154);
          logoDockGrad.addColorStop(0, 'rgba(18, 5, 41, 0.96)');
          logoDockGrad.addColorStop(0.5, 'rgba(38, 12, 82, 0.96)');
          logoDockGrad.addColorStop(1, 'rgba(18, 5, 41, 0.96)');
          drawRoundedRect(ctx, 72, 52, 760, 102, 18);
          ctx.fillStyle = logoDockGrad;
          ctx.fill();

          ctx.strokeStyle = 'rgba(251, 191, 36, 0.72)';
          ctx.lineWidth = 2;
          drawRoundedRect(ctx, 72, 52, 760, 102, 18);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(192, 132, 252, 0.35)';
          ctx.lineWidth = 1;
          drawRoundedRect(ctx, 76, 56, 752, 94, 15);
          ctx.stroke();

          // Top 24K Gold Specular Crest on Logo Plaque
          const topCrestGrad = ctx.createLinearGradient(140, 52, 764, 52);
          topCrestGrad.addColorStop(0, 'rgba(253, 224, 71, 0)');
          topCrestGrad.addColorStop(0.5, 'rgba(253, 224, 71, 0.95)');
          topCrestGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
          ctx.fillStyle = topCrestGrad;
          ctx.fillRect(140, 52, 624, 2.5);

          drawFourLogosCenteredInBox(
            ctx,
            72,
            52,
            760,
            102,
            56,
            loadedFourLogos,
            customLogoImg,
            14,
            true
          );

          // Top-right: Event Organization & Date/Location (Zero jumping text)
          ctx.textAlign = 'right';
          ctx.fillStyle = neonPurpleLight;
          drawFittedSingleLine(
            ctx,
            brandConfig.brandName.toUpperCase(),
            1512,
            86,
            660,
            18,
            14,
            700
          );

          ctx.fillStyle = '#FDE047';
          drawFittedSingleLine(
            ctx,
            'CUỘC THI VOVINAM · FPT EDU KHƠI NGUỒN VÕ VIỆT 2026',
            1512,
            114,
            660,
            15,
            12,
            700
          );

          ctx.fillStyle = '#E9D5FF';
          drawFittedSingleLine(
            ctx,
            `${customDateTimeText} · ${customVenueText}`,
            1512,
            138,
            660,
            15,
            12,
            500
          );

          // Divider line
          ctx.strokeStyle = 'rgba(192, 132, 252, 0.25)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(72, 164);
          ctx.lineTo(1512, 164);
          ctx.stroke();

          // Left Column: Proportional Portrait Frame (x=86, y=196, w=400, h=436)
          ctx.save();
          drawRoundedRect(ctx, 86, 196, 400, 436, 22);
          ctx.fillStyle = '#140828';
          ctx.fill();
          ctx.lineWidth = 4;
          ctx.strokeStyle = neonPurpleMain;
          ctx.stroke();
          ctx.clip();

          if (portraitImg) {
            const minSide = Math.min(portraitImg.width, portraitImg.height);
            const sx = (portraitImg.width - minSide) / 2;
            const sy = (portraitImg.height - minSide) / 2;
            ctx.drawImage(
              portraitImg,
              sx,
              sy,
              minSide,
              minSide,
              86,
              196,
              400,
              436
            );
          }
          ctx.restore();

          // Delegate Tier & Code Pill below Portrait
          const pillGrad1 = ctx.createLinearGradient(116, 610, 456, 656);
          pillGrad1.addColorStop(0, '#7E22CE');
          pillGrad1.addColorStop(0.5, '#D946EF');
          pillGrad1.addColorStop(1, '#7E22CE');
          drawRoundedRect(ctx, 116, 610, 340, 46, 23);
          ctx.fillStyle = pillGrad1;
          ctx.fill();
          ctx.strokeStyle = '#FDE047';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.textAlign = 'center';
          ctx.fillStyle = '#FFFFFF';
          drawFittedSingleLine(
            ctx,
            `ĐẠI BIỂU ${activeGuest.tier.toUpperCase()} · ${activeGuest.code}`,
            286,
            640,
            316,
            18,
            14,
            700
          );

          // Right Column: Pure Vietnamese Ceremonial Welcome & Scientific Layout
          ctx.textAlign = 'left';
          ctx.fillStyle = '#34D399';
          drawFittedSingleLine(
            ctx,
            `● ${customBadgeHeader}`,
            536,
            218,
            960,
            16,
            13,
            700
          );

          ctx.fillStyle = '#FFFFFF';
          ctx.font = `700 28px ${VI_FONT_STACK}`;
          wrapCanvasText(ctx, customEventTitle, 536, 260, 960, 36, 2);

          ctx.fillStyle = '#E9D5FF';
          drawFittedSingleLine(
            ctx,
            'Trân trọng đón tiếp và nhiệt liệt chào mừng Quý Đại biểu:',
            536,
            342,
            960,
            21,
            16,
            600
          );

          // Guest Name (100% Vietnamese-safe Plus Jakarta Sans 700, zero jumping characters)
          ctx.fillStyle = '#FDE047';
          const fullViName = `${activeGuest.honorific} ${activeGuest.name}`;
          drawFittedSingleLine(
            ctx,
            fullViName,
            536,
            402,
            960,
            48,
            30,
            700
          );

          // Structured Role & Company Cards
          drawRoundedRect(ctx, 536, 426, 465, 84, 14);
          ctx.fillStyle = 'rgba(20, 8, 42, 0.9)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(192, 132, 252, 0.35)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = neonPurpleLight;
          drawFittedSingleLine(
            ctx,
            'CHỨC VỤ / VAI TRÒ',
            558,
            452,
            420,
            13,
            11,
            700
          );
          ctx.fillStyle = '#FFFFFF';
          drawFittedSingleLine(
            ctx,
            activeGuest.role,
            558,
            486,
            424,
            19,
            14,
            700
          );

          drawRoundedRect(ctx, 1020, 426, 480, 84, 14);
          ctx.fillStyle = 'rgba(20, 8, 42, 0.9)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(192, 132, 252, 0.35)';
          ctx.stroke();

          ctx.fillStyle = neonPurpleLight;
          drawFittedSingleLine(
            ctx,
            'ĐƠN VỊ CÔNG TÁC',
            1042,
            452,
            436,
            13,
            11,
            700
          );
          ctx.fillStyle = '#FDE047';
          drawFittedSingleLine(
            ctx,
            activeGuest.company,
            1042,
            486,
            440,
            19,
            14,
            700
          );

          // Quote & Admin Custom Notes Box
          drawRoundedRect(ctx, 536, 526, 964, 150, 16);
          ctx.fillStyle = 'rgba(20, 8, 42, 0.92)';
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = 'rgba(217, 70, 239, 0.45)';
          ctx.stroke();

          const msgVi =
            activeGuest.customGreeting ||
            interpolateGreeting(
              brandConfig.welcomeTemplate,
              activeGuest,
              customEventTitle
            );

          ctx.fillStyle = '#FAF5FF';
          ctx.font = `500 20px ${VI_FONT_STACK}`;
          const nextY = wrapCanvasText(
            ctx,
            `“${msgVi}”`,
            564,
            566,
            910,
            30,
            2
          );

          if (activeGuest.adminNotes) {
            ctx.fillStyle = '#FDE047';
            drawFittedSingleLine(
              ctx,
              `★ Ghi chú đón tiếp: ${activeGuest.adminNotes}`,
              564,
              Math.min(654, nextY + 14),
              910,
              16,
              13,
              600
            );
          }

          // Bottom Metadata Strip (Time, Seat/Gate, Venue + QR Code)
          const stripWidth = showQrOnCard && qrImg ? 1264 : 1414;
          drawRoundedRect(ctx, 86, 712, stripWidth, 116, 16);
          ctx.fillStyle = 'rgba(20, 8, 42, 0.94)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(192, 132, 252, 0.35)';
          ctx.stroke();

          // Col 1: Check-in Time
          ctx.fillStyle = neonPurpleLight;
          drawFittedSingleLine(
            ctx,
            'THỜI GIAN CHECK-IN',
            114,
            750,
            320,
            13,
            11,
            700
          );
          ctx.fillStyle = '#34D399';
          drawFittedSingleLine(
            ctx,
            activeGuest.checkInTime || formatTimestampVi(new Date()),
            114,
            788,
            330,
            20,
            15,
            700
          );

          // Col 2: Seat / Gate Position
          ctx.fillStyle = neonPurpleLight;
          drawFittedSingleLine(
            ctx,
            'VỊ TRÍ BÀN & CỔNG ĐÓN TIẾP',
            470,
            750,
            470,
            13,
            11,
            700
          );
          ctx.fillStyle = '#FFFFFF';
          drawFittedSingleLine(
            ctx,
            `${activeGuest.seatZone} · ${activeGuest.checkInGate || brandConfig.eventPosition}`,
            470,
            788,
            480,
            18,
            14,
            700
          );

          // Col 3: Venue
          ctx.fillStyle = neonPurpleLight;
          drawFittedSingleLine(
            ctx,
            'ĐỊA ĐIỂM TỔ CHỨC',
            980,
            750,
            350,
            13,
            11,
            700
          );
          ctx.fillStyle = '#FDE047';
          drawFittedSingleLine(
            ctx,
            customVenueText,
            980,
            788,
            350,
            18,
            14,
            700
          );

          // QR Code Box on Check-in Card
          if (showQrOnCard && qrImg) {
            drawRoundedRect(ctx, 1368, 704, 132, 132, 14);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            ctx.strokeStyle = neonPurpleMain;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.drawImage(qrImg, 1376, 712, 116, 116);
          }
        }
      }

      // =========================================================================
      // 2. Draw Printable Delegate ID Badge (840 x 1260 Vertical Pass)
      //    Artistic Neon Purple & Gold Executive Layout — Zero Text Jumping or Wide Spacing
      // =========================================================================
      if (badgeCanvasRef.current) {
        const canvas = badgeCanvasRef.current;
        canvas.width = 840;
        canvas.height = 1260;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          resetCanvasTypography(ctx);

          // Deep Cosmic Neon Purple Background (#0B0418 -> #1A0936 -> #080212)
          const bgGrad = ctx.createLinearGradient(0, 0, 0, 1260);
          bgGrad.addColorStop(0, '#0C041A');
          bgGrad.addColorStop(0.48, '#1B0938');
          bgGrad.addColorStop(1, '#080212');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, 840, 1260);

          // Artistic Neon Purple & Fuchsia Spotlights
          const topGlow = ctx.createRadialGradient(420, 260, 20, 420, 260, 460);
          topGlow.addColorStop(0, 'rgba(168, 85, 247, 0.35)');
          topGlow.addColorStop(1, 'transparent');
          ctx.fillStyle = topGlow;
          ctx.fillRect(0, 0, 840, 1260);

          const bottomGlow = ctx.createRadialGradient(420, 960, 20, 420, 960, 440);
          bottomGlow.addColorStop(0, 'rgba(217, 70, 239, 0.24)');
          bottomGlow.addColorStop(1, 'transparent');
          ctx.fillStyle = bottomGlow;
          ctx.fillRect(0, 0, 840, 1260);

          // Top 4-Color Neon Purple & Gold Bar
          ctx.fillStyle = '#9333EA';
          ctx.fillRect(0, 0, 210, 16);
          ctx.fillStyle = neonFuchsia;
          ctx.fillRect(210, 0, 210, 16);
          ctx.fillStyle = vovinamGold;
          ctx.fillRect(420, 0, 210, 16);
          ctx.fillStyle = neonPurpleLight;
          ctx.fillRect(630, 0, 210, 16);

          // Lanyard Slot Hole at Top Center
          drawRoundedRect(ctx, 352, 30, 136, 20, 10);
          ctx.fillStyle = '#05010A';
          ctx.fill();
          ctx.strokeStyle = 'rgba(192, 132, 252, 0.45)';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Outer Neon Purple Architectural Frame
          drawRoundedRect(ctx, 26, 66, 788, 1166, 28);
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.75)';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Inner Subtle Gold-Violet Hairline Frame
          drawRoundedRect(ctx, 38, 78, 764, 1142, 22);
          ctx.strokeStyle = 'rgba(253, 224, 71, 0.22)';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // -------------------------------------------------------------------
          // ZONE 1: Ceremonial 4-Logo State-Protocol Header Plaque (x=54, y=86, w=732, h=96)
          // -------------------------------------------------------------------
          const badgeLogoDockGrad = ctx.createLinearGradient(54, 86, 786, 182);
          badgeLogoDockGrad.addColorStop(0, 'rgba(18, 5, 41, 0.97)');
          badgeLogoDockGrad.addColorStop(0.5, 'rgba(40, 13, 86, 0.97)');
          badgeLogoDockGrad.addColorStop(1, 'rgba(18, 5, 41, 0.97)');
          drawRoundedRect(ctx, 54, 86, 732, 96, 18);
          ctx.fillStyle = badgeLogoDockGrad;
          ctx.fill();

          // Outer 24K Gold & Violet Frame
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.78)';
          ctx.lineWidth = 2;
          drawRoundedRect(ctx, 54, 86, 732, 96, 18);
          ctx.stroke();

          // Inner Subtle Violet Rim
          ctx.strokeStyle = 'rgba(192, 132, 252, 0.35)';
          ctx.lineWidth = 1;
          drawRoundedRect(ctx, 58, 90, 724, 88, 15);
          ctx.stroke();

          // Top 24K Gold Specular Highlight Bar
          const badgeCrestGrad = ctx.createLinearGradient(120, 86, 720, 86);
          badgeCrestGrad.addColorStop(0, 'rgba(253, 224, 71, 0)');
          badgeCrestGrad.addColorStop(0.5, 'rgba(253, 224, 71, 0.95)');
          badgeCrestGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
          ctx.fillStyle = badgeCrestGrad;
          ctx.fillRect(120, 86, 600, 2.5);

          drawFourLogosCenteredInBox(
            ctx,
            54,
            86,
            732,
            96,
            52,
            loadedFourLogos,
            customLogoImg,
            13,
            true
          );

          // -------------------------------------------------------------------
          // ZONE 2: Event Title & Pass Classification Banner (x=54, y=188, w=732, h=98)
          // -------------------------------------------------------------------
          drawRoundedRect(ctx, 54, 188, 732, 98, 16);
          ctx.fillStyle = 'rgba(22, 8, 44, 0.9)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(217, 70, 239, 0.4)';
          ctx.lineWidth = 1.4;
          ctx.stroke();

          ctx.textAlign = 'center';
          ctx.fillStyle = '#FDE047';
          drawFittedSingleLine(
            ctx,
            `★ THẺ ĐẠI BIỂU CHÍNH THỨC · MÃ ĐẠI BIỂU: ${activeGuest.code} ★`,
            420,
            215,
            696,
            14,
            12,
            700
          );

          ctx.fillStyle = '#FFFFFF';
          ctx.font = `700 19px ${VI_FONT_STACK}`;
          wrapCanvasText(ctx, customEventTitle, 420, 244, 692, 24, 2);

          // -------------------------------------------------------------------
          // ZONE 3: Centered Official Portrait (268 x 284) with Neon Purple & Gold Frame
          // -------------------------------------------------------------------
          const pX = 286;
          const pY = 302;
          const pW = 268;
          const pH = 284;

          ctx.save();
          drawRoundedRect(ctx, pX, pY, pW, pH, 22);
          ctx.fillStyle = '#140828';
          ctx.fill();
          ctx.lineWidth = 4.5;
          ctx.strokeStyle = neonPurpleMain;
          ctx.stroke();
          ctx.clip();

          if (portraitImg) {
            const minSide = Math.min(portraitImg.width, portraitImg.height);
            const sx = (portraitImg.width - minSide) / 2;
            const sy = (portraitImg.height - minSide) / 2;
            ctx.drawImage(
              portraitImg,
              sx,
              sy,
              minSide,
              minSide,
              pX,
              pY,
              pW,
              pH
            );
          }
          ctx.restore();

          // Gold Corner Brackets on Portrait
          ctx.strokeStyle = '#FDE047';
          ctx.lineWidth = 3.5;
          const bLen = 22;
          // Top-left
          ctx.beginPath();
          ctx.moveTo(pX - 3, pY + bLen);
          ctx.lineTo(pX - 3, pY - 3);
          ctx.lineTo(pX + bLen, pY - 3);
          ctx.stroke();
          // Top-right
          ctx.beginPath();
          ctx.moveTo(pX + pW - bLen, pY - 3);
          ctx.lineTo(pX + pW + 3, pY - 3);
          ctx.lineTo(pX + pW + 3, pY + bLen);
          ctx.stroke();
          // Bottom-left
          ctx.beginPath();
          ctx.moveTo(pX - 3, pY + pH - bLen);
          ctx.lineTo(pX - 3, pY + pH + 3);
          ctx.lineTo(pX + bLen, pY + pH + 3);
          ctx.stroke();
          // Bottom-right
          ctx.beginPath();
          ctx.moveTo(pX + pW - bLen, pY + pH + 3);
          ctx.lineTo(pX + pW + 3, pY + pH + 3);
          ctx.lineTo(pX + pW + 3, pY + pH - bLen);
          ctx.stroke();

          // Tier Ribbon Badge overlapping bottom of portrait
          const tierGrad = ctx.createLinearGradient(250, 564, 590, 610);
          tierGrad.addColorStop(0, '#7E22CE');
          tierGrad.addColorStop(0.5, '#D946EF');
          tierGrad.addColorStop(1, '#7E22CE');
          drawRoundedRect(ctx, 250, 564, 340, 46, 23);
          ctx.fillStyle = tierGrad;
          ctx.fill();
          ctx.strokeStyle = '#FDE047';
          ctx.lineWidth = 1.8;
          ctx.stroke();

          ctx.textAlign = 'center';
          ctx.fillStyle = '#FFFFFF';
          drawFittedSingleLine(
            ctx,
            `ĐẠI BIỂU ${activeGuest.tier.toUpperCase()}`,
            420,
            594,
            310,
            20,
            15,
            700
          );

          // -------------------------------------------------------------------
          // ZONE 4: Delegate Full Name & Structured Role/Organization Card
          // -------------------------------------------------------------------
          const fullDelegateName = `${activeGuest.honorific} ${activeGuest.name}`;
          ctx.textAlign = 'center';
          ctx.fillStyle = '#FFFFFF';
          drawFittedSingleLine(
            ctx,
            fullDelegateName,
            420,
            658,
            716,
            38,
            24,
            700
          );

          // Role & Organization Box (x=54, y=680, w=732, h=124)
          drawRoundedRect(ctx, 54, 680, 732, 124, 16);
          ctx.fillStyle = 'rgba(20, 8, 42, 0.92)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(192, 132, 252, 0.48)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.textAlign = 'center';
          ctx.fillStyle = neonPurpleLight;
          drawFittedSingleLine(
            ctx,
            'CHỨC VỤ / VAI TRÒ & ĐƠN VỊ CÔNG TÁC',
            420,
            706,
            680,
            13,
            11,
            700
          );

          ctx.fillStyle = '#FDE047';
          drawFittedSingleLine(
            ctx,
            activeGuest.role,
            420,
            742,
            692,
            22,
            15,
            700
          );

          ctx.fillStyle = '#F3E8FF';
          drawFittedSingleLine(
            ctx,
            `${activeGuest.company}${activeGuest.department ? ` · ${activeGuest.department}` : ''}`,
            420,
            778,
            692,
            18,
            13,
            600
          );

          // -------------------------------------------------------------------
          // ZONE 5: Scientific Reception Info Table + Scannable QR Code Side-by-Side
          // -------------------------------------------------------------------
          const infoBoxWidth = showQrOnBadge && qrImg ? 482 : 732;
          drawRoundedRect(ctx, 54, 818, infoBoxWidth, 260, 18);
          ctx.fillStyle = 'rgba(18, 6, 38, 0.95)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(192, 132, 252, 0.38)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          const maxInfoTextW = infoBoxWidth - 44;
          ctx.textAlign = 'left';

          // Row 1: Vị trí bàn & ghế
          ctx.fillStyle = neonPurpleLight;
          drawFittedSingleLine(
            ctx,
            'VỊ TRÍ BÀN TIỆC / KHU VỰC GHẾ:',
            76,
            848,
            maxInfoTextW,
            12,
            10,
            700
          );
          ctx.fillStyle = '#FFFFFF';
          drawFittedSingleLine(
            ctx,
            activeGuest.seatZone,
            76,
            872,
            maxInfoTextW,
            18,
            13,
            700
          );

          // Row 2: Cổng đón tiếp
          ctx.fillStyle = neonPurpleLight;
          drawFittedSingleLine(
            ctx,
            'SẢNH / CỔNG ĐÓN TIẾP:',
            76,
            908,
            maxInfoTextW,
            12,
            10,
            700
          );
          ctx.fillStyle = '#34D399';
          drawFittedSingleLine(
            ctx,
            activeGuest.checkInGate || brandConfig.eventPosition,
            76,
            932,
            maxInfoTextW,
            17,
            13,
            700
          );

          // Row 3: Thời gian đón tiếp
          ctx.fillStyle = neonPurpleLight;
          drawFittedSingleLine(
            ctx,
            'THỜI GIAN ĐÓN TIẾP:',
            76,
            968,
            maxInfoTextW,
            12,
            10,
            700
          );
          ctx.fillStyle = '#F3E8FF';
          drawFittedSingleLine(
            ctx,
            activeGuest.checkInTime || customDateTimeText,
            76,
            992,
            maxInfoTextW,
            16,
            12,
            700
          );

          // Row 4: Thông tin bổ sung / Địa điểm
          ctx.fillStyle = neonPurpleLight;
          drawFittedSingleLine(
            ctx,
            activeGuest.adminNotes
              ? 'THÔNG TIN BỔ SUNG / ĐÓN TIẾP:'
              : 'ĐỊA ĐIỂM TỔ CHỨC:',
            76,
            1028,
            maxInfoTextW,
            12,
            10,
            700
          );
          ctx.fillStyle = '#FDE047';
          drawFittedSingleLine(
            ctx,
            activeGuest.adminNotes || customVenueText,
            76,
            1052,
            maxInfoTextW,
            15,
            12,
            600
          );

          // Right Side: Scannable QR Code Card
          if (showQrOnBadge && qrImg) {
            drawRoundedRect(ctx, 552, 818, 234, 260, 18);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = neonPurpleMain;
            ctx.stroke();

            ctx.drawImage(qrImg, 577, 830, 184, 184);

            ctx.textAlign = 'center';
            ctx.fillStyle = '#1E0938';
            drawFittedSingleLine(
              ctx,
              'QUÉT MÃ QR CHƯƠNG TRÌNH',
              669,
              1034,
              210,
              12,
              10,
              700
            );
            ctx.fillStyle = '#6B21A8';
            drawFittedSingleLine(
              ctx,
              `MÃ ĐẠI BIỂU: ${activeGuest.code}`,
              669,
              1056,
              210,
              13,
              10,
              700
            );
          }

          // -------------------------------------------------------------------
          // ZONE 6: Bottom Barcode & Official Verification Strip
          // -------------------------------------------------------------------
          drawRoundedRect(ctx, 54, 1094, 732, 98, 16);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.strokeStyle = neonPurpleMain;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Barcode Bars
          ctx.fillStyle = '#1E0938';
          let bx = 84;
          for (let i = 0; i < 36; i++) {
            const bw = i % 3 === 0 ? 6 : i % 2 === 0 ? 3 : 2;
            ctx.fillRect(bx, 1114, bw, 58);
            bx += bw + (i % 4 === 0 ? 5 : 3);
          }

          ctx.textAlign = 'right';
          ctx.fillStyle = '#1E0938';
          drawFittedSingleLine(
            ctx,
            `MÃ ĐẠI BIỂU: ${activeGuest.code}`,
            758,
            1138,
            340,
            21,
            15,
            700
          );
          ctx.fillStyle = '#6B21A8';
          drawFittedSingleLine(
            ctx,
            'TỔ CHỨC GIÁO DỤC FPT · XÁC THỰC ĐẠI BIỂU AI',
            758,
            1165,
            350,
            13,
            10,
            700
          );

          setBadgePreviewDataUrl(canvas.toDataURL('image/png', 1.0));
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [
    isOpen,
    activeGuest,
    brandConfig,
    activeTheme,
    agendaConfig,
    customEventTitle,
    customVenueText,
    customDateTimeText,
    customBadgeHeader,
    qrModeOverride,
    customQrTextOverride,
    showQrOnCard,
    showQrOnBadge,
    logoRevision,
  ]);

  if (!isOpen || !activeGuest) return null;

  const handleDownloadCanvas = (
    canvas: HTMLCanvasElement | null,
    prefix: string
  ) => {
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${prefix}-${activeGuest.code}-${activeGuest.name.replace(/\s+/g, '_')}.png`;
    a.click();
  };

  const handleDirectPrintBadge = () => {
    if (badgeCanvasRef.current) {
      setBadgePreviewDataUrl(badgeCanvasRef.current.toDataURL('image/png', 1.0));
    }
    window.setTimeout(() => {
      window.print();
    }, 120);
  };

  const handleSaveToRecord = () => {
    if (draftGuest && onSaveGuestContent) {
      onSaveGuestContent(draftGuest);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      {/* Dedicated Print Stylesheet so pressing "In Thẻ Đại Biểu" prints a crisp, centered badge */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-delegate-badge-container,
          #printable-delegate-badge-container * {
            visibility: visible !important;
          }
          #printable-delegate-badge-container {
            position: fixed !important;
            inset: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: #ffffff !important;
            z-index: 99999 !important;
            padding: 12mm !important;
          }
          #printable-delegate-badge-container img {
            max-height: 240mm !important;
            width: auto !important;
            border-radius: 12px !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Hidden Print Target */}
      {badgePreviewDataUrl && (
        <div id="printable-delegate-badge-container" className="hidden print:flex">
          <img src={badgePreviewDataUrl} alt={`Thẻ Đại biểu ${activeGuest.name}`} />
        </div>
      )}

      <div className="w-full max-w-5xl rounded-2xl border border-purple-500/45 bg-[#110622] p-6 text-slate-100 shadow-[0_0_50px_rgba(168,85,247,0.3)] max-h-[94vh] overflow-y-auto print:hidden">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-purple-500/30 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <FourEventLogosBar
              variant="compact"
              customLogoUrl={brandConfig.customLogoUrl}
            />
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Thiết Kế & Xuất Thẻ Đại Biểu Tím Neon — {activeGuest.honorific}{' '}
                {activeGuest.name}
              </h3>
              <p className="text-xs text-purple-200/80">
                Bố cục Tím Neon nghệ thuật, chuẩn font Tiếng Việt không nhảy chữ, tích hợp 4 Logo nguyên bản & Mã QR
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenAgendaBuilder && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAgendaBuilder();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors"
              >
                <ListChecks className="h-3.5 w-3.5" />
                <span>Soạn Kịch Bản Agenda & QR</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => openFourLogosManagerModal('fptEducation')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/50 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/25 transition-colors shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Thay Đổi 4 Logo Trên Thẻ</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEditingContent((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                isEditingContent
                  ? 'border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-200'
                  : 'border-purple-400/35 bg-purple-950/60 text-purple-100 hover:bg-purple-900/70'
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>
                {isEditingContent
                  ? 'Ẩn khung điều chỉnh'
                  : 'Admin: Sửa thông tin trên Thẻ'}
              </span>
            </button>

            {/* Switcher */}
            <div className="flex items-center rounded-lg border border-purple-500/35 bg-[#0B0318] p-1">
              <button
                type="button"
                onClick={() => setExportMode('id_badge')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  exportMode === 'id_badge'
                    ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                <IdCard className="h-3.5 w-3.5" />
                <span>Thẻ Đại Biểu In Ấn (Chuẩn Dọc)</span>
              </button>
              <button
                type="button"
                onClick={() => setExportMode('checkin_card')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  exportMode === 'checkin_card'
                    ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                <ImageIcon className="h-3.5 w-3.5" />
                <span>Ảnh Chào Mừng Đại Biểu (16:9)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-purple-300 hover:bg-purple-900/60 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Quick QR Mode Strip */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-purple-500/30 bg-[#170930]/80 px-4 py-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 font-semibold text-fuchsia-300">
              <QrCode className="h-4 w-4" />
              <span>Nội dung Mã QR tích hợp trên Thẻ:</span>
            </span>
            <select
              value={qrModeOverride}
              onChange={(e) =>
                setQrModeOverride(e.target.value as BadgeQrContentMode)
              }
              className="rounded-lg border border-purple-400/40 bg-[#0B0318] px-2.5 py-1 text-xs font-medium text-white focus:border-fuchsia-400 focus:outline-none"
            >
              <option value="guest_and_agenda">
                Hồ sơ Đại biểu + Kịch bản Chương trình ({agendaConfig.items.length} phiên)
              </option>
              <option value="agenda_only">
                Chỉ Kịch bản Chương trình ({agendaConfig.agendaTitle})
              </option>
              <option value="guest_pass">
                Chỉ Thông tin Thẻ Đại biểu & Vị trí bàn ghế
              </option>
              <option value="custom_url">
                Nhập Đường dẫn / Nội dung QR tùy chỉnh
              </option>
            </select>

            {qrModeOverride === 'custom_url' && (
              <input
                type="text"
                value={customQrTextOverride}
                onChange={(e) => setCustomQrTextOverride(e.target.value)}
                placeholder="Nhập đường dẫn hoặc nội dung QR..."
                className="w-64 rounded-lg border border-purple-400/40 bg-[#0B0318] px-2.5 py-1 text-xs text-white focus:border-fuchsia-400 focus:outline-none"
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-1.5 text-purple-200 cursor-pointer">
              <input
                type="checkbox"
                checked={showQrOnBadge}
                onChange={(e) => setShowQrOnBadge(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-purple-400/50 bg-[#0B0318] text-purple-600"
              />
              <span>Hiện QR trên Thẻ Đeo</span>
            </label>
            <label className="inline-flex items-center gap-1.5 text-purple-200 cursor-pointer">
              <input
                type="checkbox"
                checked={showQrOnCard}
                onChange={(e) => setShowQrOnCard(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-purple-400/50 bg-[#0B0318] text-purple-600"
              />
              <span>Hiện QR trên Ảnh 16:9</span>
            </label>
          </div>
        </div>

        {/* Live Content Adjustment Panel for Admin */}
        {isEditingContent && draftGuest && (
          <div className="mt-4 rounded-xl border border-purple-400/40 bg-[#170930]/90 p-4 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-500/30 pb-2.5">
              <p className="text-xs font-bold text-purple-200 uppercase tracking-wider">
                Admin điều chỉnh trực tiếp thông tin Đại biểu hiển thị trên Thẻ In & Ảnh Chào Mừng
              </p>
              {onSaveGuestContent && (
                <button
                  type="button"
                  onClick={handleSaveToRecord}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1 text-xs font-semibold text-white transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>
                    {savedNotice
                      ? 'Đã lưu vào hồ sơ đại biểu!'
                      : 'Lưu thay đổi vào hồ sơ đại biểu'}
                  </span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-purple-300 mb-1">
                  Mã đại biểu & Hạng thẻ
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={draftGuest.code}
                    onChange={(e) =>
                      setDraftGuest({ ...draftGuest, code: e.target.value })
                    }
                    className="w-1/2 rounded-lg border border-purple-400/40 bg-[#0B0318] px-2.5 py-1.5 font-mono-tabular text-xs text-amber-300"
                  />
                  <select
                    value={draftGuest.tier}
                    onChange={(e) =>
                      setDraftGuest({
                        ...draftGuest,
                        tier: e.target.value as GuestRecord['tier'],
                      })
                    }
                    className="w-1/2 rounded-lg border border-purple-400/40 bg-[#0B0318] px-2 py-1.5 text-xs text-white"
                  >
                    <option value="VVIP">VVIP</option>
                    <option value="VIP">VIP</option>
                    <option value="Diễn giả">Diễn giả</option>
                    <option value="Đối tác">Đối tác</option>
                    <option value="Phụ huynh">Phụ huynh</option>
                    <option value="Khách mời">Khách mời</option>
                    <option value="Ban tổ chức">Ban tổ chức</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-purple-300 mb-1">
                  Danh xưng & Họ và tên
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={draftGuest.honorific}
                    onChange={(e) =>
                      setDraftGuest({
                        ...draftGuest,
                        honorific: e.target.value as GuestRecord['honorific'],
                      })
                    }
                    className="w-20 rounded-lg border border-purple-400/40 bg-[#0B0318] px-1.5 py-1.5 text-xs text-white"
                  >
                    <option value="Ông">Ông</option>
                    <option value="Bà">Bà</option>
                    <option value="Anh">Anh</option>
                    <option value="Chị">Chị</option>
                    <option value="TS.">TS.</option>
                    <option value="Diễn giả">Diễn giả</option>
                    <option value="Đại biểu">Đại biểu</option>
                  </select>
                  <input
                    type="text"
                    value={draftGuest.name}
                    onChange={(e) =>
                      setDraftGuest({ ...draftGuest, name: e.target.value })
                    }
                    className="flex-1 rounded-lg border border-purple-400/40 bg-[#0B0318] px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-purple-300 mb-1">
                  Chức vụ / Vai trò
                </label>
                <input
                  type="text"
                  value={draftGuest.role}
                  onChange={(e) =>
                    setDraftGuest({ ...draftGuest, role: e.target.value })
                  }
                  className="w-full rounded-lg border border-purple-400/40 bg-[#0B0318] px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-purple-300 mb-1">
                  Đơn vị công tác
                </label>
                <input
                  type="text"
                  value={draftGuest.company}
                  onChange={(e) =>
                    setDraftGuest({ ...draftGuest, company: e.target.value })
                  }
                  className="w-full rounded-lg border border-purple-400/40 bg-[#0B0318] px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-purple-300 mb-1">
                  Vị trí bàn tiệc / Ghế ngồi
                </label>
                <input
                  type="text"
                  value={draftGuest.seatZone}
                  onChange={(e) =>
                    setDraftGuest({ ...draftGuest, seatZone: e.target.value })
                  }
                  className="w-full rounded-lg border border-purple-400/40 bg-[#0B0318] px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-purple-300 mb-1">
                  Sảnh / Cổng đón tiếp
                </label>
                <input
                  type="text"
                  value={draftGuest.checkInGate || ''}
                  onChange={(e) =>
                    setDraftGuest({
                      ...draftGuest,
                      checkInGate: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-purple-400/40 bg-[#0B0318] px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] text-amber-300 font-semibold mb-1">
                  Nội dung Admin tự bổ sung / Ghi chú đón tiếp (In trên thẻ)
                </label>
                <input
                  type="text"
                  value={draftGuest.adminNotes || ''}
                  onChange={(e) =>
                    setDraftGuest({
                      ...draftGuest,
                      adminNotes: e.target.value,
                    })
                  }
                  placeholder="VD: Đại biểu Chủ tọa · Đón tiếp tại Phòng VIP Sảnh A1..."
                  className="w-full rounded-lg border border-amber-500/40 bg-[#0B0318] px-2.5 py-1.5 text-xs text-amber-200"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] text-purple-300 mb-1">
                  Tiêu đề sự kiện trên Thẻ
                </label>
                <input
                  type="text"
                  value={customEventTitle}
                  onChange={(e) => setCustomEventTitle(e.target.value)}
                  className="w-full rounded-lg border border-purple-400/40 bg-[#0B0318] px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] text-purple-300 mb-1">
                  Lời chào đón tiếp Tiếng Việt trên Ảnh 16:9
                </label>
                <input
                  type="text"
                  value={draftGuest.customGreeting || ''}
                  onChange={(e) =>
                    setDraftGuest({
                      ...draftGuest,
                      customGreeting: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-purple-400/40 bg-[#0B0318] px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Canvas Preview Area */}
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-purple-500/35 bg-[#090214] p-4 sm:p-6">
          <div
            className={
              exportMode === 'checkin_card' ? 'w-full max-w-4xl' : 'hidden'
            }
          >
            <canvas
              ref={checkinCanvasRef}
              className="w-full h-auto rounded-xl border border-purple-500/40 shadow-[0_0_40px_rgba(168,85,247,0.3)]"
            />
          </div>

          <div
            className={exportMode === 'id_badge' ? 'w-full max-w-md' : 'hidden'}
          >
            <canvas
              ref={badgeCanvasRef}
              className="w-full h-auto rounded-xl border border-purple-500/40 shadow-[0_0_40px_rgba(168,85,247,0.35)]"
            />
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-purple-500/30 pt-4">
          <div className="flex items-center gap-2 text-xs text-purple-200/80">
            <Sparkles className="h-4 w-4 text-fuchsia-400 shrink-0" />
            <span>
              Thẻ đại biểu Tím Neon chuẩn tỷ lệ in ấn (300 DPI), khóa font Tiếng Việt không nhảy chữ, sẵn sàng in ngay.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDirectPrintBadge}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-colors whitespace-nowrap"
            >
              <Printer className="h-4 w-4" />
              <span>In Thẻ Đại Biểu Ngay (Máy In)</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleDownloadCanvas(badgeCanvasRef.current, 'The-Dai-Bieu-VIP')
              }
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-600 hover:from-purple-500 hover:to-fuchsia-500 px-4 py-2.5 text-xs font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.45)] transition-all whitespace-nowrap"
            >
              <IdCard className="h-4 w-4" />
              <span>Tải File Thẻ Đại Biểu (PNG)</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleDownloadCanvas(
                  checkinCanvasRef.current,
                  'Anh-Chao-Mung-Checkin'
                )
              }
              className="inline-flex items-center gap-2 rounded-lg border border-purple-400/50 bg-purple-950/70 hover:bg-purple-900 px-4 py-2.5 text-xs font-semibold text-purple-100 shadow-sm transition-colors whitespace-nowrap"
            >
              <Download className="h-4 w-4 text-fuchsia-400" />
              <span>Tải Ảnh Chào Mừng (16:9)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

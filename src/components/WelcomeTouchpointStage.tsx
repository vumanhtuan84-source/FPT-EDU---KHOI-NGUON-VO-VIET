import React from 'react';
import {
  AttendanceLogItem,
  BiometricRedAlertState,
  BrandConfig,
  BrandThemePreset,
  GuestRecord,
} from '../types/attendance';
import {
  Award,
  Briefcase,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  Edit3,
  FileText,
  Hash,
  MapPin,
  Maximize2,
  Minimize2,
  Music,
  Printer,
  ShieldCheck,
  Sparkles,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import {
  playInstrumentalWelcomeMelody,
  speakThankYouCheckIn,
  speakVietnameseGreeting,
} from '../utils/sound';
import { interpolateGreeting } from '../utils/biometrics';
import {
  FOUR_EVENT_LOGO_URLS,
  FourEventLogosBar,
} from './FptSchoolsLogo';

interface WelcomeTouchpointStageProps {
  activeEventLog: AttendanceLogItem | null;
  brandConfig: BrandConfig;
  activeTheme: BrandThemePreset;
  guests: GuestRecord[];
  redAlertState?: BiometricRedAlertState | null;
  onDismissRedAlert?: () => void;
  isFullScreenStage?: boolean;
  onClosePopup?: () => void;
  onTriggerDemoWelcome?: (
    guest: GuestRecord,
    action: 'check_in' | 'check_out'
  ) => void;
  onToggleFullScreen?: () => void;
  onOpenQuickEventEdit?: () => void;
  onOpenExportCard?: (guest: GuestRecord) => void;
  onOpenEditGuest?: (guest: GuestRecord) => void;
}

export const WelcomeTouchpointStage: React.FC<WelcomeTouchpointStageProps> = ({
  activeEventLog,
  brandConfig,
  guests,
  isFullScreenStage = false,
  onClosePopup,
  onTriggerDemoWelcome,
  onToggleFullScreen,
  onOpenQuickEventEdit,
  onOpenExportCard,
  onOpenEditGuest,
}) => {
  const matchedGuest = activeEventLog
    ? guests.find((g) => g.id === activeEventLog.guestId) || null
    : null;

  const verifiedPortraitUrl = activeEventLog
    ? matchedGuest?.originalAvatarUrl ||
      matchedGuest?.avatarUrl ||
      activeEventLog.originalAvatarUrl ||
      activeEventLog.avatarUrl ||
      activeEventLog.capturedFrameUrl ||
      ''
    : '';

  // Compute scientific sequential check-in turn order (Lượt Check-in #01, #02...)
  const checkedInChronological = React.useMemo(() => {
    return guests
      .filter((g) => g.status === 'checked_in' || g.status === 'checked_out')
      .slice()
      .sort(
        (a, b) =>
          (a.checkInTimestamp || Number.MAX_SAFE_INTEGER) -
          (b.checkInTimestamp || Number.MAX_SAFE_INTEGER)
      );
  }, [guests]);

  const checkInTurnIndex = React.useMemo(() => {
    if (!activeEventLog) return 0;
    const idx = checkedInChronological.findIndex(
      (g) => g.id === activeEventLog.guestId
    );
    return idx >= 0 ? idx + 1 : checkedInChronological.length + 1;
  }, [activeEventLog, checkedInChronological]);

  const displayLog: AttendanceLogItem | null = activeEventLog
    ? {
        ...activeEventLog,
        guestCode: matchedGuest?.code || activeEventLog.guestCode,
        guestName: matchedGuest?.name || activeEventLog.guestName,
        honorific: matchedGuest?.honorific || activeEventLog.honorific,
        role: matchedGuest?.role || activeEventLog.role,
        company: matchedGuest?.company || activeEventLog.company,
        adminNotes: matchedGuest?.adminNotes || activeEventLog.adminNotes,
        customFields: matchedGuest?.customFields || activeEventLog.customFields,
        verificationCount:
          matchedGuest?.verificationCount ||
          activeEventLog.verificationCount ||
          1,
        tier: matchedGuest?.tier || activeEventLog.tier,
        seatZone: matchedGuest?.seatZone || activeEventLog.seatZone,
        checkInGate:
          matchedGuest?.checkInGate ||
          activeEventLog.checkInGate ||
          brandConfig.eventPosition,
        avatarUrl: verifiedPortraitUrl,
        originalAvatarUrl: verifiedPortraitUrl,
        capturedFrameUrl: verifiedPortraitUrl,
        featureBreakdown:
          activeEventLog.featureBreakdown ||
          matchedGuest?.lastFeatureBreakdown,
      }
    : null;

  const isCheckIn = displayLog ? displayLog.action === 'check_in' : true;

  const messageVi = displayLog
    ? displayLog.welcomeMessage ||
      (matchedGuest
        ? matchedGuest.customGreeting ||
          interpolateGreeting(
            isCheckIn
              ? brandConfig.welcomeTemplate
              : brandConfig.farewellTemplate,
            matchedGuest,
            brandConfig.eventName
          )
        : '')
    : '';

  const customFieldEntries = Object.entries(
    matchedGuest?.customFields || displayLog?.customFields || {}
  ).filter(([, val]) => Boolean(val));

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-purple-500/50 bg-gradient-to-br from-[#1B0936] via-[#0F0520] to-[#080212] text-slate-100 shadow-[0_0_50px_rgba(168,85,247,0.28)] ${
        isFullScreenStage
          ? 'min-h-[calc(100vh-120px)] flex flex-col justify-between p-6 sm:p-8 lg:p-10'
          : 'p-5 sm:p-6 lg:p-7'
      }`}
    >
      {/* Top 4-Color Neon Purple & Gold Ceremonial Accent Bar */}
      <div className="absolute inset-x-0 top-0 h-1.5 flex">
        <div className="flex-1 bg-[#9333EA]" />
        <div className="flex-1 bg-[#D946EF]" />
        <div className="flex-1 bg-[#F5B324]" />
        <div className="flex-1 bg-[#C084FC]" />
      </div>

      {/* Artistic Neon Purple & Fuchsia Stage Spotlights */}
      <div className="pointer-events-none absolute -top-28 left-1/3 h-80 w-[640px] rounded-full bg-purple-600/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 right-1/4 h-72 w-[520px] rounded-full bg-fuchsia-600/20 blur-3xl" />

      {/* 1. Top Ceremonial Event Header Bar with Prominent Tổ Chức Giáo Dục FPT & 4-Logo Lockup */}
      <div className="relative z-10 flex flex-col gap-3.5 border-b border-purple-400/25 pb-4 pt-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Ceremonial 4 Official Event Logos Header Board (100% Brand Fidelity & Protocol Layout) */}
          <FourEventLogosBar
            variant={isFullScreenStage ? 'led_stage' : 'compact'}
            customLogoUrl={brandConfig.customLogoUrl}
            showProtocolLabels={true}
          />

          {/* Clean Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {displayLog && (
              <button
                type="button"
                onClick={() => speakVietnameseGreeting(messageVi)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-400/35 bg-purple-950/60 px-3 py-1.5 text-xs font-medium text-purple-100 hover:bg-purple-900/70 transition-colors whitespace-nowrap"
                title="Phát âm lời chào đón tiếp đại biểu bằng giọng đọc Tiếng Việt trang trọng"
              >
                <Volume2 className="h-3.5 w-3.5 text-amber-400" />
                <span>Phát Lời Chào</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => playInstrumentalWelcomeMelody()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-fuchsia-400/35 bg-fuchsia-950/50 px-3 py-1.5 text-xs font-medium text-fuchsia-200 hover:bg-fuchsia-900/60 transition-colors whitespace-nowrap"
              title="Phát giai điệu nhạc nền đón tiếp đại biểu"
            >
              <Music className="h-3.5 w-3.5 text-fuchsia-400" />
              <span>Nhạc Đón Tiếp</span>
            </button>

            {displayLog && matchedGuest && onOpenExportCard && (
              <button
                type="button"
                onClick={() => onOpenExportCard(matchedGuest)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-600 hover:from-purple-500 hover:to-fuchsia-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] transition-all whitespace-nowrap"
                title="Xem trước & Xuất file thiết kế In Thẻ Đại Biểu Tím Neon chuyên nghiệp"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>In Thẻ Đại Biểu & Ảnh</span>
              </button>
            )}

            {displayLog && matchedGuest && onOpenEditGuest && (
              <button
                type="button"
                onClick={() => onOpenEditGuest(matchedGuest)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-400/30 bg-purple-950/50 px-2.5 py-1.5 text-xs font-medium text-purple-100 hover:bg-purple-900/60 transition-colors whitespace-nowrap"
                title="Admin điều chỉnh thông tin đại biểu trực tiếp"
              >
                <Edit3 className="h-3.5 w-3.5 text-purple-300" />
                <span>Sửa Đại Biểu</span>
              </button>
            )}

            {onOpenQuickEventEdit && (
              <button
                type="button"
                onClick={onOpenQuickEventEdit}
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-400/30 bg-purple-950/50 px-2.5 py-1.5 text-xs font-medium text-purple-100 hover:bg-purple-900/60 transition-colors whitespace-nowrap"
                title="Chỉnh sửa thông tin sự kiện"
              >
                <Edit3 className="h-3.5 w-3.5 text-fuchsia-300" />
                <span>Sửa Sự Kiện</span>
              </button>
            )}

            {onToggleFullScreen && (
              <button
                type="button"
                onClick={onToggleFullScreen}
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-400/35 bg-purple-950/60 px-2.5 py-1.5 text-xs font-medium text-purple-100 hover:bg-purple-900/70 transition-colors whitespace-nowrap"
              >
                {isFullScreenStage ? (
                  <>
                    <Minimize2 className="h-3.5 w-3.5 text-purple-300" />
                    <span>Thu nhỏ</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3.5 w-3.5 text-purple-300" />
                    <span>Màn hình LED</span>
                  </>
                )}
              </button>
            )}

            {onClosePopup && (
              <button
                type="button"
                onClick={onClosePopup}
                className="inline-flex items-center justify-center rounded-lg border border-purple-400/30 bg-purple-950/60 p-1.5 text-purple-200 hover:bg-purple-900 hover:text-white transition-colors"
                aria-label="Đóng màn hình chào mừng"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Scientific Event Title & Venue Bar with Harmonized Gold-Violet Accent */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/35 bg-gradient-to-r from-[#14062B]/95 via-[#1F0B42]/95 to-[#14062B]/95 px-4 py-2.5 shadow-[inset_0_1px_0_rgba(253,224,71,0.25)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex h-9 w-1.5 rounded-full bg-gradient-to-b from-amber-300 via-fuchsia-400 to-purple-500 shrink-0 shadow-[0_0_10px_rgba(251,191,36,0.6)]" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-wider uppercase">
                <span className="text-purple-200">{brandConfig.brandName}</span>
                <span aria-hidden="true" className="text-amber-400/70">◆</span>
                <span className="text-amber-300">
                  CUỘC THI VOVINAM · FPT EDU KHƠI NGUỒN VÕ VIỆT 2026
                </span>
              </div>
              <h2 className="mt-0.5 text-sm sm:text-base lg:text-lg font-extrabold text-white tracking-tight text-balance leading-snug">
                {brandConfig.eventName}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-purple-100/90">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>{brandConfig.eventDateTime}</span>
            </span>
            {brandConfig.eventLocation && (
              <>
                <span aria-hidden="true" className="text-purple-500/60">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-fuchsia-400 shrink-0" />
                  <span>{brandConfig.eventLocation}</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Center Stage: Show Verified Guest Welcome OR Clean Standby LED Screen */}
      {displayLog ? (
        <>
          <div className="relative z-10 my-5 grid grid-cols-1 sm:grid-cols-12 gap-5 lg:gap-7 items-center">
            {/* Left Column: Proportional Official Delegate Portrait + Neon Purple & Gold Pedestal */}
            <div className="sm:col-span-4 lg:col-span-3 flex flex-col items-center">
              <div
                className={`relative ${
                  isFullScreenStage
                    ? 'h-44 w-40 sm:h-48 sm:w-44 lg:h-56 lg:w-48'
                    : 'h-32 w-28 sm:h-36 sm:w-32 lg:h-40 lg:w-36'
                } rounded-2xl border-2 border-purple-400 p-1.5 bg-[#120624] shadow-[0_0_32px_rgba(168,85,247,0.55)] transition-all shrink-0`}
              >
                {/* Sculpted Corner Accents */}
                <span className="pointer-events-none absolute -top-1 -left-1 h-4 w-4 border-t-2 border-l-2 border-amber-400 rounded-tl-md" />
                <span className="pointer-events-none absolute -top-1 -right-1 h-4 w-4 border-t-2 border-r-2 border-amber-400 rounded-tr-md" />
                <span className="pointer-events-none absolute -bottom-1 -left-1 h-4 w-4 border-b-2 border-l-2 border-amber-400 rounded-bl-md" />
                <span className="pointer-events-none absolute -bottom-1 -right-1 h-4 w-4 border-b-2 border-r-2 border-amber-400 rounded-br-md" />

                <div className="relative h-full w-full overflow-hidden rounded-xl bg-slate-900">
                  {displayLog.avatarUrl ? (
                    <img
                      src={displayLog.avatarUrl}
                      alt={displayLog.guestName}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover object-center"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-purple-950 text-2xl font-bold text-purple-200">
                      {displayLog.guestName.charAt(0)}
                    </div>
                  )}
                </div>
              </div>

              {/* Clean Identity, Tier & Sequential Turn Number Below Portrait */}
              <div className="mt-3 flex flex-col items-center gap-1.5 text-center">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-600 px-3.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-[0_0_16px_rgba(168,85,247,0.5)]">
                  <Award className="h-3 w-3 text-amber-300" />
                  <span>ĐẠI BIỂU {displayLog.tier.toUpperCase()}</span>
                </span>
                <div className="flex items-center gap-2 font-mono-tabular text-[11px] font-semibold text-purple-200">
                  <span>
                    Mã: <strong className="text-white">{displayLog.guestCode}</strong>
                  </span>
                  <span className="text-purple-500">·</span>
                  <span className="text-amber-300">
                    Lượt #{String(checkInTurnIndex).padStart(2, '0')}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Pure Vietnamese Ceremonial Welcome & Scientific Profile Hierarchy */}
            <div className="sm:col-span-8 lg:col-span-9 flex flex-col justify-center text-center sm:text-left min-w-0 space-y-3">
              <div className="inline-flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-purple-400/50 bg-purple-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>
                    {isCheckIn
                      ? `XÁC THỰC LƯỢT #${String(checkInTurnIndex).padStart(2, '0')} THÀNH CÔNG · CHÀO MỪNG ĐẠI BIỂU`
                      : 'TRÂN TRỌNG CẢM ƠN & HẸN GẶP LẠI QUÝ ĐẠI BIỂU'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => speakThankYouCheckIn()}
                  className="inline-flex items-center gap-1 rounded-md border border-fuchsia-400/40 bg-fuchsia-500/15 hover:bg-fuchsia-500/25 px-2.5 py-0.5 text-[11px] font-semibold text-fuchsia-200 transition-colors"
                  title="Phát lời cảm ơn: Cảm ơn bạn đã ghi danh"
                >
                  <Volume2 className="h-3 w-3 text-fuchsia-300" />
                  <span>“Cảm ơn bạn đã ghi danh”</span>
                </button>
              </div>

              <div>
                <p className="text-xs sm:text-sm font-medium text-purple-200/90 tracking-wide">
                  {isCheckIn
                    ? 'Trân trọng đón tiếp sự hiện diện của Quý Đại biểu & Quan khách:'
                    : 'Trân trọng cảm ơn sự hiện diện của Quý Đại biểu:'}
                </p>
                <h1
                  className={`mt-1 ${
                    isFullScreenStage
                      ? 'text-3xl sm:text-4xl lg:text-5xl'
                      : 'text-2xl sm:text-3xl lg:text-4xl'
                  } font-extrabold tracking-tight text-white text-balance leading-tight`}
                  style={{
                    textShadow: '0 0 24px rgba(168, 85, 247, 0.55)',
                  }}
                >
                  {displayLog.honorific} {displayLog.guestName}
                </h1>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                <div className="rounded-xl border border-purple-400/30 bg-[#130726]/85 px-3.5 py-2.5 shadow-inner">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-purple-300/80 flex items-center gap-1.5">
                    <Briefcase className="h-3 w-3 text-amber-400 shrink-0" />
                    <span>Chức vụ / Vai trò</span>
                  </p>
                  <p className="mt-0.5 text-xs sm:text-sm font-bold text-white leading-snug">
                    {displayLog.role}
                  </p>
                </div>

                <div className="rounded-xl border border-purple-400/30 bg-[#130726]/85 px-3.5 py-2.5 shadow-inner">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-purple-300/80 flex items-center gap-1.5">
                    <Building2 className="h-3 w-3 text-fuchsia-400 shrink-0" />
                    <span>Đơn vị công tác</span>
                  </p>
                  <p className="mt-0.5 text-xs sm:text-sm font-bold text-purple-200 leading-snug">
                    {displayLog.company}
                    {matchedGuest?.department ? ` · ${matchedGuest.department}` : ''}
                  </p>
                </div>
              </div>

              {(displayLog.adminNotes || customFieldEntries.length > 0) && (
                <div className="rounded-xl border border-amber-400/35 bg-amber-950/25 px-3.5 py-2 text-left space-y-1">
                  {displayLog.adminNotes && (
                    <p className="text-xs text-amber-200 flex items-start gap-2">
                      <FileText className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-amber-300">Thông tin đón tiếp:</strong>{' '}
                        {displayLog.adminNotes}
                      </span>
                    </p>
                  )}
                  {customFieldEntries.length > 0 && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 pt-0.5 text-[11px] text-purple-100">
                      {customFieldEntries.map(([k, v]) => (
                        <span key={k}>
                          <strong className="text-purple-300">{k}:</strong> {v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-xl border-l-4 border border-purple-400/40 border-l-fuchsia-400 bg-[#120624]/90 px-4 py-3 text-left shadow-inner">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="h-4 w-4 text-fuchsia-400 shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm lg:text-base font-medium leading-relaxed text-purple-50 text-balance">
                    “{messageVi}”
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left border-t border-purple-400/25 pt-4">
            <div className="rounded-xl border border-purple-400/30 bg-[#120624]/80 px-3.5 py-2.5">
              <p className="text-[11px] font-medium text-purple-300/80">
                Vị trí Bàn tiệc & Khu vực Ghế ngồi
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white">
                <MapPin className="h-3.5 w-3.5 text-fuchsia-400 shrink-0" />
                <span className="truncate">{displayLog.seatZone}</span>
              </p>
              <p className="mt-0.5 text-[11px] text-purple-200/75 truncate">
                {displayLog.checkInGate || brandConfig.eventPosition}
              </p>
            </div>

            <div className="rounded-xl border border-purple-400/30 bg-[#120624]/80 px-3.5 py-2.5">
              <p className="text-[11px] font-medium text-purple-300/80">
                Thời gian & Xác nhận Tương đối (≥ 50% · 3 Giây)
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 font-mono-tabular text-xs sm:text-sm font-bold text-emerald-400">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {matchedGuest?.checkInTime || displayLog.timeFormatted}
                </span>
              </p>
              <p className="mt-0.5 text-[11px] text-purple-200/80 truncate flex items-center gap-1">
                <Zap className="h-3 w-3 text-amber-400 shrink-0" />
                <span>
                  Độ chính xác tương đối: {(displayLog.confidence || 96.5).toFixed(1)}% (≤ 3s)
                </span>
              </p>
            </div>

            <div className="rounded-xl border border-purple-400/30 bg-[#120624]/80 px-3.5 py-2.5">
              <p className="text-[11px] font-medium text-purple-300/80">
                Thứ tự Lượt Check-in & Trạng thái
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 font-mono-tabular text-xs sm:text-sm font-bold text-amber-300">
                <Hash className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Lượt Check-in #{String(checkInTurnIndex).padStart(2, '0')} /{' '}
                  {guests.length} Đại biểu
                </span>
              </p>
              <p className="mt-0.5 text-[11px] text-purple-200/75 truncate">
                {matchedGuest?.checkOutTime
                  ? `Đã Check-out: ${matchedGuest.checkOutTime}`
                  : 'Đã xác thực vào cổng · Điểm chạm 3 giây'}
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="relative z-10 my-5 flex flex-col items-center justify-center rounded-2xl border border-purple-400/35 bg-[#120624]/85 p-6 sm:p-8 text-center space-y-4 shadow-inner">
          {/* Standby Hero Lockup of All 4 Official Logos (FPT Education, Vovinam, FPT Edu Vovinam Federation, Khơi Nguồn Võ Việt 2026) */}
          <FourEventLogosBar
            variant="standby_hero"
            customLogoUrl={brandConfig.customLogoUrl}
          />

          <div className="max-w-xl space-y-1.5 pt-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-300">
              <ShieldCheck className="h-4 w-4 text-fuchsia-400" />
              <span>
                Màn Hình LED Đón Tiếp & Vinh Danh Đại Biểu — Tổ Chức Giáo Dục FPT
              </span>
            </div>
            <p className="text-xs sm:text-sm text-purple-100/85 leading-relaxed">
              Quét nhận diện khuôn mặt đối chiếu với khuôn mặt đăng ký đạt tỷ lệ đồng nhất <strong className="text-amber-300">≥ 50%</strong> và ghi nhận nhanh trong <strong className="text-fuchsia-300">3 giây</strong>, tự động hiển thị <strong className="text-white">Họ tên, Chức vụ, Đơn vị công tác & Thứ tự lượt Check-in</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Interactive Demo Switcher on Full Stage View */}
      {onTriggerDemoWelcome && (
        <div className="relative z-10 mt-4 border-t border-purple-400/25 pt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-purple-200/80">
            Trình chiếu nhanh màn hình LED Tím Neon theo đại biểu:
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {guests.slice(0, 6).map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => onTriggerDemoWelcome(g, 'check_in')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${
                  displayLog?.guestId === g.id
                    ? 'border-purple-400 bg-purple-600/35 text-white shadow-[0_0_14px_rgba(168,85,247,0.45)]'
                    : 'border-purple-400/25 bg-purple-950/40 text-purple-200 hover:bg-purple-900/60 hover:text-white'
                }`}
              >
                {g.honorific} {g.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

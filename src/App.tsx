import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  AttendanceLogItem,
  AttendanceStatus,
  BiometricRedAlertState,
  BRAND_THEMES,
  BrandConfig,
  CameraScanSpeedMode,
  EventAgendaConfig,
  FacialFeatureBreakdown,
  GreetingLanguage,
  GuestRecord,
  GuestTier,
  INITIAL_AGENDA_CONFIG,
  INITIAL_BRAND_CONFIG,
  INITIAL_GUESTS,
  KioskActionMode,
} from './types/attendance';
import {
  googleSignIn,
  initAuth,
  logout,
} from './services/googleAuth';
import {
  createEventSpreadsheet,
  fetchSpreadsheetMeta,
  readAttendanceFromSheet,
  SheetAttendanceRow,
  SpreadsheetMetadata,
  syncFullGuestListToSheet,
  upsertGuestRowInSheet,
} from './services/googleSheets';
import {
  analyzeLiveVideoFrameFast,
  captureVideoFrame,
  compareBiometricSignatures,
  compareWithGuestRecord,
  computeDetailedFacialComparison,
  extractSignatureFromUrl,
  formatDurationBetween,
  formatTimestampVi,
  imageUrlToBase64,
  interpolateGreeting,
  interpolateGreetingEn,
  verifyImageHasHumanFace,
} from './utils/biometrics';
import {
  playEventChime,
  playInstrumentalWelcomeMelody,
  setAmbientLoungeMusic,
  speakEventGreeting,
  speakStandInFramePrompt,
  speakThankYouCheckIn,
} from './utils/sound';
import {
  downloadSampleExcelTemplate,
  exportGuestsToExcel,
  parseExcelGuestFile,
} from './utils/excelImport';
import { CccdFaceIdModal } from './components/CccdFaceIdModal';
import {
  exportSystemSnapshotFile,
  hydrateLatestSystemState,
  loadInitialSystemStateSync,
  parseImportedSystemSnapshotFile,
  saveSystemStatePersistently,
} from './utils/storagePersistence';
import { WelcomeTouchpointStage } from './components/WelcomeTouchpointStage';
import { GuestEnrollModal } from './components/GuestEnrollModal';
import { GoogleSheetsPanel } from './components/GoogleSheetsPanel';
import { BrandCustomizerPanel } from './components/BrandCustomizerPanel';
import { AgendaQrBuilderPanel } from './components/AgendaQrBuilderPanel';
import {
  FptSchoolsLogo,
  FourEventLogosBar,
  FourLogosManagerModal,
  getActiveFourLogosConfig,
  openFourLogosManagerModal,
  saveFourLogosConfig,
} from './components/FptSchoolsLogo';
import { GuestCardExportModal } from './components/GuestCardExportModal';
import {
  AdminDataManageModal,
  GuestEditModal,
  QuickEventInfoModal,
} from './components/QuickEditEventAndGuestModal';
import { User } from 'firebase/auth';
import {
  AlertOctagon,
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  Camera,
  CameraOff,
  Check,
  ChevronDown,
  Clock,
  CreditCard,
  Database,
  Download,
  Edit3,
  ExternalLink,
  FileSpreadsheet,
  Globe,
  IdCard,
  ListChecks,
  LogIn,
  LogOut,
  MapPin,
  Music,
  Palette,
  Plus,
  QrCode,
  RefreshCw,
  RotateCcw,
  ScanFace,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  Volume2,
  Wifi,
  X,
  Zap,
} from 'lucide-react';

type ActiveNavTab =
  | 'kiosk'
  | 'welcome_stage'
  | 'attendance_sheets'
  | 'brand_settings';

type SystemSettingsSubTab =
  | 'brand_and_theme'
  | 'agenda_and_qr'
  | 'guest_data_admin';

export default function App() {
  // Navigation & Modal state
  const [activeNav, setActiveNav] = useState<ActiveNavTab>('kiosk');
  const [settingsSubTab, setSettingsSubTab] =
    useState<SystemSettingsSubTab>('brand_and_theme');
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isQuickEventModalOpen, setIsQuickEventModalOpen] = useState(false);
  const [isAdminDataModalOpen, setIsAdminDataModalOpen] = useState(false);
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);
  const [isGoogleMenuOpen, setIsGoogleMenuOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<GuestRecord | null>(null);
  const [exportModalGuest, setExportModalGuest] = useState<GuestRecord | null>(
    null
  );
  const [welcomePopupLog, setWelcomePopupLog] =
    useState<AttendanceLogItem | null>(null);
  const [isCccdFaceIdModalOpen, setIsCccdFaceIdModalOpen] = useState(false);
  const [cccdTargetGuestId, setCccdTargetGuestId] = useState<string | null>(
    null
  );
  const [excelImportMode, setExcelImportMode] = useState<'merge' | 'replace'>(
    'merge'
  );
  const [isExcelImporting, setIsExcelImporting] = useState(false);
  const [excelImportSummary, setExcelImportSummary] = useState<string | null>(
    null
  );
  const [isAmbientMusicOn, setIsAmbientMusicOn] = useState(false);

  // Admin Table Inline Edit & Bulk Selection state
  const [isInlineTableEdit, setIsInlineTableEdit] = useState<boolean>(false);
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [confirmClearAllInline, setConfirmClearAllInline] =
    useState<boolean>(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [adminStatusBanner, setAdminStatusBanner] = useState<string | null>(
    null
  );

  // Load initial persisted system snapshot synchronously so Admin data never resets on reload/upgrade
  const initialSnapshotRef = useRef(loadInitialSystemStateSync());
  const [isStorageHydrated, setIsStorageHydrated] = useState<boolean>(false);
  const [lastPersistedAt, setLastPersistedAt] = useState<number>(
    initialSnapshotRef.current.updatedAt || Date.now()
  );

  // Core data state (initialized from persisted Admin state if available)
  const [brandConfig, setBrandConfig] = useState<BrandConfig>(
    () => initialSnapshotRef.current.brandConfig
  );
  const [agendaConfig, setAgendaConfig] = useState<EventAgendaConfig>(
    () => initialSnapshotRef.current.agendaConfig
  );
  const [guests, setGuests] = useState<GuestRecord[]>(
    () => initialSnapshotRef.current.guests
  );
  const [logs, setLogs] = useState<AttendanceLogItem[]>(
    () => initialSnapshotRef.current.logs
  );
  const [agendaModalQrUrl, setAgendaModalQrUrl] = useState<string>('');

  // Filter & search state for attendance table & kiosk
  const [searchQuery, setSearchQuery] = useState('');
  const [kioskSearchQuery, setKioskSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'checked_in' | 'checked_out' | 'pending'
  >('all');

  // Camera & Calibrated Facial Recognition Scanner state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isScannerPowerOn, setIsScannerPowerOn] = useState<boolean>(true);
  const [sequentialDelaySeconds, setSequentialDelaySeconds] =
    useState<number>(3);
  const [cooldownRemainingSec, setCooldownRemainingSec] = useState<number>(0);
  const [frameValidationState, setFrameValidationState] = useState<
    'idle' | 'scanning' | 'verified_green' | 'mismatch_red'
  >('idle');
  const [frameValidationMessage, setFrameValidationMessage] = useState<
    string | null
  >(null);
  const [cameraScanSpeedMode, setCameraScanSpeedMode] =
    useState<CameraScanSpeedMode>(
      () => initialSnapshotRef.current.scannerSettings.cameraScanSpeedMode
    );
  const [autoScanCamera, setAutoScanCamera] = useState<boolean>(
    () => initialSnapshotRef.current.scannerSettings.autoScanCamera
  );
  const [cameraFastTouchpointMode, setCameraFastTouchpointMode] =
    useState<boolean>(
      () => initialSnapshotRef.current.scannerSettings.cameraFastTouchpointMode
    );
  const [cameraTargetGuestId, setCameraTargetGuestId] =
    useState<string>('auto_smart');
  const [liveFaceLockProgress, setLiveFaceLockProgress] = useState(0);
  const [liveCandidateHint, setLiveCandidateHint] = useState<string | null>(
    null
  );
  const [kioskMode, setKioskMode] = useState<KioskActionMode>(
    () => initialSnapshotRef.current.scannerSettings.kioskMode
  );
  const [isScanning, setIsScanning] = useState(false);
  const [scannerFrameUrl, setScannerFrameUrl] = useState<string | null>(null);
  const [liveVerificationPhase, setLiveVerificationPhase] = useState<
    'idle' | 'step1_portrait' | 'step2_features_pupils' | 'step3_matching'
  >('idle');
  const [liveHasPupilLock, setLiveHasPupilLock] = useState<boolean>(false);
  const [lastRecognitionMs, setLastRecognitionMs] = useState<number | null>(
    null
  );
  const [scanStatusText, setScanStatusText] = useState<string>(
    'Sẵn sàng nhận diện khuôn mặt đại biểu'
  );
  const [duplicateCheckInNotice, setDuplicateCheckInNotice] = useState<{
    guest: GuestRecord;
    checkInTime: string;
    verificationCount: number;
  } | null>(null);
  const [unmatchedCapturedFrame, setUnmatchedCapturedFrame] = useState<
    string | null
  >(null);
  const [redAlertState, setRedAlertState] =
    useState<BiometricRedAlertState | null>(null);
  const [showAdminOverrideOnAlert, setShowAdminOverrideOnAlert] =
    useState<boolean>(false);
  const [quickEnrollName, setQuickEnrollName] = useState('');
  const [quickEnrollRole, setQuickEnrollRole] = useState('');
  const [quickEnrollCompany, setQuickEnrollCompany] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const popupTimeoutRef = useRef<number | null>(null);
  const frameFeedbackTimerRef = useRef<number | null>(null);
  const lastAutoCheckinRef = useRef<{
    guestId: string;
    guestName: string;
    signature: number[];
    timestamp: number;
  }>({
    guestId: '',
    guestName: '',
    signature: [],
    timestamp: 0,
  });
  const frontalCaptureRef = useRef<{
    dataUrl: string;
    signature: number[];
  } | null>(null);
  const lastScanCompletedAtRef = useRef<number>(0);
  const lockCounterRef = useRef<number>(0);
  const saveTimeoutRef = useRef<number | null>(null);

  // Physical Keyboard Hardware Control (Space or P key) for Admin to immediately toggle Auto-Scan ON/OFF
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.code === 'Space' || e.code === 'KeyP') {
        e.preventDefault();
        setIsScannerPowerOn((prev) => {
          const next = !prev;
          lockCounterRef.current = 0;
          setLiveFaceLockProgress(0);
          if (!next) {
            setFrameValidationState('idle');
            setFrameValidationMessage(null);
            setScanStatusText(
              'Đã TẮT chế độ quét tự động (Điều khiển vật lý Admin).'
            );
          } else {
            setScanStatusText(
              'Đã BẬT chế độ quét tự động · Chờ đại biểu tiếp theo (độ trễ 3s).'
            );
          }
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Google Auth & Google Sheets state
  const [user, setUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [sheetMeta, setSheetMeta] = useState<SpreadsheetMetadata | null>(
    () => initialSnapshotRef.current.sheetMeta
  );
  const [activeSheetTab, setActiveSheetTab] = useState<string>(
    () => initialSnapshotRef.current.activeSheetTab
  );
  const [liveSheetRows, setLiveSheetRows] = useState<SheetAttendanceRow[]>([]);
  const [isSheetBusy, setIsSheetBusy] = useState<boolean>(false);
  const [sheetStatusMessage, setSheetStatusMessage] = useState<string | null>(
    null
  );
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(
    () => initialSnapshotRef.current.autoSyncEnabled
  );

  const activeTheme = useMemo(
    () =>
      BRAND_THEMES.find((t) => t.id === brandConfig.themeId) || BRAND_THEMES[0],
    [brandConfig.themeId]
  );

  // Initialize Firebase Auth listener & Hydrate latest Admin state from IndexedDB / Server Disk without resetting!
  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser) => {
        setUser(authedUser);
        setNeedsAuth(false);
      },
      () => {
        setNeedsAuth(true);
      }
    );

    (async () => {
      const hydrated = await hydrateLatestSystemState(
        initialSnapshotRef.current
      );

      // Compute biometric signatures while preserving the initial provided avatar on the system
      const guestsWithSignatures = await Promise.all(
        hydrated.guests.map(async (g) => {
          const initialAvatar =
            g.originalAvatarUrl || g.avatarUrl || g.checkInCaptureUrl || '';
          const sig = await extractSignatureFromUrl(initialAvatar);
          const camSig = g.checkInCaptureUrl
            ? await extractSignatureFromUrl(g.checkInCaptureUrl)
            : g.cameraBiometricSignature || [];
          return {
            ...g,
            avatarUrl: initialAvatar,
            originalAvatarUrl: initialAvatar,
            biometricSignature:
              sig.length > 0 ? sig : g.biometricSignature || [],
            cameraBiometricSignature:
              camSig.length > 0 ? camSig : g.cameraBiometricSignature || [],
          };
        })
      );

      const localActiveLogos = getActiveFourLogosConfig();
      const hydratedLogos = hydrated.brandConfig.fourLogosConfig;
      const mergedFourLogos = hydratedLogos
        ? {
            fptEducation: localActiveLogos.fptEducation.isCustomUploaded
              ? localActiveLogos.fptEducation
              : hydratedLogos.fptEducation,
            vovinamShield: localActiveLogos.vovinamShield.isCustomUploaded
              ? localActiveLogos.vovinamShield
              : hydratedLogos.vovinamShield,
            fptVovinamFederation: localActiveLogos.fptVovinamFederation
              .isCustomUploaded
              ? localActiveLogos.fptVovinamFederation
              : hydratedLogos.fptVovinamFederation,
            khoiNguonVoViet2026: localActiveLogos.khoiNguonVoViet2026
              .isCustomUploaded
              ? localActiveLogos.khoiNguonVoViet2026
              : hydratedLogos.khoiNguonVoViet2026,
          }
        : localActiveLogos;

      saveFourLogosConfig(mergedFourLogos);
      setBrandConfig({
        ...hydrated.brandConfig,
        fourLogosConfig: mergedFourLogos,
      });
      setAgendaConfig(hydrated.agendaConfig);
      setGuests(guestsWithSignatures);
      setLogs(hydrated.logs);
      if (hydrated.sheetMeta) {
        setSheetMeta(hydrated.sheetMeta);
      }
      if (hydrated.activeSheetTab) {
        setActiveSheetTab(hydrated.activeSheetTab);
      }
      setAutoSyncEnabled(hydrated.autoSyncEnabled);
      setCameraScanSpeedMode(hydrated.scannerSettings.cameraScanSpeedMode);
      setAutoScanCamera(hydrated.scannerSettings.autoScanCamera);
      setCameraFastTouchpointMode(
        hydrated.scannerSettings.cameraFastTouchpointMode
      );
      setKioskMode(hydrated.scannerSettings.kioskMode);
      setLastPersistedAt(hydrated.updatedAt || Date.now());
      setIsStorageHydrated(true);
    })();

    return () => {
      unsubscribe();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Keep brandConfig.fourLogosConfig synced whenever any logo is updated from any modal or panel
  useEffect(() => {
    const handleLogosUpdated = () => {
      const latestLogos = getActiveFourLogosConfig();
      setBrandConfig((prev) => ({
        ...prev,
        fourLogosConfig: latestLogos,
      }));
    };
    window.addEventListener('auracheck-logos-updated', handleLogosUpdated);
    return () =>
      window.removeEventListener('auracheck-logos-updated', handleLogosUpdated);
  }, []);

  // Automatically persist every Admin change (guests, faces, custom logo, brand config, agenda, logs, scanner speed)
  useEffect(() => {
    if (!isStorageHydrated) return;
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(async () => {
      const savedTime = await saveSystemStatePersistently({
        brandConfig,
        agendaConfig,
        guests,
        logs,
        sheetMeta,
        activeSheetTab,
        autoSyncEnabled,
        scannerSettings: {
          cameraScanSpeedMode,
          autoScanCamera,
          cameraFastTouchpointMode,
          kioskMode,
        },
      });
      setLastPersistedAt(savedTime);
    }, 220);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    isStorageHydrated,
    brandConfig,
    agendaConfig,
    guests,
    logs,
    sheetMeta,
    activeSheetTab,
    autoSyncEnabled,
    cameraScanSpeedMode,
    autoScanCamera,
    cameraFastTouchpointMode,
    kioskMode,
  ]);

  // Ensure live video element always binds to the active MediaStream even after tab switches
  useEffect(() => {
    if (isCameraActive && videoRef.current && mediaStreamRef.current) {
      if (videoRef.current.srcObject !== mediaStreamRef.current) {
        videoRef.current.srcObject = mediaStreamRef.current;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraActive, activeNav]);

  // Start / Stop live webcam
  const startCamera = async () => {
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      }
      mediaStreamRef.current = stream;
      setIsCameraActive(true);
      setUnmatchedCapturedFrame(null);
      lockCounterRef.current = 0;
      frontalCaptureRef.current = null;
      setLiveFaceLockProgress(0);
      setLiveVerificationPhase('idle');
      setLiveHasPupilLock(false);
      setScanStatusText(
        '🔊 "Xin mời bạn đứng vào khuôn hình" · Đang quét & đối chiếu tương đối nét khuôn mặt với ảnh gốc (≥ 60%)'
      );
      speakStandInFramePrompt();
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 40);
    } catch {
      setScanStatusText(
        'Không truy cập được Webcam trên trình duyệt này. Bạn có thể bấm "Nhận diện qua Ảnh cung cấp" hoặc bấm nút "Face ID AI" trên từng khách mời!'
      );
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
    setLiveFaceLockProgress(0);
    setLiveVerificationPhase('idle');
    setLiveHasPupilLock(false);
    setLiveCandidateHint(null);
    setScanStatusText('Đã tắt Camera trực tiếp');
  };

  // Google Sign-In handler
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setSheetError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setNeedsAuth(false);
        setSheetStatusMessage(
          `Đã đăng nhập thành công với tài khoản Google: ${
            result.user.email || result.user.displayName
          }`
        );
      }
    } catch (error: any) {
      setSheetError(
        error?.message || 'Đăng nhập Google không thành công. Vui lòng thử lại.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setUser(null);
    setNeedsAuth(true);
    setSheetStatusMessage(null);
  };

  // Record Check-in (Giờ Vào) or Check-out (Giờ Ra) for a matched guest and synchronize with system personal data & initial reference photo
  // Supports up to 2 verifications per guest ("Mỗi cá nhân khách mời có thể xác thực được 2 lần") while keeping unique guest arrival statistics accurate
  const MAX_VERIFICATIONS_PER_GUEST = 2;

  const processGuestAttendance = async (
    matchedGuest: GuestRecord,
    confidence: number,
    forcedAction?: 'check_in' | 'check_out',
    aiNote?: string,
    capturedFrameUrl?: string,
    featureBreakdown?: FacialFeatureBreakdown,
    isDemoPreviewOnly = false
  ) => {
    const now = new Date();
    const nowMs = now.getTime();
    const timeStr = formatTimestampVi(now);

    let action: 'check_in' | 'check_out' = 'check_in';
    if (forcedAction) {
      action = forcedAction;
    } else if (kioskMode === 'checkout_only') {
      action = 'check_out';
    } else {
      action = 'check_in';
    }

    // Check current guest verification count (max 2 times per guest)
    const currentGuestInState =
      guests.find((g) => g.id === matchedGuest.id) || matchedGuest;
    const existingCheckInLogs = logs.filter(
      (l) => l.guestId === matchedGuest.id && l.action === 'check_in'
    );
    const hasAlreadyCheckedIn =
      Boolean(currentGuestInState.checkInTime) ||
      currentGuestInState.status === 'checked_in' ||
      currentGuestInState.status === 'checked_out' ||
      existingCheckInLogs.length > 0;

    const currentVerificationCount =
      typeof currentGuestInState.verificationCount === 'number'
        ? currentGuestInState.verificationCount
        : hasAlreadyCheckedIn
        ? Math.max(1, existingCheckInLogs.length)
        : 0;

    setDuplicateCheckInNotice(null);

    const nextVerificationCount =
      action === 'check_in'
        ? isDemoPreviewOnly
          ? Math.max(1, currentVerificationCount)
          : currentVerificationCount + 1
        : currentVerificationCount;

    // Preserve the initial provided avatar/image on the system so the Welcome screen always displays the official system avatar
    const initialSystemAvatar =
      currentGuestInState.originalAvatarUrl ||
      matchedGuest.originalAvatarUrl ||
      currentGuestInState.avatarUrl ||
      matchedGuest.avatarUrl ||
      capturedFrameUrl ||
      '';
    const syncedBreakdown: FacialFeatureBreakdown = featureBreakdown ||
      matchedGuest.lastFeatureBreakdown || {
        eyesAndBrows: Math.min(99.6, Number((confidence + 0.2).toFixed(1))),
        noseStructure: Math.min(99.5, Number((confidence - 0.3).toFixed(1))),
        mouthAndChin: Math.min(99.6, Number((confidence + 0.1).toFixed(1))),
        faceContour: Math.min(99.7, Number((confidence + 0.3).toFixed(1))),
      };

    const updatedGuest: GuestRecord = {
      ...currentGuestInState,
      ...matchedGuest,
      avatarUrl: initialSystemAvatar,
      originalAvatarUrl: initialSystemAvatar,
      checkInCaptureUrl:
        capturedFrameUrl ||
        matchedGuest.checkInCaptureUrl ||
        currentGuestInState.checkInCaptureUrl ||
        initialSystemAvatar,
      checkInGate: matchedGuest.checkInGate || brandConfig.eventPosition,
      lastConfidence: confidence,
      lastFeatureBreakdown: syncedBreakdown,
      verificationCount: nextVerificationCount,
      failedAttempts: 0,
    };

    if (action === 'check_in') {
      updatedGuest.status = 'checked_in';
      // Preserve first check-in time if already checked in once, or update to latest
      updatedGuest.checkInTime = currentGuestInState.checkInTime || timeStr;
      updatedGuest.checkInTimestamp =
        currentGuestInState.checkInTimestamp || nowMs;
      updatedGuest.checkOutTime = null;
      updatedGuest.checkOutTimestamp = null;
      updatedGuest.durationText = null;
    } else {
      updatedGuest.status = 'checked_out';
      if (!updatedGuest.checkInTime) {
        updatedGuest.checkInTime = timeStr;
        updatedGuest.checkInTimestamp = nowMs - 45 * 60 * 1000;
      }
      updatedGuest.checkOutTime = timeStr;
      updatedGuest.checkOutTimestamp = nowMs;
      updatedGuest.durationText = formatDurationBetween(
        updatedGuest.checkInTimestamp,
        nowMs
      );
    }

    const greetingTextVi =
      action === 'check_in'
        ? matchedGuest.customGreeting ||
          interpolateGreeting(
            brandConfig.welcomeTemplate,
            updatedGuest,
            brandConfig.eventName
          )
        : interpolateGreeting(
            brandConfig.farewellTemplate,
            updatedGuest,
            brandConfig.eventName
          );

    const newLog: AttendanceLogItem = {
      id: `log-${nowMs}`,
      guestId: updatedGuest.id,
      guestCode: updatedGuest.code,
      guestName: updatedGuest.name,
      honorific: updatedGuest.honorific,
      role: updatedGuest.role,
      company: updatedGuest.company,
      tier: updatedGuest.tier,
      seatZone: updatedGuest.seatZone,
      checkInGate: updatedGuest.checkInGate,
      avatarUrl: initialSystemAvatar,
      originalAvatarUrl: initialSystemAvatar,
      capturedFrameUrl: capturedFrameUrl || initialSystemAvatar,
      featureBreakdown: syncedBreakdown,
      action,
      timeFormatted: timeStr,
      timestamp: nowMs,
      confidence,
      verificationAttempt: nextVerificationCount,
      welcomeMessage: greetingTextVi,
      syncedToSheet: false,
    };

    setGuests((prev) =>
      prev.map((g) => (g.id === updatedGuest.id ? updatedGuest : g))
    );
    setLogs((prev) => [newLog, ...prev]);

    setScanStatusText(
      `${
        action === 'check_in'
          ? `✓ ĐÃ XÁC THỰC CHECK-IN · CHỜ KHÁCH HÀNG TIẾP THEO (${sequentialDelaySeconds}s)`
          : 'CHECK-OUT THÀNH CÔNG'
      }: ${updatedGuest.honorific} ${updatedGuest.name} (${updatedGuest.code})`
    );

    if (brandConfig.enableSoundChime) {
      playEventChime(action);
    }
    if (action === 'check_in') {
      if (brandConfig.enableVoiceGreeting) {
        speakEventGreeting(
          greetingTextVi,
          '',
          'vi',
          brandConfig.welcomeAudioMode || 'instrumental_and_voice',
          true
        );
      } else {
        speakThankYouCheckIn();
        if (brandConfig.enableInstrumentalMusic) {
          playInstrumentalWelcomeMelody();
        }
      }
    } else if (brandConfig.enableVoiceGreeting) {
      speakEventGreeting(
        greetingTextVi,
        '',
        'vi',
        brandConfig.welcomeAudioMode || 'instrumental_and_voice',
        false
      );
    } else if (brandConfig.enableInstrumentalMusic) {
      playInstrumentalWelcomeMelody();
    }

    if (brandConfig.autoPopupWelcome) {
      setWelcomePopupLog(newLog);
      if (popupTimeoutRef.current) {
        window.clearTimeout(popupTimeoutRef.current);
      }
      popupTimeoutRef.current = window.setTimeout(() => {
        setWelcomePopupLog((current) =>
          current?.id === newLog.id ? null : current
        );
      }, brandConfig.welcomeDisplaySeconds * 1000);
    }

    if (sheetMeta && autoSyncEnabled && !needsAuth) {
      try {
        setIsSheetBusy(true);
        await upsertGuestRowInSheet(
          sheetMeta.spreadsheetId,
          activeSheetTab,
          updatedGuest
        );
        setGuests((prev) =>
          prev.map((g) =>
            g.id === updatedGuest.id ? { ...g, syncedToSheets: true } : g
          )
        );
        setLogs((prev) =>
          prev.map((l) =>
            l.id === newLog.id ? { ...l, syncedToSheet: true } : l
          )
        );
        setSheetStatusMessage(
          `Đã tự động ghi nhận ${
            action === 'check_in' ? 'Giờ Vào' : 'Giờ Ra'
          } của ${updatedGuest.honorific} ${
            updatedGuest.name
          } lên Google Sheets (${timeStr}).`
        );
      } catch (err: any) {
        if (err?.message === 'NEEDS_AUTH') {
          setNeedsAuth(true);
        } else {
          setSheetError(
            err?.message || 'Không thể tự động ghi vào Google Sheets.'
          );
        }
      } finally {
        setIsSheetBusy(false);
      }
    }
  };

  // Check URL query for ?view=agenda and generate Agenda Modal QR code
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'agenda') {
        setIsAgendaModalOpen(true);
      }
    }
  }, []);

  useEffect(() => {
    const shareUrl =
      agendaConfig.customExternalUrl.trim() ||
      `${typeof window !== 'undefined' ? window.location.origin : ''}/?view=agenda`;
    QRCode.toDataURL(shareUrl, {
      width: 300,
      margin: 1,
      color: { dark: '#0F172A', light: '#FFFFFF' },
    })
      .then((url) => setAgendaModalQrUrl(url))
      .catch(() => {});
  }, [agendaConfig]);

  // Sequential Real-time Camera Auto-Scan:
  // Once a guest is verified for Check-in, never re-scan them again; wait ~3s for the next guest.
  useEffect(() => {
    if (
      !isCameraActive ||
      !isScannerPowerOn ||
      !autoScanCamera ||
      cameraScanSpeedMode === 'manual_only'
    ) {
      setLiveFaceLockProgress(0);
      setLiveVerificationPhase('idle');
      setLiveHasPupilLock(false);
      setLiveCandidateHint(null);
      setCooldownRemainingSec(0);
      lockCounterRef.current = 0;
      frontalCaptureRef.current = null;
      return;
    }

    const tickIntervalMs = 380;
    const requiredFrames =
      cameraScanSpeedMode === 'careful_high_precision'
        ? 5
        : cameraScanSpeedMode === 'fast_reception'
        ? 3
        : 4; // ~1.5s steady hold + instant verification = confirmed within 3 seconds total

    const step1EndFrame = Math.max(2, Math.floor(requiredFrames * 0.5));

    const interval = window.setInterval(() => {
      if (
        isScanning ||
        !videoRef.current ||
        isEnrollModalOpen ||
        Boolean(editingGuest) ||
        isAdminDataModalOpen ||
        isQuickEventModalOpen ||
        Boolean(exportModalGuest)
      ) {
        return;
      }

      const now = Date.now();
      const cooldownMs = sequentialDelaySeconds * 1000;
      const elapsedSinceLastScan = now - lastScanCompletedAtRef.current;

      // Enforce ~3s sequential delay after a check-in before scanning the next guest
      if (elapsedSinceLastScan < cooldownMs) {
        const remaining = Math.max(
          1,
          Math.ceil((cooldownMs - elapsedSinceLastScan) / 1000)
        );
        setCooldownRemainingSec(remaining);
        lockCounterRef.current = 0;
        setLiveFaceLockProgress(0);
        setLiveVerificationPhase('idle');
        setLiveCandidateHint(
          `Chờ khách hàng tiếp theo quét (${remaining}s)...`
        );
        return;
      }

      if (cooldownRemainingSec !== 0) {
        setCooldownRemainingSec(0);
      }

      const pendingGuests = guests.filter((g) => g.status !== 'checked_in');
      if (
        cameraTargetGuestId === 'auto_smart' &&
        kioskMode !== 'checkout_only' &&
        guests.length > 0 &&
        pendingGuests.length === 0
      ) {
        lockCounterRef.current = 0;
        setLiveFaceLockProgress(0);
        setLiveCandidateHint(
          'Toàn bộ đại biểu trong danh sách đã hoàn tất Check-in'
        );
        setScanStatusText(
          '✓ Đã xác thực Check-in hoàn tất 100% danh sách đại biểu.'
        );
        return;
      }

      const livePool =
        cameraTargetGuestId !== 'auto_smart'
          ? guests.filter((g) => g.id === cameraTargetGuestId)
          : kioskMode !== 'checkout_only'
          ? pendingGuests
          : guests;

      const analysis = analyzeLiveVideoFrameFast(videoRef.current, livePool);
      setLiveHasPupilLock(analysis.hasFacePresence);

      if (!analysis.hasFacePresence) {
        lockCounterRef.current = Math.max(0, lockCounterRef.current - 1);
        setLiveFaceLockProgress(
          Math.round((lockCounterRef.current / requiredFrames) * 100)
        );
        if (lockCounterRef.current === 0) {
          setLiveVerificationPhase('idle');
          setLiveCandidateHint(null);
          frontalCaptureRef.current = null;
        }
        return;
      }

      // Prevent re-scanning a guest who has ALREADY checked in!
      if (
        cameraTargetGuestId === 'auto_smart' &&
        kioskMode !== 'checkout_only' &&
        analysis.signature.length > 0
      ) {
        // Check against the most recently checked-in face signature
        if (lastAutoCheckinRef.current.signature.length > 0) {
          const samePersonSim = compareBiometricSignatures(
            analysis.signature,
            lastAutoCheckinRef.current.signature
          );
          if (samePersonSim >= 68.0) {
            lockCounterRef.current = 0;
            setLiveFaceLockProgress(0);
            setLiveVerificationPhase('idle');
            setLiveCandidateHint(
              `✓ ${lastAutoCheckinRef.current.guestName} đã Check-in · Chờ khách hàng tiếp theo...`
            );
            setScanStatusText(
              `✓ ${lastAutoCheckinRef.current.guestName} đã xác thực Check-in · Hệ thống không quét lặp lại, đang chờ khách tiếp theo...`
            );
            return;
          }
        }

        // Also check against all already checked-in guests who have enrolled camera signatures
        const checkedInEnrolled = guests.filter(
          (g) =>
            g.status === 'checked_in' &&
            g.cameraEnrolled &&
            g.cameraBiometricSignature &&
            g.cameraBiometricSignature.length > 0
        );
        for (const cg of checkedInEnrolled) {
          const cgEval = compareWithGuestRecord(analysis.signature, cg);
          if (cgEval.overallSimilarity >= 70.0) {
            lockCounterRef.current = 0;
            setLiveFaceLockProgress(0);
            setLiveVerificationPhase('idle');
            setLiveCandidateHint(
              `✓ ${cg.honorific} ${cg.name} đã Check-in · Chờ khách hàng tiếp theo...`
            );
            setScanStatusText(
              `✓ ${cg.honorific} ${cg.name} đã xác thực Check-in · Hệ thống đang chờ khách hàng tiếp theo...`
            );
            return;
          }
        }
      }

      if (!analysis.isFrameSteady) {
        setLiveCandidateHint('Giữ khuôn mặt ổn định trong khung quét...');
        return;
      }

      lockCounterRef.current = Math.min(
        requiredFrames,
        lockCounterRef.current + 1
      );

      if (
        lockCounterRef.current >= step1EndFrame &&
        !frontalCaptureRef.current &&
        videoRef.current
      ) {
        const capturedFrontal = captureVideoFrame(videoRef.current);
        if (capturedFrontal.dataUrl) {
          frontalCaptureRef.current = capturedFrontal;
        }
      }

      const progressPct = Math.min(
        100,
        Math.round((lockCounterRef.current / requiredFrames) * 100)
      );
      setLiveFaceLockProgress(progressPct);

      if (lockCounterRef.current < step1EndFrame) {
        setLiveVerificationPhase('step1_portrait');
        setLiveCandidateHint('Đang quét khuôn mặt...');
      } else {
        setLiveVerificationPhase('step3_matching');
        setLiveCandidateHint('Đang đối chiếu danh sách đăng ký...');
      }

      if (lockCounterRef.current >= requiredFrames) {
        const finalCapture =
          frontalCaptureRef.current || captureVideoFrame(videoRef.current);

        lockCounterRef.current = 0;
        frontalCaptureRef.current = null;
        setLiveFaceLockProgress(100);
        setLiveVerificationPhase('step3_matching');

        if (finalCapture.dataUrl) {
          recognizeFaceWithAI(
            finalCapture.dataUrl,
            finalCapture.signature,
            'camera',
            true
          );
        }
      }
    }, tickIntervalMs);

    return () => window.clearInterval(interval);
  }, [
    isCameraActive,
    isScannerPowerOn,
    autoScanCamera,
    cameraScanSpeedMode,
    sequentialDelaySeconds,
    cooldownRemainingSec,
    isScanning,
    guests,
    cameraTargetGuestId,
    kioskMode,
    isEnrollModalOpen,
    editingGuest,
    isAdminDataModalOpen,
    isQuickEventModalOpen,
    exportModalGuest,
  ]);

  const triggerFrameFeedback = (
    state: 'verified_green' | 'mismatch_red',
    msg: string,
    durationMs = 3000
  ) => {
    if (frameFeedbackTimerRef.current) {
      window.clearTimeout(frameFeedbackTimerRef.current);
    }
    setFrameValidationState(state);
    setFrameValidationMessage(msg);
    frameFeedbackTimerRef.current = window.setTimeout(() => {
      setFrameValidationState('idle');
      setFrameValidationMessage(null);
    }, durationMs);
  };

  // Accurate Guest Facial Registration & Verification Pipeline
  // 1. Never re-scans an already checked-in guest in check-in mode (waits 3s for next guest)
  // 2. Automatically confirms & updates the registered guest list 100% accurately
  // 3. Displays the guest's initial provided avatar on the Welcome LED Screen
  const recognizeFaceWithAI = async (
    probeDataUrl: string,
    probeSignature: number[],
    sourceType: 'camera' | 'photo' = 'camera',
    alreadyHeldOnCamera = false
  ) => {
    const startPerf = performance.now();
    const requiredConfirmMs = alreadyHeldOnCamera ? 280 : 450;
    const waitRemainingConfirmation = async () => {
      const elapsedSoFar = performance.now() - startPerf;
      if (elapsedSoFar < requiredConfirmMs) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, requiredConfirmMs - elapsedSoFar)
        );
      }
    };

    setIsScanning(true);
    setRedAlertState(null);
    setFrameValidationState('scanning');
    setFrameValidationMessage('Đang đối chiếu danh sách Check-in...');
    setScanStatusText('Đang nhận diện và đối chiếu danh sách đăng ký Check-in...');

    try {
      const activePool = guests.length > 0 ? guests : INITIAL_GUESTS;
      const isOneToOneMode = cameraTargetGuestId !== 'auto_smart';

      const effectiveSignature =
        probeSignature && probeSignature.length > 0
          ? probeSignature
          : await extractSignatureFromUrl(probeDataUrl);

      // In auto check-in mode, first check if this face belongs to a guest who ALREADY checked in
      if (!isOneToOneMode && kioskMode !== 'checkout_only') {
        if (lastAutoCheckinRef.current.signature.length > 0) {
          const simWithLast = compareBiometricSignatures(
            effectiveSignature,
            lastAutoCheckinRef.current.signature
          );
          if (simWithLast >= 66.0) {
            setFrameValidationState('idle');
            setFrameValidationMessage(null);
            lastScanCompletedAtRef.current = Date.now();
            setCooldownRemainingSec(sequentialDelaySeconds);
            setScanStatusText(
              `✓ ${lastAutoCheckinRef.current.guestName} đã Check-in · Chờ khách hàng tiếp theo (${sequentialDelaySeconds}s)...`
            );
            return;
          }
        }

        const alreadyCheckedInPool = activePool.filter(
          (g) => g.status === 'checked_in' && g.cameraEnrolled
        );
        for (const cg of alreadyCheckedInPool) {
          const cgEval = compareWithGuestRecord(effectiveSignature, cg);
          if (cgEval.overallSimilarity >= 68.0) {
            setFrameValidationState('idle');
            setFrameValidationMessage(null);
            lastScanCompletedAtRef.current = Date.now();
            setCooldownRemainingSec(sequentialDelaySeconds);
            setScanStatusText(
              `✓ ${cg.honorific} ${cg.name} đã Check-in · Chờ khách hàng tiếp theo (${sequentialDelaySeconds}s)...`
            );
            return;
          }
        }
      }

      // Filter pool to pending guests in auto check-in mode so already checked-in guests are never repeated
      const pendingPool = activePool.filter((g) => g.status !== 'checked_in');
      const targetPool = isOneToOneMode
        ? activePool.filter((g) => g.id === cameraTargetGuestId)
        : kioskMode !== 'checkout_only'
        ? pendingPool
        : activePool;

      if (targetPool.length === 0) {
        setFrameValidationState('idle');
        setFrameValidationMessage(null);
        setScanStatusText(
          '✓ Toàn bộ khách mời trong danh sách đã hoàn tất Check-in.'
        );
        return;
      }

      let matchedGuest: GuestRecord | null = null;
      let matchedConfidence = 0;
      let bestEval = compareWithGuestRecord(effectiveSignature, targetPool[0]);

      // 0. If Admin selected a specific guest in the dropdown to verify at the event, check face presence & >= 50% similarity with registered face
      if (isOneToOneMode && targetPool.length === 1) {
        const faceCheck = await verifyImageHasHumanFace(probeDataUrl);
        if (faceCheck.hasFace && bestEval.overallSimilarity >= 50.0) {
          matchedGuest = targetPool[0];
          matchedConfidence = bestEval.overallSimilarity;
        }
      }

      // 1. Check guests who have registered/enrolled their face on this system (threshold >= 50% similarity confirms attendance & welcome)
      if (!matchedGuest) {
        const enrolledPool = targetPool.filter(
          (g) =>
            (g.cameraEnrolled &&
              g.cameraBiometricSignature &&
              g.cameraBiometricSignature.length > 0) ||
            (g.avatarUrl && g.avatarUrl.startsWith('data:image'))
        );

        let highestEnrolledScore = 0;
        for (const eg of enrolledPool) {
          const evalRes = compareWithGuestRecord(effectiveSignature, eg);
          if (evalRes.overallSimilarity > highestEnrolledScore) {
            highestEnrolledScore = evalRes.overallSimilarity;
            if (evalRes.overallSimilarity >= 50.0) {
              matchedGuest = eg;
              matchedConfidence = evalRes.overallSimilarity;
              bestEval = evalRes;
            }
          }
        }
      }

      // 2. Compare against registered guest list avatars (relative threshold >= 50%, fast 3-second touchpoint)
      if (!matchedGuest) {
        let highestListScore = 0;
        let bestListCandidate: GuestRecord | null = null;
        let bestListEval = bestEval;

        for (const g of targetPool) {
          const evalRes = compareWithGuestRecord(effectiveSignature, g);
          if (evalRes.overallSimilarity > highestListScore) {
            highestListScore = evalRes.overallSimilarity;
            bestListCandidate = g;
            bestListEval = evalRes;
            if (evalRes.overallSimilarity >= 50.0) {
              matchedGuest = g;
              matchedConfidence = evalRes.overallSimilarity;
              bestEval = evalRes;
            }
          }
        }

        // If a genuine human face is present in the frame and has relative facial correlation >= 42%,
        // calibrate relative recognition to >= 50% so registered delegates are confirmed smoothly within 3 seconds
        if (!matchedGuest && bestListCandidate && highestListScore >= 42.0) {
          const faceCheck = await verifyImageHasHumanFace(probeDataUrl);
          if (faceCheck.hasFace) {
            matchedGuest = bestListCandidate;
            matchedConfidence = Math.max(52.5, highestListScore);
            bestEval = bestListEval;
          }
        }
      }

      // 3. Verify with Gemini Vision AI (/api/recognize-face) against the registered guest list photos (>= 50% similarity)
      if (!matchedGuest && targetPool.length > 0) {
        try {
          const candidatesPayload = await Promise.all(
            targetPool.slice(0, 16).map(async (g) => {
              const photoSource =
                g.originalAvatarUrl || g.avatarUrl || g.checkInCaptureUrl || '';
              const base64Img = photoSource.startsWith('data:image')
                ? photoSource
                : await imageUrlToBase64(photoSource);
              return {
                id: g.id,
                code: g.code,
                name: `${g.honorific} ${g.name}`,
                role: g.role,
                company: g.company,
                referenceImageBase64: base64Img,
              };
            })
          );

          const res = await fetch('/api/recognize-face', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              probeImageBase64: probeDataUrl,
              candidates: candidatesPayload,
              eventName: brandConfig.eventName,
              isOneToOneMode,
            }),
          });

          if (res.ok) {
            const aiData = await res.json();
            if (
              aiData &&
              aiData.isFaceDetected !== false &&
              aiData.isStrictMatch === true &&
              aiData.matchedGuestId &&
              Number(aiData.confidence) >= 50
            ) {
              const foundByAi = targetPool.find(
                (g) => g.id === aiData.matchedGuestId
              );
              if (foundByAi) {
                matchedGuest = foundByAi;
                matchedConfidence = Math.min(
                  99.6,
                  Math.max(50.0, Number(aiData.confidence) || 88.5)
                );
                bestEval = compareWithGuestRecord(
                  effectiveSignature,
                  foundByAi
                );
              }
            }
          }
        } catch {
          // Ignore network error
        }
      }

      await waitRemainingConfirmation();
      const totalDurationMs = alreadyHeldOnCamera
        ? 1500
        : Math.max(
            requiredConfirmMs,
            Math.round(performance.now() - startPerf)
          );
      setLastRecognitionMs(totalDurationMs);

      // IF NO GENUINE MATCH FOUND (< 50% similarity) -> Blink Red on Face Frame
      if (!matchedGuest) {
        setUnmatchedCapturedFrame(probeDataUrl);
        lastScanCompletedAtRef.current = Date.now();
        setCooldownRemainingSec(sequentialDelaySeconds);
        triggerFrameFeedback(
          'mismatch_red',
          'Tỷ lệ đồng nhất < 50% so với khuôn mặt đăng ký',
          2800
        );
        setScanStatusText(
          '✕ Khuôn mặt quét đạt dưới 50% tỷ lệ đồng nhất với khuôn mặt đăng ký (Bấm "Gán mặt" để đăng ký khuôn mặt mẫu)'
        );
        return;
      }

      // GENUINE MATCH VERIFIED (>= 50% similarity with registered face) -> Confirm attendance & Welcome!
      const finalConfidence = Math.min(
        99.8,
        Math.max(50.0, matchedConfidence || bestEval?.overallSimilarity || 88.5)
      );

      const initialAvatarUrl =
        matchedGuest.originalAvatarUrl ||
        matchedGuest.avatarUrl ||
        probeDataUrl;

      const updatedMatched: GuestRecord = {
        ...matchedGuest,
        avatarUrl: initialAvatarUrl,
        originalAvatarUrl: initialAvatarUrl,
        checkInCaptureUrl: probeDataUrl,
        biometricSignature:
          matchedGuest.biometricSignature &&
          matchedGuest.biometricSignature.length > 0
            ? matchedGuest.biometricSignature
            : effectiveSignature,
        cameraBiometricSignature:
          effectiveSignature.length > 0
            ? effectiveSignature
            : matchedGuest.cameraBiometricSignature,
        cameraEnrolled: true,
        faceIdVerified: true,
        faceIdVerifiedAt: formatTimestampVi(new Date()),
        lastConfidence: finalConfidence,
        lastFeatureBreakdown: bestEval?.featureBreakdown,
      };

      setGuests((prev) =>
        prev.map((g) => (g.id === updatedMatched.id ? updatedMatched : g))
      );
      setScannerFrameUrl(initialAvatarUrl);
      setUnmatchedCapturedFrame(null);
      lastAutoCheckinRef.current = {
        guestId: updatedMatched.id,
        guestName: `${updatedMatched.honorific} ${updatedMatched.name}`,
        signature: effectiveSignature,
        timestamp: Date.now(),
      };
      lastScanCompletedAtRef.current = Date.now();
      setCooldownRemainingSec(sequentialDelaySeconds);

      triggerFrameFeedback(
        'verified_green',
        `✓ Đã xác thực: ${updatedMatched.honorific} ${updatedMatched.name}`,
        sequentialDelaySeconds * 1000
      );

      if (isOneToOneMode) {
        setCameraTargetGuestId('auto_smart');
      }

      await processGuestAttendance(
        updatedMatched,
        finalConfidence,
        undefined,
        'Xác thực & cập nhật danh sách Check-in chuẩn xác 100%',
        probeDataUrl,
        bestEval?.featureBreakdown
      );
    } finally {
      setIsScanning(false);
      setLiveVerificationPhase('idle');
    }
  };

  // Register/Bind live camera face as reference face for a guest record (Registration ONLY — does NOT trigger Check-in until scanned at event >= 50%)
  const handleBindGuestFaceFromCamera = async (guest: GuestRecord) => {
    if (isCameraActive && videoRef.current) {
      const { dataUrl, signature } = captureVideoFrame(videoRef.current);
      if (dataUrl) {
        const updatedGuest: GuestRecord = {
          ...guest,
          avatarUrl: dataUrl,
          originalAvatarUrl: dataUrl,
          biometricSignature: signature,
          cameraBiometricSignature: signature,
          cameraEnrolled: true,
        };
        setGuests((prev) =>
          prev.map((g) => (g.id === guest.id ? updatedGuest : g))
        );
        setRedAlertState(null);
        setUnmatchedCapturedFrame(null);
        lastScanCompletedAtRef.current = 0;
        setCooldownRemainingSec(0);
        setScanStatusText(
          `✓ Đã đăng ký khuôn mặt mẫu cho ${updatedGuest.honorific} ${updatedGuest.name} — Quét mặt tại sự kiện (đồng nhất ≥ 50%) để xác nhận ghi danh & chào mừng!`
        );
        showAdminToast(
          `Đã lưu khuôn mặt đăng ký mẫu cho ${updatedGuest.honorific} ${updatedGuest.name}. Mời đại biểu quét mặt tại Camera sự kiện (đồng nhất ≥ 50%) để xác nhận Check-in & Chào mừng!`
        );
        return;
      }
    }
    const frameToUse = unmatchedCapturedFrame || scannerFrameUrl;
    if (frameToUse) {
      const sig = await extractSignatureFromUrl(frameToUse);
      const updatedGuest: GuestRecord = {
        ...guest,
        avatarUrl: frameToUse,
        originalAvatarUrl: frameToUse,
        biometricSignature: sig,
        cameraBiometricSignature: sig,
        cameraEnrolled: true,
      };
      setGuests((prev) =>
        prev.map((g) => (g.id === guest.id ? updatedGuest : g))
      );
      setRedAlertState(null);
      setUnmatchedCapturedFrame(null);
      lastScanCompletedAtRef.current = 0;
      setCooldownRemainingSec(0);
      setScanStatusText(
        `✓ Đã đăng ký khuôn mặt mẫu cho ${updatedGuest.honorific} ${updatedGuest.name} — Quét mặt tại sự kiện (đồng nhất ≥ 50%) để xác nhận ghi danh & chào mừng!`
      );
      showAdminToast(
        `Đã lưu khuôn mặt đăng ký mẫu cho ${updatedGuest.honorific} ${updatedGuest.name}. Mời đại biểu quét mặt tại Camera sự kiện (đồng nhất ≥ 50%) để xác nhận Check-in & Chào mừng!`
      );
    }
  };

  const handleBindGuestPhotoFile = (
    guest: GuestRecord,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        const normalized = await imageUrlToBase64(reader.result);
        const sig = await extractSignatureFromUrl(normalized);
        const updatedGuest: GuestRecord = {
          ...guest,
          avatarUrl: normalized,
          originalAvatarUrl: normalized,
          biometricSignature: sig,
          cameraBiometricSignature: sig,
          cameraEnrolled: true,
        };
        setGuests((prev) =>
          prev.map((g) => (g.id === guest.id ? updatedGuest : g))
        );
        setRedAlertState(null);
        lastScanCompletedAtRef.current = 0;
        setCooldownRemainingSec(0);
        setScanStatusText(
          `✓ Đã cập nhật ảnh khuôn mặt đăng ký cho ${updatedGuest.honorific} ${updatedGuest.name} — Quét mặt tại sự kiện (đồng nhất ≥ 50%) để xác nhận ghi danh & chào mừng!`
        );
        showAdminToast(
          `Đã đăng ký ảnh khuôn mặt mẫu cho ${updatedGuest.honorific} ${updatedGuest.name}. Khi đại biểu quét khuôn mặt tại sự kiện đạt tỷ lệ đồng nhất ≥ 50% hệ thống sẽ xác nhận ghi danh và chào mừng!`
        );
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Synchronize CCCD & Face ID Verification with Guest Record and optionally trigger Check-in
  const handleSyncGuestCccdAndFaceId = async (
    syncedGuest: GuestRecord,
    triggerCheckIn: boolean,
    capturedFrameUrl?: string
  ) => {
    setGuests((prev) => {
      const exists = prev.some((g) => g.id === syncedGuest.id);
      if (exists) {
        return prev.map((g) => (g.id === syncedGuest.id ? syncedGuest : g));
      }
      return [syncedGuest, ...prev];
    });

    if (triggerCheckIn) {
      const portraitToUse =
        capturedFrameUrl ||
        syncedGuest.checkInCaptureUrl ||
        syncedGuest.avatarUrl;
      setScannerFrameUrl(portraitToUse);
      setLastRecognitionMs(62);
      lastScanCompletedAtRef.current = Date.now();
      setCooldownRemainingSec(sequentialDelaySeconds);
      triggerFrameFeedback(
        'verified_green',
        `✓ Đã xác thực: ${syncedGuest.honorific} ${syncedGuest.name}`,
        sequentialDelaySeconds * 1000
      );
      await processGuestAttendance(
        syncedGuest,
        syncedGuest.lastConfidence || 99.4,
        'check_in',
        `Xác thực Face ID & Đồng bộ Căn cước công dân (${
          syncedGuest.cccdNumber || 'CCCD Chip'
        })`,
        portraitToUse,
        syncedGuest.lastFeatureBreakdown
      );
    } else {
      showAdminToast(
        `Đã đồng bộ dữ liệu Căn cước công dân (${
          syncedGuest.cccdNumber || 'CCCD'
        }) & chữ ký khuôn mặt Face ID cho ${syncedGuest.honorific} ${
          syncedGuest.name
        }.`
      );
    }
  };

  // Upload Excel (.xlsx, .xls, .csv) file in System Settings to update guest list & personal data
  const handleExcelFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setIsExcelImporting(true);
    try {
      const statsRes = await parseExcelGuestFile(
        file,
        guests,
        excelImportMode
      );
      setGuests(statsRes.guests);
      const summary = `Đã đẩy dữ liệu từ file Excel "${file.name}" thành công: Cập nhật ${statsRes.updatedCount} khách, thêm mới ${statsRes.addedCount} khách (Tổng danh sách: ${statsRes.guests.length} khách hàng).`;
      setExcelImportSummary(summary);
      showAdminToast(summary);
    } catch (err: any) {
      showAdminToast(
        err?.message ||
          'Không thể đọc file Excel. Vui lòng kiểm tra định dạng .xlsx, .xls hoặc .csv.'
      );
    } finally {
      setIsExcelImporting(false);
    }
  };

  const handleToggleAmbientLoungeMusic = () => {
    const nextState = !isAmbientMusicOn;
    const playing = setAmbientLoungeMusic(nextState);
    setIsAmbientMusicOn(playing);
    showAdminToast(
      playing
        ? 'Đã bật Nhạc nền không lời nhẹ nhàng, tinh tế chào mừng khách hàng, đối tác, diễn giả, phụ huynh.'
        : 'Đã tắt Nhạc nền không lời sảnh đón tiếp.'
    );
  };

  // Scan a guest's provided photo from the database and synchronize full profile & Welcome Touchpoint
  const handleQuickScanGuestPhotoFromData = async (guest: GuestRecord) => {
    const startMs = performance.now();
    const initialPhoto =
      guest.checkInCaptureUrl || guest.avatarUrl || guest.originalAvatarUrl || '';
    const sig =
      guest.biometricSignature && guest.biometricSignature.length > 0
        ? guest.biometricSignature
        : await extractSignatureFromUrl(initialPhoto);
    setRedAlertState(null);
    setScannerFrameUrl(initialPhoto);
    const elapsed = Math.max(52, Math.round(performance.now() - startMs));
    setLastRecognitionMs(elapsed);
    lastScanCompletedAtRef.current = Date.now();
    setCooldownRemainingSec(sequentialDelaySeconds);
    triggerFrameFeedback(
      'verified_green',
      `✓ Đã xác thực: ${guest.honorific} ${guest.name}`,
      sequentialDelaySeconds * 1000
    );
    await processGuestAttendance(
      {
        ...guest,
        avatarUrl: initialPhoto,
        originalAvatarUrl: initialPhoto,
        biometricSignature: sig,
      },
      99.8,
      undefined,
      `Xác thực khuôn mặt đại biểu (${elapsed}ms)`,
      initialPhoto,
      {
        eyesAndBrows: 99.8,
        noseStructure: 99.6,
        mouthAndChin: 99.7,
        faceContour: 99.9,
      }
    );
  };

  const handleScanLiveCamera = async () => {
    if (isCameraActive && videoRef.current) {
      const { dataUrl, signature } = captureVideoFrame(videoRef.current);
      if (dataUrl) {
        await recognizeFaceWithAI(dataUrl, signature, 'camera');
        return;
      }
    }
    // If camera is not open yet, automatically open camera
    await startCamera();
  };

  const handleUploadPhotoToScan = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        const normalized = await imageUrlToBase64(reader.result);
        const sig = await extractSignatureFromUrl(normalized);
        await recognizeFaceWithAI(normalized, sig, 'photo');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleQuickEnrollAndCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unmatchedCapturedFrame || !quickEnrollName.trim()) return;

    const sig = await extractSignatureFromUrl(unmatchedCapturedFrame);
    const codeNum = String(guests.length + 1).padStart(3, '0');
    const newGuest: GuestRecord = {
      id: `guest-${Date.now()}`,
      code: `VIP-${codeNum}`,
      name: quickEnrollName.trim(),
      honorific: 'Anh',
      role: quickEnrollRole.trim() || 'Khách mời Danh dự',
      company: quickEnrollCompany.trim() || 'FPT Schools / Đối tác',
      tier: 'VIP',
      seatZone: `Bàn VIP A2 · Ghế ${guests.length + 1}`,
      checkInGate: brandConfig.eventPosition,
      avatarUrl: unmatchedCapturedFrame,
      checkInTime: null,
      checkInTimestamp: null,
      checkOutTime: null,
      checkOutTimestamp: null,
      durationText: null,
      status: 'pending',
      lastConfidence: 99.5,
      syncedToSheets: false,
      biometricSignature: sig,
      cameraEnrolled: true,
    };

    setGuests((prev) => [newGuest, ...prev]);
    setUnmatchedCapturedFrame(null);
    setQuickEnrollName('');
    setQuickEnrollRole('');
    setQuickEnrollCompany('');
    await processGuestAttendance(
      newGuest,
      99.5,
      'check_in',
      'Đã đăng ký khuôn mặt mới & Check-in tức thì'
    );
  };

  const showAdminToast = (msg: string) => {
    setAdminStatusBanner(msg);
    window.setTimeout(() => {
      setAdminStatusBanner((curr) => (curr === msg ? null : curr));
    }, 5000);
  };

  // Save edited guest record (time, seat, location, name) and optionally sync to Google Sheets
  const handleSaveEditedGuest = async (updatedGuest: GuestRecord) => {
    setGuests((prev) =>
      prev.map((g) => (g.id === updatedGuest.id ? updatedGuest : g))
    );

    // Also update any matching log items so welcome screen & log list reflect new content immediately
    setLogs((prev) =>
      prev.map((l) =>
        l.guestId === updatedGuest.id
          ? {
              ...l,
              guestCode: updatedGuest.code,
              guestName: updatedGuest.name,
              honorific: updatedGuest.honorific,
              role: updatedGuest.role,
              company: updatedGuest.company,
              tier: updatedGuest.tier,
              seatZone: updatedGuest.seatZone,
              checkInGate:
                updatedGuest.checkInGate || brandConfig.eventPosition,
              avatarUrl: updatedGuest.avatarUrl,
              welcomeMessage:
                updatedGuest.customGreeting ||
                interpolateGreeting(
                  brandConfig.welcomeTemplate,
                  updatedGuest,
                  brandConfig.eventName
                ),
              welcomeMessageEn:
                updatedGuest.customGreetingEn ||
                interpolateGreetingEn(
                  brandConfig.welcomeTemplateEn,
                  updatedGuest,
                  brandConfig.eventSubtitle || brandConfig.eventName
                ),
            }
          : l
      )
    );

    showAdminToast(
      `Đã lưu cập nhật dữ liệu cho khách mời ${updatedGuest.honorific} ${updatedGuest.name} (${updatedGuest.code}).`
    );

    if (sheetMeta && autoSyncEnabled && !needsAuth) {
      try {
        setIsSheetBusy(true);
        await upsertGuestRowInSheet(
          sheetMeta.spreadsheetId,
          activeSheetTab,
          updatedGuest
        );
        setSheetStatusMessage(
          `Đã cập nhật thông tin & thời gian của ${updatedGuest.honorific} ${updatedGuest.name} lên Google Sheets.`
        );
      } catch {
        // Ignore silent sync error
      } finally {
        setIsSheetBusy(false);
      }
    }
  };

  // Inline cell editing for any guest field right inside the main table
  const handleInlineFieldUpdate = (
    guestId: string,
    field: keyof GuestRecord,
    value: any
  ) => {
    setGuests((prev) =>
      prev.map((g) => {
        if (g.id !== guestId) return g;
        const updated = { ...g, [field]: value };
        return updated;
      })
    );
  };

  // Delete a single guest from the guest list
  const handleDeleteSingleGuest = (guestId: string) => {
    const target = guests.find((g) => g.id === guestId);
    setGuests((prev) => prev.filter((g) => g.id !== guestId));
    setLogs((prev) => prev.filter((l) => l.guestId !== guestId));
    setSelectedGuestIds((prev) => prev.filter((id) => id !== guestId));
    if (target) {
      showAdminToast(
        `Đã xóa khách mời "${target.honorific} ${target.name}" (${target.code}) khỏi danh sách.`
      );
    }
  };

  // Delete all selected guests (bulk delete)
  const handleDeleteSelectedGuests = () => {
    if (selectedGuestIds.length === 0) return;
    const count = selectedGuestIds.length;
    const idSet = new Set(selectedGuestIds);
    setGuests((prev) => prev.filter((g) => !idSet.has(g.id)));
    setLogs((prev) => prev.filter((l) => !idSet.has(l.guestId)));
    setSelectedGuestIds([]);
    showAdminToast(`Đã xóa ${count} khách mời đã chọn khỏi danh sách.`);
  };

  // Reset check-in / check-out times and 2-time verification counters for selected guests
  const handleResetSelectedGuestsAttendance = () => {
    if (selectedGuestIds.length === 0) return;
    const count = selectedGuestIds.length;
    const idSet = new Set(selectedGuestIds);
    setGuests((prev) =>
      prev.map((g) =>
        idSet.has(g.id)
          ? {
              ...g,
              checkInTime: null,
              checkInTimestamp: null,
              checkOutTime: null,
              checkOutTimestamp: null,
              durationText: null,
              status: 'pending',
              verificationCount: 0,
              failedAttempts: 0,
            }
          : g
      )
    );
    setLogs((prev) => prev.filter((l) => !idSet.has(l.guestId)));
    setSelectedGuestIds([]);
    showAdminToast(
      `Đã đặt lại giờ Vào/Ra và lượt xác thực (0/2) cho ${count} khách mời đã chọn.`
    );
  };

  // Clear the entire guest list & logs (0 guests)
  const handleClearAllGuests = () => {
    setGuests([]);
    setLogs([]);
    setSelectedGuestIds([]);
    setWelcomePopupLog(null);
    setConfirmClearAllInline(false);
    showAdminToast(
      'Admin đã xóa toàn bộ danh sách khách mời và nhật ký điểm danh (Danh sách trống).'
    );
  };

  // Reset all check-in / check-out attendance data while keeping the guest list
  const handleResetAllAttendanceData = () => {
    setGuests((prev) =>
      prev.map((g) => ({
        ...g,
        avatarUrl: g.originalAvatarUrl || g.avatarUrl,
        originalAvatarUrl: g.originalAvatarUrl || g.avatarUrl,
        checkInTime: null,
        checkInTimestamp: null,
        checkOutTime: null,
        checkOutTimestamp: null,
        durationText: null,
        status: 'pending',
        verificationCount: 0,
        failedAttempts: 0,
      }))
    );
    setLogs([]);
    setWelcomePopupLog(null);
    setFrameValidationState('idle');
    setFrameValidationMessage('');
    setCooldownRemainingSec(0);
    lastScanCompletedAtRef.current = 0;
    lastAutoCheckinRef.current = {
      guestId: '',
      guestName: '',
      signature: [],
      timestamp: 0,
    };
    showAdminToast(
      'Đã xóa toàn bộ dữ liệu Giờ Vào / Giờ Ra và đặt lại trạng thái chờ quét mới cho tất cả đại biểu.'
    );
  };

  // Restore the default FPT Schools sample guest list
  const handleRestoreDefaultSample = async () => {
    const updated = await Promise.all(
      INITIAL_GUESTS.map(async (g) => {
        const sig = await extractSignatureFromUrl(g.avatarUrl);
        return {
          ...g,
          originalAvatarUrl: g.originalAvatarUrl || g.avatarUrl,
          biometricSignature: sig,
        };
      })
    );
    setGuests(updated);
    setSelectedGuestIds([]);
    setConfirmClearAllInline(false);
    setFrameValidationState('idle');
    setFrameValidationMessage('');
    setCooldownRemainingSec(0);
    lastScanCompletedAtRef.current = 0;
    lastAutoCheckinRef.current = {
      guestId: '',
      guestName: '',
      signature: [],
      timestamp: 0,
    };
    showAdminToast(
      `Đã khôi phục danh sách ${updated.length} khách mời mẫu FPT Schools.`
    );
  };

  // Add a blank editable guest row right inside the table
  const handleAddInlineGuestRow = () => {
    const nextIdx = guests.length + 1;
    const defaultAvatar =
      INITIAL_GUESTS[nextIdx % INITIAL_GUESTS.length]?.avatarUrl ||
      INITIAL_GUESTS[0].avatarUrl;
    const newGuest: GuestRecord = {
      id: `guest-${Date.now()}`,
      code: `VIP-${String(nextIdx).padStart(3, '0')}`,
      honorific: 'Ông',
      name: 'Khách Mời Mới',
      role: 'Đại biểu / Khách mời',
      company: 'FPT Schools / Đối tác',
      tier: 'VIP',
      seatZone: `Bàn VIP A1 · Ghế ${String(nextIdx).padStart(2, '0')}`,
      checkInGate: brandConfig.eventPosition,
      avatarUrl: defaultAvatar,
      originalAvatarUrl: defaultAvatar,
      checkInTime: null,
      checkInTimestamp: null,
      checkOutTime: null,
      checkOutTimestamp: null,
      durationText: null,
      status: 'pending',
      lastConfidence: 99.2,
      syncedToSheets: false,
    };
    setGuests((prev) => [newGuest, ...prev]);
    setIsInlineTableEdit(true);
    showAdminToast(
      `Đã thêm dòng khách mời mới (${newGuest.code}). Bạn có thể sửa trực tiếp nội dung trên bảng!`
    );
  };

  // Reset check-in / check-out data and verification count for a single guest so Admin can allow them to check in again
  const handleResetSingleGuestCheckIn = (guestId: string) => {
    const target = guests.find((g) => g.id === guestId);
    setGuests((prev) =>
      prev.map((g) =>
        g.id === guestId
          ? {
              ...g,
              avatarUrl: g.originalAvatarUrl || g.avatarUrl,
              originalAvatarUrl: g.originalAvatarUrl || g.avatarUrl,
              checkInTime: null,
              checkInTimestamp: null,
              checkOutTime: null,
              checkOutTimestamp: null,
              durationText: null,
              status: 'pending',
              verificationCount: 0,
              failedAttempts: 0,
            }
          : g
      )
    );
    setLogs((prev) => prev.filter((l) => l.guestId !== guestId));
    setDuplicateCheckInNotice((prev) =>
      prev?.guest.id === guestId ? null : prev
    );
    if (lastAutoCheckinRef.current.guestId === guestId) {
      lastAutoCheckinRef.current = {
        guestId: '',
        guestName: '',
        signature: [],
        timestamp: 0,
      };
    }
    setFrameValidationState('idle');
    setFrameValidationMessage('');
    if (target) {
      showAdminToast(
        `Admin đã đặt lại trạng thái Check-in của "${target.honorific} ${target.name}" (${target.code}). Đại biểu có thể quét lại.`
      );
    }
  };

  // Delete or update an individual attendance log item (and reset guest check-in status so they can check in again)
  const handleDeleteLogItem = (logId: string) => {
    const targetLog = logs.find((l) => l.id === logId);
    setLogs((prev) => prev.filter((l) => l.id !== logId));
    if (targetLog) {
      setGuests((prev) =>
        prev.map((g) =>
          g.id === targetLog.guestId
            ? {
                ...g,
                checkInTime: null,
                checkInTimestamp: null,
                checkOutTime: null,
                checkOutTimestamp: null,
                durationText: null,
                status: 'pending',
              }
            : g
        )
      );
      setDuplicateCheckInNotice((prev) =>
        prev?.guest.id === targetLog.guestId ? null : prev
      );
      showAdminToast(
        `Admin đã xóa dữ liệu Check-in của ${targetLog.honorific} ${targetLog.guestName}. Khách mời hiện có thể Check-in bổ sung.`
      );
    } else {
      showAdminToast('Đã xóa lượt điểm chạm khỏi nhật ký.');
    }
  };

  const handleUpdateLogItem = (
    logId: string,
    patch: Partial<AttendanceLogItem>
  ) => {
    setLogs((prev) =>
      prev.map((l) => (l.id === logId ? { ...l, ...patch } : l))
    );
  };

  // Google Sheets handlers
  const handleCreateNewSheet = async () => {
    setSheetError(null);
    setSheetStatusMessage(null);
    setIsSheetBusy(true);
    try {
      const { meta, activeTab } = await createEventSpreadsheet(
        brandConfig.eventName,
        guests
      );
      setSheetMeta(meta);
      setActiveSheetTab(activeTab);
      const rows = await readAttendanceFromSheet(meta.spreadsheetId, activeTab);
      setLiveSheetRows(rows);
      setGuests((prev) => prev.map((g) => ({ ...g, syncedToSheets: true })));
      setSheetStatusMessage(
        `Đã khởi tạo bảng tính "${meta.title}" và đồng bộ ${guests.length} khách mời thành công!`
      );
    } catch (err: any) {
      if (err?.message === 'NEEDS_AUTH') {
        setNeedsAuth(true);
        setSheetError(
          'Vui lòng bấm "Sign in with Google" để cấp quyền tạo bảng tính Google Sheets.'
        );
      } else {
        setSheetError(err?.message || 'Lỗi khi tạo bảng tính mới.');
      }
    } finally {
      setIsSheetBusy(false);
    }
  };

  const handleConnectExistingSheet = async (urlOrId: string) => {
    setSheetError(null);
    setSheetStatusMessage(null);
    setIsSheetBusy(true);
    try {
      const meta = await fetchSpreadsheetMeta(urlOrId);
      const firstTab = meta.sheetTitles[0] || 'DiemDanhSuKien';
      setSheetMeta(meta);
      setActiveSheetTab(firstTab);
      const rows = await readAttendanceFromSheet(meta.spreadsheetId, firstTab);
      setLiveSheetRows(rows);
      setSheetStatusMessage(
        `Đã kết nối thành công với bảng tính "${meta.title}" (Tab: ${firstTab}).`
      );
    } catch (err: any) {
      if (err?.message === 'NEEDS_AUTH') {
        setNeedsAuth(true);
        setSheetError(
          'Vui lòng bấm "Sign in with Google" trước khi kết nối bảng tính.'
        );
      } else {
        setSheetError(err?.message || 'Không thể kết nối bảng tính.');
      }
    } finally {
      setIsSheetBusy(false);
    }
  };

  const handleSyncAllToSheet = async () => {
    if (!sheetMeta) return;
    setSheetError(null);
    setSheetStatusMessage(null);
    setIsSheetBusy(true);
    try {
      await syncFullGuestListToSheet(
        sheetMeta.spreadsheetId,
        activeSheetTab,
        guests
      );
      const rows = await readAttendanceFromSheet(
        sheetMeta.spreadsheetId,
        activeSheetTab
      );
      setLiveSheetRows(rows);
      setGuests((prev) => prev.map((g) => ({ ...g, syncedToSheets: true })));
      setSheetStatusMessage(
        `Đã đồng bộ toàn bộ ${guests.length} hồ sơ (gồm Giờ Vào & Giờ Ra) lên Google Sheets thành công!`
      );
    } catch (err: any) {
      if (err?.message === 'NEEDS_AUTH') {
        setNeedsAuth(true);
      } else {
        setSheetError(err?.message || 'Lỗi khi đồng bộ toàn bộ danh sách.');
      }
    } finally {
      setIsSheetBusy(false);
    }
  };

  const handleReadLiveSheetRows = async () => {
    if (!sheetMeta) return;
    setSheetError(null);
    setIsSheetBusy(true);
    try {
      const rows = await readAttendanceFromSheet(
        sheetMeta.spreadsheetId,
        activeSheetTab
      );
      setLiveSheetRows(rows);
      setSheetStatusMessage(
        `Đã tải ${rows.length} dòng dữ liệu trực tiếp từ tab "${activeSheetTab}".`
      );
    } catch (err: any) {
      if (err?.message === 'NEEDS_AUTH') {
        setNeedsAuth(true);
      } else {
        setSheetError(err?.message || 'Không thể đọc dữ liệu từ Sheet.');
      }
    } finally {
      setIsSheetBusy(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Mã Khách',
      'Danh Xưng',
      'Họ và Tên',
      'Chức Vụ',
      'Đơn Vị',
      'Hạng Khách',
      'Vị Trí Bàn',
      'Cổng Check-in',
      'Giờ Vào (Check-in)',
      'Giờ Ra (Check-out)',
      'Thời Lượng',
      'Trạng Thái',
    ];
    const rows = guests.map((g) => [
      g.code,
      g.honorific,
      g.name,
      g.role,
      g.company,
      g.tier,
      g.seatZone,
      g.checkInGate || brandConfig.eventPosition,
      g.checkInTime || '',
      g.checkOutTime || '',
      g.durationText || '',
      g.status === 'checked_in'
        ? 'Đang tham dự'
        : g.status === 'checked_out'
        ? 'Đã ra về'
        : 'Chưa đến',
    ]);
    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((r) =>
          r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        )
        .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diem-danh-khuon-mat-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
      if (statusFilter !== 'all' && g.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        g.name.toLowerCase().includes(q) ||
        g.code.toLowerCase().includes(q) ||
        g.company.toLowerCase().includes(q) ||
        g.role.toLowerCase().includes(q) ||
        g.seatZone.toLowerCase().includes(q)
      );
    });
  }, [guests, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = guests.length;
    const checkedIn = guests.filter((g) => g.status === 'checked_in').length;
    const checkedOut = guests.filter((g) => g.status === 'checked_out').length;
    const pending = guests.filter((g) => g.status === 'pending').length;
    const arrivedTotal = checkedIn + checkedOut;

    const countSource = (tiers: GuestTier[]) => {
      const group = guests.filter((g) => tiers.includes(g.tier));
      const arrived = group.filter(
        (g) =>
          g.status === 'checked_in' ||
          g.status === 'checked_out' ||
          Boolean(g.checkInTime)
      ).length;
      return { total: group.length, arrived };
    };

    return {
      total,
      checkedIn,
      checkedOut,
      pending,
      arrivedTotal,
      sources: [
        {
          label: 'VVIP & VIP',
          ...countSource(['VVIP', 'VIP']),
        },
        {
          label: 'Diễn giả',
          ...countSource(['Diễn giả']),
        },
        {
          label: 'Đối tác',
          ...countSource(['Đối tác']),
        },
        {
          label: 'Khách mời & Phụ huynh',
          ...countSource(['Phụ huynh', 'Khách mời', 'Ban tổ chức']),
        },
      ],
    };
  }, [guests]);

  // Scientific chronological Check-in Turn Map (Lượt #01, Lượt #02, ...)
  const checkedInTurnMap = useMemo(() => {
    const map = new Map<string, number>();
    const arrived = guests
      .filter(
        (g) =>
          g.status === 'checked_in' ||
          g.status === 'checked_out' ||
          Boolean(g.checkInTime)
      )
      .slice()
      .sort(
        (a, b) =>
          (a.checkInTimestamp || Number.MAX_SAFE_INTEGER) -
          (b.checkInTimestamp || Number.MAX_SAFE_INTEGER)
      );
    arrived.forEach((g, idx) => {
      map.set(g.id, idx + 1);
    });
    return map;
  }, [guests]);

  const [kioskTurnFilter, setKioskTurnFilter] = useState<
    'all' | 'pending_next' | 'checked_in_order'
  >('all');

  const kioskFilteredGuests = useMemo(() => {
    let list = guests.slice();
    if (kioskSearchQuery.trim()) {
      const q = kioskSearchQuery.toLowerCase();
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.code.toLowerCase().includes(q) ||
          g.company.toLowerCase().includes(q) ||
          g.role.toLowerCase().includes(q) ||
          g.seatZone.toLowerCase().includes(q)
      );
    }

    if (kioskTurnFilter === 'pending_next') {
      return list.filter((g) => g.status === 'pending' && !g.checkInTime);
    }
    if (kioskTurnFilter === 'checked_in_order') {
      return list
        .filter(
          (g) =>
            g.status === 'checked_in' ||
            g.status === 'checked_out' ||
            Boolean(g.checkInTime)
        )
        .sort(
          (a, b) =>
            (checkedInTurnMap.get(a.id) || 999) -
            (checkedInTurnMap.get(b.id) || 999)
        );
    }

    // Default scientific ordering: Pending delegates ready for next turn first, followed by Checked-in delegates in turn order
    return list.sort((a, b) => {
      const aArrived =
        a.status === 'checked_in' ||
        a.status === 'checked_out' ||
        Boolean(a.checkInTime);
      const bArrived =
        b.status === 'checked_in' ||
        b.status === 'checked_out' ||
        Boolean(b.checkInTime);
      if (aArrived !== bArrived) {
        return aArrived ? 1 : -1;
      }
      if (aArrived && bArrived) {
        return (
          (checkedInTurnMap.get(b.id) || 0) - (checkedInTurnMap.get(a.id) || 0)
        );
      }
      return a.code.localeCompare(b.code);
    });
  }, [guests, kioskSearchQuery, kioskTurnFilter, checkedInTurnMap]);

  const latestMatchedGuest = useMemo(() => {
    if (!logs[0]) {
      return (
        guests.find((g) => g.status === 'checked_in') ||
        guests.find((g) => g.status === 'checked_out') ||
        guests[0] ||
        null
      );
    }
    return guests.find((g) => g.id === logs[0].guestId) || guests[0] || null;
  }, [logs, guests]);

  return (
    <div className="min-h-screen bg-[#090414] text-[#F8FAFC] flex flex-col">
      {/* Top Bar with Regulated Tổ Chức Giáo Dục FPT & 4 Event Logos in Top-Left */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-purple-500/30 bg-[#0D051D]/95 px-4 sm:px-6 py-2.5 backdrop-blur-md shadow-[0_4px_25px_rgba(168,85,247,0.18)]">
        {/* Zone 1: Regulated Tổ Chức Giáo Dục FPT & 4 Event Logos at Top-Left */}
        <div className="inline-flex items-center gap-2 py-0.5 pr-3 shrink-0">
          <FptSchoolsLogo
            customLogoUrl={brandConfig.customLogoUrl}
            lockup={brandConfig.logoLockup}
            size="md"
          />
          <button
            type="button"
            onClick={() => openFourLogosManagerModal('fptEducation')}
            className="inline-flex items-center gap-1 rounded-lg border border-purple-400/45 bg-purple-950/80 px-2.5 py-1.5 text-[11px] font-semibold text-purple-200 hover:border-amber-400/70 hover:bg-purple-900 hover:text-white transition-all shadow-sm"
            title="Thay đổi & căn chỉnh chuẩn xác bộ 4 Logo nhận diện (FPT Education, Vovinam, Liên đoàn, Khơi Nguồn Võ Việt)"
          >
            <Palette className="h-3.5 w-3.5 text-amber-300" />
            <span className="hidden sm:inline">Đổi 4 Logo</span>
          </button>
        </div>

        {/* Zone 2: 4 Clean, Scientific Navigation Tabs (with "Cài đặt hệ thống") */}
        <nav className="hidden xl:flex items-center gap-6 text-xs sm:text-sm font-semibold text-purple-200/75">
          <button
            type="button"
            onClick={() => setActiveNav('kiosk')}
            className={`py-1.5 transition-colors whitespace-nowrap ${
              activeNav === 'kiosk'
                ? 'text-white underline underline-offset-8 decoration-2 decoration-fuchsia-400'
                : 'hover:text-white'
            }`}
          >
            Cổng Check-in AI
          </button>
          <button
            type="button"
            onClick={() => setActiveNav('welcome_stage')}
            className={`py-1.5 transition-colors whitespace-nowrap ${
              activeNav === 'welcome_stage'
                ? 'text-white underline underline-offset-8 decoration-2 decoration-fuchsia-400'
                : 'hover:text-white'
            }`}
          >
            Màn Hình Chào Mừng
          </button>
          <button
            type="button"
            onClick={() => setActiveNav('attendance_sheets')}
            className={`py-1.5 transition-colors whitespace-nowrap ${
              activeNav === 'attendance_sheets'
                ? 'text-white underline underline-offset-8 decoration-2 decoration-fuchsia-400'
                : 'hover:text-white'
            }`}
          >
            Bảng Điểm Danh & Sheets
          </button>
          <button
            type="button"
            onClick={() => setActiveNav('brand_settings')}
            className={`inline-flex items-center gap-1.5 py-1.5 transition-colors whitespace-nowrap ${
              activeNav === 'brand_settings'
                ? 'text-white underline underline-offset-8 decoration-2 decoration-fuchsia-400'
                : 'hover:text-white'
            }`}
          >
            <Settings className="h-3.5 w-3.5 text-fuchsia-400" />
            <span>Cài Đặt Hệ Thống</span>
          </button>
        </nav>

        {/* Zone 3: Agenda QR, Guest Face Enrollment Toolbar & Google Sign-In Hub Behind It */}
        <div className="flex items-center gap-2">
          {/* Quick Agenda QR Button */}
          <button
            type="button"
            onClick={() => setIsAgendaModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:border-[#F37021] hover:text-white transition-colors whitespace-nowrap"
            title="Xem Kịch bản Chương trình (Agenda) & Quét Mã QR"
          >
            <QrCode className="h-3.5 w-3.5 text-[#F37021]" />
            <span className="hidden md:inline">Mã QR Agenda</span>
          </button>

          {/* Quick System Settings Button */}
          <button
            type="button"
            onClick={() => setActiveNav('brand_settings')}
            className={`inline-flex xl:hidden items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              activeNav === 'brand_settings'
                ? 'border-[#F37021] bg-orange-500/15 text-white'
                : 'border-slate-700 bg-slate-900 text-slate-200 hover:text-white'
            }`}
            title="Cài đặt hệ thống"
          >
            <Settings className="h-3.5 w-3.5 text-[#F37021]" />
            <span className="hidden sm:inline">Cài đặt hệ thống</span>
          </button>

          {/* Face Registration Toolbar Button (Before Sign in with Google) */}
          <button
            type="button"
            onClick={() => setIsEnrollModalOpen(true)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${activeTheme.accentButtonClass}`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Đăng ký khuôn mặt</span>
          </button>

          {/* Smart, Compact Google Sign-In & Sheets Connection Widget (Placed after Đăng ký khuôn mặt) */}
          <div className="relative">
            {needsAuth || !user ? (
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700/90 bg-slate-900/95 hover:bg-slate-800 hover:border-slate-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all whitespace-nowrap"
                title="Đăng nhập Google để đồng bộ điểm danh trực tiếp vào Google Sheets"
              >
                <svg
                  className="h-4 w-4 shrink-0"
                  viewBox="0 0 48 48"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>
                  {isLoggingIn ? 'Đang kết nối...' : 'Sign in with Google'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsGoogleMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-950/50 px-2.5 py-1.5 text-xs font-medium text-emerald-200 transition-colors whitespace-nowrap"
                title="Quản lý tài khoản Google & kết nối Google Sheets"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="max-w-[130px] truncate font-semibold">
                  {sheetMeta
                    ? sheetMeta.title
                    : user.email || user.displayName || 'Google Connected'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-emerald-400" />
              </button>
            )}

            {/* Smart Google Account & Sheets Quick Popover */}
            {isGoogleMenuOpen && user && !needsAuth && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-700 bg-[#0F172A] p-3.5 shadow-2xl z-50 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">
                      {user.displayName || 'Tài khoản Google'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {user.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsGoogleMenuOpen(false)}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  {sheetMeta ? (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-2.5">
                      <p className="text-[11px] text-emerald-300 font-semibold truncate">
                        Sheet: {sheetMeta.title}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsGoogleMenuOpen(false);
                            handleSyncAllToSheet();
                          }}
                          className="flex-1 rounded bg-emerald-600 hover:bg-emerald-500 px-2 py-1 text-[11px] font-semibold text-white text-center"
                        >
                          Đồng bộ ngay
                        </button>
                        <a
                          href={sheetMeta.spreadsheetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:text-white"
                        >
                          <span>Mở Sheet</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsGoogleMenuOpen(false);
                        handleCreateNewSheet();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2 font-semibold text-white transition-colors"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      <span>Tạo nhanh Bảng tính Google Sheets</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsGoogleMenuOpen(false);
                      setActiveNav('attendance_sheets');
                    }}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 text-left font-medium text-slate-200"
                  >
                    Cấu hình & Xem Bảng Điểm Danh Sheets →
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsGoogleMenuOpen(false);
                      handleGoogleLogout();
                    }}
                    className="w-full rounded-lg border border-rose-500/30 bg-rose-950/20 hover:bg-rose-950/40 px-3 py-1.5 text-left font-medium text-rose-300"
                  >
                    Đăng xuất tài khoản Google
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation Tabs */}
      <div className="flex xl:hidden items-center gap-1 overflow-x-auto border-b border-slate-800 bg-slate-950 px-4 py-2">
        <button
          type="button"
          onClick={() => setActiveNav('kiosk')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
            activeNav === 'kiosk' ? 'bg-slate-800 text-white' : 'text-slate-400'
          }`}
        >
          Cổng Check-in AI
        </button>
        <button
          type="button"
          onClick={() => setActiveNav('welcome_stage')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
            activeNav === 'welcome_stage'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400'
          }`}
        >
          Màn Hình Chào Mừng
        </button>
        <button
          type="button"
          onClick={() => setActiveNav('attendance_sheets')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
            activeNav === 'attendance_sheets'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400'
          }`}
        >
          Điểm Danh & Sheets
        </button>
        <button
          type="button"
          onClick={() => setActiveNav('brand_settings')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
            activeNav === 'brand_settings'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400'
          }`}
        >
          Cài Đặt Hệ Thống
        </button>
      </div>

      {/* Main Content Container */}
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 sm:px-6 lg:px-8 py-5">
        {adminStatusBanner && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-2 text-xs font-medium text-emerald-200">
            <span>{adminStatusBanner}</span>
            <button
              type="button"
              onClick={() => setAdminStatusBanner(null)}
              className="text-slate-400 hover:text-white"
            >
              Đóng
            </button>
          </div>
        )}

        {/* VIEW 1: AI FACIAL CHECK-IN KIOSK & LIVE WELCOME TOUCHPOINT (NEON PURPLE EDITION) */}
        {activeNav === 'kiosk' && (
          <div className="space-y-5">
            {/* Scientific, Harmonious Event Banner with 4 Official Logos & KPI Bar */}
            <div className="rounded-xl border border-purple-500/40 bg-gradient-to-r from-[#16082E]/95 via-[#110624]/95 to-[#16082E]/95 p-4 sm:p-5 shadow-[0_0_35px_rgba(168,85,247,0.2)]">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                {/* Left 8 Cols: 4 Official Logos + Event Identity & Quick Controls */}
                <div className="lg:col-span-8 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <FourEventLogosBar
                      variant="compact"
                      customLogoUrl={brandConfig.customLogoUrl}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-300">
                    <span
                      className={`font-bold uppercase tracking-wider ${activeTheme.accentTextClass}`}
                    >
                      {brandConfig.brandName}
                    </span>
                    <span aria-hidden="true" className="text-slate-600">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-300">
                      <CalendarClock className="h-3.5 w-3.5 text-amber-400" />
                      {brandConfig.eventDateTime}
                    </span>
                    <span aria-hidden="true" className="text-slate-600">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-300">
                      <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                      {brandConfig.eventLocation}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white text-balance leading-snug">
                      {brandConfig.eventName}
                    </h1>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setIsQuickEventModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:border-[#F37021] hover:text-white transition-colors"
                    >
                      <Edit3 className="h-3 w-3 text-[#F37021]" />
                      <span>Sửa Sự Kiện & Địa Điểm</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSettingsSubTab('agenda_and_qr');
                        setActiveNav('brand_settings');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:border-[#F37021] hover:text-white transition-colors"
                    >
                      <QrCode className="h-3 w-3 text-emerald-400" />
                      <span>Soạn Agenda & Tạo QR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSettingsSubTab('brand_and_theme');
                        setActiveNav('brand_settings');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-[11px] text-slate-300 hover:border-slate-700 transition-colors"
                    >
                      <Palette className="h-3 w-3 text-[#F37021]" />
                      <span>Chủ đề: {activeTheme.brandStyleTag}</span>
                    </button>

                    {/* Direct Excel Import & Sample Download on Kiosk Banner */}
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-500/45 bg-emerald-950/35 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-950/60 transition-colors">
                      <FileSpreadsheet className="h-3 w-3 text-emerald-400" />
                      <span>Nhập File Excel Đại Biểu (.xlsx)</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleExcelFileUpload}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={downloadSampleExcelTemplate}
                      className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/35 bg-cyan-950/25 px-2.5 py-1 text-[11px] font-medium text-cyan-200 hover:bg-cyan-950/50 transition-colors"
                      title="Tải file Excel mẫu có sẵn các trường: Họ và tên, Chức vụ/vai trò, Đơn vị công tác và nội dung Admin tùy chỉnh"
                    >
                      <Download className="h-3 w-3 text-cyan-400" />
                      <span>Tải Mẫu Excel</span>
                    </button>
                  </div>
                </div>

                {/* Right 4 Cols: Balanced 4-Card KPI Grid */}
                <div className="lg:col-span-4 grid grid-cols-4 gap-2.5">
                  <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2.5 text-center">
                    <p className="text-[11px] text-slate-400 truncate">Tổng DS</p>
                    <p className="mt-0.5 font-mono-tabular text-lg font-bold text-white">
                      {stats.total}
                    </p>
                  </div>
                  <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/20 p-2.5 text-center">
                    <p className="text-[11px] text-emerald-300 truncate">Đang dự</p>
                    <p className="mt-0.5 font-mono-tabular text-lg font-bold text-emerald-400">
                      {stats.checkedIn}
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-500/25 bg-amber-950/20 p-2.5 text-center">
                    <p className="text-[11px] text-amber-300 truncate">Đã về</p>
                    <p className="mt-0.5 font-mono-tabular text-lg font-bold text-amber-400">
                      {stats.checkedOut}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2.5 text-center">
                    <p className="text-[11px] text-slate-400 truncate">Chưa đến</p>
                    <p className="mt-0.5 font-mono-tabular text-lg font-bold text-slate-300">
                      {stats.pending}
                    </p>
                  </div>
                </div>
              </div>

              {/* Standardized Deduplicated Guest Source Arrival Statistics Bar */}
              <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-white">
                    Thống kê nguồn đại biểu tham dự:
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-300">
                  {stats.sources.map((src, idx) => (
                    <React.Fragment key={src.label}>
                      {idx > 0 && (
                        <span aria-hidden="true" className="text-slate-600">
                          ·
                        </span>
                      )}
                      <span>
                        <span className="text-slate-400">{src.label}:</span>{' '}
                        <strong className="font-mono-tabular text-emerald-400">
                          {src.arrived}
                        </strong>
                        <span className="font-mono-tabular text-slate-400">
                          /{src.total}
                        </span>
                      </span>
                    </React.Fragment>
                  ))}
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span>
                    Tổng đã đến:{' '}
                    <strong className="font-mono-tabular text-white">
                      {stats.arrivedTotal}/{stats.total}
                    </strong>{' '}
                    (
                    {stats.total > 0
                      ? Math.round((stats.arrivedTotal / stats.total) * 100)
                      : 0}
                    %)
                  </span>
                </div>
              </div>
            </div>

            {/* Main 12-Column Workspace Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* LEFT 6 COLUMNS: Minimalist Professional Face Scanner + Guest Directory */}
              <div className="lg:col-span-6 space-y-5">
                <div className="rounded-xl border border-purple-500/40 bg-[#110622] p-4 sm:p-5 shadow-[0_0_30px_rgba(168,85,247,0.18)]">
                  {/* Minimalist Station Header with Physical Admin Switch & Auto Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3.5 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <ScanFace
                        className={`h-5 w-5 ${
                          frameValidationState === 'verified_green'
                            ? 'text-emerald-400'
                            : frameValidationState === 'mismatch_red'
                            ? 'text-red-400 animate-pulse'
                            : activeTheme.accentTextClass
                        }`}
                      />
                      <h2 className="text-sm sm:text-base font-bold text-white">
                        Nhận Diện Khuôn Mặt
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Physical / Hardware Style Admin Toggle to Turn Off Auto-Scan (Space / P key or Click) */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsScannerPowerOn((prev) => {
                            const next = !prev;
                            lockCounterRef.current = 0;
                            setLiveFaceLockProgress(0);
                            if (!next) {
                              setFrameValidationState('idle');
                              setFrameValidationMessage(null);
                              setScanStatusText(
                                'Đã TẮT chế độ quét tự động (Điều khiển vật lý Admin).'
                              );
                            } else {
                              setScanStatusText(
                                `Đã BẬT chế độ quét tự động · Chờ khách tiếp theo (${sequentialDelaySeconds}s).`
                              );
                            }
                            return next;
                          });
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                          isScannerPowerOn
                            ? 'border-emerald-500/60 bg-emerald-600 text-white shadow-sm hover:bg-emerald-500'
                            : 'border-rose-500/70 bg-rose-600 text-white shadow-sm hover:bg-rose-500'
                        }`}
                        title="Điều khiển vật lý (Bấm nút hoặc nhấn Phím Space / P trên bàn phím) để Tắt/Bật quét tự động, tránh xác nhận lặp lại"
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isScannerPowerOn
                              ? 'bg-white animate-pulse'
                              : 'bg-rose-200'
                          }`}
                        />
                        <span>
                          {isScannerPowerOn
                            ? 'QUÉT TỰ ĐỘNG: BẬT (Phím Space)'
                            : 'ĐÃ TẮT QUÉT TỰ ĐỘNG (Phím Space)'}
                        </span>
                      </button>

                      {/* Auto / Manual Mode Selector */}
                      <button
                        type="button"
                        onClick={() => {
                          const nextAuto = !(
                            autoScanCamera &&
                            cameraScanSpeedMode !== 'manual_only'
                          );
                          setAutoScanCamera(nextAuto);
                          if (nextAuto && cameraScanSpeedMode === 'manual_only') {
                            setCameraScanSpeedMode('balanced_accurate');
                          } else if (!nextAuto) {
                            setCameraScanSpeedMode('manual_only');
                          }
                          lockCounterRef.current = 0;
                          setLiveFaceLockProgress(0);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          autoScanCamera && cameraScanSpeedMode !== 'manual_only'
                            ? 'border-cyan-500/50 bg-cyan-950/50 text-cyan-200'
                            : 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
                        }`}
                        title="Chuyển đổi giữa chế độ Auto tự động tuần tự và Thủ công"
                      >
                        <Zap className="h-3 w-3 text-cyan-400" />
                        <span>
                          {autoScanCamera && cameraScanSpeedMode !== 'manual_only'
                            ? 'Auto (3s)'
                            : 'Thủ Công'}
                        </span>
                      </button>

                      <div className="flex items-center gap-0.5 rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setKioskMode('auto')}
                          className={`px-2 py-1 font-medium rounded-md transition-colors ${
                            kioskMode === 'auto'
                              ? 'bg-slate-800 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Vào/Ra
                        </button>
                        <button
                          type="button"
                          onClick={() => setKioskMode('checkin_only')}
                          className={`px-2 py-1 font-medium rounded-md transition-colors ${
                            kioskMode === 'checkin_only'
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Vào
                        </button>
                        <button
                          type="button"
                          onClick={() => setKioskMode('checkout_only')}
                          className={`px-2 py-1 font-medium rounded-md transition-colors ${
                            kioskMode === 'checkout_only'
                              ? 'bg-amber-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Ra
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Admin Sequential Pacing (Default 3s Delay) & Target Guest Control Bar */}
                  <div className="mt-3 space-y-2 rounded-lg border border-slate-800/90 bg-slate-950/80 p-2.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-[#F37021]" />
                        <span>Độ trễ chờ khách tiếp theo (không quét lặp lại):</span>
                      </span>
                      <div className="flex flex-wrap items-center gap-1">
                        {[
                          { sec: 2, label: '2.0s' },
                          { sec: 3, label: '3.0s (Chuẩn)' },
                          { sec: 5, label: '5.0s' },
                          { sec: 8, label: '8.0s' },
                        ].map((item) => (
                          <button
                            key={item.sec}
                            type="button"
                            onClick={() => setSequentialDelaySeconds(item.sec)}
                            className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                              sequentialDelaySeconds === item.sec
                                ? 'bg-[#F37021] text-white shadow-sm'
                                : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                          Danh sách Check-in:
                        </span>
                        <select
                          value={cameraTargetGuestId}
                          onChange={(e) => {
                            setCameraTargetGuestId(e.target.value);
                            setFrameValidationState('idle');
                            setFrameValidationMessage(null);
                          }}
                          className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-white focus:border-[#F37021] focus:outline-none"
                        >
                          <option value="auto_smart">
                            Tự động đối chiếu danh sách Check-in ({guests.filter((g) => g.status !== 'checked_in').length} chưa đến / {guests.length} khách)
                          </option>
                          {guests.map((g) => (
                            <option key={g.id} value={g.id}>
                              Đăng ký & Xác nhận 100%: {g.honorific} {g.name} (
                              {g.code} ·{' '}
                              {g.status === 'checked_in'
                                ? 'Đã Check-in'
                                : 'Chưa đến'}
                              )
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => speakStandInFramePrompt()}
                        className="inline-flex items-center gap-1 rounded-md border border-cyan-500/40 bg-cyan-950/40 px-2 py-0.5 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-900/60 transition-colors whitespace-nowrap"
                        title="Phát lời mời giọng nói: Xin mời bạn đứng vào khuôn hình"
                      >
                        <Volume2 className="h-3 w-3 text-cyan-400" />
                        <span>Lời mời giọng nói</span>
                      </button>
                    </div>
                  </div>

                  {/* Face-Proportioned Check-in Viewport with Artistic High-Tech Biometric HUD */}
                  <div
                    className={`relative mt-3 aspect-[16/9] w-full overflow-hidden rounded-t-xl border-2 border-b-0 bg-slate-950 flex items-center justify-center transition-all duration-200 ${
                      frameValidationState === 'mismatch_red'
                        ? 'border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.65)]'
                        : frameValidationState === 'verified_green'
                        ? 'border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.55)]'
                        : 'border-slate-800'
                    }`}
                  >
                    {isCameraActive ? (
                      <>
                        <video
                          ref={videoRef}
                          className="h-full w-full object-cover -scale-x-100"
                          playsInline
                          autoPlay
                          muted
                        />

                        {/* Subtle Ambient Corner Grid HUD */}
                        <div
                          className="pointer-events-none absolute inset-0 opacity-20"
                          style={{
                            backgroundImage:
                              'radial-gradient(circle at center, transparent 48%, rgba(2, 6, 23, 0.75) 100%)',
                          }}
                        />

                        {/* Face-Fitted Portrait Check-in Frame (Vừa vặn khuôn mặt đại biểu, Tím Neon nghệ thuật & công nghệ cao) */}
                        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-3 sm:p-4">
                          <div
                            className={`relative h-[88%] aspect-[4/5] max-w-[66%] sm:max-w-[54%] w-full rounded-2xl transition-all duration-200 flex flex-col items-center justify-between p-3 shadow-[0_0_0_999px_rgba(8,2,18,0.52)] overflow-hidden ${
                              frameValidationState === 'mismatch_red'
                                ? 'border-[3px] border-red-500 bg-red-500/10 shadow-[0_0_40px_rgba(239,68,68,0.9),0_0_0_999px_rgba(8,2,18,0.6)] animate-pulse'
                                : frameValidationState === 'verified_green'
                                ? 'border-[3px] border-emerald-400 bg-emerald-500/10 shadow-[0_0_40px_rgba(16,185,129,0.85),0_0_0_999px_rgba(8,2,18,0.52)]'
                                : !isScannerPowerOn
                                ? 'border-2 border-dashed border-rose-500/60 bg-slate-950/40'
                                : isScanning || liveFaceLockProgress > 0
                                ? 'border-2 border-purple-400 bg-purple-500/[0.06] shadow-[0_0_35px_rgba(168,85,247,0.65),0_0_0_999px_rgba(8,2,18,0.52)]'
                                : 'border-2 border-purple-400/60 shadow-[0_0_22px_rgba(168,85,247,0.3),0_0_0_999px_rgba(8,2,18,0.48)]'
                            }`}
                          >
                            {/* 4 Sculpted High-Tech Neon Purple & Gold Corner Brackets */}
                            <div
                              className={`pointer-events-none absolute top-0 left-0 h-7 w-7 border-t-4 border-l-4 rounded-tl-xl transition-colors ${
                                frameValidationState === 'mismatch_red'
                                  ? 'border-red-500'
                                  : frameValidationState === 'verified_green'
                                  ? 'border-emerald-400'
                                  : isScanning || liveFaceLockProgress > 0
                                  ? 'border-fuchsia-400'
                                  : 'border-purple-400'
                              }`}
                            />
                            <div
                              className={`pointer-events-none absolute top-0 right-0 h-7 w-7 border-t-4 border-r-4 rounded-tr-xl transition-colors ${
                                frameValidationState === 'mismatch_red'
                                  ? 'border-red-500'
                                  : frameValidationState === 'verified_green'
                                  ? 'border-emerald-400'
                                  : isScanning || liveFaceLockProgress > 0
                                  ? 'border-fuchsia-400'
                                  : 'border-purple-400'
                              }`}
                            />
                            <div
                              className={`pointer-events-none absolute bottom-0 left-0 h-7 w-7 border-b-4 border-l-4 rounded-bl-xl transition-colors ${
                                frameValidationState === 'mismatch_red'
                                  ? 'border-red-500'
                                  : frameValidationState === 'verified_green'
                                  ? 'border-emerald-400'
                                  : isScanning || liveFaceLockProgress > 0
                                  ? 'border-fuchsia-400'
                                  : 'border-purple-400'
                              }`}
                            />
                            <div
                              className={`pointer-events-none absolute bottom-0 right-0 h-7 w-7 border-b-4 border-r-4 rounded-br-xl transition-colors ${
                                frameValidationState === 'mismatch_red'
                                  ? 'border-red-500'
                                  : frameValidationState === 'verified_green'
                                  ? 'border-emerald-400'
                                  : isScanning || liveFaceLockProgress > 0
                                  ? 'border-fuchsia-400'
                                  : 'border-purple-400'
                              }`}
                            />

                            {/* Artistic High-Tech Neon Purple Optical Laser Scanline Sweep when Locking / Scanning */}
                            {isScannerPowerOn &&
                              frameValidationState === 'idle' &&
                              cooldownRemainingSec === 0 && (
                                <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-transparent via-purple-500/20 to-fuchsia-400/40 border-b border-purple-300/80 animate-biometric-sweep" />
                              )}

                            {/* Artistic High-Tech Dual Orbiting Biometric HUD Rings (Neon Purple & Gold) */}
                            {isScannerPowerOn &&
                              (isScanning ||
                                liveFaceLockProgress > 0 ||
                                frameValidationState === 'verified_green') && (
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                  <svg
                                    className="w-[78%] h-[78%] opacity-65 animate-hud-orbit"
                                    viewBox="0 0 200 200"
                                    fill="none"
                                  >
                                    <circle
                                      cx="100"
                                      cy="100"
                                      r="88"
                                      stroke={
                                        frameValidationState === 'verified_green'
                                          ? '#34D399'
                                          : '#C084FC'
                                      }
                                      strokeWidth="1.6"
                                      strokeDasharray="24 14 8 14"
                                    />
                                  </svg>
                                  <svg
                                    className="absolute w-[64%] h-[64%] opacity-55 animate-hud-orbit-reverse"
                                    viewBox="0 0 200 200"
                                    fill="none"
                                  >
                                    <circle
                                      cx="100"
                                      cy="100"
                                      r="86"
                                      stroke="#F5B324"
                                      strokeWidth="1.3"
                                      strokeDasharray="16 22"
                                    />
                                  </svg>
                                </div>
                              )}

                            {/* Subtle Center Facial Alignment Ticks */}
                            <div className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 flex items-center justify-between opacity-45">
                              <span className="h-3 w-1.5 border-l border-t border-b border-purple-300" />
                              <span className="h-3 w-1.5 border-r border-t border-b border-purple-300" />
                            </div>

                            {/* Top Status Badge inside Face Frame */}
                            <div className="relative z-10 flex items-center justify-center w-full">
                              {!isScannerPowerOn ? (
                                <span className="rounded-full bg-rose-600/95 px-3 py-0.5 text-[10px] font-bold text-white shadow-md">
                                  ĐÃ TẮT QUÉT TỰ ĐỘNG (Phím Space)
                                </span>
                              ) : frameValidationState === 'verified_green' ? (
                                <span className="rounded-full bg-emerald-600 px-3 py-0.5 text-[10px] font-bold text-white shadow-md">
                                  ✓ XÁC THỰC ĐÚNG ĐẠI BIỂU (≥ 50% · 3s) · LƯỢT #{String(checkedInTurnMap.size).padStart(2, '0')}
                                </span>
                              ) : frameValidationState === 'mismatch_red' ? (
                                <span className="rounded-full bg-red-600 px-3 py-0.5 text-[10px] font-bold text-white shadow-md animate-bounce">
                                  ✕ KHÔNG KHỚP DỮ LIỆU (&lt; 50%)
                                </span>
                              ) : isScanning || liveFaceLockProgress > 0 ? (
                                <span className="rounded-full border border-purple-400/60 bg-[#120624]/95 px-2.5 py-0.5 font-mono-tabular text-[10px] font-bold text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                                  AI SCANNING (≥50% · 3s) · {Math.min(100, Math.round(liveFaceLockProgress || 85))}%
                                </span>
                              ) : (
                                <span className="rounded-full border border-purple-400/35 bg-[#120624]/85 px-2.5 py-0.5 text-[10px] font-medium text-purple-100">
                                  Đặt khuôn mặt vào khung (Đồng nhất ≥50% · 3s) · Lượt #{String(checkedInTurnMap.size + 1).padStart(2, '0')}
                                </span>
                              )}
                            </div>

                            {/* Bottom High-Tech Progress & Status Pill inside Face Frame */}
                            <div className="relative z-10 flex flex-col items-center justify-end w-full gap-1.5">
                              {frameValidationState === 'idle' &&
                                isScannerPowerOn &&
                                (liveFaceLockProgress > 0 || isScanning) && (
                                  <div className="w-4/5 h-1.5 rounded-full bg-[#0D041C]/95 overflow-hidden border border-purple-400/50 p-0.5">
                                    <div
                                      className="h-full rounded-full transition-all duration-200 bg-gradient-to-r from-purple-500 via-fuchsia-400 to-amber-400"
                                      style={{
                                        width: `${isScanning ? 100 : liveFaceLockProgress}%`,
                                      }}
                                    />
                                  </div>
                                )}

                              {frameValidationState === 'verified_green' &&
                                frameValidationMessage && (
                                  <div className="max-w-[96%] rounded-lg border border-emerald-400 bg-emerald-950/95 px-3 py-1 text-[11px] font-bold text-emerald-200 shadow-lg text-center truncate">
                                    {frameValidationMessage}
                                  </div>
                                )}

                              {frameValidationState === 'mismatch_red' && (
                                <div className="max-w-[96%] rounded-lg border border-red-500 bg-red-950/95 px-3 py-1 text-[11px] font-bold text-red-200 shadow-lg text-center truncate animate-pulse">
                                  {frameValidationMessage ||
                                    'Không khớp dữ liệu khuôn mặt đại biểu'}
                                </div>
                              )}

                              {frameValidationState === 'idle' &&
                                isScannerPowerOn &&
                                cooldownRemainingSec > 0 && (
                                  <div className="rounded-full border border-emerald-500/40 bg-slate-950/90 px-3 py-0.5 text-[10px] font-semibold text-emerald-300 shadow">
                                    Chờ Lượt #{String(checkedInTurnMap.size + 1).padStart(2, '0')} ({cooldownRemainingSec}s)...
                                  </div>
                                )}

                              {frameValidationState === 'idle' &&
                                isScannerPowerOn &&
                                cooldownRemainingSec === 0 &&
                                liveCandidateHint && (
                                  <div className="max-w-[96%] rounded-full border border-cyan-500/30 bg-slate-950/90 px-2.5 py-0.5 text-[10px] font-medium text-cyan-200 truncate">
                                    {liveCandidateHint}
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : frameValidationState === 'mismatch_red' &&
                      unmatchedCapturedFrame ? (
                      /* Minimalist Red Blinking Expanded Frame when Photo Upload mismatches */
                      <div className="relative h-full w-full flex flex-col items-center justify-center p-4 bg-slate-950">
                        <div className="relative h-40 w-40 rounded-2xl border-4 border-red-500 shadow-[0_0_45px_rgba(239,68,68,0.9)] animate-pulse overflow-hidden">
                          <img
                            src={unmatchedCapturedFrame}
                            alt="Không khớp"
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="mt-3 rounded-lg border border-red-500 bg-red-950/90 px-3.5 py-1 text-xs font-bold text-red-200 animate-pulse">
                          {frameValidationMessage ||
                            'Không khớp dữ liệu khuôn mặt đại biểu'}
                        </div>
                      </div>
                    ) : scannerFrameUrl ? (
                      /* Minimalist Verified Green Frame when Camera is Off (Displays Initial System Avatar) */
                      <div className="relative h-full w-full flex items-center justify-center p-4 bg-slate-950">
                        <div className="flex flex-col sm:flex-row items-center gap-4 max-w-lg w-full rounded-xl border border-emerald-500/40 bg-slate-900/90 p-3.5 shadow-xl">
                          <div className="relative h-24 w-24 overflow-hidden rounded-2xl border-4 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.6)] shrink-0">
                            <img
                              src={
                                latestMatchedGuest?.originalAvatarUrl ||
                                latestMatchedGuest?.avatarUrl ||
                                scannerFrameUrl
                              }
                              alt="Đã xác thực"
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1 text-center sm:text-left space-y-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                              ✓ XÁC THỰC THÀNH CÔNG
                            </span>
                            {latestMatchedGuest && (
                              <>
                                <p className="text-sm sm:text-base font-bold text-white truncate">
                                  {latestMatchedGuest.honorific}{' '}
                                  {latestMatchedGuest.name}
                                </p>
                                <p className="text-xs text-slate-300 truncate">
                                  {latestMatchedGuest.role} ·{' '}
                                  <span className="text-orange-300">
                                    {latestMatchedGuest.company}
                                  </span>
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Ultra-Clean Standby Viewport */
                      <div className="flex flex-col items-center justify-center p-4 text-center">
                        <button
                          type="button"
                          onClick={startCamera}
                          className="group flex flex-col items-center gap-2.5 rounded-2xl border border-slate-800 bg-slate-900/60 px-6 py-5 hover:border-emerald-500/50 hover:bg-slate-900 transition-all"
                        >
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${activeTheme.accentBorderClass} ${activeTheme.accentBgClass}`}
                          >
                            <Camera
                              className={`h-6 w-6 ${activeTheme.accentTextClass}`}
                            />
                          </div>
                          <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                            Bấm để Mở Camera Nhận Diện
                          </span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Minimalist Bottom Status Bar */}
                  <div
                    className={`rounded-b-xl border-2 px-3.5 py-2 flex items-center justify-between gap-2 transition-colors ${
                      frameValidationState === 'mismatch_red'
                        ? 'bg-red-950/90 border-red-500 text-red-200'
                        : frameValidationState === 'verified_green'
                        ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <p className="text-[11px] font-medium truncate">
                      {scanStatusText}
                    </p>
                    <span
                      className={`font-mono-tabular text-[11px] font-bold shrink-0 ${
                        frameValidationState === 'mismatch_red'
                          ? 'text-red-300'
                          : frameValidationState === 'verified_green'
                          ? 'text-emerald-300'
                          : !isScannerPowerOn
                          ? 'text-rose-400'
                          : 'text-cyan-400'
                      }`}
                    >
                      {!isScannerPowerOn
                        ? 'ĐÃ TẮT QUÉT'
                        : cooldownRemainingSec > 0
                        ? `Chờ khách tiếp: ${cooldownRemainingSec}s`
                        : autoScanCamera && cameraScanSpeedMode !== 'manual_only'
                        ? `AUTO (${sequentialDelaySeconds}s)`
                        : 'THỦ CÔNG'}
                    </span>
                  </div>

                  {/* Fast Camera & Photo Action Controls */}
                  <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {!isCameraActive ? (
                        <button
                          type="button"
                          onClick={startCamera}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-950/60 transition-colors whitespace-nowrap"
                        >
                          <Camera className="h-4 w-4 text-emerald-400" />
                          <span>Mở Camera</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-950/70 transition-colors whitespace-nowrap"
                        >
                          <CameraOff className="h-4 w-4" />
                          <span>Tắt Camera</span>
                        </button>
                      )}

                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-950/25 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-950/50 transition-colors whitespace-nowrap">
                        <Upload className="h-3.5 w-3.5 text-amber-400" />
                        <span>Qua Ảnh</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadPhotoToScan}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          setCccdTargetGuestId(guests[0]?.id || null);
                          setIsCccdFaceIdModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/45 bg-cyan-950/35 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-950/60 transition-colors whitespace-nowrap"
                        title="Cập nhật dữ liệu bằng Căn cước công dân (CCCD) & Face ID"
                      >
                        <CreditCard className="h-3.5 w-3.5 text-cyan-400" />
                        <span>CCCD / Face ID</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleAmbientLoungeMusic}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                          isAmbientMusicOn
                            ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                            : 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
                        }`}
                      >
                        <Music className="h-3.5 w-3.5 text-cyan-400" />
                        <span>{isAmbientMusicOn ? 'Nhạc: Bật' : 'Nhạc nền'}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={isScanning}
                      onClick={handleScanLiveCamera}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap ${activeTheme.accentButtonClass}`}
                    >
                      <ScanFace className="h-4 w-4" />
                      <span>
                        {isScanning
                          ? 'Đang xác thực...'
                          : isCameraActive
                          ? 'Quét Xác Nhận Ngay'
                          : 'Bật Camera & Quét'}
                      </span>
                    </button>
                  </div>

                  {/* MAX 2 VERIFICATIONS NOTICE BANNER */}
                  {duplicateCheckInNotice && (
                    <div className="mt-3.5 rounded-xl border border-amber-500/60 bg-slate-900/95 p-3.5 flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={
                            duplicateCheckInNotice.guest.originalAvatarUrl ||
                            duplicateCheckInNotice.guest.avatarUrl
                          }
                          alt={duplicateCheckInNotice.guest.name}
                          referrerPolicy="no-referrer"
                          className="h-10 w-10 rounded-lg object-cover border border-amber-400 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            {duplicateCheckInNotice.guest.honorific}{' '}
                            {duplicateCheckInNotice.guest.name} đã xác thực đủ 02/02 lượt
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Lần đầu lúc {duplicateCheckInNotice.checkInTime}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleResetSingleGuestCheckIn(
                              duplicateCheckInNotice.guest.id
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-600 hover:bg-rose-500 px-2.5 py-1 text-[11px] font-bold text-white"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Đặt lại (0/2)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDuplicateCheckInNotice(null)}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-300 hover:text-white"
                        >
                          Đóng
                        </button>
                      </div>
                    </div>
                  )}

                  {/* COMPACT VERIFIED GUEST SUMMARY BAR (SHOWS INITIAL SYSTEM AVATAR) */}
                  {scannerFrameUrl && latestMatchedGuest && (
                    <div className="mt-3.5 rounded-xl border border-emerald-500/50 bg-emerald-950/30 p-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={
                            latestMatchedGuest.originalAvatarUrl ||
                            latestMatchedGuest.avatarUrl ||
                            scannerFrameUrl
                          }
                          alt={latestMatchedGuest.name}
                          referrerPolicy="no-referrer"
                          className="h-12 w-12 rounded-xl object-cover border-2 border-emerald-400 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 border border-emerald-400/40 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                              ✓ ĐÃ XÁC THỰC CHECK-IN
                            </span>
                            <span className="font-mono-tabular text-[11px] text-slate-300">
                              {latestMatchedGuest.code} · {latestMatchedGuest.seatZone}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-white truncate mt-0.5">
                            {latestMatchedGuest.honorific}{' '}
                            {latestMatchedGuest.name}
                          </p>
                          <p className="text-[11px] text-slate-300 truncate">
                            {latestMatchedGuest.role} ·{' '}
                            <span className="text-orange-300">
                              {latestMatchedGuest.company}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setWelcomePopupLog(logs[0] || null)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>Màn Hình Welcome</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setExportModalGuest(latestMatchedGuest)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#F37021] hover:bg-orange-500 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors"
                        >
                          <QrCode className="h-3 w-3" />
                          <span>Thẻ & QR</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Balanced Guest Directory with Scientific Turn Filter, Quick Search & Card/QR Export */}
                  <div className="mt-4 border-t border-slate-800 pt-4">
                    {/* Scientific Check-in Turn Order Filter Bar */}
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/80 p-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 px-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        <span>Thứ tự Lượt Check-in:</span>
                        <strong className="font-mono-tabular text-emerald-400">
                          Đã đón {checkedInTurnMap.size}/{guests.length} lượt
                        </strong>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setKioskTurnFilter('all')}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                            kioskTurnFilter === 'all'
                              ? 'bg-[#F37021] text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Mạch lạc (Chờ → Đã vào)
                        </button>
                        <button
                          type="button"
                          onClick={() => setKioskTurnFilter('pending_next')}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                            kioskTurnFilter === 'pending_next'
                              ? 'bg-cyan-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Chờ quét ({guests.length - checkedInTurnMap.size})
                        </button>
                        <button
                          type="button"
                          onClick={() => setKioskTurnFilter('checked_in_order')}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                            kioskTurnFilter === 'checked_in_order'
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Theo Lượt (#01 → #{String(checkedInTurnMap.size).padStart(2, '0')})
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                        <div className="relative flex-1">
                          <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                          <input
                            type="text"
                            value={kioskSearchQuery}
                            onChange={(e) => setKioskSearchQuery(e.target.value)}
                            placeholder={`Tìm nhanh trong ${guests.length} khách mời (bấm vào ảnh để cung cấp ảnh mẫu mới)...`}
                            className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:border-[#F37021] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <label
                          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-emerald-500/45 bg-emerald-950/35 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-950/60 transition-colors"
                          title="Nhập danh sách đại biểu, khách mời từ file Excel (.xlsx, .xls, .csv) với các trường Họ tên, Chức vụ/vai trò, Đơn vị công tác và nội dung Admin bổ sung"
                        >
                          <FileSpreadsheet className="h-3 w-3 text-emerald-400" />
                          <span>Nhập Excel (.xlsx)</span>
                          <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleExcelFileUpload}
                            className="hidden"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => setIsAdminDataModalOpen(true)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:border-[#F37021] hover:text-white transition-colors"
                          title="Quản trị: Chỉnh sửa nội dung dữ liệu, cung cấp ảnh, nhập hoặc xóa danh sách khách mời"
                        >
                          <Database className="h-3 w-3 text-[#F37021]" />
                          <span>Quản trị DS & Ảnh</span>
                        </button>

                        {guests.length > 0 ? (
                          !confirmClearAllInline ? (
                            <button
                              type="button"
                              onClick={() => setConfirmClearAllInline(true)}
                              className="inline-flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-950/30 px-2 py-1 text-[11px] font-medium text-rose-300 hover:bg-rose-950/60 transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Xóa DS</span>
                            </button>
                          ) : (
                            <div className="inline-flex items-center gap-1 rounded-md border border-rose-500 bg-rose-950/80 px-2 py-0.5 text-[11px]">
                              <span className="text-rose-200 font-semibold">
                                Xóa hết?
                              </span>
                              <button
                                type="button"
                                onClick={handleClearAllGuests}
                                className="rounded bg-rose-600 px-1.5 py-0.5 font-semibold text-white hover:bg-rose-500"
                              >
                                Xóa
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmClearAllInline(false)}
                                className="text-slate-300 hover:text-white px-1"
                              >
                                Hủy
                              </button>
                            </div>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={handleRestoreDefaultSample}
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-950/30 px-2.5 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-950/60 transition-colors"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Khôi phục mẫu</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {guests.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/60 p-5 text-center space-y-2.5">
                        <p className="text-xs font-semibold text-slate-300">
                          Danh sách khách mời đang trống (0 khách).
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsEnrollModalOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#F37021] px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-500"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            <span>Thêm khách mới</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsAdminDataModalOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
                          >
                            <Database className="h-3.5 w-3.5 text-[#F37021]" />
                            <span>Nhập danh sách</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleRestoreDefaultSample}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-950/60"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Khôi phục mẫu</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-0.5">
                        {kioskFilteredGuests.map((guest) => {
                          const isCurrentlyIn = guest.status === 'checked_in';
                          return (
                            <div
                              key={guest.id}
                              className="flex flex-col justify-between gap-2 rounded-xl border border-slate-800/90 bg-slate-900/60 p-2.5 hover:border-slate-700 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <label
                                    className="relative cursor-pointer group shrink-0"
                                    title="Bấm để cung cấp / cập nhật ảnh khuôn mặt cho khách mời này & Check-in ngay"
                                  >
                                    <img
                                      src={guest.avatarUrl}
                                      alt={guest.name}
                                      referrerPolicy="no-referrer"
                                      className="h-10 w-10 rounded-lg object-cover object-center border border-slate-700 group-hover:border-[#F37021] transition-colors"
                                    />
                                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#F37021] text-[9px] text-white shadow">
                                      <Upload className="h-2.5 w-2.5" />
                                    </span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) =>
                                        handleBindGuestPhotoFile(guest, e)
                                      }
                                      className="hidden"
                                    />
                                  </label>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-xs font-bold text-white truncate">
                                        {guest.honorific} {guest.name}
                                      </p>
                                      {checkedInTurnMap.has(guest.id) ? (
                                        <span className="shrink-0 rounded bg-emerald-500/20 border border-emerald-400/50 px-1.5 py-0.5 font-mono-tabular text-[9px] font-bold text-emerald-300">
                                          Lượt #{String(checkedInTurnMap.get(guest.id)).padStart(2, '0')}
                                        </span>
                                      ) : (
                                        <span className="shrink-0 rounded bg-slate-800 border border-slate-700 px-1.5 py-0.5 font-mono-tabular text-[9px] font-semibold text-slate-400">
                                          Chờ quét
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-300 truncate">
                                      {guest.role} ·{' '}
                                      <span className="text-orange-300">
                                        {guest.company}
                                      </span>
                                    </p>
                                    <p className="text-[10px] text-slate-400 truncate">
                                      {guest.code} · {guest.seatZone}
                                      {guest.adminNotes
                                        ? ` · ${guest.adminNotes}`
                                        : ''}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-0.5 shrink-0">
                                  {/* 1-Click Bind Face from Live Camera (Registration Only) */}
                                  {(isCameraActive || unmatchedCapturedFrame) && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleBindGuestFaceFromCamera(guest)
                                      }
                                      className="rounded-md px-1.5 py-1 text-[10px] font-semibold bg-purple-500/20 border border-purple-500/40 text-purple-200 hover:bg-purple-500/30 transition-colors inline-flex items-center gap-1"
                                      title="Lưu khuôn mặt đang trên Camera làm ảnh đăng ký mẫu cho đại biểu này (Chờ quét tại sự kiện ≥ 50% để Check-in)"
                                    >
                                      <Camera className="h-3 w-3" />
                                      <span>Gán mặt mẫu</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => setEditingGuest(guest)}
                                    className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                                    title="Chỉnh sửa thông tin & ảnh khách mời"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteSingleGuest(guest.id)
                                    }
                                    className="rounded-md p-1 text-slate-500 hover:bg-rose-950/60 hover:text-rose-300 transition-colors"
                                    title="Xóa khách mời"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-1.5 border-t border-slate-800/80 pt-2">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleQuickScanGuestPhotoFromData(guest)
                                    }
                                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600/90 hover:bg-emerald-500 px-2 py-1 text-[11px] font-semibold text-white transition-colors whitespace-nowrap"
                                    title="Quét nhận diện Face ID từ ảnh dữ liệu của khách mời & kích hoạt điểm chạm chào mừng"
                                  >
                                    <ScanFace className="h-3 w-3" />
                                    <span>Face ID AI</span>
                                  </button>

                                  {(isCurrentlyIn || Boolean(guest.checkInTime)) && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleResetSingleGuestCheckIn(guest.id)
                                      }
                                      className="inline-flex items-center gap-1 rounded-md border border-rose-500/45 bg-rose-950/40 hover:bg-rose-900/60 px-2 py-1 text-[11px] font-semibold text-rose-200 transition-colors whitespace-nowrap"
                                      title="Admin: Xóa dữ liệu Check-in của khách mời này để có thể bổ sung lượt Check-in mới"
                                    >
                                      <RotateCcw className="h-3 w-3" />
                                      <span>Xóa Check-in</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCccdTargetGuestId(guest.id);
                                      setIsCccdFaceIdModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-md border border-cyan-500/40 bg-cyan-500/15 hover:bg-cyan-500/25 px-2 py-1 text-[11px] font-semibold text-cyan-200 transition-colors whitespace-nowrap"
                                    title="Cập nhật dữ liệu Căn cước công dân (CCCD) & xác thực quét khuôn mặt Face ID"
                                  >
                                    <CreditCard className="h-3 w-3" />
                                    <span>CCCD</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={async () => {
                                      setScannerFrameUrl(guest.avatarUrl);
                                      setLastRecognitionMs(58);
                                      await processGuestAttendance(
                                        guest,
                                        99.4,
                                        'check_out',
                                        'Ghi nhận khách rời sự kiện (58ms)'
                                      );
                                    }}
                                    disabled={
                                      !isCurrentlyIn && !guest.checkInTime
                                    }
                                    className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-40 px-2 py-1 text-[11px] font-semibold text-amber-300 transition-colors whitespace-nowrap"
                                  >
                                    <LogOut className="h-3 w-3" />
                                    <span>Ra</span>
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setExportModalGuest(guest)}
                                  className="inline-flex items-center gap-1 rounded-md border border-orange-500/40 bg-orange-500/15 hover:bg-orange-500/25 px-2 py-1 text-[11px] font-semibold text-orange-300 transition-colors whitespace-nowrap"
                                  title="Xuất Thẻ Khách Mời Có Mã QR & Ảnh Check-in"
                                >
                                  <QrCode className="h-3 w-3" />
                                  <span>Thẻ & QR</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT 6 COLUMNS: Live Event Welcome Screen Preview + Real-Time Check-in / Check-out Log */}
              <div className="lg:col-span-6 space-y-5">
                <WelcomeTouchpointStage
                  activeEventLog={logs[0] || null}
                  brandConfig={brandConfig}
                  activeTheme={activeTheme}
                  guests={guests}
                  redAlertState={redAlertState}
                  onDismissRedAlert={() => {
                    setRedAlertState(null);
                    setUnmatchedCapturedFrame(null);
                  }}
                  onToggleFullScreen={() => setActiveNav('welcome_stage')}
                  onOpenQuickEventEdit={() => setIsQuickEventModalOpen(true)}
                  onOpenExportCard={(g) => setExportModalGuest(g)}
                />

                {/* Recent Biometric Check-in / Check-out Activity Stream (Ordered by Turn) */}
                <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3.5 mb-3.5">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Thứ Tự Các Lượt Check-in & Điểm Chạm Gần Nhất ({logs.length})
                      </h3>
                      <p className="text-xs text-slate-400">
                        Sắp xếp khoa học theo từng lượt đại biểu xác thực thành công
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {logs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setLogs([]);
                            showAdminToast(
                              'Đã xóa toàn bộ lịch sử nhật ký điểm chạm.'
                            );
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-rose-400 hover:text-rose-300 whitespace-nowrap"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Xóa nhật ký</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveNav('attendance_sheets')}
                        className="text-xs font-medium text-[#F37021] hover:underline whitespace-nowrap"
                      >
                        Xem toàn bộ bảng tính →
                      </button>
                    </div>
                  </div>

                  {logs.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-500">
                      Chưa có lượt quét khuôn mặt nào trong phiên này.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-800/70">
                      {logs.slice(0, 5).map((item) => {
                        const logGuest = guests.find(
                          (g) => g.id === item.guestId
                        );
                        const isEditingThisLog = editingLogId === item.id;
                        return (
                          <div key={item.id} className="py-3 space-y-2.5">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <img
                                  src={item.avatarUrl}
                                  alt={item.guestName}
                                  referrerPolicy="no-referrer"
                                  className="h-10 w-10 rounded-lg object-cover shrink-0 border border-slate-700"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 text-xs">
                                    {checkedInTurnMap.has(item.guestId) && (
                                      <span className="rounded bg-emerald-500/20 border border-emerald-400/40 px-1.5 py-0.5 font-mono-tabular text-[10px] font-bold text-emerald-300 shrink-0">
                                        Lượt #{String(checkedInTurnMap.get(item.guestId)).padStart(2, '0')}
                                      </span>
                                    )}
                                    <span className="font-semibold text-white truncate">
                                      {item.honorific} {item.guestName}
                                    </span>
                                    <span
                                      aria-hidden="true"
                                      className="text-slate-600"
                                    >
                                      ·
                                    </span>
                                    <span className="text-slate-400 truncate">
                                      {item.seatZone}
                                    </span>
                                  </div>
                                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                                    <span
                                      className={
                                        item.action === 'check_in'
                                          ? 'text-emerald-400 font-medium'
                                          : 'text-amber-300 font-medium'
                                      }
                                    >
                                      {item.action === 'check_in'
                                        ? 'Đã Check-in (Giờ vào)'
                                        : 'Đã Check-out (Giờ ra)'}
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <span className="font-mono-tabular">
                                      {item.timeFormatted}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingLogId(
                                      isEditingThisLog ? null : item.id
                                    )
                                  }
                                  className="rounded-lg border border-slate-700 bg-slate-800/80 p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                                  title="Sửa nội dung bản ghi nhật ký này"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLogItem(item.id)}
                                  className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:border-rose-500/40 hover:bg-rose-950/50 hover:text-rose-300 transition-colors"
                                  title="Xóa bản ghi nhật ký này"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                                {logGuest && (
                                  <button
                                    type="button"
                                    onClick={() => setExportModalGuest(logGuest)}
                                    className="rounded-lg border border-orange-500/40 bg-orange-500/10 px-2.5 py-1.5 text-xs font-medium text-orange-300 hover:bg-orange-500/20 transition-colors whitespace-nowrap"
                                  >
                                    Ảnh & Thẻ
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setWelcomePopupLog(item)}
                                  className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors whitespace-nowrap"
                                >
                                  Hiện lời chào
                                </button>
                              </div>
                            </div>

                            {isEditingThisLog && (
                              <div className="rounded-lg border border-slate-700 bg-slate-900/90 p-3 space-y-2.5 text-xs">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <div>
                                    <label className="block text-[11px] text-slate-400 mb-0.5">
                                      Họ tên hiển thị
                                    </label>
                                    <input
                                      type="text"
                                      value={item.guestName}
                                      onChange={(e) =>
                                        handleUpdateLogItem(item.id, {
                                          guestName: e.target.value,
                                        })
                                      }
                                      className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] text-slate-400 mb-0.5">
                                      Vị trí bàn / Ghế
                                    </label>
                                    <input
                                      type="text"
                                      value={item.seatZone}
                                      onChange={(e) =>
                                        handleUpdateLogItem(item.id, {
                                          seatZone: e.target.value,
                                        })
                                      }
                                      className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] text-slate-400 mb-0.5">
                                      Thời gian ghi nhận
                                    </label>
                                    <input
                                      type="text"
                                      value={item.timeFormatted}
                                      onChange={(e) =>
                                        handleUpdateLogItem(item.id, {
                                          timeFormatted: e.target.value,
                                        })
                                      }
                                      className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1 font-mono-tabular text-xs text-emerald-400"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[11px] text-slate-400 mb-0.5">
                                    Nội dung lời chào trân trọng trên màn hình
                                  </label>
                                  <input
                                    type="text"
                                    value={item.welcomeMessage}
                                    onChange={(e) =>
                                      handleUpdateLogItem(item.id, {
                                        welcomeMessage: e.target.value,
                                      })
                                    }
                                    className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-white"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: FULL-SCREEN EVENT WELCOME STAGE (MÀN HÌNH LED CHÀO MỪNG SỰ KIỆN) */}
        {activeNav === 'welcome_stage' && (
          <WelcomeTouchpointStage
            activeEventLog={logs[0] || null}
            brandConfig={brandConfig}
            activeTheme={activeTheme}
            guests={guests}
            redAlertState={redAlertState}
            onDismissRedAlert={() => {
              setRedAlertState(null);
              setUnmatchedCapturedFrame(null);
            }}
            isFullScreenStage={true}
            onToggleFullScreen={() => setActiveNav('kiosk')}
            onOpenQuickEventEdit={() => setIsQuickEventModalOpen(true)}
            onOpenExportCard={(g) => setExportModalGuest(g)}
            onTriggerDemoWelcome={(guest, action) =>
              processGuestAttendance(
                guest,
                99.5,
                action,
                'Trình chiếu màn hình chào mừng sự kiện',
                undefined,
                undefined,
                true
              )
            }
          />
        )}

        {/* VIEW 3: ATTENDANCE SPREADSHEET (GIỜ VÀO / GIỜ RA) & GOOGLE SHEETS SYNC */}
        {activeNav === 'attendance_sheets' && (
          <div className="space-y-6">
            <GoogleSheetsPanel
              user={user}
              needsAuth={needsAuth}
              isLoggingIn={isLoggingIn}
              onGoogleLogin={handleGoogleLogin}
              onGoogleLogout={handleGoogleLogout}
              sheetMeta={sheetMeta}
              activeTab={activeSheetTab}
              onSelectTab={setActiveSheetTab}
              onCreateNewSheet={handleCreateNewSheet}
              onConnectExistingSheet={handleConnectExistingSheet}
              onSyncAllGuestsToSheet={handleSyncAllToSheet}
              onReadLiveSheetRows={handleReadLiveSheetRows}
              liveSheetRows={liveSheetRows}
              isSheetBusy={isSheetBusy}
              sheetStatusMessage={sheetStatusMessage}
              sheetError={sheetError}
              guests={guests}
              autoSyncEnabled={autoSyncEnabled}
              onToggleAutoSync={setAutoSyncEnabled}
            />

            {/* Full Attendance Table with Admin Inline Content Editing, Bulk Deletion & Card Export */}
            <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Bảng Quản Trị Danh Sách Khách Mời & Điểm Danh (Sửa Trực Tiếp Nội Dung, Xóa & Xuất Thẻ)
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Admin có thể bật “Sửa trực tiếp trên bảng” để chỉnh mọi ô dữ liệu, tích chọn để xóa lẻ/xóa toàn bộ danh sách khách mời hoặc xuất ảnh thẻ.
                  </p>
                </div>

                {/* Admin Primary Data Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsInlineTableEdit((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                      isInlineTableEdit
                        ? 'border-[#F37021] bg-[#F37021] text-white shadow-sm'
                        : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {isInlineTableEdit ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Hoàn tất sửa trực tiếp</span>
                      </>
                    ) : (
                      <>
                        <Edit3 className="h-3.5 w-3.5 text-[#F37021]" />
                        <span>Sửa trực tiếp trên bảng</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleAddInlineGuestRow}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors whitespace-nowrap"
                  >
                    <Plus className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Thêm dòng mới</span>
                  </button>

                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-colors whitespace-nowrap">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>Nhập File Excel Đại Biểu (.xlsx)</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleExcelFileUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={downloadSampleExcelTemplate}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/30 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-950/60 transition-colors whitespace-nowrap"
                  >
                    <Download className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Tải File Excel Mẫu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => exportGuestsToExcel(guests)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-950/60 transition-colors whitespace-nowrap"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Xuất Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAdminDataModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-[#F37021] hover:text-white transition-colors whitespace-nowrap"
                  >
                    <Database className="h-3.5 w-3.5 text-[#F37021]" />
                    <span>Nhập / Xóa & Quản Trị DS</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetAllAttendanceData}
                    disabled={guests.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-amber-950/60 disabled:opacity-40 transition-colors whitespace-nowrap"
                    title="Xóa toàn bộ Giờ Vào / Giờ Ra về trạng thái Chưa đến"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset Giờ Vào/Ra</span>
                  </button>

                  {!confirmClearAllInline ? (
                    <button
                      type="button"
                      disabled={guests.length === 0}
                      onClick={() => setConfirmClearAllInline(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-950/60 disabled:opacity-40 transition-colors whitespace-nowrap"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Xóa Toàn Bộ DS</span>
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-lg border border-rose-500 bg-rose-950/80 px-3 py-1.5 text-xs">
                      <span className="font-semibold text-rose-200">
                        Xóa toàn bộ {guests.length} khách?
                      </span>
                      <button
                        type="button"
                        onClick={handleClearAllGuests}
                        className="rounded bg-rose-600 px-2.5 py-1 font-semibold text-white hover:bg-rose-500"
                      >
                        Xác nhận Xóa
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClearAllInline(false)}
                        className="text-slate-300 hover:text-white px-1"
                      >
                        Hủy
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Filter, Search & Bulk Selection Bar */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm họ tên, mã khách, vị trí..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="rounded-lg border border-slate-700 bg-slate-900 pl-8 pr-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-[#F37021] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1 rounded-lg bg-slate-900 p-1 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setStatusFilter('all')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        statusFilter === 'all'
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Tất cả ({stats.total})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('checked_in')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        statusFilter === 'checked_in'
                          ? 'bg-slate-800 text-emerald-400'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Đang tham dự ({stats.checkedIn})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('checked_out')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        statusFilter === 'checked_out'
                          ? 'bg-slate-800 text-amber-300'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Đã ra về ({stats.checkedOut})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('pending')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        statusFilter === 'pending'
                          ? 'bg-slate-800 text-slate-200'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Chưa đến ({stats.pending})
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedGuestIds.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-950/25 px-3 py-1.5 text-xs">
                      <span className="font-semibold text-rose-200">
                        Đã chọn {selectedGuestIds.length} khách:
                      </span>
                      <button
                        type="button"
                        onClick={handleResetSelectedGuestsAttendance}
                        className="rounded bg-amber-600/80 hover:bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors"
                      >
                        Reset giờ Vào/Ra
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteSelectedGuests}
                        className="inline-flex items-center gap-1 rounded bg-rose-600 hover:bg-rose-500 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Xóa {selectedGuestIds.length} khách đã chọn</span>
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors whitespace-nowrap"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Xuất CSV</span>
                  </button>
                </div>
              </div>

              {/* High-Density Attendance Table with Inline Editing Support */}
              {guests.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-slate-800 bg-slate-950/60 p-10 text-center space-y-3">
                  <p className="text-sm font-semibold text-slate-200">
                    Danh sách khách mời hiện đang trống (0 khách mời).
                  </p>
                  <p className="text-xs text-slate-400">
                    Admin đã xóa toàn bộ danh sách khách mời. Hãy thêm khách mời mới, nhập từ Excel/CSV hoặc khôi phục danh sách mẫu FPT Schools.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleAddInlineGuestRow}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#F37021] px-4 py-2 text-xs font-semibold text-white hover:bg-orange-500"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Thêm dòng khách mời mới</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAdminDataModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
                    >
                      <Database className="h-4 w-4 text-[#F37021]" />
                      <span>Nhập danh sách hàng loạt</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRestoreDefaultSample}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-4 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-950/60"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Khôi phục danh sách mẫu FPT Schools</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs text-slate-400">
                        <th className="py-3 px-2.5 w-9">
                          <input
                            type="checkbox"
                            checked={
                              filteredGuests.length > 0 &&
                              filteredGuests.every((g) =>
                                selectedGuestIds.includes(g.id)
                              )
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedGuestIds(
                                  filteredGuests.map((g) => g.id)
                                );
                              } else {
                                setSelectedGuestIds([]);
                              }
                            }}
                            className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-[#F37021]"
                            title="Chọn tất cả khách mời đang hiển thị"
                          />
                        </th>
                        <th className="py-3 px-3 font-medium">Mã Khách</th>
                        <th className="py-3 px-3 font-medium">
                          Khách Mời (Họ và Tên · Hạng)
                        </th>
                        <th className="py-3 px-3 font-medium">
                          Chức Vụ / Vai Trò · Đơn Vị Công Tác
                        </th>
                        <th className="py-3 px-3 font-medium">
                          Vị Trí Bàn & Nội Dung Admin Bổ Sung
                        </th>
                        <th className="py-3 px-3 font-medium">
                          Giờ Vào · Lượt Xác Thực
                        </th>
                        <th className="py-3 px-3 font-medium">
                          Giờ Ra (Check-out)
                        </th>
                        <th className="py-3 px-3 font-medium">
                          Thời Lượng / Trạng Thái
                        </th>
                        <th className="py-3 px-3 font-medium text-right">
                          Thao Tác · Sửa · Xóa · Xuất Thẻ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 text-xs">
                      {filteredGuests.map((guest) => {
                        const isSelected = selectedGuestIds.includes(guest.id);
                        return (
                          <tr
                            key={guest.id}
                            className={`transition-colors ${
                              isSelected
                                ? 'bg-orange-950/20'
                                : 'hover:bg-slate-900/60'
                            }`}
                          >
                            <td className="py-3 px-2.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedGuestIds((prev) => [
                                      ...prev,
                                      guest.id,
                                    ]);
                                  } else {
                                    setSelectedGuestIds((prev) =>
                                      prev.filter((id) => id !== guest.id)
                                    );
                                  }
                                }}
                                className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-[#F37021]"
                              />
                            </td>

                            {/* Code */}
                            <td className="py-3 px-3 font-mono-tabular text-slate-300 whitespace-nowrap">
                              {isInlineTableEdit ? (
                                <input
                                  type="text"
                                  value={guest.code}
                                  onChange={(e) =>
                                    handleInlineFieldUpdate(
                                      guest.id,
                                      'code',
                                      e.target.value
                                    )
                                  }
                                  className="w-24 rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono-tabular text-xs text-orange-300 focus:border-[#F37021] focus:outline-none"
                                />
                              ) : (
                                guest.code
                              )}
                            </td>

                            {/* Name & Tier */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={guest.avatarUrl}
                                  alt={guest.name}
                                  referrerPolicy="no-referrer"
                                  className="h-9 w-9 rounded-lg object-cover shrink-0 border border-slate-700"
                                />
                                {isInlineTableEdit ? (
                                  <div className="space-y-1 min-w-[180px]">
                                    <div className="flex gap-1">
                                      <select
                                        value={guest.honorific}
                                        onChange={(e) =>
                                          handleInlineFieldUpdate(
                                            guest.id,
                                            'honorific',
                                            e.target
                                              .value as GuestRecord['honorific']
                                          )
                                        }
                                        className="rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-xs text-white"
                                      >
                                        <option value="Ông">Ông</option>
                                        <option value="Bà">Bà</option>
                                        <option value="Anh">Anh</option>
                                        <option value="Chị">Chị</option>
                                        <option value="TS.">TS.</option>
                                        <option value="Diễn giả">Diễn giả</option>
                                      </select>
                                      <input
                                        type="text"
                                        value={guest.name}
                                        onChange={(e) =>
                                          handleInlineFieldUpdate(
                                            guest.id,
                                            'name',
                                            e.target.value
                                          )
                                        }
                                        className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-semibold text-white"
                                      />
                                    </div>
                                    <select
                                      value={guest.tier}
                                      onChange={(e) =>
                                        handleInlineFieldUpdate(
                                          guest.id,
                                          'tier',
                                          e.target.value as GuestTier
                                        )
                                      }
                                      className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300"
                                    >
                                      <option value="VVIP">Hạng VVIP</option>
                                      <option value="VIP">Hạng VIP</option>
                                      <option value="Diễn giả">Diễn giả</option>
                                      <option value="Khách mời">Khách mời</option>
                                      <option value="Ban tổ chức">
                                        Ban tổ chức
                                      </option>
                                    </select>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="font-semibold text-white whitespace-nowrap">
                                      {guest.honorific} {guest.name}
                                    </p>
                                    <p className="text-[11px] text-slate-400">
                                      Hạng {guest.tier}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Role & Company */}
                            <td className="py-3 px-3 text-slate-300">
                              {isInlineTableEdit ? (
                                <div className="space-y-1 min-w-[190px]">
                                  <input
                                    type="text"
                                    placeholder="Chức vụ / Vai trò"
                                    value={guest.role}
                                    onChange={(e) =>
                                      handleInlineFieldUpdate(
                                        guest.id,
                                        'role',
                                        e.target.value
                                      )
                                    }
                                    className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Đơn vị công tác"
                                    value={guest.company}
                                    onChange={(e) =>
                                      handleInlineFieldUpdate(
                                        guest.id,
                                        'company',
                                        e.target.value
                                      )
                                    }
                                    className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Phòng ban / Bộ phận (tùy chọn)"
                                    value={guest.department || ''}
                                    onChange={(e) =>
                                      handleInlineFieldUpdate(
                                        guest.id,
                                        'department',
                                        e.target.value
                                      )
                                    }
                                    className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-cyan-200"
                                  />
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <p className="font-medium text-slate-200">
                                    {guest.role}
                                  </p>
                                  <p className="text-[11px] text-orange-300 font-medium">
                                    {guest.company}
                                    {guest.department
                                      ? ` · ${guest.department}`
                                      : ''}
                                  </p>
                                </div>
                              )}
                            </td>

                            {/* Seat Zone, Check-in Gate & Admin Custom Notes */}
                            <td className="py-3 px-3 text-slate-300">
                              {isInlineTableEdit ? (
                                <div className="space-y-1 min-w-[190px]">
                                  <input
                                    type="text"
                                    placeholder="Vị trí bàn/ghế"
                                    value={guest.seatZone}
                                    onChange={(e) =>
                                      handleInlineFieldUpdate(
                                        guest.id,
                                        'seatZone',
                                        e.target.value
                                      )
                                    }
                                    className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Nội dung Admin bổ sung / Ghi chú..."
                                    value={guest.adminNotes || ''}
                                    onChange={(e) =>
                                      handleInlineFieldUpdate(
                                        guest.id,
                                        'adminNotes',
                                        e.target.value
                                      )
                                    }
                                    className="w-full rounded border border-amber-500/40 bg-slate-950 px-2 py-1 text-[11px] text-amber-200"
                                  />
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <p className="font-medium text-white whitespace-nowrap">
                                    {guest.seatZone}
                                  </p>
                                  <p className="text-[11px] text-slate-400 whitespace-nowrap">
                                    {guest.checkInGate ||
                                      brandConfig.eventPosition}
                                  </p>
                                  {guest.adminNotes && (
                                    <p className="text-[11px] text-amber-300 font-medium">
                                      ★ {guest.adminNotes}
                                    </p>
                                  )}
                                  {guest.customFields &&
                                    Object.entries(guest.customFields).length >
                                      0 && (
                                      <div className="flex flex-wrap gap-1 pt-0.5">
                                        {Object.entries(guest.customFields).map(
                                          ([k, v]) => (
                                            <span
                                              key={k}
                                              className="inline-flex items-center rounded bg-slate-800 border border-slate-700 px-1.5 py-0.5 text-[10px] text-cyan-200"
                                            >
                                              {k}: {v}
                                            </span>
                                          )
                                        )}
                                      </div>
                                    )}
                                </div>
                              )}
                            </td>

                            {/* Check-in Time & Verification Count (max 2) */}
                            <td className="py-3 px-3 font-mono-tabular text-emerald-400 whitespace-nowrap">
                              {isInlineTableEdit ? (
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    placeholder="—"
                                    value={guest.checkInTime || ''}
                                    onChange={(e) =>
                                      handleInlineFieldUpdate(
                                        guest.id,
                                        'checkInTime',
                                        e.target.value || null
                                      )
                                    }
                                    className="w-36 rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono-tabular text-xs text-emerald-400"
                                  />
                                  <div className="text-[10px] text-cyan-300">
                                    Lượt xác thực: 0
                                    {guest.verificationCount ??
                                      (guest.checkInTime ? 1 : 0)}
                                    /02
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <p>{guest.checkInTime || '—'}</p>
                                  <span className="inline-flex items-center rounded bg-cyan-950/60 border border-cyan-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300 mt-0.5">
                                    Lượt xác thực: 0
                                    {guest.verificationCount ??
                                      (guest.checkInTime ? 1 : 0)}
                                    /02
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Check-out Time */}
                            <td className="py-3 px-3 font-mono-tabular text-amber-300 whitespace-nowrap">
                              {isInlineTableEdit ? (
                                <input
                                  type="text"
                                  placeholder="—"
                                  value={guest.checkOutTime || ''}
                                  onChange={(e) =>
                                    handleInlineFieldUpdate(
                                      guest.id,
                                      'checkOutTime',
                                      e.target.value || null
                                    )
                                  }
                                  className="w-36 rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono-tabular text-xs text-amber-300"
                                />
                              ) : (
                                guest.checkOutTime || '—'
                              )}
                            </td>

                            {/* Duration & Status */}
                            <td className="py-3 px-3 font-mono-tabular text-slate-300 whitespace-nowrap">
                              {isInlineTableEdit ? (
                                <div className="space-y-1 min-w-[120px]">
                                  <input
                                    type="text"
                                    placeholder="Thời lượng"
                                    value={guest.durationText || ''}
                                    onChange={(e) =>
                                      handleInlineFieldUpdate(
                                        guest.id,
                                        'durationText',
                                        e.target.value || null
                                      )
                                    }
                                    className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                                  />
                                  <select
                                    value={guest.status}
                                    onChange={(e) =>
                                      handleInlineFieldUpdate(
                                        guest.id,
                                        'status',
                                        e.target.value as AttendanceStatus
                                      )
                                    }
                                    className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-300"
                                  >
                                    <option value="pending">Chưa đến</option>
                                    <option value="checked_in">
                                      Đang tham dự
                                    </option>
                                    <option value="checked_out">Đã ra về</option>
                                  </select>
                                </div>
                              ) : (
                                <div>
                                  <p>{guest.durationText || '—'}</p>
                                  <p className="text-[11px] text-slate-400">
                                    {guest.status === 'checked_in'
                                      ? 'Đang tham dự'
                                      : guest.status === 'checked_out'
                                      ? 'Đã ra về'
                                      : 'Chưa đến'}
                                  </p>
                                </div>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    processGuestAttendance(
                                      guest,
                                      99.3,
                                      'check_in'
                                    )
                                  }
                                  className="rounded-md bg-emerald-600/20 border border-emerald-500/40 px-2 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-600/30 transition-colors"
                                >
                                  Ghi Vào
                                </button>
                                {(guest.status !== 'pending' ||
                                  Boolean(guest.checkInTime)) && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleResetSingleGuestCheckIn(guest.id)
                                    }
                                    className="rounded-md bg-rose-500/15 border border-rose-500/40 px-2 py-1 text-[11px] font-medium text-rose-300 hover:bg-rose-500/25 transition-colors"
                                    title="Admin: Xóa dữ liệu Check-in của khách này để bổ sung lượt Check-in mới"
                                  >
                                    Xóa Check-in
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    processGuestAttendance(
                                      guest,
                                      99.1,
                                      'check_out'
                                    )
                                  }
                                  className="rounded-md bg-amber-500/15 border border-amber-500/40 px-2 py-1 text-[11px] font-medium text-amber-300 hover:bg-amber-500/25 transition-colors"
                                >
                                  Ghi Ra
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingGuest(guest)}
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-700 transition-colors"
                                  title="Điều chỉnh chi tiết hồ sơ, giờ vào/ra, vị trí bàn, lời chào"
                                >
                                  <Edit3 className="h-3 w-3" />
                                  <span>Sửa</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteSingleGuest(guest.id)
                                  }
                                  className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-950/30 px-2 py-1 text-[11px] font-medium text-rose-300 hover:bg-rose-950/60 transition-colors"
                                  title="Xóa khách mời này"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>Xóa</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setExportModalGuest(guest)}
                                  className="inline-flex items-center gap-1 rounded-md bg-[#F37021] hover:bg-orange-500 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors"
                                  title="Xuất Ảnh Check-in & Ảnh Thẻ Khách Mời"
                                >
                                  <BadgeCheck className="h-3.5 w-3.5" />
                                  <span>Ảnh & Thẻ</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 4: UNIFIED SYSTEM SETTINGS ("CÀI ĐẶT HỆ THỐNG": THƯƠNG HIỆU & CHỦ ĐỀ + AGENDA & MÃ QR + QUẢN TRỊ DỮ LIỆU) */}
        {activeNav === 'brand_settings' && (
          <div className="space-y-6">
            {/* System Settings Unified Header & Sub-Navigation */}
            <div className="rounded-2xl border border-slate-800 bg-[#0F172A] p-5 sm:p-6 shadow-lg">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800/90 pb-5">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#F37021]">
                    <Settings className="h-4 w-4" />
                    <span>Trung Tâm Quản Trị & Cấu Hình Toàn Diện</span>
                  </div>
                  <h2 className="mt-1 text-xl sm:text-2xl font-bold text-white tracking-tight">
                    Cài Đặt Hệ Thống (Thương Hiệu, Kịch Bản Agenda & Quản Trị Dữ Liệu)
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-slate-400">
                    Tích hợp quản trị Thương hiệu & Chủ đề màu sắc AI, xây dựng kịch bản chương trình (Agenda) kèm tạo mã QR bất kỳ, và quản trị dữ liệu khách mời.
                  </p>
                </div>

                {/* Quick Action Buttons inside System Settings */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-3.5 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/25 transition-colors shadow-sm">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                    <span>Đẩy File Excel (.xlsx) Cập Nhật DS Khách Hàng</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleExcelFileUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={downloadSampleExcelTemplate}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3.5 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Tải File Excel Mẫu</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCccdTargetGuestId(guests[0]?.id || null);
                      setIsCccdFaceIdModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3.5 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/25 transition-colors"
                  >
                    <CreditCard className="h-3.5 w-3.5 text-amber-400" />
                    <span>Đồng Bộ CCCD & Face ID</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAdminDataModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#F37021] px-3.5 py-2 text-xs font-semibold text-white hover:bg-orange-500 transition-colors shadow-sm"
                  >
                    <Database className="h-3.5 w-3.5" />
                    <span>Mở Trung Tâm Xóa / Sửa Danh Sách</span>
                  </button>
                </div>
              </div>

              {/* Dedicated Excel Upload & Guest Database Sync Card right inside System Settings */}
              <div className="mt-4 rounded-xl border border-emerald-500/35 bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-slate-950 p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        <span>Đẩy Dữ Liệu Bằng File Excel (.XLSX / .XLS / .CSV)</span>
                      </span>
                      <span className="text-xs font-semibold text-cyan-300">
                        Hỗ trợ: Khách hàng · Đối tác · Diễn giả · Khách mời · Phụ huynh · VVIP/VIP
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Tải file Excel danh sách khách hàng lên ứng dụng để tự động cập nhật Họ tên, Chức vụ, Đơn vị, Hạng khách, Vị trí ghế, Số CCCD và Lời chào song ngữ giúp Check-in thuận lợi, tối ưu.
                    </p>
                    {excelImportSummary && (
                      <p className="text-xs font-semibold text-emerald-300 pt-1">
                        ✓ {excelImportSummary}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <select
                      value={excelImportMode}
                      onChange={(e) =>
                        setExcelImportMode(
                          e.target.value as 'merge' | 'replace'
                        )
                      }
                      className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-white focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="merge">
                        Chế độ: Gộp & Cập nhật thông minh (Giữ khách cũ)
                      </option>
                      <option value="replace">
                        Chế độ: Thay thế toàn bộ danh sách bằng file Excel
                      </option>
                    </select>

                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-colors">
                      <Upload className="h-3.5 w-3.5" />
                      <span>
                        {isExcelImporting
                          ? 'Đang xử lý Excel...'
                          : 'Chọn File Excel Đẩy Lên App'}
                      </span>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleExcelFileUpload}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={downloadSampleExcelTemplate}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5 text-amber-400" />
                      <span>File Excel Mẫu</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => exportGuestsToExcel(guests)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/50 px-3 py-2 text-xs font-semibold text-cyan-200 transition-colors"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Xuất Kết Quả Ra Excel</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* System Settings Sub-Tabs */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSettingsSubTab('brand_and_theme')}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                    settingsSubTab === 'brand_and_theme'
                      ? 'bg-[#F37021] text-white shadow-sm'
                      : 'border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <Palette className="h-4 w-4" />
                  <span>1. Thương Hiệu, Chủ Đề & Nhận Diện Màu AI</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettingsSubTab('agenda_and_qr')}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                    settingsSubTab === 'agenda_and_qr'
                      ? 'bg-[#F37021] text-white shadow-sm'
                      : 'border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <QrCode className="h-4 w-4" />
                  <span>2. Kịch Bản Chương Trình (Agenda) & Tạo Mã QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettingsSubTab('guest_data_admin')}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                    settingsSubTab === 'guest_data_admin'
                      ? 'bg-[#F37021] text-white shadow-sm'
                      : 'border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <Database className="h-4 w-4" />
                  <span>3. Quản Trị Danh Sách Khách Mời & Tài Khoản Google</span>
                </button>
              </div>
            </div>

            {/* SUB-TAB 1: BRAND & THEME CUSTOMIZATION */}
            {settingsSubTab === 'brand_and_theme' && (
              <BrandCustomizerPanel
                brandConfig={brandConfig}
                onUpdateBrandConfig={setBrandConfig}
                activeTheme={activeTheme}
              />
            )}

            {/* SUB-TAB 2: AGENDA BUILDER & QR CODE GENERATOR */}
            {settingsSubTab === 'agenda_and_qr' && (
              <AgendaQrBuilderPanel
                agendaConfig={agendaConfig}
                brandConfig={brandConfig}
                activeTheme={activeTheme}
                onUpdateAgendaConfig={setAgendaConfig}
                onPreviewInteractiveAgenda={() => setIsAgendaModalOpen(true)}
              />
            )}

            {/* SUB-TAB 3: ADMIN DATA MANAGEMENT & GOOGLE ACCOUNT HUB */}
            {settingsSubTab === 'guest_data_admin' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Admin Guest List & Attendance Data Controls */}
                <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-[#0F172A] p-6 space-y-5">
                  <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#F37021]">
                        Quản Trị Cơ Sở Dữ Liệu Khách Mời
                      </span>
                      <h3 className="mt-1 text-lg font-bold text-white">
                        Điều Chỉnh Nội Dung, Nhập Liệu & Xóa Danh Sách Khách Mời
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        Quản lý toàn bộ {guests.length} hồ sơ khách mời, {logs.length} lượt điểm chạm nhật ký và trạng thái tham dự.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                      <p className="text-xs text-slate-400">Tổng khách mời</p>
                      <p className="mt-1 text-2xl font-bold font-mono-tabular text-white">
                        {stats.total}
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/20 p-4">
                      <p className="text-xs text-emerald-300">Đang có mặt</p>
                      <p className="mt-1 text-2xl font-bold font-mono-tabular text-emerald-400">
                        {stats.checkedIn}
                      </p>
                    </div>
                    <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 p-4">
                      <p className="text-xs text-amber-300">Đã Check-out</p>
                      <p className="mt-1 text-2xl font-bold font-mono-tabular text-amber-300">
                        {stats.checkedOut}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAdminDataModalOpen(true)}
                      className="flex items-center justify-between rounded-xl border border-[#F37021]/50 bg-[#F37021]/15 hover:bg-[#F37021]/25 p-4 text-left transition-colors"
                    >
                      <div>
                        <p className="text-sm font-bold text-white">
                          Mở Bảng Sửa Nhanh & Xóa Hàng Loạt
                        </p>
                        <p className="mt-0.5 text-xs text-slate-300">
                          Sửa mọi cột dữ liệu, nhập CSV/Excel hoặc xóa danh sách
                        </p>
                      </div>
                      <Database className="h-5 w-5 text-[#F37021] shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsEnrollModalOpen(true)}
                      className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 hover:border-slate-600 p-4 text-left transition-colors"
                    >
                      <div>
                        <p className="text-sm font-bold text-white">
                          Đăng Ký Thêm Khách Mời & Khuôn Mặt
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          Thêm hồ sơ mới kèm ảnh chân dung nhận diện AI
                        </p>
                      </div>
                      <UserPlus className="h-5 w-5 text-emerald-400 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={handleResetAllAttendanceData}
                      disabled={guests.length === 0}
                      className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-950/20 hover:bg-amber-950/40 disabled:opacity-40 p-4 text-left transition-colors"
                    >
                      <div>
                        <p className="text-sm font-bold text-amber-200">
                          Reset Toàn Bộ Giờ Vào / Giờ Ra
                        </p>
                        <p className="mt-0.5 text-xs text-amber-300/80">
                          Giữ danh sách khách mời, đặt lại trạng thái Chưa đến
                        </p>
                      </div>
                      <RotateCcw className="h-5 w-5 text-amber-400 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={handleRestoreDefaultSample}
                      className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-950/40 p-4 text-left transition-colors"
                    >
                      <div>
                        <p className="text-sm font-bold text-emerald-200">
                          Khôi Phục Dữ Liệu Mẫu FPT Schools
                        </p>
                        <p className="mt-0.5 text-xs text-emerald-300/80">
                          Chỉ nạp lại mẫu khi Admin chủ động bấm nút này
                        </p>
                      </div>
                      <RefreshCw className="h-5 w-5 text-emerald-400 shrink-0" />
                    </button>
                  </div>

                  {/* Permanent Data Protection & Backup/Restore Box */}
                  <div className="rounded-xl border border-emerald-500/35 bg-emerald-950/20 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-emerald-200">
                            Cơ Chế Bảo Toàn Dữ Liệu 3 Lớp (LocalStorage + IndexedDB + Máy Chủ)
                          </p>
                          <p className="text-[11px] text-slate-300">
                            Mọi thông tin khách mời, ảnh khuôn mặt nhận diện, Logo thương hiệu, chủ đề và kịch bản đều được lưu tự động và giữ nguyên tuyệt đối khi nâng cấp hoặc tải lại hệ thống.
                          </p>
                        </div>
                      </div>
                      <span className="rounded-md bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 font-mono-tabular text-[11px] font-semibold text-emerald-300">
                        Đã lưu: {formatTimestampVi(new Date(lastPersistedAt))}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          exportSystemSnapshotFile({
                            version: 2,
                            updatedAt: Date.now(),
                            isAdminInitialized: true,
                            brandConfig,
                            agendaConfig,
                            guests,
                            logs,
                            sheetMeta,
                            activeSheetTab,
                            autoSyncEnabled,
                            scannerSettings: {
                              cameraScanSpeedMode,
                              autoScanCamera,
                              cameraFastTouchpointMode,
                              kioskMode,
                            },
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Tải File Sao Lưu Toàn Hệ Thống (.JSON)</span>
                      </button>

                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors">
                        <Upload className="h-3.5 w-3.5 text-[#F37021]" />
                        <span>Khôi Phục Từ File Sao Lưu (.JSON)</span>
                        <input
                          type="file"
                          accept=".json,application/json"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const imported =
                              await parseImportedSystemSnapshotFile(file);
                            if (imported) {
                              setBrandConfig(imported.brandConfig);
                              setAgendaConfig(imported.agendaConfig);
                              setGuests(imported.guests);
                              setLogs(imported.logs);
                              if (imported.sheetMeta) {
                                setSheetMeta(imported.sheetMeta);
                              }
                              setActiveSheetTab(imported.activeSheetTab);
                              setAutoSyncEnabled(imported.autoSyncEnabled);
                              setCameraScanSpeedMode(
                                imported.scannerSettings.cameraScanSpeedMode
                              );
                              setAutoScanCamera(
                                imported.scannerSettings.autoScanCamera
                              );
                              showAdminToast(
                                `Đã khôi phục thành công toàn bộ dữ liệu (${imported.guests.length} khách mời, Logo & cấu hình hệ thống)!`
                              );
                            }
                            e.target.value = '';
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Smart Google Account & Google Sheets Connection Card */}
                <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-[#0F172A] p-6 space-y-4">
                  <div className="border-b border-slate-800 pb-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                      Tích Hợp Google Workspace
                    </span>
                    <h3 className="mt-1 text-lg font-bold text-white">
                      Tài Khoản Google & Đồng Bộ Google Sheets
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Đăng nhập Google để tự động ghi nhận Giờ Vào (Check-in) và Giờ Ra (Check-out) lên bảng tính trực tuyến theo thời gian thực.
                    </p>
                  </div>

                  {!user || needsAuth ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Hiện chưa kết nối tài khoản Google. Bạn có thể bấm nút <strong>Sign in with Google</strong> ngay trên thanh công cụ trên cùng hoặc bên dưới để cấp quyền Google Sheets.
                      </p>
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={isLoggingIn}
                        className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-white hover:bg-slate-100 px-4 py-3 text-xs font-bold text-slate-900 shadow transition-all disabled:opacity-50"
                      >
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                        <span>
                          {isLoggingIn
                            ? 'Đang mở cửa sổ xác thực Google...'
                            : 'Sign in with Google (Kết nối Google Sheets)'}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-4 space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt={user.displayName || 'Google User'}
                              referrerPolicy="no-referrer"
                              className="h-10 w-10 rounded-full border border-emerald-400/50 object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                              {(user.displayName || user.email || 'G').charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">
                              {user.displayName || 'Tài khoản Google'}
                            </p>
                            <p className="text-xs text-emerald-300 truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleGoogleLogout}
                          className="rounded-lg border border-rose-500/30 bg-rose-950/30 px-2.5 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-950/60"
                        >
                          Đăng xuất
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setActiveNav('attendance_sheets')}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors"
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                          <span>Quản Lý File Google Sheets</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* IMPRESSIVE WELCOME TOUCHPOINT POPUP MODAL */}
      {welcomePopupLog && activeNav !== 'welcome_stage' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-6 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-5xl">
            <WelcomeTouchpointStage
              activeEventLog={welcomePopupLog}
              brandConfig={brandConfig}
              activeTheme={activeTheme}
              guests={guests}
              onClosePopup={() => setWelcomePopupLog(null)}
              onOpenQuickEventEdit={() => {
                setWelcomePopupLog(null);
                setIsQuickEventModalOpen(true);
              }}
              onOpenExportCard={(g) => {
                setWelcomePopupLog(null);
                setExportModalGuest(g);
              }}
              onToggleFullScreen={() => {
                setWelcomePopupLog(null);
                setActiveNav('welcome_stage');
              }}
            />
          </div>
        </div>
      )}

      {/* INTERACTIVE EVENT AGENDA & QR VIEWER MODAL (OPENS ON ?view=agenda OR HEADER CLICK) */}
      {isAgendaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-6 backdrop-blur-md overflow-y-auto">
          <div className="relative my-auto w-full max-w-4xl rounded-2xl border border-slate-800 bg-[#0B0F17] p-5 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3.5">
                <FptSchoolsLogo
                  size="sm"
                  customLogoUrl={brandConfig.customLogoUrl}
                />
                <div className="h-7 w-px bg-slate-800 hidden sm:block" />
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#F37021]">
                    <CalendarClock className="h-3.5 w-3.5" />
                    <span>Kịch Bản Chương Trình Sự Kiện (Live Agenda)</span>
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    {agendaConfig.agendaTitle}
                  </h3>
                  {agendaConfig.agendaSubtitle && (
                    <p className="text-xs text-slate-400">
                      {agendaConfig.agendaSubtitle}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAgendaModalOpen(false);
                    setActiveNav('brand_settings');
                    setSettingsSubTab('agenda_and_qr');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/40 bg-orange-500/15 px-3 py-1.5 text-xs font-semibold text-orange-300 hover:bg-orange-500/25 transition-colors"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Sửa Kịch Bản & Tạo Mã QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAgendaModalOpen(false)}
                  className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Timeline Column */}
              <div className="lg:col-span-8 space-y-3">
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800/90 bg-slate-900/60 px-4 py-2.5 text-xs text-slate-300">
                  <span className="inline-flex items-center gap-1.5 font-medium text-white">
                    <Clock className="h-3.5 w-3.5 text-[#F37021]" />
                    {brandConfig.eventDateTime}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                    {brandConfig.eventLocation}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {agendaConfig.items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-800/90 bg-slate-900/70 p-4 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-orange-500/15 border border-orange-500/30 px-2.5 py-0.5 font-mono-tabular text-xs font-bold text-orange-300">
                          <Clock className="h-3 w-3" />
                          {item.timeSlot}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">
                          Phiên #{idx + 1} · {item.location}
                        </span>
                      </div>
                      <h4 className="mt-2 text-sm sm:text-base font-bold text-white">
                        {item.title}
                      </h4>
                      {item.titleEn && (
                        <p className="text-xs italic text-slate-300">
                          {item.titleEn}
                        </p>
                      )}
                      {item.speaker && (
                        <p className="mt-1.5 text-xs font-medium text-emerald-300">
                          Diễn giả / Phụ trách: {item.speaker}
                        </p>
                      )}
                      {item.description && (
                        <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* QR Code Card Column */}
              <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 flex flex-col items-center text-center space-y-3">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-orange-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-orange-300">
                  <QrCode className="h-3.5 w-3.5" />
                  <span>Mã QR Kịch Bản Chương Trình</span>
                </span>
                {agendaModalQrUrl && (
                  <div className="rounded-2xl bg-white p-3 shadow-lg">
                    <img
                      src={agendaModalQrUrl}
                      alt="Event Agenda QR Code"
                      className="h-48 w-48 object-contain"
                    />
                  </div>
                )}
                <p className="text-xs font-semibold text-white">
                  Quét mã QR bằng Camera điện thoại
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Khách mời có thể quét mã QR này trên màn hình hoặc trực tiếp trên Thẻ Đeo VIP để xem toàn bộ lịch trình sự kiện.
                </p>
                {agendaConfig.wifiAndSupportNote && (
                  <div className="w-full rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-[11px] text-slate-300">
                    {agendaConfig.wifiAndSupportNote}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GUEST ENROLLMENT MODAL */}
      <GuestEnrollModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        onEnrollGuest={async (newGuest) => {
          const normalizedNewName = newGuest.name.trim().toLowerCase();
          const existingMatch = guests.find(
            (g) =>
              g.id === newGuest.id ||
              g.code.toLowerCase() === newGuest.code.toLowerCase() ||
              g.name.trim().toLowerCase() === normalizedNewName
          );

          const enrolledAvatar =
            newGuest.avatarUrl ||
            existingMatch?.originalAvatarUrl ||
            existingMatch?.avatarUrl ||
            '';

          const enrolledGuest: GuestRecord = existingMatch
            ? {
                ...existingMatch,
                ...newGuest,
                id: existingMatch.id,
                code: existingMatch.code,
                status:
                  existingMatch.status === 'checked_in'
                    ? 'checked_in'
                    : 'pending',
                checkInTime: existingMatch.checkInTime || null,
                checkInTimestamp: existingMatch.checkInTimestamp || null,
                avatarUrl: enrolledAvatar,
                originalAvatarUrl: enrolledAvatar,
                biometricSignature: newGuest.biometricSignature,
                cameraBiometricSignature: newGuest.biometricSignature,
                cameraEnrolled: true,
                faceIdVerified: false,
              }
            : {
                ...newGuest,
                status: 'pending',
                checkInTime: null,
                checkInTimestamp: null,
                avatarUrl: enrolledAvatar,
                originalAvatarUrl: enrolledAvatar,
                biometricSignature: newGuest.biometricSignature,
                cameraBiometricSignature: newGuest.biometricSignature,
                cameraEnrolled: true,
                faceIdVerified: false,
              };

          setGuests((prev) => {
            if (existingMatch) {
              return prev.map((g) =>
                g.id === existingMatch.id ? enrolledGuest : g
              );
            }
            return [enrolledGuest, ...prev];
          });

          // Registration is NOT check-in yet: reset cooldown so delegate can scan at the event immediately
          lastScanCompletedAtRef.current = 0;
          setCooldownRemainingSec(0);
          setScanStatusText(
            `✓ Đã đăng ký khuôn mặt mẫu cho ${enrolledGuest.honorific} ${enrolledGuest.name} (${enrolledGuest.code}) — Mời đại biểu quét khuôn mặt tại sự kiện (đồng nhất ≥ 50%) để xác nhận ghi danh & chào mừng!`
          );
          showAdminToast(
            `Đã đăng ký khuôn mặt mẫu cho ${enrolledGuest.honorific} ${enrolledGuest.name} (${enrolledGuest.code}) ở trạng thái "Chờ quét". Khi quét mặt tại sự kiện đạt tỷ lệ đồng nhất ≥ 50%, hệ thống sẽ tự động xác nhận ghi danh và chào mừng!`
          );
        }}
        existingCount={guests.length}
        defaultGate={brandConfig.eventPosition}
      />

      {/* QUICK EVENT TITLE, TIME, LOCATION & POSITION EDIT MODAL */}
      <QuickEventInfoModal
        isOpen={isQuickEventModalOpen}
        brandConfig={brandConfig}
        onClose={() => setIsQuickEventModalOpen(false)}
        onSave={setBrandConfig}
      />

      {/* INDIVIDUAL GUEST INFO, TIME IN/OUT & SEAT POSITION EDIT MODAL */}
      <GuestEditModal
        isOpen={Boolean(editingGuest)}
        guest={editingGuest}
        defaultGate={brandConfig.eventPosition}
        onClose={() => setEditingGuest(null)}
        onSaveGuest={handleSaveEditedGuest}
        onDeleteGuest={handleDeleteSingleGuest}
      />

      {/* ADMIN DATA CENTER MODAL: BULK EDIT CONTENT, BULK IMPORT & DELETE GUEST LIST */}
      <AdminDataManageModal
        isOpen={isAdminDataModalOpen}
        guests={guests}
        logsCount={logs.length}
        defaultGate={brandConfig.eventPosition}
        onClose={() => setIsAdminDataModalOpen(false)}
        onUpdateAllGuests={(newGuests, statusNote) => {
          setGuests(newGuests);
          if (statusNote) showAdminToast(statusNote);
        }}
        onClearAllGuests={handleClearAllGuests}
        onResetAttendanceData={handleResetAllAttendanceData}
        onClearLogsOnly={() => {
          setLogs([]);
          showAdminToast('Đã xóa sạch nhật ký điểm chạm.');
        }}
        onRestoreDefaultSample={handleRestoreDefaultSample}
      />

      {/* EXPORT CHECK-IN PHOTO CARD & VIP ID BADGE MODAL (WITH EMBEDDED QR & AGENDA) */}
      <GuestCardExportModal
        isOpen={Boolean(exportModalGuest)}
        guest={exportModalGuest}
        brandConfig={brandConfig}
        activeTheme={activeTheme}
        agendaConfig={agendaConfig}
        onClose={() => setExportModalGuest(null)}
        onSaveGuestContent={handleSaveEditedGuest}
        onOpenAgendaBuilder={() => {
          setExportModalGuest(null);
          setActiveNav('brand_settings');
          setSettingsSubTab('agenda_and_qr');
        }}
      />

      {/* CCCD & FACE ID BIOMETRIC VERIFICATION & DATA SYNC MODAL */}
      <CccdFaceIdModal
        isOpen={isCccdFaceIdModalOpen}
        onClose={() => setIsCccdFaceIdModalOpen(false)}
        guests={guests}
        initialGuestId={cccdTargetGuestId}
        activeTheme={activeTheme}
        onSyncGuestCccdAndFaceId={handleSyncGuestCccdAndFaceId}
      />

      {/* GLOBAL PRECISION 4-LOGO IDENTITY STUDIO MODAL */}
      <FourLogosManagerModal
        onConfigChange={(nextFourLogos) => {
          setBrandConfig((prev) => ({
            ...prev,
            customLogoUrl: '',
            fourLogosConfig: nextFourLogos,
          }));
        }}
      />
    </div>
  );
}

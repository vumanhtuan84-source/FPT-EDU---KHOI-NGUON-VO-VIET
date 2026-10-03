import avatarMinhQuan from '../assets/images/avatar_guest_minh_quan_1790565466687.jpg';
import avatarThanhHa from '../assets/images/avatar_guest_thanh_ha_1790565480908.jpg';
import avatarHoangNam from '../assets/images/avatar_guest_hoang_nam_1790565494000.jpg';
import avatarLanAnh from '../assets/images/avatar_guest_lan_anh_1790565505142.jpg';

export type GuestTier =
  | 'VVIP'
  | 'VIP'
  | 'Diễn giả'
  | 'Đối tác'
  | 'Phụ huynh'
  | 'Khách mời'
  | 'Ban tổ chức';

export type AttendanceStatus = 'pending' | 'checked_in' | 'checked_out';

export type KioskActionMode = 'auto' | 'checkin_only' | 'checkout_only';

export type CameraScanSpeedMode =
  | 'balanced_accurate'
  | 'careful_high_precision'
  | 'fast_reception'
  | 'manual_only';

export type GreetingLanguage = 'bilingual' | 'vi' | 'en';

export type WelcomeAudioMode =
  | 'instrumental_and_voice'
  | 'instrumental_only'
  | 'voice_only';

export interface GuestRecord {
  id: string;
  code: string;
  name: string;
  honorific:
    | 'Ông'
    | 'Bà'
    | 'Anh'
    | 'Chị'
    | 'TS.'
    | 'Diễn giả'
    | 'Đối tác'
    | 'Phụ huynh'
    | 'Đại biểu';
  role: string; // Chức vụ / Vai trò
  company: string; // Đơn vị công tác
  department?: string; // Phòng ban / Bộ phận chuyên môn
  phone?: string; // Số điện thoại liên hệ
  email?: string; // Email đại biểu
  adminNotes?: string; // Nội dung bổ sung, ghi chú đón tiếp do Admin tự điều chỉnh trên app
  customFields?: Record<string, string>; // Các trường thông tin mở rộng từ file Excel hoặc Admin thêm
  tier: GuestTier;
  seatZone: string;
  checkInGate?: string;
  avatarUrl: string;
  originalAvatarUrl?: string; // Ảnh dữ liệu ban đầu cung cấp trên hệ thống
  checkInCaptureUrl?: string; // Ảnh khuôn mặt chụp thực tế khi quét Check-in
  cccdNumber?: string; // Số Căn cước công dân (12 số)
  dateOfBirth?: string; // Ngày sinh đồng bộ từ CCCD / Excel
  gender?: string; // Giới tính (Nam / Nữ)
  hometown?: string; // Quê quán / Địa chỉ thường trú từ CCCD
  cccdIssueDate?: string; // Ngày cấp CCCD
  faceIdVerified?: boolean; // Đã xác thực sinh trắc học Face ID AI
  faceIdVerifiedAt?: string; // Thời gian xác thực Face ID
  verificationCount?: number; // Số lần cá nhân khách mời đã xác thực (tối đa 2 lần)
  failedAttempts?: number; // Số lần thử xác thực chưa nhận diện được (tối đa 2 lần)
  customGreeting?: string;
  customGreetingEn?: string;
  checkInTime: string | null; // HH:mm:ss DD/MM/YYYY
  checkInTimestamp: number | null;
  checkOutTime: string | null;
  checkOutTimestamp: number | null;
  durationText: string | null;
  status: AttendanceStatus;
  lastConfidence: number | null;
  syncedToSheets: boolean;
  biometricSignature?: number[];
  cameraBiometricSignature?: number[]; // Chữ ký sinh trắc học bổ sung từ Camera thực tế
  cameraEnrolled?: boolean;
  lastFeatureBreakdown?: FacialFeatureBreakdown;
}

export interface FacialFeatureBreakdown {
  eyesAndBrows: number; // Đôi mắt, chân mày & kính mắt (0..100)
  noseStructure: number; // Sống mũi, cánh mũi & tỷ lệ giữa mặt (0..100)
  mouthAndChin: number; // Khuôn miệng, môi & cấu trúc cằm (0..100)
  faceContour: number; // Khung xương mặt, viền hàm & tỷ lệ trán (0..100)
}

export interface BiometricRedAlertState {
  id: string;
  timestamp: string;
  sourceType: 'camera' | 'photo';
  probeImageUrl: string;
  measuredSimilarity: number;
  requiredThreshold: number;
  attemptCount?: number;
  attemptNumber?: number;
  maxAttempts?: number;
  alertTitle: string;
  alertMessage: string;
  mismatchReasons: string[];
  featureBreakdown: FacialFeatureBreakdown;
  comparedGuest?: {
    id: string;
    code: string;
    name: string;
    honorific: string;
    role: string;
    company: string;
    seatZone: string;
    avatarUrl: string;
  } | null;
}

export interface AttendanceLogItem {
  id: string;
  guestId: string;
  guestCode: string;
  guestName: string;
  honorific: string;
  role: string;
  company: string;
  adminNotes?: string;
  customFields?: Record<string, string>;
  verificationCount?: number;
  verificationAttempt?: number;
  tier: GuestTier;
  seatZone: string;
  checkInGate?: string;
  avatarUrl: string;
  originalAvatarUrl?: string; // Ảnh dữ liệu ban đầu trên hệ thống
  capturedFrameUrl?: string; // Ảnh khuôn mặt vừa quét khi Check-in
  featureBreakdown?: FacialFeatureBreakdown;
  action: 'check_in' | 'check_out';
  timeFormatted: string;
  timestamp: number;
  confidence: number;
  welcomeMessage: string;
  welcomeMessageEn?: string;
  syncedToSheet: boolean;
}

export interface BrandThemePreset {
  id: string;
  name: string;
  subtitle: string;
  brandStyleTag: string;
  accentHex: string;
  accentLightHex: string;
  secondaryHex: string;
  tertiaryHex: string;
  accentBorderClass: string;
  accentTextClass: string;
  accentBgClass: string;
  accentButtonClass: string;
  stageGradient: string;
}

export interface CustomLogoSlotConfig {
  url: string;
  scale: number;
  visible: boolean;
  whiteBadgeBg: boolean;
  label: string;
  isCustomUploaded?: boolean;
}

export interface FourLogosConfig {
  fptEducation: CustomLogoSlotConfig;
  vovinamShield: CustomLogoSlotConfig;
  fptVovinamFederation: CustomLogoSlotConfig;
  khoiNguonVoViet2026: CustomLogoSlotConfig;
}

export interface BrandConfig {
  eventName: string;
  eventSubtitle: string;
  brandName: string;
  eventTagline: string;
  eventDateTime: string;
  eventLocation: string;
  eventPosition: string;
  greetingLanguage: GreetingLanguage;
  welcomeTemplate: string;
  welcomeTemplateEn: string;
  farewellTemplate: string;
  farewellTemplateEn: string;
  themeId: string;
  customLogoUrl?: string;
  fourLogosConfig?: FourLogosConfig;
  logoLockup: 'horizontal' | 'stacked';
  recognizedBrandStyle: string;
  recognizedThemeConcept: string;
  customPrimaryHex: string;
  customSecondaryHex: string;
  customAccentHex: string;
  enableSoundChime: boolean;
  enableVoiceGreeting: boolean;
  enableInstrumentalMusic?: boolean;
  welcomeAudioMode?: WelcomeAudioMode;
  autoPopupWelcome: boolean;
  welcomeDisplaySeconds: number;
  neonPurpleUpgradedV3?: boolean;
}

export const BRAND_THEMES: BrandThemePreset[] = [
  {
    id: 'neon_purple',
    name: 'Tím Neon Nghệ Thuật & Hoàng Kim Công Nghệ',
    subtitle: 'Ấn tượng, Nghệ thuật, Sân khấu LED Đón Tiếp & Thẻ Đại Biểu VIP (#A855F7 · #D946EF · #F5B324)',
    brandStyleTag: 'Tím Neon Nghệ Thuật · Công Nghệ Cao · Sang Trọng',
    accentHex: '#9333EA',
    accentLightHex: '#C084FC',
    secondaryHex: '#D946EF',
    tertiaryHex: '#F5B324',
    accentBorderClass: 'border-purple-500/50',
    accentTextClass: 'text-purple-300',
    accentBgClass: 'bg-purple-500/15',
    accentButtonClass:
      'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-600 hover:from-purple-500 hover:to-fuchsia-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.45)]',
    stageGradient: 'from-[#1D0B38] via-[#110622] to-[#080312]',
  },
  {
    id: 'fpt_schools',
    name: 'Tổ Chức Giáo Dục FPT — Cam Nhiệt Huyết & Xanh Tri Thức',
    subtitle: 'Chuẩn nhận diện Tổ chức Giáo dục FPT (#F37021 · #0066B2 · #0DB14B)',
    brandStyleTag: 'Hiện đại · Khai phóng · Công nghệ Giáo dục Quốc tế',
    accentHex: '#EA580C',
    accentLightHex: '#F37021',
    secondaryHex: '#0066B2',
    tertiaryHex: '#0DB14B',
    accentBorderClass: 'border-orange-500/45',
    accentTextClass: 'text-orange-400',
    accentBgClass: 'bg-orange-500/10',
    accentButtonClass: 'bg-[#F37021] hover:bg-orange-500 text-white shadow-sm',
    stageGradient: 'from-orange-950/55 via-[#0B1528] to-slate-950',
  },
  {
    id: 'obsidian_gold',
    name: 'Vàng Hoàng Gia & Đen Obsidian',
    subtitle: 'Sang trọng, Thượng đỉnh Doanh nghiệp & Gala VIP',
    brandStyleTag: 'Thượng lưu · Trang trọng · Đẳng cấp Doanh nhân',
    accentHex: '#D97706',
    accentLightHex: '#F59E0B',
    secondaryHex: '#78350F',
    tertiaryHex: '#FBBF24',
    accentBorderClass: 'border-amber-500/40',
    accentTextClass: 'text-amber-400',
    accentBgClass: 'bg-amber-500/10',
    accentButtonClass: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
    stageGradient: 'from-amber-950/50 via-slate-950 to-slate-950',
  },
  {
    id: 'corporate_sapphire',
    name: 'Xanh Sapphire Công Nghệ',
    subtitle: 'Hiện đại, Tập đoàn Công nghệ & Hội nghị Chuyển đổi số',
    brandStyleTag: 'Tương lai · Đổi mới Sáng tạo · AI & Digital',
    accentHex: '#2563EB',
    accentLightHex: '#3B82F6',
    secondaryHex: '#0066B2',
    tertiaryHex: '#06B6D4',
    accentBorderClass: 'border-blue-500/40',
    accentTextClass: 'text-blue-400',
    accentBgClass: 'bg-blue-500/10',
    accentButtonClass: 'bg-blue-600 hover:bg-blue-500 text-white',
    stageGradient: 'from-blue-950/50 via-slate-950 to-slate-950',
  },
  {
    id: 'emerald_prestige',
    name: 'Xanh Ngọc Lục Bảo Tinh Tế',
    subtitle: 'Bền vững, Giáo dục Xanh & Đầu tư Phát triển ESG',
    brandStyleTag: 'Bền vững · Sinh thái Xanh · Hài hòa',
    accentHex: '#059669',
    accentLightHex: '#10B981',
    secondaryHex: '#0DB14B',
    tertiaryHex: '#34D399',
    accentBorderClass: 'border-emerald-500/40',
    accentTextClass: 'text-emerald-400',
    accentBgClass: 'bg-emerald-500/10',
    accentButtonClass: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    stageGradient: 'from-emerald-950/50 via-slate-950 to-slate-950',
  },
  {
    id: 'crimson_summit',
    name: 'Đỏ Ruby Sự Kiện Lớn',
    subtitle: 'Nổi bật, Lễ Kỷ niệm Thành lập & Vinh danh',
    brandStyleTag: 'Nhiệt huyết · Tự hào · Lễ hội Vinh danh',
    accentHex: '#E11D48',
    accentLightHex: '#F43F5E',
    secondaryHex: '#9F1239',
    tertiaryHex: '#FB7185',
    accentBorderClass: 'border-rose-500/40',
    accentTextClass: 'text-rose-400',
    accentBgClass: 'bg-rose-500/10',
    accentButtonClass: 'bg-rose-600 hover:bg-rose-500 text-white',
    stageGradient: 'from-rose-950/50 via-slate-950 to-slate-950',
  },
  {
    id: 'custom_ai',
    name: 'Màu Thương Hiệu Nhận Diện AI (Tuỳ chỉnh)',
    subtitle: 'Trích xuất tự động từ Logo / Key Visual của sự kiện',
    brandStyleTag: 'Cá nhân hóa AI · Đồng bộ Bộ nhận diện',
    accentHex: '#9333EA',
    accentLightHex: '#C084FC',
    secondaryHex: '#D946EF',
    tertiaryHex: '#F5B324',
    accentBorderClass: 'border-purple-500/50',
    accentTextClass: 'text-purple-300',
    accentBgClass: 'bg-purple-500/15',
    accentButtonClass: 'bg-purple-600 hover:bg-purple-500 text-white',
    stageGradient: 'from-[#1D0B38] via-[#110622] to-[#080312]',
  },
];

export const INITIAL_BRAND_CONFIG: BrandConfig = {
  eventName: 'Hội Nghị & Sự Kiện Tổ Chức Giáo Dục FPT — Khơi Nguồn Võ Việt 2026',
  eventSubtitle: 'Tổ Chức Giáo Dục FPT · Liên Đoàn Vovinam FPT Edu · Môn Phái Vovinam Việt Võ Đạo',
  brandName: 'TỔ CHỨC GIÁO DỤC FPT (FPT EDUCATION)',
  eventTagline: 'Khơi Nguồn Võ Việt · Tinh Hoa Võ Đạo & Công Nghệ Giáo Dục FPT',
  eventDateTime: '08:00 - 17:00 · Chủ Nhật, 27/09/2026',
  eventLocation: 'Hội Trường Lớn — Tổ Chức Giáo Dục FPT (FPT Education)',
  eventPosition: 'Cổng Đón Tiếp VIP Sảnh A1 · Khu Vực Check-in AI',
  greetingLanguage: 'vi',
  welcomeTemplate:
    'Nhiệt liệt chào mừng {honorific} {name} ({role} — {company}) đã hiện diện tại {event}!',
  welcomeTemplateEn:
    'Nhiệt liệt chào mừng {honorific} {name} ({role} — {company}) đã hiện diện tại {event}!',
  farewellTemplate:
    'Trân trọng cảm ơn {honorific} {name} đã tham dự {event}. Kính chúc Quý Đại biểu nhiều sức khỏe và thành công!',
  farewellTemplateEn:
    'Trân trọng cảm ơn {honorific} {name} đã tham dự {event}. Kính chúc Quý Đại biểu nhiều sức khỏe và thành công!',
  themeId: 'neon_purple',
  customLogoUrl: '',
  logoLockup: 'horizontal',
  recognizedBrandStyle: 'Tím Neon Nghệ Thuật, Hiện Đại, Công Nghệ Cao & Trang Trọng (FPT Education)',
  recognizedThemeConcept: 'Tím Neon (#A855F7 · #C084FC) kết hợp Hồng Fuchsia (#D946EF) & Vàng Hoàng Kim (#F5B324)',
  customPrimaryHex: '#A855F7',
  customSecondaryHex: '#D946EF',
  customAccentHex: '#F5B324',
  enableSoundChime: true,
  enableVoiceGreeting: true,
  enableInstrumentalMusic: true,
  welcomeAudioMode: 'instrumental_and_voice',
  autoPopupWelcome: true,
  welcomeDisplaySeconds: 7,
  neonPurpleUpgradedV3: true,
};

export const INITIAL_GUESTS: GuestRecord[] = [
  {
    id: 'guest-1',
    code: 'VIP-001',
    name: 'Nguyễn Minh Quân',
    honorific: 'Ông',
    role: 'Giám Đốc Điều Hành Khối Công Nghệ Giáo Dục',
    company: 'Tập đoàn FPT / Khối Giáo dục FPT Education',
    department: 'Ban Điều Hành Cấp Cao',
    phone: '0903 128 899',
    email: 'quannm@fpt.edu.vn',
    adminNotes: 'Đại biểu Chủ tọa Phiên Khai mạc · Đón tiếp tại Phòng Khách VVIP Sảnh A1',
    tier: 'VVIP',
    seatZone: 'Bàn VVIP A1 · Ghế 01 (Hàng Đầu)',
    checkInGate: 'Cổng Đón Tiếp VIP Sảnh A1',
    avatarUrl: avatarMinhQuan,
    originalAvatarUrl: avatarMinhQuan,
    cccdNumber: '001082019482',
    dateOfBirth: '15/08/1982',
    gender: 'Nam',
    hometown: 'Cầu Giấy, Hà Nội',
    cccdIssueDate: '10/05/2022',
    faceIdVerified: true,
    faceIdVerifiedAt: '08:15:12 27/09/2026',
    verificationCount: 1,
    failedAttempts: 0,
    customGreeting:
      'Trân trọng đón tiếp và nhiệt liệt chào mừng Diễn giả chính phiên Khai mạc — Ông Nguyễn Minh Quân đến với Hội nghị FPT Schools 2026!',
    checkInTime: '08:15:12 27/09/2026',
    checkInTimestamp: Date.now() - 52 * 60 * 1000,
    checkOutTime: null,
    checkOutTimestamp: null,
    durationText: null,
    status: 'checked_in',
    lastConfidence: 99.4,
    syncedToSheets: false,
  },
  {
    id: 'guest-2',
    code: 'VIP-002',
    name: 'Trần Vũ Thanh Hà',
    honorific: 'Bà',
    role: 'Giám Đốc Chiến Lược & Phát Triển Học Thuật',
    company: 'Hệ Thống Phổ Thông FPT (FPT Schools)',
    department: 'Hội Đồng Học Thuật & Đổi Mới Sáng Tạo',
    phone: '0912 456 789',
    email: 'hatvt@fpt.edu.vn',
    adminNotes: 'Khách mời Danh dự · Tặng bộ ấn phẩm Chuyển đổi số Giáo dục 2026',
    tier: 'VIP',
    seatZone: 'Bàn VIP A2 · Ghế 04',
    checkInGate: 'Cổng Đón Tiếp VIP Sảnh A1',
    avatarUrl: avatarThanhHa,
    originalAvatarUrl: avatarThanhHa,
    cccdNumber: '079186028341',
    dateOfBirth: '22/10/1986',
    gender: 'Nữ',
    hometown: 'Quận 1, TP. Hồ Chí Minh',
    cccdIssueDate: '18/09/2022',
    faceIdVerified: true,
    verificationCount: 0,
    failedAttempts: 0,
    customGreeting:
      'Hân hạnh đón tiếp Bà Trần Vũ Thanh Hà đến với Hội nghị Chuyển đổi số & Giáo dục Sáng tạo FPT Schools!',
    checkInTime: null,
    checkInTimestamp: null,
    checkOutTime: null,
    checkOutTimestamp: null,
    durationText: null,
    status: 'pending',
    lastConfidence: null,
    syncedToSheets: false,
  },
  {
    id: 'guest-3',
    code: 'SPK-003',
    name: 'Lê Hoàng Nam',
    honorific: 'TS.',
    role: 'Kiến Trúc Sư Trưởng Trí Tuệ Nhân Tạo & Robotics',
    company: 'Viện Nghiên Cứu Công Nghệ & AI Quốc Gia',
    department: 'Khối Nghiên Cứu AI & STEM',
    phone: '0988 776 554',
    email: 'namlh@ai-institute.vn',
    adminNotes: 'Diễn giả Tọa đàm Chuyên sâu · Hỗ trợ kỹ thuật trình chiếu tại Bàn S1',
    tier: 'Diễn giả',
    seatZone: 'Bàn Diễn Giả S1 · Ghế 02',
    checkInGate: 'Cổng Diễn Giả Sảnh Chính',
    avatarUrl: avatarHoangNam,
    originalAvatarUrl: avatarHoangNam,
    cccdNumber: '048080015923',
    dateOfBirth: '06/03/1980',
    gender: 'Nam',
    hometown: 'Hải Châu, Đà Nẵng',
    cccdIssueDate: '12/03/2023',
    faceIdVerified: true,
    verificationCount: 0,
    failedAttempts: 0,
    customGreeting:
      'Trân trọng chào mừng TS. Lê Hoàng Nam — Chuyên gia dẫn dắt Tọa đàm AI & Robotics trong trường học tương lai!',
    checkInTime: null,
    checkInTimestamp: null,
    checkOutTime: null,
    checkOutTimestamp: null,
    durationText: null,
    status: 'pending',
    lastConfidence: null,
    syncedToSheets: false,
  },
  {
    id: 'guest-4',
    code: 'VIP-004',
    name: 'Phạm Ngọc Lan Anh',
    honorific: 'Bà',
    role: 'Chủ Tịch Hội Đồng Đối Tác Giáo Dục Quốc Tế',
    company: 'Tổ Chức Đầu Tư Công Nghệ Giáo Dục Global EdTech',
    department: 'Hội Đồng Đối Tác Chiến Lược',
    phone: '0909 334 556',
    email: 'lananh.pham@globaledtech.vn',
    adminNotes: 'Đại biểu Ký kết Hợp tác Chiến lược · Bố trí lễ tân dẫn bàn VIP A1',
    tier: 'Đối tác',
    seatZone: 'Bàn VIP A1 · Ghế 06',
    checkInGate: 'Cổng Đón Tiếp VIP Sảnh A1',
    avatarUrl: avatarLanAnh,
    originalAvatarUrl: avatarLanAnh,
    cccdNumber: '001185037490',
    dateOfBirth: '19/11/1985',
    gender: 'Nữ',
    hometown: 'Hoàn Kiếm, Hà Nội',
    cccdIssueDate: '25/07/2022',
    faceIdVerified: true,
    faceIdVerifiedAt: '08:05:40 27/09/2026',
    verificationCount: 1,
    failedAttempts: 0,
    customGreeting:
      'Trân trọng đón tiếp và chào mừng Đối tác chiến lược — Bà Phạm Ngọc Lan Anh!',
    checkInTime: '08:05:40 27/09/2026',
    checkInTimestamp: Date.now() - 88 * 60 * 1000,
    checkOutTime: '09:22:15 27/09/2026',
    checkOutTimestamp: Date.now() - 11 * 60 * 1000,
    durationText: '1 giờ 16 phút',
    status: 'checked_out',
    lastConfidence: 98.9,
    syncedToSheets: false,
  },
];

export type AgendaCategory =
  | 'welcome'
  | 'keynote'
  | 'panel'
  | 'award'
  | 'networking'
  | 'other';

export interface EventAgendaItem {
  id: string;
  timeSlot: string;
  title: string;
  titleEn?: string;
  speaker: string;
  location: string;
  description: string;
  category: AgendaCategory;
}

export type BadgeQrContentMode =
  | 'guest_and_agenda'
  | 'agenda_only'
  | 'guest_pass'
  | 'custom_url';

export interface EventAgendaConfig {
  agendaTitle: string;
  agendaSubtitle: string;
  eventDate: string;
  venue: string;
  wifiAndSupportNote: string;
  customExternalUrl: string;
  badgeQrMode: BadgeQrContentMode;
  showQrOnCheckinCard: boolean;
  showQrOnIdBadge: boolean;
  items: EventAgendaItem[];
}

export const INITIAL_AGENDA_CONFIG: EventAgendaConfig = {
  agendaTitle: 'KỊCH BẢN CHƯƠNG TRÌNH (EVENT AGENDA)',
  agendaSubtitle: 'HỘI NGHỊ CÔNG NGHỆ & GIÁO DỤC TƯƠNG LAI FPT SCHOOLS 2026',
  eventDate: '08:00 - 17:00 · Chủ Nhật, 27/09/2026',
  venue: 'Hội Trường Lớn — Tổ Hợp Giáo Dục FPT Schools',
  wifiAndSupportNote: 'Wi-Fi: FPT_Schools_VIP (Pass: 2026@FPT) · Hotline BTC: 0901 234 567',
  customExternalUrl: '',
  badgeQrMode: 'guest_and_agenda',
  showQrOnCheckinCard: true,
  showQrOnIdBadge: true,
  items: [
    {
      id: 'ag-1',
      timeSlot: '08:00 - 08:30',
      title: 'Đón tiếp Đại biểu & Check-in Khuôn mặt AI',
      titleEn: 'VIP Reception & AI Facial Biometric Check-in',
      speaker: 'Ban Tổ Chức & Hệ Thống AI SmartGate',
      location: 'Cổng Đón Tiếp VIP Sảnh A1',
      description: 'Nhận diện khuôn mặt tự động, chào mừng trên màn hình LED & nhận thẻ VIP kèm mã QR',
      category: 'welcome',
    },
    {
      id: 'ag-2',
      timeSlot: '08:30 - 09:00',
      title: 'Phát biểu Khai mạc & Tầm nhìn Giáo dục Khai phóng',
      titleEn: 'Opening Ceremony & Future Education Vision',
      speaker: 'Ông Nguyễn Minh Quân — GĐ Điều hành Khối Công nghệ Giáo dục',
      location: 'Sân khấu chính — Hội Trường Lớn',
      description: 'Định hướng chiến lược ứng dụng Trí tuệ Nhân tạo (AI) và trải nghiệm học tập số năm 2026',
      category: 'keynote',
    },
    {
      id: 'ag-3',
      timeSlot: '09:00 - 10:15',
      title: 'Tọa đàm Chuyên sâu: AI & Robotics trong Trường học Tương lai',
      titleEn: 'Panel Discussion: AI & Robotics in Future Schools',
      speaker: 'TS. Lê Hoàng Nam & Bà Trần Vũ Thanh Hà',
      location: 'Hội Trường Lớn — Khu Vực Tọa Đàm S1',
      description: 'Thảo luận mô hình lớp học thông minh, cá nhân hóa lộ trình học tập với trợ lý AI',
      category: 'panel',
    },
    {
      id: 'ag-4',
      timeSlot: '10:15 - 10:45',
      title: 'Lễ Ký kết Hợp tác Chiến lược Quốc tế & Vinh danh Đối tác',
      titleEn: 'Strategic Partnership Signing & VIP Appreciation',
      speaker: 'Bà Phạm Ngọc Lan Anh — Chủ tịch Global EdTech Ventures',
      location: 'Sân khấu Vinh danh VIP',
      description: 'Nghi thức ký kết hợp tác chuyển đổi số giáo dục và trao kỷ niệm chương',
      category: 'award',
    },
    {
      id: 'ag-5',
      timeSlot: '10:45 - 11:45',
      title: 'Tiệc Trà Kết nối (Networking Tea Break) & Trải nghiệm Khu Công nghệ',
      titleEn: 'VIP Networking Lounge & EdTech Exhibition Tour',
      speaker: 'Toàn thể Khách mời VIP & Diễn giả',
      location: 'Sảnh Triển Lãm Công Nghệ B1',
      description: 'Giao lưu kết nối đối tác và tham quan các gian hàng giải pháp AI & STEM',
      category: 'networking',
    },
  ],
};

export const AGENDA_TEMPLATES: {
  id: string;
  name: string;
  description: string;
  config: Pick<EventAgendaConfig, 'agendaTitle' | 'agendaSubtitle' | 'items'>;
}[] = [
  {
    id: 'fpt_summit',
    name: 'Hội Nghị & Tọa Đàm Giáo Dục / Công Nghệ',
    description: 'Kịch bản tiêu chuẩn gồm Đón khách AI, Khai mạc, Keynote, Tọa đàm & Networking',
    config: {
      agendaTitle: 'KỊCH BẢN CHƯƠNG TRÌNH HỘI NGHỊ',
      agendaSubtitle: 'HỘI NGHỊ CÔNG NGHỆ & GIÁO DỤC TƯƠNG LAI FPT SCHOOLS 2026',
      items: INITIAL_AGENDA_CONFIG.items,
    },
  },
  {
    id: 'gala_awards',
    name: 'Lễ Vinh Danh & Gala Dinner Doanh Nghiệp',
    description: 'Kịch bản sự kiện tối gồm Thảm đỏ Check-in AI, Vinh danh, Khai tiệc & Giao lưu nghệ thuật',
    config: {
      agendaTitle: 'KỊCH BẢN ĐÊM GALA VINH DANH',
      agendaSubtitle: 'LỄ TÔN VINH LÃNH ĐẠO & ĐỐI TÁC XUẤT SẮC NĂM 2026',
      items: [
        {
          id: 'gala-1',
          timeSlot: '18:00 - 18:45',
          title: 'Đón khách Thảm đỏ & Check-in Khuôn mặt AI',
          titleEn: 'Red Carpet Reception & AI Biometric Check-in',
          speaker: 'Ban Đón Tiếp VIP',
          location: 'Sảnh Thảm Đỏ Grand Ballroom',
          description: 'Chụp hình lưu niệm, hiển thị lời chào cá nhân hóa trên màn hình LED',
          category: 'welcome',
        },
        {
          id: 'gala-2',
          timeSlot: '18:45 - 19:15',
          title: 'Tiết mục Nghệ thuật Mở màn & Phát biểu Khai mạc',
          titleEn: 'Opening Performance & Executive Address',
          speaker: 'Ban Lãnh Đạo Cấp Cao',
          location: 'Sân khấu Trung tâm',
          description: 'Trình diễn ánh sáng 3D Mapping và thông điệp tri ân đối tác',
          category: 'keynote',
        },
        {
          id: 'gala-3',
          timeSlot: '19:15 - 20:00',
          title: 'Lễ Vinh danh Đối tác Chiến lược & Giải thưởng Cống hiến',
          titleEn: 'Strategic Partner & Excellence Awards Ceremony',
          speaker: 'Hội đồng Vinh danh',
          location: 'Sân khấu Trung tâm',
          description: 'Trao cúp vinh danh cho các cá nhân và tập thể tiêu biểu',
          category: 'award',
        },
        {
          id: 'gala-4',
          timeSlot: '20:00 - 21:30',
          title: 'Nghi thức Khai tiệc Gala Dinner & Giao lưu Âm nhạc',
          titleEn: 'Gala Dinner Toast & Live Music Networking',
          speaker: 'Toàn thể Khách mời VIP',
          location: 'Khán phòng Grand Ballroom',
          description: 'Thưởng thức ẩm thực cao cấp và chương trình bốc thăm may mắn',
          category: 'networking',
        },
      ],
    },
  },
  {
    id: 'workshop_training',
    name: 'Workshop Chuyên Đề & Đào Tạo Thực Hành',
    description: 'Kịch bản ngắn gọn tập trung vào phần chia sẻ chuyên gia, thực hành và hỏi đáp Q&A',
    config: {
      agendaTitle: 'LỊCH TRÌNH WORKSHOP CHUYÊN ĐỀ',
      agendaSubtitle: 'CHƯƠNG TRÌNH ĐÀO TẠO & ỨNG DỤNG AI THỰC CHIẾN 2026',
      items: [
        {
          id: 'ws-1',
          timeSlot: '08:30 - 09:00',
          title: 'Check-in AI & Nhận tài liệu Workshop qua Mã QR',
          titleEn: 'AI Face Check-in & Digital Kit via QR Code',
          speaker: 'Ban Tổ Chức',
          location: 'Cổng Check-in Phòng Innovation Lab',
          description: 'Quét khuôn mặt nhận vị trí chỗ ngồi và quét mã QR nhận tài liệu',
          category: 'welcome',
        },
        {
          id: 'ws-2',
          timeSlot: '09:00 - 10:30',
          title: 'Phiên 1: Kiến trúc Hệ thống AI & Ứng dụng Thực tế',
          titleEn: 'Session 1: Applied AI Architecture & Case Studies',
          speaker: 'Chuyên gia Công nghệ AI',
          location: 'Phòng Hội thảo Sáng tạo',
          description: 'Trình bày phương pháp triển khai và demo trực tiếp trên hệ thống',
          category: 'keynote',
        },
        {
          id: 'ws-3',
          timeSlot: '10:30 - 11:30',
          title: 'Phiên 2: Thực hành Nhóm & Thảo luận Hỏi đáp (Q&A)',
          titleEn: 'Session 2: Hands-on Practice & Interactive Q&A',
          speaker: 'Đội ngũ Cố vấn Chuyên môn',
          location: 'Khu vực Bàn nhóm Workshop',
          description: 'Giải đáp câu hỏi thực tế và tổng kết trao chứng nhận tham dự',
          category: 'panel',
        },
      ],
    },
  },
];


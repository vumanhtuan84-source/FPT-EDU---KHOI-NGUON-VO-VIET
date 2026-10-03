import React, { useEffect, useState } from 'react';
import {
  AttendanceStatus,
  BrandConfig,
  GreetingLanguage,
  GuestRecord,
  GuestTier,
} from '../types/attendance';
import {
  AlertTriangle,
  CalendarClock,
  Database,
  Download,
  Edit3,
  FileSpreadsheet,
  Globe,
  MapPin,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  X,
} from 'lucide-react';
import { extractSignatureFromUrl, imageUrlToBase64 } from '../utils/biometrics';
import {
  downloadSampleExcelTemplate,
  exportGuestsToExcel,
  parseExcelGuestFile,
} from '../utils/excelImport';

interface QuickEventInfoModalProps {
  isOpen: boolean;
  brandConfig: BrandConfig;
  onClose: () => void;
  onSave: (updated: BrandConfig) => void;
}

const EVENT_PRESET_TEMPLATES = [
  {
    label: 'Hội nghị AI & Giáo dục FPT Schools',
    eventName: 'Hội Nghị Chuyển Đổi Số & Giáo Dục Sáng Tạo FPT Schools 2026',
    eventSubtitle: 'FPT Schools AI & Future Education Summit 2026 — Experience To Grow',
    brandName: 'HỆ THỐNG PHỔ THÔNG FPT (FPT SCHOOLS)',
    eventDateTime: '08:00 - 17:00 · Chủ Nhật, 27/09/2026',
    eventLocation: 'Hội Trường Lớn — Tổ Hợp Giáo Dục FPT Schools',
    eventPosition: 'Cổng Đón Tiếp VIP Sảnh A1 · Khu Vực Check-in AI',
  },
  {
    label: 'Lễ Khai Giảng & Chào Đón Tân Học Sinh',
    eventName: 'Lễ Khai Giảng Năm Học Mới & Ngày Hội Trải Nghiệm Công Nghệ FPT Schools',
    eventSubtitle: 'FPT Schools Grand Opening Ceremony & Tech Experience Day',
    brandName: 'HỆ THỐNG PHỔ THÔNG FPT (FPT SCHOOLS)',
    eventDateTime: '07:30 - 11:30 · Thứ Hai, 05/09/2026',
    eventLocation: 'Sân Khấu Trung Tâm — FPT Schools Campus',
    eventPosition: 'Cổng Chính Sảnh Đón Tiếp Đại Biểu & Phụ Huynh',
  },
  {
    label: 'Gala Vinh Danh & Thượng Đỉnh Doanh Nghiệp',
    eventName: 'Vietnam Executive Leadership & Digital Innovation Gala 2026',
    eventSubtitle: 'Shaping The Future of Enterprise Intelligence',
    brandName: 'FPT CORPORATION & STRATEGIC PARTNERS',
    eventDateTime: '18:00 - 21:30 · Thứ Bảy, 10/10/2026',
    eventLocation: 'Grand Ballroom — Trung Tâm Hội Nghị Quốc Gia',
    eventPosition: 'Sảnh VVIP Diamond · Cổng Check-in Khuôn Mặt Số 01',
  },
];

export const QuickEventInfoModal: React.FC<QuickEventInfoModalProps> = ({
  isOpen,
  brandConfig,
  onClose,
  onSave,
}) => {
  const [formState, setFormState] = useState<BrandConfig>(brandConfig);

  useEffect(() => {
    setFormState(brandConfig);
  }, [brandConfig, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formState);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#0F172A] p-6 text-slate-100 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Edit3 className="h-5 w-5 text-[#F37021]" />
            <div>
              <h3 className="text-lg font-bold text-white">
                Chỉnh Sửa Tiêu Đề Sự Kiện, Thời Gian, Địa Điểm & Vị Trí
              </h3>
              <p className="text-xs text-slate-400">
                Cập nhật tức thì lên Cổng Check-in, Màn hình LED Chào mừng, Ảnh Check-in và Google Sheets
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Preset Selector */}
        <div className="mt-4">
          <p className="text-xs font-medium text-slate-400 mb-2">
            Chọn nhanh mẫu sự kiện gợi ý:
          </p>
          <div className="flex flex-wrap gap-2">
            {EVENT_PRESET_TEMPLATES.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() =>
                  setFormState((prev) => ({
                    ...prev,
                    ...preset,
                  }))
                }
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-[#F37021] hover:text-white transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tiêu Đề Sự Kiện Chính (Tiếng Việt) *
            </label>
            <input
              type="text"
              required
              value={formState.eventName}
              onChange={(e) =>
                setFormState({ ...formState, eventName: e.target.value })
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white focus:border-[#F37021] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tiêu Đề Phụ / Tên Sự Kiện Tiếng Anh (English Event Title & Theme)
            </label>
            <input
              type="text"
              value={formState.eventSubtitle}
              onChange={(e) =>
                setFormState({ ...formState, eventSubtitle: e.target.value })
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white focus:border-[#F37021] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Đơn Vị Tổ Chức / Thương Hiệu
              </label>
              <input
                type="text"
                value={formState.brandName}
                onChange={(e) =>
                  setFormState({ ...formState, brandName: e.target.value })
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white focus:border-[#F37021] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Slogan / Thông Điệp Chủ Đề
              </label>
              <input
                type="text"
                value={formState.eventTagline}
                onChange={(e) =>
                  setFormState({ ...formState, eventTagline: e.target.value })
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white focus:border-[#F37021] focus:outline-none"
              />
            </div>
          </div>

          {/* Time, Venue & Gate Position */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
            <p className="text-xs font-semibold text-[#F37021] uppercase tracking-wider flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4" />
              <span>Thông Tin Thời Gian, Địa Điểm & Vị Trí Đón Tiếp</span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Thời Gian Diễn Ra Sự Kiện
                </label>
                <input
                  type="text"
                  placeholder="VD: 08:00 - 17:00 · Chủ Nhật, 27/09/2026"
                  value={formState.eventDateTime}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      eventDateTime: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-[#F37021] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Địa Điểm Tổ Chức (Venue)
                </label>
                <input
                  type="text"
                  placeholder="VD: Hội Trường Lớn — FPT Schools"
                  value={formState.eventLocation}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      eventLocation: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-[#F37021] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Vị Trí Cổng / Sảnh Check-in Hiện Tại (Position / Gate)
                </label>
                <input
                  type="text"
                  placeholder="VD: Cổng Đón Tiếp VIP Sảnh A1 · Khu Vực Check-in AI"
                  value={formState.eventPosition}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      eventPosition: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-[#F37021] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Language Mode */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <label className="block text-xs font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-emerald-400" />
              <span>Chế Độ Ngôn Ngữ Chào Mừng (Tiếng Việt / Tiếng Anh / Song Ngữ)</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {(
                [
                  {
                    id: 'bilingual',
                    label: 'Song Ngữ Việt – Anh',
                    desc: 'Hiển thị & đọc cả Tiếng Việt + English',
                  },
                  {
                    id: 'vi',
                    label: 'Chỉ Tiếng Việt',
                    desc: 'Hiển thị & đọc chào mừng Tiếng Việt',
                  },
                  {
                    id: 'en',
                    label: 'English Only',
                    desc: 'Welcome & Voice in English',
                  },
                ] as { id: GreetingLanguage; label: string; desc: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    setFormState({ ...formState, greetingLanguage: opt.id })
                  }
                  className={`rounded-lg border p-2.5 text-left transition-colors ${
                    formState.greetingLanguage === opt.id
                      ? 'border-[#F37021] bg-orange-500/15 text-white'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  <p className="text-xs font-semibold">{opt.label}</p>
                  <p className="mt-0.5 text-[11px] opacity-80">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#F37021] hover:bg-orange-500 px-5 py-2 text-xs font-semibold text-white shadow-sm transition-colors"
            >
              Lưu Thông Tin Sự Kiện
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface GuestEditModalProps {
  isOpen: boolean;
  guest: GuestRecord | null;
  defaultGate: string;
  onClose: () => void;
  onSaveGuest: (updatedGuest: GuestRecord) => void;
  onDeleteGuest?: (guestId: string) => void;
}

export const GuestEditModal: React.FC<GuestEditModalProps> = ({
  isOpen,
  guest,
  defaultGate,
  onClose,
  onSaveGuest,
  onDeleteGuest,
}) => {
  const [form, setForm] = useState<GuestRecord | null>(guest);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (guest) {
      setForm({
        ...guest,
        checkInGate: guest.checkInGate || defaultGate,
      });
      setConfirmDelete(false);
    }
  }, [guest, defaultGate, isOpen]);

  if (!isOpen || !form) return null;

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        const normalized = await imageUrlToBase64(reader.result);
        const sig = await extractSignatureFromUrl(normalized);
        setForm((prev) =>
          prev
            ? { ...prev, avatarUrl: normalized, biometricSignature: sig }
            : null
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    let finalGuest = { ...form };
    if (
      finalGuest.avatarUrl &&
      (!finalGuest.biometricSignature ||
        finalGuest.biometricSignature.length === 0 ||
        finalGuest.avatarUrl !== guest?.avatarUrl)
    ) {
      const sig = await extractSignatureFromUrl(finalGuest.avatarUrl);
      if (sig.length > 0) {
        finalGuest = { ...finalGuest, biometricSignature: sig };
      }
    }
    onSaveGuest(finalGuest);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#0F172A] p-6 text-slate-100 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <UserCheck className="h-5 w-5 text-[#F37021]" />
            <div>
              <h3 className="text-lg font-bold text-white">
                Điều Chỉnh Toàn Bộ Dữ Liệu Khách Mời — {form.code}
              </h3>
              <p className="text-xs text-slate-400">
                Chỉnh sửa mã khách, họ tên, chức vụ, đơn vị, vị trí ghế, cổng đón, giờ vào/ra và lời chào riêng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Portrait & Basic Identity */}
          <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <img
              src={form.avatarUrl}
              alt={form.name}
              referrerPolicy="no-referrer"
              className="h-20 w-20 rounded-xl object-cover border border-slate-700 shrink-0"
            />
            <div className="flex-1 space-y-2 text-center sm:text-left">
              <p className="text-xs font-semibold text-white">
                Ảnh chân dung nhận diện khuôn mặt & in thẻ khách mời
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Đổi ảnh khuôn mặt</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
                <input
                  type="text"
                  placeholder="Hoặc dán URL ảnh trực tiếp..."
                  value={form.avatarUrl.startsWith('data:') ? '' : form.avatarUrl}
                  onChange={(e) => {
                    if (e.target.value.trim()) {
                      setForm({ ...form, avatarUrl: e.target.value.trim() });
                    }
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-[#F37021] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Mã khách mời *
              </label>
              <input
                type="text"
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono-tabular text-xs text-orange-300"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Danh xưng
              </label>
              <select
                value={form.honorific}
                onChange={(e) =>
                  setForm({
                    ...form,
                    honorific: e.target.value as GuestRecord['honorific'],
                  })
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
              >
                <option value="Ông">Ông</option>
                <option value="Bà">Bà</option>
                <option value="Anh">Anh</option>
                <option value="Chị">Chị</option>
                <option value="TS.">TS.</option>
                <option value="Diễn giả">Diễn giả</option>
                <option value="Đối tác">Đối tác</option>
                <option value="Phụ huynh">Phụ huynh</option>
                <option value="Đại biểu">Đại biểu</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Họ và Tên đại biểu *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Hạng đại biểu
              </label>
              <select
                value={form.tier}
                onChange={(e) =>
                  setForm({ ...form, tier: e.target.value as GuestTier })
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
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

            <div className="sm:col-span-6">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Chức vụ / Vai trò *
              </label>
              <input
                type="text"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="sm:col-span-6">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Đơn vị công tác *
              </label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Phòng ban / Bộ phận
              </label>
              <input
                type="text"
                placeholder="VD: Ban Giám đốc..."
                value={form.department || ''}
                onChange={(e) =>
                  setForm({ ...form, department: e.target.value })
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Số điện thoại
              </label>
              <input
                type="text"
                placeholder="VD: 0903 123 456"
                value={form.phone || ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Email liên hệ
              </label>
              <input
                type="text"
                placeholder="VD: daibieu@fpt.edu.vn"
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          {/* Admin Editable Notes & Custom Fields */}
          <div className="rounded-xl border border-amber-500/35 bg-amber-950/15 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Edit3 className="h-3.5 w-3.5 text-amber-400" />
                <span>
                  Nội Dung Admin Tự Bổ Sung, Điều Chỉnh & Sửa Đổi (Hiển thị trên Màn hình Welcome & Thẻ In)
                </span>
              </p>
              <span className="font-mono-tabular text-[11px] font-semibold text-emerald-300">
                Lượt xác thực: {form.verificationCount || (form.checkInTime ? 1 : 0)}/2 lần
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">
                Ghi chú đón tiếp / Thông tin bổ sung của Admin
              </label>
              <input
                type="text"
                placeholder="VD: Đại biểu Chủ tọa · Tặng bộ ấn phẩm VIP · Bố trí lễ tân dẫn vào Bàn A1..."
                value={form.adminNotes || ''}
                onChange={(e) =>
                  setForm({ ...form, adminNotes: e.target.value })
                }
                className="w-full rounded-lg border border-amber-500/40 bg-slate-950 px-3 py-2 text-xs text-amber-100 placeholder-slate-500 focus:border-[#F37021] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Lời chào đón tiếp riêng bằng Tiếng Việt (Tuỳ chọn)</span>
              </label>
              <input
                type="text"
                placeholder="Để trống để dùng mẫu tự động của sự kiện"
                value={form.customGreeting || ''}
                onChange={(e) =>
                  setForm({ ...form, customGreeting: e.target.value })
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          {/* Location, Seat Position & Time In / Time Out */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#F37021] flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span>Chỉnh Sửa Vị Trí Ghế, Cổng Check-in & Thời Gian Vào / Ra</span>
              </p>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    checkInTime: null,
                    checkInTimestamp: null,
                    checkOutTime: null,
                    checkOutTimestamp: null,
                    durationText: null,
                    verificationCount: 0,
                    failedAttempts: 0,
                    status: 'pending',
                  })
                }
                className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset lượt xác thực (0/2) & giờ Vào/Ra</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Vị trí bàn / Ghế ngồi (Seat / Zone)
                </label>
                <input
                  type="text"
                  value={form.seatZone}
                  onChange={(e) =>
                    setForm({ ...form, seatZone: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Cổng / Sảnh đón tiếp (Check-in Gate)
                </label>
                <input
                  type="text"
                  value={form.checkInGate || ''}
                  onChange={(e) =>
                    setForm({ ...form, checkInGate: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Thời gian Vào (Giờ Check-in)
                </label>
                <input
                  type="text"
                  placeholder="VD: 08:15:00 27/09/2026"
                  value={form.checkInTime || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      checkInTime: e.target.value || null,
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono-tabular text-xs text-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Thời gian Ra (Giờ Check-out)
                </label>
                <input
                  type="text"
                  placeholder="VD: 11:30:00 27/09/2026"
                  value={form.checkOutTime || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      checkOutTime: e.target.value || null,
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono-tabular text-xs text-amber-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Trạng thái tham dự
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status: e.target.value as AttendanceStatus,
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                >
                  <option value="pending">Chưa đến (Pending)</option>
                  <option value="checked_in">Đang tham dự (Checked In)</option>
                  <option value="checked_out">Đã ra về (Checked Out)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Thời lượng lưu trú
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 2 giờ 15 phút"
                    value={form.durationText || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        durationText: e.target.value || null,
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Độ chính xác AI (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={form.lastConfidence ?? 99.4}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        lastConfidence: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono-tabular text-xs text-emerald-300"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
            {onDeleteGuest ? (
              !confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/30 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-950/60 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Xóa khách mời này</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-rose-500/50 bg-rose-950/50 px-3 py-1.5">
                  <span className="text-xs font-medium text-rose-200">
                    Xác nhận xóa?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteGuest(form.id);
                      onClose();
                    }}
                    className="rounded bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-500"
                  >
                    Xóa ngay
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs text-slate-300 hover:text-white px-1"
                  >
                    Hủy
                  </button>
                </div>
              )
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#F37021] hover:bg-orange-500 px-5 py-2 text-xs font-semibold text-white shadow-sm transition-colors"
              >
                Lưu Cập Nhật Khách Mời
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

interface AdminDataManageModalProps {
  isOpen: boolean;
  guests: GuestRecord[];
  logsCount: number;
  defaultGate: string;
  onClose: () => void;
  onUpdateAllGuests: (newGuests: GuestRecord[], statusNote?: string) => void;
  onClearAllGuests: () => void;
  onResetAttendanceData: () => void;
  onClearLogsOnly: () => void;
  onRestoreDefaultSample: () => void;
}

export const AdminDataManageModal: React.FC<AdminDataManageModalProps> = ({
  isOpen,
  guests,
  logsCount,
  defaultGate,
  onClose,
  onUpdateAllGuests,
  onClearAllGuests,
  onResetAttendanceData,
  onClearLogsOnly,
  onRestoreDefaultSample,
}) => {
  const [activeTab, setActiveTab] = useState<'table_editor' | 'bulk_import' | 'delete_reset'>('table_editor');
  const [draftGuests, setDraftGuests] = useState<GuestRecord[]>(guests);
  const [bulkText, setBulkText] = useState('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [confirmAction, setConfirmAction] = useState<
    null | 'clear_all' | 'reset_attendance' | 'restore_sample' | 'delete_pending' | 'delete_checked_out'
  >(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraftGuests(guests);
      setConfirmAction(null);
      setFeedbackMsg(null);
    }
  }, [guests, isOpen]);

  if (!isOpen) return null;

  const handleFieldChange = (
    id: string,
    field: keyof GuestRecord,
    value: any
  ) => {
    setDraftGuests((prev) =>
      prev.map((g) => (g.id === id ? { ...g, [field]: value } : g))
    );
  };

  const handleDraftPhotoUpload = (
    guestId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        const normalized = await imageUrlToBase64(reader.result);
        const sig = await extractSignatureFromUrl(normalized);
        setDraftGuests((prev) =>
          prev.map((g) =>
            g.id === guestId
              ? { ...g, avatarUrl: normalized, biometricSignature: sig }
              : g
          )
        );
        setFeedbackMsg(
          'Đã cập nhật ảnh khuôn mặt và trích xuất vector sinh trắc học thành công!'
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteRowInDraft = (id: string) => {
    setDraftGuests((prev) => prev.filter((g) => g.id !== id));
  };

  const handleAddBlankRow = () => {
    const nextIdx = draftGuests.length + 1;
    const newGuest: GuestRecord = {
      id: `guest-${Date.now()}-${nextIdx}`,
      code: `VIP-${String(nextIdx).padStart(3, '0')}`,
      honorific: 'Ông',
      name: 'Khách Mời Mới',
      role: 'Đại biểu / Khách mời',
      company: 'FPT Schools / Đối tác',
      tier: 'VIP',
      seatZone: `Bàn VIP A · Ghế ${String(nextIdx).padStart(2, '0')}`,
      checkInGate: defaultGate,
      avatarUrl:
        guests[0]?.avatarUrl ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      checkInTime: null,
      checkInTimestamp: null,
      checkOutTime: null,
      checkOutTimestamp: null,
      durationText: null,
      status: 'pending',
      lastConfidence: null,
      syncedToSheets: false,
    };
    setDraftGuests((prev) => [...prev, newGuest]);
  };

  const handleSaveDraftTable = async () => {
    const indexedGuests = await Promise.all(
      draftGuests.map(async (g) => {
        if (g.biometricSignature && g.biometricSignature.length > 0) {
          return g;
        }
        const sig = await extractSignatureFromUrl(g.avatarUrl);
        return { ...g, biometricSignature: sig };
      })
    );
    onUpdateAllGuests(
      indexedGuests,
      `Admin đã lưu cập nhật dữ liệu & đồng bộ nhận diện ảnh cho ${indexedGuests.length} khách mời.`
    );
    setFeedbackMsg(
      `Đã lưu thành công bảng dữ liệu & vector khuôn mặt (${indexedGuests.length} khách mời)!`
    );
  };

  const handleParseAndImport = () => {
    const lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    const baseAvatar =
      guests[0]?.avatarUrl ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80';

    const parsedGuests: GuestRecord[] = lines.map((line, idx) => {
      // Support Tab (Excel paste), semicolon, or comma separated
      const delimiter = line.includes('\t')
        ? '\t'
        : line.includes(';')
        ? ';'
        : ',';
      const cols = line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''));

      // Format: [Mã khách, Danh xưng, Họ tên, Chức vụ, Đơn vị, Hạng khách, Vị trí ghế, Cổng đón, Giờ vào, Giờ ra]
      // Or simpler: [Họ tên, Chức vụ, Đơn vị, Vị trí ghế]
      const seqNum = (importMode === 'append' ? draftGuests.length : 0) + idx + 1;
      if (cols.length >= 5) {
        const rawHonorific = cols[1] as GuestRecord['honorific'];
        const validHonorifics = ['Ông', 'Bà', 'Anh', 'Chị', 'TS.', 'Diễn giả'];
        const honorific: GuestRecord['honorific'] = validHonorifics.includes(rawHonorific)
          ? rawHonorific
          : 'Ông';

        const rawTier = cols[5] as GuestTier;
        const validTiers: GuestTier[] = ['VVIP', 'VIP', 'Diễn giả', 'Khách mời', 'Ban tổ chức'];
        const tier: GuestTier = validTiers.includes(rawTier) ? rawTier : 'VIP';

        const checkInTime = cols[8] && cols[8] !== '—' ? cols[8] : null;
        const checkOutTime = cols[9] && cols[9] !== '—' ? cols[9] : null;
        const status: AttendanceStatus = checkOutTime
          ? 'checked_out'
          : checkInTime
          ? 'checked_in'
          : 'pending';

        return {
          id: `guest-import-${Date.now()}-${idx}`,
          code: cols[0] || `VIP-${String(seqNum).padStart(3, '0')}`,
          honorific,
          name: cols[2] || cols[0] || `Khách Mời ${seqNum}`,
          role: cols[3] || 'Khách mời Danh dự',
          company: cols[4] || 'Đối tác Sự kiện',
          tier,
          seatZone: cols[6] || `Bàn VIP · Ghế ${String(seqNum).padStart(2, '0')}`,
          checkInGate: cols[7] || defaultGate,
          avatarUrl: baseAvatar,
          checkInTime,
          checkInTimestamp: checkInTime ? Date.now() : null,
          checkOutTime,
          checkOutTimestamp: checkOutTime ? Date.now() : null,
          durationText: null,
          status,
          lastConfidence: 99.2,
          syncedToSheets: false,
        };
      } else {
        return {
          id: `guest-import-${Date.now()}-${idx}`,
          code: `VIP-${String(seqNum).padStart(3, '0')}`,
          honorific: 'Ông',
          name: cols[0] || `Khách Mời ${seqNum}`,
          role: cols[1] || 'Khách mời Danh dự',
          company: cols[2] || 'FPT Schools / Đối tác',
          tier: 'VIP',
          seatZone: cols[3] || `Bàn VIP · Ghế ${String(seqNum).padStart(2, '0')}`,
          checkInGate: defaultGate,
          avatarUrl: baseAvatar,
          checkInTime: null,
          checkInTimestamp: null,
          checkOutTime: null,
          checkOutTimestamp: null,
          durationText: null,
          status: 'pending',
          lastConfidence: null,
          syncedToSheets: false,
        };
      }
    });

    const nextList =
      importMode === 'replace'
        ? parsedGuests
        : [...draftGuests, ...parsedGuests];

    setDraftGuests(nextList);
    onUpdateAllGuests(
      nextList,
      `Đã nhập thành công ${parsedGuests.length} khách mời (${
        importMode === 'replace' ? 'Ghi đè danh sách mới' : 'Thêm nối tiếp'
      }).`
    );
    setBulkText('');
    setFeedbackMsg(
      `Đã nhập thành công ${parsedGuests.length} khách mời vào hệ thống!`
    );
    setActiveTab('table_editor');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-md">
      <div className="w-full max-w-6xl rounded-2xl border border-slate-800 bg-[#0F172A] p-5 sm:p-6 text-slate-100 shadow-2xl max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Database className="h-6 w-6 text-[#F37021]" />
            <div>
              <h3 className="text-lg font-bold text-white">
                Quản Trị Admin: Xóa Danh Sách Khách Mời & Điều Chỉnh Nội Dung Dữ Liệu Bên Trong
              </h3>
              <p className="text-xs text-slate-400">
                Chỉnh sửa trực tiếp từng ô dữ liệu, xóa lẻ hoặc xóa toàn bộ danh sách khách mời, đặt lại giờ điểm danh hoặc nhập dữ liệu hàng loạt
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('table_editor')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                activeTab === 'table_editor'
                  ? 'bg-[#F37021] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>1. Điều Chỉnh Nội Dung Bảng Dữ Liệu ({draftGuests.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('bulk_import')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                activeTab === 'bulk_import'
                  ? 'bg-[#F37021] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>2. Nhập / Dán Danh Sách Khách Mời Mới</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('delete_reset')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                activeTab === 'delete_reset'
                  ? 'bg-rose-600 text-white'
                  : 'text-rose-300 hover:text-white'
              }`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>3. Xóa Danh Sách Khách Mời & Reset Dữ Liệu</span>
            </button>
          </div>

          {feedbackMsg && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3.5 py-1.5 text-xs font-medium text-emerald-300">
              {feedbackMsg}
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          {/* TAB 1: SPREADSHEET INLINE CONTENT EDITOR */}
          {activeTab === 'table_editor' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
                <p className="text-xs text-slate-300">
                  Bạn có thể nhấp trực tiếp vào bất kỳ ô nào bên dưới để sửa{' '}
                  <strong className="text-white">
                    Mã khách, Danh xưng, Họ tên, Chức vụ, Đơn vị, Hạng, Vị trí ghế, Cổng đón, Giờ Vào/Ra, Lời chào riêng
                  </strong>{' '}
                  hoặc bấm nút thùng rác để xóa từng dòng.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddBlankRow}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Thêm dòng khách mời</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDraftTable}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#F37021] hover:bg-orange-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors"
                  >
                    <span>Lưu Tất Cả Thay Đổi ({draftGuests.length})</span>
                  </button>
                </div>
              </div>

              {draftGuests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/60 p-10 text-center space-y-3">
                  <p className="text-sm font-semibold text-slate-300">
                    Danh sách khách mời hiện đang trống (0 khách mời).
                  </p>
                  <p className="text-xs text-slate-400">
                    Bạn có thể bấm “Thêm dòng khách mời”, chuyển sang tab “Nhập / Dán Danh Sách” hoặc khôi phục danh sách mẫu.
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleAddBlankRow}
                      className="rounded-lg bg-[#F37021] px-4 py-2 text-xs font-semibold text-white hover:bg-orange-500"
                    >
                      + Thêm khách mời đầu tiên
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onRestoreDefaultSample();
                        onClose();
                      }}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
                    >
                      Khôi phục danh sách mẫu FPT Schools
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                  <table className="w-full text-left border-collapse min-w-[1250px]">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/90 text-[11px] font-semibold text-slate-300">
                        <th className="py-2.5 px-2 w-24">Ảnh Mẫu AI</th>
                        <th className="py-2.5 px-2.5 w-24">Mã Khách</th>
                        <th className="py-2.5 px-2 w-24">Danh Xưng</th>
                        <th className="py-2.5 px-2.5 w-44">Họ và Tên</th>
                        <th className="py-2.5 px-2.5 w-44">Chức Vụ / Vai Trò</th>
                        <th className="py-2.5 px-2.5 w-44">Đơn Vị Công Tác</th>
                        <th className="py-2.5 px-2.5 w-52">Nội Dung Admin Bổ Sung</th>
                        <th className="py-2.5 px-2 w-28">Hạng</th>
                        <th className="py-2.5 px-2.5 w-40">Vị Trí Bàn / Ghế</th>
                        <th className="py-2.5 px-2.5 w-36">Cổng Đón</th>
                        <th className="py-2.5 px-2.5 w-36">Giờ Vào</th>
                        <th className="py-2.5 px-2.5 w-36">Giờ Ra</th>
                        <th className="py-2.5 px-2 w-32">Trạng Thái</th>
                        <th className="py-2.5 px-2.5 w-52">Lời Chào Riêng</th>
                        <th className="py-2.5 px-2 text-center w-14">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 text-xs">
                      {draftGuests.map((g) => (
                        <tr key={g.id} className="hover:bg-slate-900/50">
                          <td className="p-1.5">
                            <div className="flex items-center gap-1.5">
                              <img
                                src={g.avatarUrl}
                                alt={g.name}
                                referrerPolicy="no-referrer"
                                className="h-8 w-8 rounded-md object-cover border border-slate-700 shrink-0"
                              />
                              <label
                                className="cursor-pointer rounded border border-slate-700 bg-slate-800 px-1.5 py-1 text-[10px] font-medium text-sky-300 hover:bg-slate-700 transition-colors"
                                title="Cung cấp / Đổi ảnh khuôn mặt cho khách mời này"
                              >
                                Đổi ảnh
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleDraftPhotoUpload(g.id, e)}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={g.code}
                              onChange={(e) =>
                                handleFieldChange(g.id, 'code', e.target.value)
                              }
                              className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1.5 font-mono-tabular text-xs text-orange-300 focus:border-[#F37021] focus:outline-none"
                            />
                          </td>
                          <td className="p-1.5">
                            <select
                              value={g.honorific}
                              onChange={(e) =>
                                handleFieldChange(
                                  g.id,
                                  'honorific',
                                  e.target.value as GuestRecord['honorific']
                                )
                              }
                              className="w-full rounded border border-slate-800 bg-slate-900 px-1.5 py-1.5 text-xs text-white focus:border-[#F37021] focus:outline-none"
                            >
                              <option value="Ông">Ông</option>
                              <option value="Bà">Bà</option>
                              <option value="Anh">Anh</option>
                              <option value="Chị">Chị</option>
                              <option value="TS.">TS.</option>
                              <option value="Diễn giả">Diễn giả</option>
                              <option value="Đại biểu">Đại biểu</option>
                            </select>
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={g.name}
                              onChange={(e) =>
                                handleFieldChange(g.id, 'name', e.target.value)
                              }
                              className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs font-semibold text-white focus:border-[#F37021] focus:outline-none"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={g.role}
                              onChange={(e) =>
                                handleFieldChange(g.id, 'role', e.target.value)
                              }
                              className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 focus:border-[#F37021] focus:outline-none"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={g.company}
                              onChange={(e) =>
                                handleFieldChange(g.id, 'company', e.target.value)
                              }
                              className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 focus:border-[#F37021] focus:outline-none"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              placeholder="Ghi chú / Nội dung bổ sung..."
                              value={g.adminNotes || ''}
                              onChange={(e) =>
                                handleFieldChange(
                                  g.id,
                                  'adminNotes',
                                  e.target.value
                                )
                              }
                              className="w-full rounded border border-amber-500/30 bg-slate-900 px-2 py-1.5 text-xs text-amber-200 focus:border-[#F37021] focus:outline-none"
                            />
                          </td>
                          <td className="p-1.5">
                            <select
                              value={g.tier}
                              onChange={(e) =>
                                handleFieldChange(
                                  g.id,
                                  'tier',
                                  e.target.value as GuestTier
                                )
                              }
                              className="w-full rounded border border-slate-800 bg-slate-900 px-1.5 py-1.5 text-xs text-white focus:border-[#F37021] focus:outline-none"
                            >
                              <option value="VVIP">VVIP</option>
                              <option value="VIP">VIP</option>
                              <option value="Diễn giả">Diễn giả</option>
                              <option value="Khách mời">Khách mời</option>
                              <option value="Ban tổ chức">Ban tổ chức</option>
                            </select>
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={g.seatZone}
                              onChange={(e) =>
                                handleFieldChange(
                                  g.id,
                                  'seatZone',
                                  e.target.value
                                )
                              }
                              className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-white focus:border-[#F37021] focus:outline-none"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={g.checkInGate || defaultGate}
                              onChange={(e) =>
                                handleFieldChange(
                                  g.id,
                                  'checkInGate',
                                  e.target.value
                                )
                              }
                              className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-300 focus:border-[#F37021] focus:outline-none"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              placeholder="—"
                              value={g.checkInTime || ''}
                              onChange={(e) =>
                                handleFieldChange(
                                  g.id,
                                  'checkInTime',
                                  e.target.value || null
                                )
                              }
                              className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1.5 font-mono-tabular text-xs text-emerald-400 focus:border-[#F37021] focus:outline-none"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              placeholder="—"
                              value={g.checkOutTime || ''}
                              onChange={(e) =>
                                handleFieldChange(
                                  g.id,
                                  'checkOutTime',
                                  e.target.value || null
                                )
                              }
                              className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1.5 font-mono-tabular text-xs text-amber-300 focus:border-[#F37021] focus:outline-none"
                            />
                          </td>
                          <td className="p-1.5">
                            <select
                              value={g.status}
                              onChange={(e) =>
                                handleFieldChange(
                                  g.id,
                                  'status',
                                  e.target.value as AttendanceStatus
                                )
                              }
                              className="w-full rounded border border-slate-800 bg-slate-900 px-1.5 py-1.5 text-xs text-white focus:border-[#F37021] focus:outline-none"
                            >
                              <option value="pending">Chưa đến</option>
                              <option value="checked_in">Đang dự</option>
                              <option value="checked_out">Đã về</option>
                            </select>
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              placeholder="Tự động theo mẫu"
                              value={g.customGreeting || ''}
                              onChange={(e) =>
                                handleFieldChange(
                                  g.id,
                                  'customGreeting',
                                  e.target.value
                                )
                              }
                              className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-300 focus:border-[#F37021] focus:outline-none"
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRowInDraft(g.id)}
                              className="rounded p-1.5 text-rose-400 hover:bg-rose-950/60 hover:text-rose-200 transition-colors"
                              title="Xóa dòng khách mời này"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXCEL FILE UPLOAD & BULK IMPORT GUEST LIST */}
          {activeTab === 'bulk_import' && (
            <div className="space-y-4">
              {/* Direct Excel File Upload (.xlsx, .xls, .csv) */}
              <div className="rounded-xl border-2 border-emerald-500/40 bg-emerald-950/20 p-5 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                      <span>TÍCH HỢP NGUỒN DỮ LIỆU FILE EXCEL ĐẠI BIỂU & KHÁCH MỜI</span>
                    </span>
                    <h4 className="mt-1.5 text-sm sm:text-base font-bold text-white">
                      Tải Lên File Excel (.xlsx, .xls, .csv) Nguồn Dữ Liệu Đại Biểu Tham Dự
                    </h4>
                    <p className="mt-0.5 text-xs text-slate-300">
                      Tự động nhận diện các trường thông tin cụ thể: <strong className="text-white">Họ và tên</strong>, <strong className="text-white">Chức vụ / Vai trò</strong>, <strong className="text-white">Đơn vị công tác</strong>, <strong className="text-white">Vị trí bàn ghế</strong> và <strong className="text-amber-300">Nội dung Admin bổ sung</strong>. Sau khi tải lên, Admin có thể tự điều chỉnh, sửa đổi trực tiếp trên bảng.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => downloadSampleExcelTemplate()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors"
                    >
                      <Download className="h-4 w-4 text-amber-400" />
                      <span>Tải File Excel Mẫu Chuẩn</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => exportGuestsToExcel(draftGuests)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-sky-400" />
                      <span>Xuất Danh Sách Ra Excel</span>
                    </button>

                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-md transition-colors">
                      <Upload className="h-4 w-4" />
                      <span>Chọn File Excel Đại Biểu (.xlsx / .csv)</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          e.target.value = '';
                          try {
                            const mode =
                              importMode === 'replace' ? 'replace' : 'merge';
                            const res = await parseExcelGuestFile(
                              file,
                              draftGuests,
                              mode
                            );
                            setDraftGuests(res.guests);
                            onUpdateAllGuests(
                              res.guests,
                              `Đã tích hợp file Excel "${file.name}": Thêm mới ${res.addedCount} đại biểu, cập nhật ${res.updatedCount} đại biểu (Tổng: ${res.guests.length} đại biểu).`
                            );
                            setFeedbackMsg(
                              `Đã nhận file Excel "${file.name}" thành công (${res.guests.length} đại biểu)! Bạn có thể sửa đổi hoặc bổ sung nội dung ngay trên bảng.`
                            );
                            setActiveTab('table_editor');
                          } catch (err: any) {
                            setFeedbackMsg(
                              err?.message ||
                                'Không thể đọc file Excel. Vui lòng kiểm tra định dạng .xlsx, .xls hoặc .csv.'
                            );
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-white">
                  Hoặc Dán (Paste) Nhanh Danh Sách Đại Biểu Từ Bảng Tính Excel / Google Sheets
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Mỗi dòng tương ứng 1 khách mời. Hỗ trợ 2 định dạng linh hoạt (ngăn cách bằng dấu phẩy <code className="text-orange-300">,</code> hoặc phím Tab khi copy từ Excel):
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <p className="font-semibold text-emerald-400 mb-1">
                      Cách 1 — Nhập nhanh 4 cột:
                    </p>
                    <p className="font-mono-tabular text-[11px] text-slate-300">
                      Họ và Tên, Chức vụ, Đơn vị, Vị trí bàn
                    </p>
                    <p className="mt-1 font-mono-tabular text-[11px] text-slate-500">
                      VD: Nguyễn Văn A, Hiệu trưởng, FPT Schools Cầu Giấy, Bàn VIP A1
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <p className="font-semibold text-amber-400 mb-1">
                      Cách 2 — Đầy đủ 8 cột:
                    </p>
                    <p className="font-mono-tabular text-[11px] text-slate-300">
                      Mã khách, Danh xưng, Họ tên, Chức vụ, Đơn vị, Hạng, Vị trí bàn, Cổng đón
                    </p>
                    <p className="mt-1 font-mono-tabular text-[11px] text-slate-500">
                      VD: VIP-010, Ông, Trần Quốc Bảo, Giám đốc, FPT IS, VVIP, Bàn A1, Cổng VIP
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-[#F37021]"
                    />
                    <span>Thêm nối tiếp vào danh sách hiện tại ({draftGuests.length} khách)</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs text-orange-300 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-[#F37021]"
                    />
                    <span>Xóa danh sách cũ & Ghi đè hoàn toàn bằng danh sách mới</span>
                  </label>
                </div>

                <textarea
                  rows={8}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`VIP-005, Ông, Đỗ Minh Tuấn, Hiệu trưởng, FPT Schools Hà Nội, VVIP, Bàn VVIP A1 · Ghế 05, Cổng Đón Tiếp VIP\nVIP-006, Bà, Nguyễn Thị Mai, Trưởng ban Phụ huynh, FPT Schools, VIP, Bàn VIP A2 · Ghế 08, Cổng Chính`}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3.5 font-mono-tabular text-xs text-white placeholder-slate-600 focus:border-[#F37021] focus:outline-none"
                />

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setBulkText(
                        `VIP-005, Ông, Đỗ Minh Tuấn, Hiệu Trưởng Điều Hành, Hệ Thống Trường Phổ Thông FPT, VVIP, Bàn VVIP A1 · Ghế 05, Cổng Đón Tiếp VIP Sảnh A1\nVIP-006, Bà, Hoàng Mai Phương, Giám Đốc Đào Tạo Quốc Tế, FPT Education Global, VIP, Bàn VIP A2 · Ghế 06, Cổng Đón Tiếp VIP Sảnh A1\nSPK-007, TS., Vũ Đình Khoa, Chuyên Gia Nghiên Cứu AI Tạo Sinh, Viện Công Nghệ FPT, Diễn giả, Bàn Diễn Giả S1 · Ghế 03, Cổng Diễn Giả Sảnh Chính`
                      )
                    }
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
                  >
                    Điền dữ liệu mẫu thử nghiệm
                  </button>
                  <button
                    type="button"
                    disabled={!bulkText.trim()}
                    onClick={handleParseAndImport}
                    className="rounded-lg bg-[#F37021] hover:bg-orange-500 disabled:opacity-40 px-5 py-2 text-xs font-semibold text-white transition-colors"
                  >
                    Thực Hiện Nhập Dữ Liệu Khách Mời
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DELETE GUEST LIST & RESET DATA */}
          {activeTab === 'delete_reset' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Delete Entire Guest List */}
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/15 p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-400">
                    <Trash2 className="h-5 w-5" />
                    <h4 className="text-sm font-bold text-white">
                      Xóa Toàn Bộ Danh Sách Khách Mời ({guests.length} khách)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Xóa sạch toàn bộ danh sách khách mời hiện có và nhật ký điểm danh về trạng thái trống (0 khách mời) để Admin tự nhập danh sách sự kiện mới hoàn toàn.
                  </p>
                </div>

                {confirmAction === 'clear_all' ? (
                  <div className="rounded-lg border border-rose-500 bg-rose-950/60 p-3 space-y-2.5">
                    <p className="text-xs font-semibold text-rose-200 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                      <span>Bạn chắc chắn muốn xóa toàn bộ {guests.length} khách mời?</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClearAllGuests();
                          setDraftGuests([]);
                          setConfirmAction(null);
                          setFeedbackMsg('Đã xóa toàn bộ danh sách khách mời!');
                        }}
                        className="rounded-lg bg-rose-600 hover:bg-rose-500 px-3.5 py-1.5 text-xs font-semibold text-white"
                      >
                        Xác nhận Xóa trắng danh sách
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmAction(null)}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={guests.length === 0}
                    onClick={() => setConfirmAction('clear_all')}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 px-4 py-2.5 text-xs font-semibold text-white transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Xóa Toàn Bộ Danh Sách Khách Mời</span>
                  </button>
                )}
              </div>

              {/* Card 2: Reset Attendance Times & Logs (Keep Guests) */}
              <div className="rounded-xl border border-amber-500/40 bg-amber-950/15 p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-400">
                    <RotateCcw className="h-5 w-5" />
                    <h4 className="text-sm font-bold text-white">
                      Xóa Dữ Liệu Giờ Vào/Ra & Nhật Ký Quét ({logsCount} lượt)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Giữ nguyên danh sách họ tên & ảnh khuôn mặt khách mời nhưng xóa toàn bộ Giờ Vào (Check-in), Giờ Ra (Check-out) và Nhật ký quét về trạng thái “Chưa đến”.
                  </p>
                </div>

                {confirmAction === 'reset_attendance' ? (
                  <div className="rounded-lg border border-amber-500 bg-amber-950/60 p-3 space-y-2.5">
                    <p className="text-xs font-semibold text-amber-200">
                      Xác nhận đặt lại toàn bộ giờ Vào/Ra về “Chưa đến”?
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onResetAttendanceData();
                          setConfirmAction(null);
                          setFeedbackMsg(
                            'Đã xóa dữ liệu giờ Vào/Ra và đặt lại trạng thái Chưa đến!'
                          );
                        }}
                        className="rounded-lg bg-amber-600 hover:bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-white"
                      >
                        Xác nhận Reset Điểm Danh
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmAction(null)}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmAction('reset_attendance')}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-500 px-4 py-2.5 text-xs font-semibold text-white transition-colors"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Reset Giờ Vào/Ra Về Chưa Đến</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClearLogsOnly();
                        setFeedbackMsg('Đã xóa sạch lịch sử nhật ký điểm chạm!');
                      }}
                      className="rounded-lg border border-amber-500/40 bg-amber-950/40 hover:bg-amber-950/70 px-3.5 py-2.5 text-xs font-medium text-amber-200 transition-colors"
                    >
                      Chỉ xóa Nhật ký ({logsCount})
                    </button>
                  </div>
                )}
              </div>

              {/* Card 3: Filter Delete (Delete Pending or Checked-out guests) */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold text-white">
                    Xóa Nhanh Khách Mời Theo Trạng Thái Tham Dự
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Lọc và xóa bớt những khách mời không đến tham dự (Chưa check-in) hoặc những khách đã ra về để làm gọn bảng điểm danh.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const remaining = guests.filter(
                        (g) => g.status !== 'pending'
                      );
                      onUpdateAllGuests(
                        remaining,
                        'Đã xóa các khách mời ở trạng thái Chưa đến.'
                      );
                      setDraftGuests(remaining);
                      setFeedbackMsg('Đã xóa các khách mời Chưa đến!');
                    }}
                    className="rounded-lg border border-rose-500/40 bg-rose-950/30 hover:bg-rose-950/60 px-3.5 py-2 text-xs font-semibold text-rose-300 transition-colors"
                  >
                    Xóa khách “Chưa đến” ({guests.filter((g) => g.status === 'pending').length})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const remaining = guests.filter(
                        (g) => g.status !== 'checked_out'
                      );
                      onUpdateAllGuests(
                        remaining,
                        'Đã xóa các khách mời ở trạng thái Đã ra về.'
                      );
                      setDraftGuests(remaining);
                      setFeedbackMsg('Đã xóa các khách mời Đã ra về!');
                    }}
                    className="rounded-lg border border-rose-500/40 bg-rose-950/30 hover:bg-rose-950/60 px-3.5 py-2 text-xs font-semibold text-rose-300 transition-colors"
                  >
                    Xóa khách “Đã ra về” ({guests.filter((g) => g.status === 'checked_out').length})
                  </button>
                </div>
              </div>

              {/* Card 4: Restore Sample Data */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold text-white">
                    Khôi Phục Danh Sách Khách Mời Mẫu (FPT Schools)
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Khôi phục lại 4 hồ sơ khách mời VIP & Diễn giả mẫu ban đầu (kèm ảnh chân dung sinh trắc học chuẩn) để trình diễn demo bất kỳ lúc nào.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onRestoreDefaultSample();
                    setFeedbackMsg(
                      'Đã khôi phục danh sách khách mời mẫu FPT Schools!'
                    );
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-semibold text-white transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Khôi Phục Dữ Liệu Mẫu Ban Đầu</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4">
          <span className="text-xs text-slate-400">
            Mọi thay đổi được tự động lưu trữ trên trình duyệt và sẵn sàng đồng bộ lên Google Sheets.
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
            >
              Đóng cửa sổ
            </button>
            {activeTab === 'table_editor' && (
              <button
                type="button"
                onClick={() => {
                  handleSaveDraftTable();
                  onClose();
                }}
                className="rounded-lg bg-[#F37021] hover:bg-orange-500 px-5 py-2 text-xs font-semibold text-white shadow-sm transition-colors"
              >
                Lưu & Hoàn Tất
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

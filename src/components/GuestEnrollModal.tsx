import React, { useRef, useState } from 'react';
import { GuestRecord, GuestTier } from '../types/attendance';
import { Camera, Globe, Upload, UserPlus, X } from 'lucide-react';
import {
  captureVideoFrame,
  extractSignatureFromUrl,
  imageUrlToBase64,
} from '../utils/biometrics';

interface GuestEnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnrollGuest: (newGuest: GuestRecord) => void;
  existingCount: number;
  defaultGate?: string;
}

export const GuestEnrollModal: React.FC<GuestEnrollModalProps> = ({
  isOpen,
  onClose,
  onEnrollGuest,
  existingCount,
  defaultGate = 'Cổng Đón Tiếp VIP Sảnh A1',
}) => {
  const [honorific, setHonorific] = useState<GuestRecord['honorific']>('Ông');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [tier, setTier] = useState<GuestTier>('VIP');
  const [seatZone, setSeatZone] = useState('Bàn VIP A2 · Ghế 08');
  const [checkInGate, setCheckInGate] = useState(defaultGate);
  const [customGreeting, setCustomGreeting] = useState('');
  const [customGreetingEn, setCustomGreetingEn] = useState('');
  const [avatarDataUrl, setAvatarDataUrl] = useState<string>('');
  const [isUsingWebcam, setIsUsingWebcam] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  if (!isOpen) return null;

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsUsingWebcam(false);
  };

  const handleStartWebcam = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      streamRef.current = stream;
      setIsUsingWebcam(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 80);
    } catch {
      setErrorMsg(
        'Không thể mở camera. Bạn có thể tải ảnh chân dung từ máy tính.'
      );
    }
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const { dataUrl } = captureVideoFrame(videoRef.current);
    if (dataUrl) {
      setAvatarDataUrl(dataUrl);
      stopWebcam();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        try {
          const normalized = await imageUrlToBase64(reader.result);
          setAvatarDataUrl(normalized);
        } catch {
          setAvatarDataUrl(reader.result);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Vui lòng nhập Họ và Tên khách mời.');
      return;
    }
    if (!avatarDataUrl) {
      setErrorMsg(
        'Vui lòng chụp ảnh khuôn mặt từ Camera hoặc tải ảnh chân dung lên để hệ thống nhận diện.'
      );
      return;
    }

    const signature = await extractSignatureFromUrl(avatarDataUrl);
    const codeNumber = String(existingCount + 1).padStart(3, '0');
    const prefix =
      tier === 'VVIP' || tier === 'VIP'
        ? 'VIP'
        : tier === 'Diễn giả'
        ? 'SPK'
        : 'GST';

    const newGuest: GuestRecord = {
      id: `guest-${Date.now()}`,
      code: `${prefix}-${codeNumber}`,
      name: name.trim(),
      honorific,
      role: role.trim() || 'Khách mời Danh dự',
      company: company.trim() || 'FPT Schools / Đối tác Chiến lược',
      tier,
      seatZone: seatZone.trim() || 'Khu vực Trung tâm · Bàn B1',
      checkInGate: checkInGate.trim() || defaultGate,
      avatarUrl: avatarDataUrl,
      customGreeting: customGreeting.trim() || undefined,
      customGreetingEn: customGreetingEn.trim() || undefined,
      checkInTime: null,
      checkInTimestamp: null,
      checkOutTime: null,
      checkOutTimestamp: null,
      durationText: null,
      status: 'pending',
      lastConfidence: null,
      syncedToSheets: false,
      biometricSignature: signature,
    };

    stopWebcam();
    onEnrollGuest(newGuest);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-slate-800 bg-[#0F172A] p-6 text-slate-100 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <UserPlus className="h-5 w-5 text-[#F37021]" />
            <div>
              <h3 className="text-lg font-semibold text-white">
                Đăng Ký Khuôn Mặt Mẫu & Hồ Sơ Đại Biểu (Chưa Check-in)
              </h3>
              <p className="text-xs text-purple-200/80">
                Lưu khuôn mặt mẫu vào hệ thống · Khi đại biểu quét mặt tại sự kiện đạt tỷ lệ đồng nhất ≥ 50% sẽ tự động xác nhận ghi danh & chào mừng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopWebcam();
              onClose();
            }}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {errorMsg && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-xs text-rose-200">
              {errorMsg}
            </div>
          )}

          {/* Face Portrait Capture / Upload */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="sm:col-span-5 flex flex-col items-center">
              <div className="relative h-40 w-40 overflow-hidden rounded-xl border border-slate-700 bg-slate-950 flex items-center justify-center">
                {isUsingWebcam ? (
                  <video
                    ref={videoRef}
                    className="h-full w-full object-cover -scale-x-100"
                    playsInline
                    muted
                  />
                ) : avatarDataUrl ? (
                  <img
                    src={avatarDataUrl}
                    alt="Ảnh khuôn mặt đăng ký"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-center p-3 text-xs text-slate-500">
                    Chưa có ảnh mẫu khuôn mặt
                  </div>
                )}
              </div>
            </div>

            <div className="sm:col-span-7 space-y-3">
              <p className="text-sm font-semibold text-white">
                1. Ảnh khuôn mặt đăng ký mẫu (Dùng để đối chiếu khi quét tại sự kiện)
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Bước này chỉ <strong className="text-amber-300">đăng ký khuôn mặt mẫu</strong> (trạng thái <span className="text-cyan-300 font-semibold">Chờ quét Check-in</span>). Khi khách hàng, đại biểu quét khuôn mặt tại cổng sự kiện và đạt <strong className="text-emerald-300">tỷ lệ đồng nhất từ 50% trở lên</strong>, hệ thống sẽ chính thức xác nhận ghi danh và phát lời chào mừng.
              </p>
              <div className="flex flex-wrap items-center gap-2.5">
                {!isUsingWebcam ? (
                  <button
                    type="button"
                    onClick={handleStartWebcam}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#F37021] px-3.5 py-2 text-xs font-semibold text-white hover:bg-orange-500 transition-colors whitespace-nowrap"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Mở Camera chụp mẫu</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCaptureSnapshot}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition-colors whitespace-nowrap"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Chụp & Lưu khuôn mặt này</span>
                  </button>
                )}

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors whitespace-nowrap">
                  <Upload className="h-4 w-4" />
                  <span>Tải ảnh từ máy</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Guest Details */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Danh xưng
              </label>
              <select
                value={honorific}
                onChange={(e) =>
                  setHonorific(e.target.value as GuestRecord['honorific'])
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-[#F37021] focus:outline-none"
              >
                <option value="Ông">Ông (Mr.)</option>
                <option value="Bà">Bà (Ms.)</option>
                <option value="Anh">Anh (Mr.)</option>
                <option value="Chị">Chị (Ms.)</option>
                <option value="TS.">TS. (Dr.)</option>
                <option value="Diễn giả">Diễn giả (Speaker)</option>
              </select>
            </div>

            <div className="sm:col-span-9">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Họ và Tên khách mời *
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Vũ Minh Tuấn"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-[#F37021] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-6">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Chức vụ / Vai trò
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Giám Đốc Điều Hành"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-[#F37021] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-6">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Đơn vị / Trường / Doanh nghiệp
              </label>
              <input
                type="text"
                placeholder="Ví dụ: FPT Schools / FPT Education"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-[#F37021] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Phân hạng khách mời
              </label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as GuestTier)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-[#F37021] focus:outline-none"
              >
                <option value="VVIP">VVIP</option>
                <option value="VIP">VIP</option>
                <option value="Diễn giả">Diễn giả</option>
                <option value="Khách mời">Khách mời</option>
                <option value="Ban tổ chức">Ban tổ chức</option>
              </select>
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Vị trí bàn / Ghế ngồi
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Bàn VIP A1 · Ghế 05"
                value={seatZone}
                onChange={(e) => setSeatZone(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-[#F37021] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Cổng / Sảnh đón tiếp
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Cổng VIP Sảnh A1"
                value={checkInGate}
                onChange={(e) => setCheckInGate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-[#F37021] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-12">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Thông điệp chào mừng riêng bằng Tiếng Việt (Tuỳ chọn)
              </label>
              <input
                type="text"
                placeholder="Để trống để sử dụng mẫu lời chào tự động của sự kiện"
                value={customGreeting}
                onChange={(e) => setCustomGreeting(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-[#F37021] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-12">
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-emerald-400" />
                <span>
                  Thông điệp chào mừng riêng bằng Tiếng Anh (Custom English Greeting - Tuỳ chọn)
                </span>
              </label>
              <input
                type="text"
                placeholder="Leave blank to use automatic English welcome template"
                value={customGreetingEn}
                onChange={(e) => setCustomGreetingEn(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => {
                stopWebcam();
                onClose();
              }}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors whitespace-nowrap"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="rounded-lg bg-gradient-to-r from-purple-600 via-fuchsia-600 to-amber-500 px-5 py-2 text-xs font-bold text-white hover:opacity-95 transition-all shadow-md whitespace-nowrap"
            >
              Lưu Đăng Ký Khuôn Mặt Mẫu (Chờ Quét Check-in ≥ 50%)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

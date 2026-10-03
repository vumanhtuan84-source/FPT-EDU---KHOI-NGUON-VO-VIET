import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  AGENDA_TEMPLATES,
  AgendaCategory,
  BadgeQrContentMode,
  BrandConfig,
  BrandThemePreset,
  EventAgendaConfig,
  EventAgendaItem,
} from '../types/attendance';
import { buildAgendaShareText } from '../utils/biometrics';
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Link2,
  ListChecks,
  MapPin,
  Plus,
  QrCode,
  Sparkles,
  Trash2,
  User,
  Wifi,
} from 'lucide-react';

interface AgendaQrBuilderPanelProps {
  agendaConfig: EventAgendaConfig;
  onUpdateAgendaConfig: (updated: EventAgendaConfig) => void;
  brandConfig: BrandConfig;
  activeTheme: BrandThemePreset;
  onPreviewInteractiveAgenda?: () => void;
}

const CATEGORY_LABELS: Record<
  AgendaCategory,
  { label: string; badgeClass: string }
> = {
  welcome: {
    label: 'Đón tiếp & Check-in',
    badgeClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  },
  keynote: {
    label: 'Keynote / Khai mạc',
    badgeClass: 'border-orange-500/40 bg-orange-500/15 text-orange-300',
  },
  panel: {
    label: 'Tọa đàm / Thảo luận',
    badgeClass: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
  },
  award: {
    label: 'Vinh danh / Ký kết',
    badgeClass: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  },
  networking: {
    label: 'Giao lưu / Tiệc trà',
    badgeClass: 'border-purple-500/40 bg-purple-500/15 text-purple-300',
  },
  other: {
    label: 'Hoạt động khác',
    badgeClass: 'border-slate-600 bg-slate-800 text-slate-300',
  },
};

export const AgendaQrBuilderPanel: React.FC<AgendaQrBuilderPanelProps> = ({
  agendaConfig,
  onUpdateAgendaConfig,
  brandConfig,
  activeTheme,
  onPreviewInteractiveAgenda,
}) => {
  const [qrGeneratorTab, setQrGeneratorTab] = useState<
    'agenda_script' | 'interactive_web_link' | 'custom_any_qr'
  >('agenda_script');
  const [customAnyText, setCustomAnyText] = useState<string>(
    'https://fptschools.edu.vn — Kịch bản chương trình & Tài liệu Hội nghị AI 2026'
  );
  const [qrColorDark, setQrColorDark] = useState<string>('#0F172A');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedPayload, setCopiedPayload] = useState(false);
  const standeeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const primaryColor =
    brandConfig.themeId === 'custom_ai'
      ? brandConfig.customPrimaryHex
      : activeTheme.accentLightHex;

  // Compute the active QR payload string based on selected mode
  const getActiveQrPayload = (): string => {
    if (qrGeneratorTab === 'custom_any_qr') {
      return customAnyText.trim() || 'https://fptschools.edu.vn';
    }
    if (qrGeneratorTab === 'interactive_web_link') {
      if (agendaConfig.customExternalUrl.trim()) {
        return agendaConfig.customExternalUrl.trim();
      }
      const baseUrl =
        typeof window !== 'undefined' ? window.location.origin : '';
      return `${baseUrl}/?view=agenda`;
    }
    return buildAgendaShareText(
      { ...agendaConfig, badgeQrMode: 'agenda_only' },
      brandConfig,
      null
    );
  };

  const activePayload = getActiveQrPayload();

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(activePayload || 'FPT Schools Event Agenda', {
      width: 520,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: qrColorDark,
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [activePayload, qrColorDark]);

  const handleFieldChange = <K extends keyof EventAgendaConfig>(
    key: K,
    val: EventAgendaConfig[K]
  ) => {
    onUpdateAgendaConfig({
      ...agendaConfig,
      [key]: val,
    });
  };

  const handleUpdateItem = (
    id: string,
    field: keyof EventAgendaItem,
    value: string
  ) => {
    onUpdateAgendaConfig({
      ...agendaConfig,
      items: agendaConfig.items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    });
  };

  const handleAddItem = () => {
    const newItem: EventAgendaItem = {
      id: `ag-${Date.now()}`,
      timeSlot: '11:45 - 12:30',
      title: 'Phiên chương trình mới (Nhập nội dung kịch bản)',
      titleEn: 'New Program Session',
      speaker: 'Ban Tổ Chức / Diễn giả',
      location: agendaConfig.venue || brandConfig.eventLocation,
      description: 'Mô tả chi tiết hoạt động trong khung giờ này',
      category: 'keynote',
    };
    onUpdateAgendaConfig({
      ...agendaConfig,
      items: [...agendaConfig.items, newItem],
    });
  };

  const handleDeleteItem = (id: string) => {
    onUpdateAgendaConfig({
      ...agendaConfig,
      items: agendaConfig.items.filter((item) => item.id !== id),
    });
  };

  const handleMoveItem = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= agendaConfig.items.length) return;
    const next = [...agendaConfig.items];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    onUpdateAgendaConfig({
      ...agendaConfig,
      items: next,
    });
  };

  const handleApplyTemplate = (templateId: string) => {
    const found = AGENDA_TEMPLATES.find((t) => t.id === templateId);
    if (!found) return;
    onUpdateAgendaConfig({
      ...agendaConfig,
      agendaTitle: found.config.agendaTitle,
      agendaSubtitle: found.config.agendaSubtitle,
      items: found.config.items.map((it, idx) => ({
        ...it,
        id: `ag-${Date.now()}-${idx}`,
      })),
    });
  };

  const handleDownloadQrPng = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `Ma-QR-Agenda-${Date.now()}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handleDownloadStandeePoster = async () => {
    const canvas = standeeCanvasRef.current || document.createElement('canvas');
    const W = 1200;
    const H = 1650;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#090D16');
    bgGrad.addColorStop(0.5, '#0F172A');
    bgGrad.addColorStop(1, '#090D16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Top FPT 3-color bar
    ctx.fillStyle = '#0066B2';
    ctx.fillRect(0, 0, W / 3, 14);
    ctx.fillStyle = primaryColor || '#F37021';
    ctx.fillRect(W / 3, 0, W / 3, 14);
    ctx.fillStyle = '#0DB14B';
    ctx.fillRect((W / 3) * 2, 0, W / 3, 14);

    // Header text
    ctx.fillStyle = primaryColor || '#F37021';
    ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(brandConfig.brandName.toUpperCase(), W / 2, 85);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 38px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(agendaConfig.agendaTitle.toUpperCase(), W / 2, 140);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 21px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      (agendaConfig.agendaSubtitle || brandConfig.eventName).slice(0, 70),
      W / 2,
      180
    );

    // QR Code Card Box
    const qrBoxSize = 440;
    const qrBoxX = (W - qrBoxSize) / 2;
    const qrBoxY = 225;

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 28);
    ctx.fill();

    if (qrDataUrl) {
      const qrImg = new Image();
      await new Promise<void>((resolve) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = () => resolve();
        qrImg.src = qrDataUrl;
      });
      ctx.drawImage(
        qrImg,
        qrBoxX + 24,
        qrBoxY + 24,
        qrBoxSize - 48,
        qrBoxSize - 48
      );
    }

    ctx.fillStyle = '#38BDF8';
    ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      'QUÉT MÃ QR ĐỂ XEM KỊCH BẢN CHƯƠNG TRÌNH CHI TIẾT TRÊN ĐIỆN THOẠI',
      W / 2,
      qrBoxY + qrBoxSize + 45
    );

    // Timeline items on Standee
    let yCursor = qrBoxY + qrBoxSize + 95;
    ctx.textAlign = 'left';

    agendaConfig.items.slice(0, 6).forEach((item) => {
      ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(80, yCursor, W - 160, 118, 16);
      ctx.fill();
      ctx.stroke();

      // Time badge
      ctx.fillStyle = primaryColor || '#F37021';
      ctx.font = '700 22px "JetBrains Mono", monospace';
      ctx.fillText(item.timeSlot, 110, yCursor + 44);

      // Title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 23px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(item.title.slice(0, 56), 330, yCursor + 44);

      // Speaker & Location
      ctx.fillStyle = '#94A3B8';
      ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(
        `${item.speaker}  ·  ${item.location}`.slice(0, 78),
        330,
        yCursor + 84
      );

      yCursor += 134;
    });

    // Footer
    ctx.textAlign = 'center';
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '600 19px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      `${agendaConfig.eventDate || brandConfig.eventDateTime}  |  ${
        agendaConfig.venue || brandConfig.eventLocation
      }`,
      W / 2,
      H - 65
    );
    if (agendaConfig.wifiAndSupportNote) {
      ctx.fillStyle = '#10B981';
      ctx.font = '600 17px "JetBrains Mono", monospace';
      ctx.fillText(agendaConfig.wifiAndSupportNote, W / 2, H - 32);
    }

    const link = document.createElement('a');
    link.download = `Standee-QR-Agenda-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header & Template Selector */}
      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <QrCode className="h-5 w-5 text-[#F37021]" />
              <h2 className="text-lg font-bold text-white">
                Xây Dựng Kịch Bản Chương Trình (Agenda) & Tạo Mã QR Đa Năng
              </h2>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Soạn thảo, chỉnh sửa nội dung kịch bản chương trình trước khi tạo mã QR. Mã QR được tích hợp trực tiếp lên Thẻ Đeo Khách Mời VIP, Ảnh Check-in và Standee bàn đại biểu.
            </p>
          </div>

          {onPreviewInteractiveAgenda && (
            <button
              type="button"
              onClick={onPreviewInteractiveAgenda}
              className="inline-flex items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3.5 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Xem Trang Agenda Khi Quét QR</span>
            </button>
          )}
        </div>

        {/* Quick Template Loader */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2.5">
            Chọn nhanh Mẫu Kịch Bản Chương Trình (Có thể tùy chỉnh toàn bộ bên dưới):
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {AGENDA_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleApplyTemplate(tpl.id)}
                className="text-left rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700 p-3.5 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-[#F37021] transition-colors">
                    {tpl.name}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-400">
                    Áp dụng mẫu
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                  {tpl.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Main Grid: Left 7 cols = Program Script Editor | Right 5 cols = Live QR Studio */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          {/* LEFT 7 COLS: AGENDA SCRIPT EDITOR */}
          <div className="lg:col-span-7 space-y-5">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-[#F37021]" />
                <span>1. Thông Tin Chung Của Kịch Bản Chương Trình</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Tiêu đề Kịch bản / Agenda
                  </label>
                  <input
                    type="text"
                    value={agendaConfig.agendaTitle}
                    onChange={(e) =>
                      handleFieldChange('agendaTitle', e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white focus:border-[#F37021] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Tên Chương trình / Sự kiện trên Agenda
                  </label>
                  <input
                    type="text"
                    value={agendaConfig.agendaSubtitle}
                    onChange={(e) =>
                      handleFieldChange('agendaSubtitle', e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-[#F37021] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                    <CalendarClock className="h-3 w-3 text-amber-400" />
                    <span>Thời gian diễn ra</span>
                  </label>
                  <input
                    type="text"
                    value={agendaConfig.eventDate}
                    onChange={(e) =>
                      handleFieldChange('eventDate', e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-[#F37021] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-emerald-400" />
                    <span>Địa điểm / Hội trường chính</span>
                  </label>
                  <input
                    type="text"
                    value={agendaConfig.venue}
                    onChange={(e) => handleFieldChange('venue', e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-[#F37021] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                    <Wifi className="h-3 w-3 text-sky-400" />
                    <span>Thông tin Wi-Fi Sự kiện / Hotline Hỗ trợ Đại biểu</span>
                  </label>
                  <input
                    type="text"
                    value={agendaConfig.wifiAndSupportNote}
                    onChange={(e) =>
                      handleFieldChange('wifiAndSupportNote', e.target.value)
                    }
                    placeholder="VD: Wi-Fi: FPT_VIP (Pass: 2026) · Hotline: 0901 234 567"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-[#F37021] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* TIMELINE ITEMS EDITOR */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    2. Chi Tiết Từng Khung Giờ Kịch Bản ({agendaConfig.items.length} phiên)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Chỉnh sửa trực tiếp giờ, tên phần trình bày, diễn giả và vị trí phòng/sảnh.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#F37021] hover:bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Thêm Khung Giờ Mới</span>
                </button>
              </div>

              <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
                {agendaConfig.items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/90 p-3.5 space-y-2.5 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 font-mono-tabular text-xs font-bold text-[#F37021]">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={item.timeSlot}
                          onChange={(e) =>
                            handleUpdateItem(item.id, 'timeSlot', e.target.value)
                          }
                          placeholder="08:00 - 08:30"
                          className="w-32 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono-tabular text-xs font-bold text-emerald-400 focus:border-[#F37021] focus:outline-none"
                        />
                        <select
                          value={item.category}
                          onChange={(e) =>
                            handleUpdateItem(
                              item.id,
                              'category',
                              e.target.value as AgendaCategory
                            )
                          }
                          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-medium text-slate-200 focus:border-[#F37021] focus:outline-none"
                        >
                          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveItem(idx, -1)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30"
                          title="Di chuyển lên"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === agendaConfig.items.length - 1}
                          onClick={() => handleMoveItem(idx, 1)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30"
                          title="Di chuyển xuống"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="rounded p-1 text-rose-400 hover:bg-rose-950/50 hover:text-rose-200"
                          title="Xóa khung giờ này"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) =>
                            handleUpdateItem(item.id, 'title', e.target.value)
                          }
                          placeholder="Tiêu đề hoạt động / Phiên trình bày (Tiếng Việt)"
                          className="w-full rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white focus:border-[#F37021] focus:outline-none"
                        />
                      </div>

                      <div>
                        <div className="relative">
                          <User className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                          <input
                            type="text"
                            value={item.speaker}
                            onChange={(e) =>
                              handleUpdateItem(item.id, 'speaker', e.target.value)
                            }
                            placeholder="Diễn giả / Người phụ trách"
                            className="w-full rounded-md border border-slate-800 bg-slate-900 pl-8 pr-2.5 py-1.5 text-xs text-slate-200 focus:border-[#F37021] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="relative">
                          <MapPin className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                          <input
                            type="text"
                            value={item.location}
                            onChange={(e) =>
                              handleUpdateItem(
                                item.id,
                                'location',
                                e.target.value
                              )
                            }
                            placeholder="Vị trí / Hội trường"
                            className="w-full rounded-md border border-slate-800 bg-slate-900 pl-8 pr-2.5 py-1.5 text-xs text-slate-200 focus:border-[#F37021] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) =>
                            handleUpdateItem(
                              item.id,
                              'description',
                              e.target.value
                            )
                          }
                          placeholder="Ghi chú nội dung tóm tắt / Tài liệu đính kèm..."
                          className="w-full rounded-md border border-slate-800 bg-slate-900/70 px-2.5 py-1 text-[11px] text-slate-300 focus:border-[#F37021] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLS: LIVE QR CODE GENERATOR & BADGE QR CONFIG */}
          <div className="lg:col-span-5 space-y-5">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#F37021]" />
                  <span>3. Tạo Mã QR Agenda & Tùy Chỉnh Nội Dung Quét</span>
                </h3>
              </div>

              {/* Mode Switcher */}
              <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-slate-800 bg-slate-950 p-1">
                <button
                  type="button"
                  onClick={() => setQrGeneratorTab('agenda_script')}
                  className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                    qrGeneratorTab === 'agenda_script'
                      ? 'bg-[#F37021] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  QR Kịch Bản
                </button>
                <button
                  type="button"
                  onClick={() => setQrGeneratorTab('interactive_web_link')}
                  className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                    qrGeneratorTab === 'interactive_web_link'
                      ? 'bg-[#F37021] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  QR Link Trang Web
                </button>
                <button
                  type="button"
                  onClick={() => setQrGeneratorTab('custom_any_qr')}
                  className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                    qrGeneratorTab === 'custom_any_qr'
                      ? 'bg-[#F37021] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  QR Tùy Ý Bất Kỳ
                </button>
              </div>

              {qrGeneratorTab === 'custom_any_qr' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-amber-300">
                    Nhập nội dung kịch bản, đường link tài liệu hoặc văn bản bất kỳ để tạo QR:
                  </label>
                  <textarea
                    rows={3}
                    value={customAnyText}
                    onChange={(e) => setCustomAnyText(e.target.value)}
                    placeholder="Nhập URL Google Drive, Link sự kiện, cấu hình Wi-Fi hoặc kịch bản tóm tắt..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-[#F37021] focus:outline-none"
                  />
                </div>
              )}

              {qrGeneratorTab === 'interactive_web_link' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5 text-sky-400" />
                    <span>
                      Đường dẫn Agenda bên ngoài (Để trống để dùng Trang Agenda Trực Tuyến của hệ thống):
                    </span>
                  </label>
                  <input
                    type="text"
                    value={agendaConfig.customExternalUrl}
                    onChange={(e) =>
                      handleFieldChange('customExternalUrl', e.target.value)
                    }
                    placeholder={`${
                      typeof window !== 'undefined' ? window.location.origin : ''
                    }/?view=agenda`}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-[#F37021] focus:outline-none"
                  />
                </div>
              )}

              {/* QR Preview Card */}
              <div className="flex flex-col items-center rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900 p-5 text-center">
                <div className="relative rounded-2xl bg-white p-3.5 shadow-xl">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Event Agenda QR Code"
                      className="h-52 w-52 object-contain"
                    />
                  ) : (
                    <div className="flex h-52 w-52 items-center justify-center text-xs text-slate-400">
                      Đang tạo QR...
                    </div>
                  )}
                </div>

                <p className="mt-3 text-xs font-bold text-white">
                  {agendaConfig.agendaTitle}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Quét bằng Camera điện thoại hoặc Zalo để xem ngay kịch bản chương trình
                </p>

                {/* Color Picker for QR */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Màu mã QR:</span>
                  {[
                    { hex: '#0F172A', name: 'Đen Navy' },
                    { hex: '#0066B2', name: 'Xanh FPT' },
                    { hex: '#9A3412', name: 'Cam Đậm' },
                    { hex: '#065F46', name: 'Xanh Lục' },
                  ].map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setQrColorDark(c.hex)}
                      className={`h-5 w-5 rounded-full border ${
                        qrColorDark === c.hex
                          ? 'ring-2 ring-white border-white'
                          : 'border-slate-600'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={handleDownloadQrPng}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#F37021] hover:bg-orange-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Tải Ảnh Mã QR (PNG)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadStandeePoster}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-600/20 hover:bg-emerald-600/30 px-3.5 py-2 text-xs font-semibold text-emerald-300 transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Tải Standee QR Đặt Bàn</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(activePayload);
                      setCopiedPayload(true);
                      setTimeout(() => setCopiedPayload(false), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-medium text-slate-200 transition-colors"
                  >
                    {copiedPayload ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-300">Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Chép Nội dung QR</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* BADGE QR CONFIGURATION */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <QrCode className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Cấu Hình Mã QR Khi Xuất Thẻ Khách Mời VIP & Ảnh Check-in</span>
                </p>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Dữ liệu mã hóa trong QR trên Thẻ Đeo Khách Mời:
                  </label>
                  <select
                    value={agendaConfig.badgeQrMode}
                    onChange={(e) =>
                      handleFieldChange(
                        'badgeQrMode',
                        e.target.value as BadgeQrContentMode
                      )
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-white focus:border-[#F37021] focus:outline-none"
                  >
                    <option value="guest_and_agenda">
                      Định danh Khách mời + Kịch bản Agenda Chương trình (Khuyên dùng)
                    </option>
                    <option value="agenda_only">
                      Chỉ Kịch bản Agenda Chương trình (Mọi thẻ cùng mã Agenda)
                    </option>
                    <option value="guest_pass">
                      Chỉ Thông tin Vé Check-in & Vị trí ghế ngồi của Khách
                    </option>
                    <option value="custom_url">
                      Đường dẫn URL tùy chỉnh bên trên
                    </option>
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agendaConfig.showQrOnIdBadge}
                      onChange={(e) =>
                        handleFieldChange('showQrOnIdBadge', e.target.checked)
                      }
                      className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-[#F37021]"
                    />
                    <span>Hiển thị Mã QR trên Thẻ Đeo VIP</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agendaConfig.showQrOnCheckinCard}
                      onChange={(e) =>
                        handleFieldChange(
                          'showQrOnCheckinCard',
                          e.target.checked
                        )
                      }
                      className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-[#F37021]"
                    />
                    <span>Hiển thị Mã QR trên Ảnh Check-in 16:9</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Standee Canvas */}
      <canvas ref={standeeCanvasRef} className="hidden" />
    </div>
  );
};

import React, { useState } from 'react';
import {
  BRAND_THEMES,
  BrandConfig,
  BrandThemePreset,
  GreetingLanguage,
  WelcomeAudioMode,
} from '../types/attendance';
import {
  FourLogosCustomizerSection,
  FptSchoolsLogo,
} from './FptSchoolsLogo';
import {
  extractDominantColorsFromImage,
  imageUrlToBase64,
} from '../utils/biometrics';
import {
  isAmbientLoungeMusicPlaying,
  playInstrumentalWelcomeMelody,
  setAmbientLoungeMusic,
  speakEnglishGreeting,
  speakVietnameseGreeting,
} from '../utils/sound';
import {
  CalendarClock,
  CheckCircle2,
  Globe,
  MapPin,
  Music,
  Palette,
  RefreshCw,
  Sparkles,
  Upload,
  Volume2,
  Wand2,
} from 'lucide-react';

interface BrandCustomizerPanelProps {
  brandConfig: BrandConfig;
  onUpdateBrandConfig: (updated: BrandConfig) => void;
  activeTheme: BrandThemePreset;
}

export const BrandCustomizerPanel: React.FC<BrandCustomizerPanelProps> = ({
  brandConfig,
  onUpdateBrandConfig,
  activeTheme,
}) => {
  const [isAnalyzingBrand, setIsAnalyzingBrand] = useState(false);
  const [analysisFeedback, setAnalysisFeedback] = useState<string | null>(null);
  const [brandVisualPreview, setBrandVisualPreview] = useState<string>('');

  const handleChange = <K extends keyof BrandConfig>(
    key: K,
    value: BrandConfig[K]
  ) => {
    onUpdateBrandConfig({
      ...brandConfig,
      [key]: value,
    });
  };

  // Upload custom logo to top-left header & auto-recognize dominant brand colors
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        const dataUrl = reader.result;
        setBrandVisualPreview(dataUrl);
        const extracted = await extractDominantColorsFromImage(dataUrl);
        onUpdateBrandConfig({
          ...brandConfig,
          customLogoUrl: dataUrl,
          customPrimaryHex: extracted.primaryHex,
          customSecondaryHex: extracted.secondaryHex,
          customAccentHex: extracted.accentHex,
          recognizedBrandStyle: extracted.brandStyleDescription,
        });
        setAnalysisFeedback(
          `Đã cập nhật Logo mới và tự động trích xuất bộ màu chủ đạo: ${extracted.primaryHex} · ${extracted.secondaryHex} · ${extracted.accentHex}`
        );
      }
    };
    reader.readAsDataURL(file);
  };

  // Upload any Key Visual / Banner image to recognize dominant color & brand style
  const handleKeyVisualAnalyzeUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        const normalized = await imageUrlToBase64(reader.result);
        setBrandVisualPreview(normalized);
        await runAiBrandAndColorRecognition(normalized);
      }
    };
    reader.readAsDataURL(file);
  };

  // Run AI + Canvas Dominant Color & Brand Style Recognition
  const runAiBrandAndColorRecognition = async (imageSource?: string) => {
    setIsAnalyzingBrand(true);
    setAnalysisFeedback(
      'Đang phân tích màu sắc chủ đạo, phong cách thương hiệu và chủ đề sự kiện qua AI...'
    );

    const targetImg = imageSource || brandVisualPreview || brandConfig.customLogoUrl;

    try {
      let localColors = {
        primaryHex: brandConfig.customPrimaryHex || '#F37021',
        secondaryHex: brandConfig.customSecondaryHex || '#0066B2',
        accentHex: brandConfig.customAccentHex || '#0DB14B',
        suggestedThemeId: 'fpt_schools',
        brandStyleDescription:
          'Năng động, Khai phóng, Công nghệ & Giáo dục Hiện đại (FPT Identity)',
      };

      if (targetImg) {
        localColors = await extractDominantColorsFromImage(targetImg);
      }

      const response = await fetch('/api/analyze-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: targetImg || undefined,
          brandName: brandConfig.brandName,
          eventDescription: `${brandConfig.eventName} - ${brandConfig.eventSubtitle}`,
        }),
      });

      if (response.ok) {
        const aiData = await response.json();
        const primaryHex = aiData.primaryHex || localColors.primaryHex;
        const secondaryHex = aiData.secondaryHex || localColors.secondaryHex;
        const accentHex = aiData.accentHex || localColors.accentHex;

        onUpdateBrandConfig({
          ...brandConfig,
          themeId: targetImg ? 'custom_ai' : brandConfig.themeId,
          customPrimaryHex: primaryHex,
          customSecondaryHex: secondaryHex,
          customAccentHex: accentHex,
          recognizedBrandStyle:
            aiData.brandStyle || localColors.brandStyleDescription,
          recognizedThemeConcept:
            aiData.themeConcept ||
            `Bộ màu chủ đạo ${primaryHex} · ${secondaryHex} · ${accentHex}`,
          welcomeTemplate:
            aiData.suggestedWelcomeVi || brandConfig.welcomeTemplate,
          welcomeTemplateEn:
            aiData.suggestedWelcomeEn || brandConfig.welcomeTemplateEn,
        });

        setAnalysisFeedback(
          `AI đã nhận diện thành công! Phong cách: "${aiData.brandStyle}" · Màu chủ đạo: ${primaryHex}, ${secondaryHex}, ${accentHex}.`
        );
      } else {
        onUpdateBrandConfig({
          ...brandConfig,
          themeId: 'custom_ai',
          customPrimaryHex: localColors.primaryHex,
          customSecondaryHex: localColors.secondaryHex,
          customAccentHex: localColors.accentHex,
          recognizedBrandStyle: localColors.brandStyleDescription,
          recognizedThemeConcept: `Phối màu Thương hiệu ${localColors.primaryHex} · ${localColors.secondaryHex} · ${localColors.accentHex}`,
        });
        setAnalysisFeedback(
          `Đã trích xuất bảng màu chủ đạo: ${localColors.primaryHex}, ${localColors.secondaryHex}, ${localColors.accentHex} — Phong cách: ${localColors.brandStyleDescription}`
        );
      }
    } catch {
      setAnalysisFeedback(
        'Đã áp dụng nhận diện bảng màu thương hiệu tiêu chuẩn.'
      );
    } finally {
      setIsAnalyzingBrand(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1: 4-LOGO IDENTITY STUDIO & BRAND COLOR / STYLE AI RECOGNITION */}
      <div className="rounded-xl border border-purple-500/35 bg-[#0F172A] p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Palette className="h-5 w-5 text-purple-400" />
              <h2 className="text-lg font-bold text-white">
                1. Quản Lý & Thay Đổi Chuẩn Xác Bộ 4 Logo Nhận Diện Sự Kiện (FPT Education · Vovinam · Liên Đoàn · Khơi Nguồn Võ Việt)
              </h2>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Thay đổi từng logo nhận diện bằng file ảnh gốc (PNG/SVG/JPG/WebP), dán trực tiếp từ Clipboard (Ctrl+V), tự động cắt viền thừa, tách nền trắng và căn chỉnh tỷ lệ hiển thị chuẩn xác trên Màn hình LED & Thẻ Đại Biểu.
            </p>
          </div>
        </div>

        {analysisFeedback && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-3 text-xs text-emerald-200 flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{analysisFeedback}</span>
          </div>
        )}

        {/* 4-Logo Interactive Precision Customizer */}
        <FourLogosCustomizerSection
          onConfigChange={(nextFourLogos) => {
            onUpdateBrandConfig({
              ...brandConfig,
              customLogoUrl: '',
              fourLogosConfig: nextFourLogos,
            });
          }}
        />

        {/* AI Dominant Color & Brand Style Analyzer */}
        <div className="rounded-xl border border-orange-500/30 bg-gradient-to-r from-orange-950/20 via-slate-900/70 to-blue-950/20 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-[#F37021]" />
                <span>
                  Nhận Diện Màu Chủ Đạo, Phong Cách Thương Hiệu & Chủ Đề Sự Kiện (AI Brand Analyzer)
                </span>
              </h3>
              <p className="mt-1 text-xs text-slate-300">
                Tải ảnh Poster / Key Visual hoặc bấm phân tích tự động để AI trích xuất mã màu HEX chủ đạo, nhận diện phong cách thương hiệu và gợi ý thông điệp chào mừng.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors">
                <Upload className="h-3.5 w-3.5 text-amber-400" />
                <span>Tải Ảnh Key Visual / Poster để Nhận Diện Màu</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleKeyVisualAnalyzeUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                disabled={isAnalyzingBrand}
                onClick={() => runAiBrandAndColorRecognition()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#F37021] hover:bg-orange-500 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                <span>
                  {isAnalyzingBrand
                    ? 'Đang phân tích AI...'
                    : 'Phân Tích Phong Cách & Màu Chủ Đạo AI'}
                </span>
              </button>
            </div>
          </div>

          {/* Recognized Palette & Brand Style Display */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2">
            <div className="md:col-span-5 rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-300">
                Bảng Màu Chủ Đạo Nhận Diện Được (Có thể tinh chỉnh):
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Màu Chính (Primary)
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 p-1.5">
                    <input
                      type="color"
                      value={brandConfig.customPrimaryHex}
                      onChange={(e) => {
                        onUpdateBrandConfig({
                          ...brandConfig,
                          themeId: 'custom_ai',
                          customPrimaryHex: e.target.value.toUpperCase(),
                        });
                      }}
                      className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent"
                    />
                    <span className="font-mono-tabular text-xs text-white">
                      {brandConfig.customPrimaryHex}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Màu Phụ (Secondary)
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 p-1.5">
                    <input
                      type="color"
                      value={brandConfig.customSecondaryHex}
                      onChange={(e) => {
                        onUpdateBrandConfig({
                          ...brandConfig,
                          themeId: 'custom_ai',
                          customSecondaryHex: e.target.value.toUpperCase(),
                        });
                      }}
                      className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent"
                    />
                    <span className="font-mono-tabular text-xs text-white">
                      {brandConfig.customSecondaryHex}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Màu Nhấn (Accent)
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 p-1.5">
                    <input
                      type="color"
                      value={brandConfig.customAccentHex}
                      onChange={(e) => {
                        onUpdateBrandConfig({
                          ...brandConfig,
                          themeId: 'custom_ai',
                          customAccentHex: e.target.value.toUpperCase(),
                        });
                      }}
                      className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent"
                    />
                    <span className="font-mono-tabular text-xs text-white">
                      {brandConfig.customAccentHex}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-7 rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-2.5">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#F37021]">
                  Phong Cách Thương Hiệu Nhận Diện (Brand Style Archetype)
                </label>
                <input
                  type="text"
                  value={brandConfig.recognizedBrandStyle}
                  onChange={(e) =>
                    handleChange('recognizedBrandStyle', e.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-white focus:border-[#F37021] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-sky-400">
                  Chủ Đề & Ý Tưởng Thẩm Mỹ Sự Kiện (Event Theme Concept)
                </label>
                <input
                  type="text"
                  value={brandConfig.recognizedThemeConcept}
                  onChange={(e) =>
                    handleChange('recognizedThemeConcept', e.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 focus:border-[#F37021] focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preset Brand Themes */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-3">
            Chọn Chủ Đề Màu Sắc & Phong Cách Thương Hiệu Có Sẵn:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {BRAND_THEMES.map((theme) => {
              const isSelected = brandConfig.themeId === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleChange('themeId', theme.id)}
                  className={`text-left rounded-xl border p-4 transition-all ${
                    isSelected
                      ? `${theme.accentBorderClass} bg-slate-900 ring-1 ring-white/25`
                      : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-4 w-6 rounded-full"
                        style={{
                          backgroundColor:
                            theme.id === 'custom_ai'
                              ? brandConfig.customPrimaryHex
                              : theme.accentLightHex,
                        }}
                      />
                      <span
                        className="h-4 w-4 rounded-full"
                        style={{
                          backgroundColor:
                            theme.id === 'custom_ai'
                              ? brandConfig.customSecondaryHex
                              : theme.secondaryHex,
                        }}
                      />
                      <span
                        className="h-4 w-4 rounded-full"
                        style={{
                          backgroundColor:
                            theme.id === 'custom_ai'
                              ? brandConfig.customAccentHex
                              : theme.tertiaryHex,
                        }}
                      />
                    </div>
                    {isSelected && (
                      <span className="text-xs font-semibold text-emerald-400">
                        ● Đang áp dụng
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white">
                    {theme.name}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-amber-400/90">
                    Phong cách: {theme.brandStyleTag}
                  </p>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                    {theme.subtitle}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 2: EVENT TITLES, TIME, LOCATION & POSITION EDITOR */}
      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-6 space-y-5">
        <div className="border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <CalendarClock className="h-5 w-5 text-[#F37021]" />
            <h2 className="text-lg font-bold text-white">
              2. Chỉnh Sửa Tiêu Đề Sự Kiện, Thời Gian, Địa Điểm & Vị Trí Đón Tiếp
            </h2>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Mọi thay đổi về tiêu đề, thời gian, địa điểm và vị trí cổng đón sẽ được cập nhật tức thì trên Cổng Check-in, Màn hình LED Chào mừng và Ảnh Thẻ Khách mời.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tiêu Đề Sự Kiện Chính Thức (Event Title - Tiếng Việt)
            </label>
            <input
              type="text"
              value={brandConfig.eventName}
              onChange={(e) => handleChange('eventName', e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white focus:border-[#F37021] focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tiêu Đề Phụ / Tên Sự Kiện Tiếng Anh (English Event Subtitle)
            </label>
            <input
              type="text"
              value={brandConfig.eventSubtitle}
              onChange={(e) => handleChange('eventSubtitle', e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white focus:border-[#F37021] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Tên Thương Hiệu / Đơn Vị Tổ Chức
            </label>
            <input
              type="text"
              value={brandConfig.brandName}
              onChange={(e) => handleChange('brandName', e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white focus:border-[#F37021] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Thông Điệp Chủ Đề / Slogan Sự Kiện
            </label>
            <input
              type="text"
              value={brandConfig.eventTagline}
              onChange={(e) => handleChange('eventTagline', e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white focus:border-[#F37021] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 text-amber-400" />
              <span>Thời Gian Tổ Chức Sự Kiện (Event Date & Time)</span>
            </label>
            <input
              type="text"
              value={brandConfig.eventDateTime}
              onChange={(e) => handleChange('eventDateTime', e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white focus:border-[#F37021] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-emerald-400" />
              <span>Địa Điểm Tổ Chức (Event Location / Venue)</span>
            </label>
            <input
              type="text"
              value={brandConfig.eventLocation}
              onChange={(e) => handleChange('eventLocation', e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white focus:border-[#F37021] focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Vị Trí Sảnh / Cổng Check-in Đón Tiếp (Gate / Reception Position)
            </label>
            <input
              type="text"
              value={brandConfig.eventPosition}
              onChange={(e) => handleChange('eventPosition', e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white focus:border-[#F37021] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: VIETNAMESE & ENGLISH BILINGUAL GREETING CONFIGURATION */}
      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Globe className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">
                3. Cấu Hình Lời Chào Mừng Tiếng Việt & Tiếng Anh (Bilingual Welcome Touchpoint)
              </h2>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Tuỳ chỉnh chế độ hiển thị & phát giọng đọc chào mừng bằng Tiếng Việt, Tiếng Anh hoặc Song ngữ Việt – Anh.
            </p>
          </div>

          {/* Language Mode Switcher */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1">
            {(
              [
                { id: 'bilingual', label: 'Song Ngữ Việt – Anh' },
                { id: 'vi', label: 'Chỉ Tiếng Việt' },
                { id: 'en', label: 'English Only' },
              ] as { id: GreetingLanguage; label: string }[]
            ).map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => handleChange('greetingLanguage', lang.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  brandConfig.greetingLanguage === lang.id
                    ? 'bg-[#F37021] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Vietnamese Templates */}
          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Mẫu Chào Mừng Tiếng Việt
              </span>
              <span className="font-mono-tabular text-[11px] text-slate-400">
                {'{honorific}'} {'{name}'} {'{role}'} {'{company}'} {'{event}'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Khi khách Check-in (Giờ Vào):
              </label>
              <textarea
                rows={2}
                value={brandConfig.welcomeTemplate}
                onChange={(e) => handleChange('welcomeTemplate', e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-[#F37021] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Khi khách Check-out (Giờ Ra):
              </label>
              <textarea
                rows={2}
                value={brandConfig.farewellTemplate}
                onChange={(e) =>
                  handleChange('farewellTemplate', e.target.value)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-[#F37021] focus:outline-none"
              />
            </div>
          </div>

          {/* English Templates */}
          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                English Welcome & Farewell Templates
              </span>
              <span className="font-mono-tabular text-[11px] text-slate-400">
                {'{honorific_en}'} {'{name}'} {'{role}'} {'{company}'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                English Check-in Welcome Message:
              </label>
              <textarea
                rows={2}
                value={brandConfig.welcomeTemplateEn}
                onChange={(e) =>
                  handleChange('welcomeTemplateEn', e.target.value)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                English Check-out Farewell Message:
              </label>
              <textarea
                rows={2}
                value={brandConfig.farewellTemplateEn}
                onChange={(e) =>
                  handleChange('farewellTemplateEn', e.target.value)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Sound, Voice TTS, Instrumental Music & Auto-Popup Preferences */}
        <div className="space-y-4 border-t border-slate-800 pt-5">
          <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <Music className="h-4 w-4 text-cyan-400" />
                  <span>
                    Chế Độ Phát Âm Chuẩn Ngôn Ngữ (Việt / Anh) & Nhạc Không Lời Nhẹ Nhàng, Tinh Tế
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Phát âm chuẩn giọng bản xứ Tiếng Việt / Tiếng Anh thân thiện, chuyên nghiệp hoặc phát bản nhạc không lời nhẹ nhàng, tinh tế chào mừng khách hàng, đối tác, diễn giả, khách mời, phụ huynh.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    speakVietnameseGreeting(
                      'Nhiệt liệt chào mừng Quý khách hàng, Quý đối tác, Diễn giả và Quý phụ huynh đã hiện diện tại sự kiện!'
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  <span>Nghe thử Tiếng Việt</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    speakEnglishGreeting(
                      'Warmly welcome our distinguished guests, partners, speakers, and parents to the event!'
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>Test English Voice</span>
                </button>
                <button
                  type="button"
                  onClick={() => playInstrumentalWelcomeMelody()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25"
                >
                  <Music className="h-3.5 w-3.5" />
                  <span>Nghe Giai Điệu Không Lời</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
              {(
                [
                  {
                    id: 'instrumental_and_voice',
                    title: 'Nhạc Không Lời Tinh Tế + Giọng Đọc (VI / EN)',
                    desc: 'Phát giai điệu Piano & Harp nhẹ nhàng kết hợp giọng đọc chào mừng chuẩn ngôn ngữ',
                  },
                  {
                    id: 'instrumental_only',
                    title: 'Chỉ Phát Bản Nhạc Không Lời Nhẹ Nhàng',
                    desc: 'Không đọc lời thoại, chỉ phát bản nhạc không lời tinh tế khi đón khách',
                  },
                  {
                    id: 'voice_only',
                    title: 'Chỉ Phát Giọng Đọc Chuyên Nghiệp (VI / EN)',
                    desc: 'Phát âm chuẩn Tiếng Việt hoặc Tiếng Anh thân thiện, rõ ràng',
                  },
                ] as { id: WelcomeAudioMode; title: string; desc: string }[]
              ).map((m) => {
                const active =
                  (brandConfig.welcomeAudioMode || 'instrumental_and_voice') ===
                  m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onUpdateBrandConfig({
                        ...brandConfig,
                        welcomeAudioMode: m.id,
                        enableInstrumentalMusic: m.id !== 'voice_only',
                        enableVoiceGreeting: true,
                      });
                    }}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      active
                        ? 'border-cyan-400 bg-cyan-950/35 text-white shadow-sm'
                        : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <p className="text-xs font-bold text-white">{m.title}</p>
                    <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                      {m.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3.5">
              <input
                type="checkbox"
                checked={brandConfig.autoPopupWelcome}
                onChange={(e) =>
                  handleChange('autoPopupWelcome', e.target.checked)
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-[#F37021]"
              />
              <div>
                <p className="text-xs font-semibold text-white">
                  Bật Màn hình Chào mừng tức thì
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Hiển thị toàn khung thông điệp chào mừng mỗi khi nhận diện thành công
                </p>
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3.5">
              <input
                type="checkbox"
                checked={brandConfig.enableSoundChime}
                onChange={(e) =>
                  handleChange('enableSoundChime', e.target.checked)
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-[#F37021]"
              />
              <div>
                <p className="text-xs font-semibold text-white">
                  Âm thanh Chuông Sự kiện (Chime)
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Phát hợp âm sang trọng khi khách mời bước qua cổng Check-in
                </p>
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3.5">
              <input
                type="checkbox"
                checked={brandConfig.enableVoiceGreeting}
                onChange={(e) =>
                  handleChange('enableVoiceGreeting', e.target.checked)
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-[#F37021]"
              />
              <div>
                <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Volume2 className="h-3.5 w-3.5 text-[#F37021]" />
                  <span>Bật Âm Thanh / Giọng Đọc Welcome</span>
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Phát tự động lời chào Tiếng Việt / Tiếng Anh hoặc nhạc không lời khi Check-in
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

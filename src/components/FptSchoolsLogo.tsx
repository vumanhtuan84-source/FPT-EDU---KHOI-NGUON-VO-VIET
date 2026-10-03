import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Crop,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Link2,
  RotateCcw,
  Sliders,
  Sparkles,
  Square,
  Upload,
  Wand2,
  X,
  ZoomIn,
} from 'lucide-react';
import { CustomLogoSlotConfig, FourLogosConfig } from '../types/attendance';

interface FptSchoolsLogoProps {
  customLogoUrl?: string;
  lockup?: 'horizontal' | 'stacked';
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

/**
 * ============================================================================
 * BỘ 4 LOGO SỰ KIỆN NGUYÊN BẢN & THƯ VIỆN PRESET CHUẨN XÁC
 * 1. Tổ Chức Giáo Dục FPT (FPT Education) — Chuẩn Nền Sáng / Trong Suốt / FPT Schools
 * 2. Môn Phái Vovinam Việt Võ Đạo (Huy hiệu Khiên Vàng Âm Dương & Bản Đồ Việt Nam)
 * 3. Liên Đoàn Vovinam FPT Edu (FPT Edu Vovinam Federation)
 * 4. Cuộc Thi Vovinam: FPT EDU Khơi Nguồn Võ Việt 2026 (Key Visual Đỏ Vàng Trống Đồng)
 * ============================================================================
 */

// 1A. Nguyên bản Logo: TỔ CHỨC GIÁO DỤC FPT (FPT Education - Nền Trắng Chuẩn)
export const FPT_EDUCATION_SVG_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 156" fill="none">
  <rect x="2" y="2" width="456" height="152" rx="16" fill="#FFFFFF"/>
  <!-- 3 Lá FPT Nguyên Bản: Xanh Dương (#0066B2) - Cam (#F37021) - Xanh Lá (#0DB14B) -->
  <path d="M92 22C95 10 105 4 118 4H148L133 82H102C89 82 82 73 85 60L92 22Z" fill="#0066B2"/>
  <path d="M106 29H134L132 39H116L114 48H128L126 57H112L109 72H97L106 29Z" fill="#FFFFFF"/>

  <path d="M148 0C151 -1 157 0 165 0H195L176 92C173 103 163 108 150 108H130L148 0Z" fill="#F37021"/>
  <path d="M155 28H174C182 28 186 33 184 42C182 51 176 57 167 57H160L157 72H146L155 28ZM161 47H167C170 47 172 45 173 42C173 39 171 37 168 37H163L161 47Z" fill="#FFFFFF"/>

  <path d="M195 10H240L227 68C224 79 215 84 202 84H179L195 10Z" fill="#0DB14B"/>
  <path d="M200 29H231L229 39H218L212 72H200L206 39H197L200 29Z" fill="#FFFFFF"/>

  <!-- Biểu tượng ® -->
  <circle cx="236" cy="78" r="7" stroke="#0066B2" stroke-width="1.5" fill="none"/>
  <text x="236" y="81.5" text-anchor="middle" fill="#0066B2" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="700" font-size="9">R</text>

  <!-- Chữ Education (#0066B2) -->
  <text x="252" y="65" fill="#0066B2" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="600" font-size="35">Education</text>

  <!-- Dòng chữ: TỔ CHỨC GIÁO DỤC FPT (Chuẩn màu Cam #F37021) -->
  <text x="230" y="137" text-anchor="middle" textLength="396" lengthAdjust="spacingAndGlyphs" fill="#F37021" stroke="#F37021" stroke-width="0.8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="700" font-size="30">TỔ CHỨC GIÁO DỤC FPT</text>
</svg>`;

// 1B. Phiên bản Tách Nền Trong Suốt cho Màn LED Tối: TỔ CHỨC GIÁO DỤC FPT (FPT Education - Nền Trong Suốt)
export const FPT_EDUCATION_TRANSPARENT_SVG_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 156" fill="none">
  <path d="M92 22C95 10 105 4 118 4H148L133 82H102C89 82 82 73 85 60L92 22Z" fill="#0066B2"/>
  <path d="M106 29H134L132 39H116L114 48H128L126 57H112L109 72H97L106 29Z" fill="#FFFFFF"/>

  <path d="M148 0C151 -1 157 0 165 0H195L176 92C173 103 163 108 150 108H130L148 0Z" fill="#F37021"/>
  <path d="M155 28H174C182 28 186 33 184 42C182 51 176 57 167 57H160L157 72H146L155 28ZM161 47H167C170 47 172 45 173 42C173 39 171 37 168 37H163L161 47Z" fill="#FFFFFF"/>

  <path d="M195 10H240L227 68C224 79 215 84 202 84H179L195 10Z" fill="#0DB14B"/>
  <path d="M200 29H231L229 39H218L212 72H200L206 39H197L200 29Z" fill="#FFFFFF"/>

  <circle cx="236" cy="78" r="7" stroke="#38BDF8" stroke-width="1.5" fill="none"/>
  <text x="236" y="81.5" text-anchor="middle" fill="#38BDF8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="700" font-size="9">R</text>

  <text x="252" y="65" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="700" font-size="35">Education</text>
  <text x="230" y="137" text-anchor="middle" textLength="396" lengthAdjust="spacingAndGlyphs" fill="#F97316" stroke="#F97316" stroke-width="0.8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="700" font-size="30">TỔ CHỨC GIÁO DỤC FPT</text>
</svg>`;

// 1C. Phiên bản Hệ Thống Trường Phổ Thông FPT (FPT Schools)
export const FPT_SCHOOLS_SVG_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 156" fill="none">
  <rect x="2" y="2" width="456" height="152" rx="16" fill="#FFFFFF"/>
  <path d="M88 22C91 10 101 4 114 4H144L129 82H98C85 82 78 73 81 60L88 22Z" fill="#0066B2"/>
  <path d="M102 29H130L128 39H112L110 48H124L122 57H108L105 72H93L102 29Z" fill="#FFFFFF"/>

  <path d="M144 0C147 -1 153 0 161 0H191L172 92C169 103 159 108 146 108H126L144 0Z" fill="#F37021"/>
  <path d="M151 28H170C178 28 182 33 180 42C178 51 172 57 163 57H156L153 72H142L151 28ZM157 47H163C166 47 168 45 169 42C169 39 167 37 164 37H159L157 47Z" fill="#FFFFFF"/>

  <path d="M191 10H236L223 68C220 79 211 84 198 84H175L191 10Z" fill="#0DB14B"/>
  <path d="M196 29H227L225 39H214L208 72H196L202 39H193L196 29Z" fill="#FFFFFF"/>

  <text x="248" y="65" fill="#F37021" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="700" font-size="36">Schools</text>
  <text x="230" y="137" text-anchor="middle" textLength="396" lengthAdjust="spacingAndGlyphs" fill="#0066B2" stroke="#0066B2" stroke-width="0.7" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="700" font-size="27">HỆ THỐNG TRƯỜNG PHỔ THÔNG FPT</text>
</svg>`;

// 2. Nguyên bản Logo Môn Phái: VOVINAM VIỆT VÕ ĐẠO (Khiên Vàng Âm Dương & Bản Đồ Việt Nam)
export const VOVINAM_SHIELD_SVG_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 270 340" fill="none">
  <!-- Khiên Vàng Viền Xanh Đậm Nguyên Bản -->
  <path d="M10 8H260V178C260 258 200 312 135 332C70 312 10 258 10 178V8Z" fill="#FFF200" stroke="#0054A6" stroke-width="7"/>
  <path d="M17 15H253V176C253 251 196 302 135 322C74 302 17 251 17 176V15Z" stroke="#FFFFFF" stroke-width="2.5" fill="none"/>
  <path d="M20 18H250V175C250 248 194 298 135 318C76 298 20 248 20 175V18Z" stroke="#0054A6" stroke-width="1.5" fill="none"/>

  <!-- Chữ VOVINAM Đỏ Nguyên Bản (Chữ V đầu cao hơn và kéo nét ngang phía trên chữ OVINAM) -->
  <polygon points="28,26 42,26 53,65 65,26 238,26 238,34 72,34 57,78 45,78" fill="#ED1C24"/>
  <text x="156" y="76" text-anchor="middle" textLength="166" lengthAdjust="spacingAndGlyphs" fill="#ED1C24" stroke="#ED1C24" stroke-width="1.1" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="700" font-size="37">OVINAM</text>

  <!-- Chữ VIỆT VÕ ĐẠO Xanh Dương Nguyên Bản -->
  <text x="135" y="114" text-anchor="middle" textLength="198" lengthAdjust="spacingAndGlyphs" fill="#0054A6" stroke="#0054A6" stroke-width="0.9" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="700" font-size="29">VIỆT VÕ ĐẠO</text>

  <!-- Vòng Tròn Âm Dương Viền Trắng & Xanh -->
  <circle cx="135" cy="212" r="88" fill="#FFFFFF" stroke="#0054A6" stroke-width="3.5"/>
  <circle cx="135" cy="212" r="80" fill="#0054A6"/>
  <!-- Nửa Đỏ Bên Trái & Nửa Xanh Bên Phải Theo Đường Cong Âm Dương -->
  <path d="M135 132A80 80 0 0 0 135 292A40 40 0 0 1 135 212A40 40 0 0 0 135 132Z" fill="#ED1C24"/>
  <path d="M135 132A80 80 0 0 1 135 292A40 40 0 0 0 135 212A40 40 0 0 1 135 132Z" fill="#0054A6"/>

  <!-- Bản Đồ Việt Nam Màu Vàng Hình Chữ S Nằm Giữa Vòng Âm Dương -->
  <path d="M110 142L136 137L149 148L142 162L124 169L129 183L154 204L164 228L156 254L127 276L115 268L132 248L142 227L130 202L109 178L106 156Z" fill="#FFF200" stroke="#ED1C24" stroke-width="2.2" stroke-linejoin="round"/>
  <!-- Quần đảo Hoàng Sa & Trường Sa -->
  <circle cx="172" cy="198" r="3.5" fill="#FFF200" stroke="#ED1C24" stroke-width="1"/>
  <circle cx="180" cy="204" r="2.5" fill="#FFF200"/>
  <circle cx="170" cy="242" r="3.5" fill="#FFF200" stroke="#ED1C24" stroke-width="1"/>
  <circle cx="179" cy="248" r="2.5" fill="#FFF200"/>
</svg>`;

// 3A. Nguyên bản Logo Huy Hiệu Tròn: LIÊN ĐOÀN VOVINAM FPT EDU (FPT Edu Vovinam Federation)
export const FPT_VOVINAM_FEDERATION_SVG_RAW = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 340 340" fill="none">
  <defs>
    <path id="fptFedBottomArc" d="M 44,182 A 126,126 0 1,0 296,182" />
  </defs>
  <!-- Vòng Tròn Nền Trắng & Viền Xanh Đậm Nguyên Bản -->
  <circle cx="170" cy="170" r="162" fill="#FFFFFF" stroke="#004B8D" stroke-width="10"/>
  <circle cx="170" cy="170" r="150" stroke="#004B8D" stroke-width="2" stroke-opacity="0.25" fill="none"/>

  <!-- Cánh Cung Đỏ Bên Trái -->
  <path d="M124 34C62 56 24 118 33 188C42 252 98 296 166 296C196 296 222 284 240 266C210 279 174 280 142 266C86 240 58 176 78 114C88 80 104 52 124 34Z" fill="#D91F26"/>

  <!-- Cánh Cung Xanh Dương Bên Phải -->
  <path d="M114 46C150 22 200 20 242 44C296 76 314 146 290 208C276 242 248 268 218 280C258 254 280 204 270 150C260 94 212 56 156 54C140 53 126 50 114 46Z" fill="#004B8D"/>

  <!-- Thân Tre Việt Nam Cách Điệu Bên Trái (Chuẩn nguyên bản Liên Đoàn Vovinam FPT) -->
  <path d="M84 194C79 158 86 122 104 90L111 94C95 124 88 158 93 192Z" fill="#005B9F"/>
  <path d="M98 204C93 168 100 132 118 100L125 104C109 134 102 168 107 202Z" fill="#005B9F"/>

  <!-- Chữ VOVINAM Xanh Dương Cách Điệu Võ Thuật -->
  <text x="176" y="100" text-anchor="middle" textLength="154" lengthAdjust="spacingAndGlyphs" fill="#005B9F" stroke="#005B9F" stroke-width="0.9" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="800" font-size="32">VOVINAM</text>
  <!-- Chữ Việt Võ Đạo Màu Vàng Nghệ -->
  <text x="180" y="126" text-anchor="middle" textLength="116" lengthAdjust="spacingAndGlyphs" fill="#F5B324" stroke="#F5B324" stroke-width="0.5" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="700" font-size="20">Việt Võ Đạo</text>

  <!-- Biểu Tượng Võ Sĩ Vovinam Tung Đòn Cước & Quyền Đạo Chính Giữa -->
  <circle cx="164" cy="146" r="9.5" fill="#005B9F"/>
  <path d="M124 184C144 162 174 152 218 158C194 168 178 182 174 208L194 242L178 246L160 212L138 238L124 230L148 194C138 190 130 188 124 184Z" fill="#005B9F"/>
  <path d="M150 232C184 248 226 238 248 204C234 244 190 264 146 246Z" fill="#005B9F"/>

  <!-- Dòng Chữ Vòng Cung: FPT Edu Vovinam Federation -->
  <text fill="#004B8D" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="800" font-size="20.5" letter-spacing="0.4">
    <textPath href="#fptFedBottomArc" xlink:href="#fptFedBottomArc" startOffset="50%" text-anchor="middle">FPT Edu Vovinam Federation</textPath>
  </text>
</svg>`;

// 3B. Phiên bản Quy Chuẩn Ngang: LIÊN ĐOÀN VOVINAM TỔ CHỨC GIÁO DỤC FPT (Huy Hiệu + 3 Lá FPT + Chữ Ngang)
export const FPT_VOVINAM_FEDERATION_HORIZONTAL_SVG_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 170" fill="none">
  <rect x="2" y="2" width="556" height="166" rx="20" fill="#FFFFFF" stroke="#004B8D" stroke-width="3"/>
  <!-- Huy hiệu tròn Liên Đoàn bên trái -->
  <g transform="translate(14, 11) scale(0.435)">
    <circle cx="170" cy="170" r="160" fill="#FFFFFF" stroke="#004B8D" stroke-width="11"/>
    <path d="M126 32C62 54 22 118 31 190C40 258 100 306 170 304C202 303 228 289 246 270C216 285 178 287 144 272C86 246 56 180 76 116C86 80 104 50 126 32Z" fill="#D91F26"/>
    <path d="M114 46C150 20 202 18 244 44C300 76 320 148 295 212C280 248 252 274 220 286C262 260 286 208 276 152C265 94 216 54 158 52C142 51 126 49 114 46Z" fill="#004B8D"/>
    <path d="M84 198C79 162 86 124 104 92L111 96C95 126 88 162 93 196Z" fill="#005B9F"/>
    <path d="M98 208C93 172 100 134 118 102L125 106C109 136 102 172 107 206Z" fill="#005B9F"/>
    <text x="176" y="102" text-anchor="middle" fill="#005B9F" font-family="Arial, sans-serif" font-weight="800" font-size="33">VOVINAM</text>
    <text x="182" y="129" text-anchor="middle" fill="#F5B324" font-family="Arial, sans-serif" font-weight="700" font-size="20">Việt Võ Đạo</text>
    <circle cx="164" cy="148" r="9.5" fill="#005B9F"/>
    <path d="M124 188C144 166 174 156 218 162C194 172 178 186 174 212L194 246L178 250L160 216L138 242L124 234L148 198C138 194 130 192 124 188Z" fill="#005B9F"/>
    <path d="M150 236C184 252 226 242 248 208C234 248 190 268 146 250Z" fill="#005B9F"/>
  </g>
  <!-- Cụm 3 Lá FPT + Chữ LIÊN ĐOÀN VOVINAM FPT bên phải -->
  <g transform="translate(172, 16) scale(0.55)">
    <path d="M12 22C15 10 25 4 38 4H68L53 82H22C9 82 2 73 5 60L12 22Z" fill="#0066B2"/>
    <path d="M26 29H54L52 39H36L34 48H48L46 57H32L29 72H17L26 29Z" fill="#FFFFFF"/>
    <path d="M68 0C71 -1 77 0 85 0H115L96 92C93 103 83 108 70 108H50L68 0Z" fill="#F37021"/>
    <path d="M75 28H94C102 28 106 33 104 42C102 51 96 57 87 57H80L77 72H66L75 28ZM81 47H87C90 47 92 45 93 42C93 39 91 37 88 37H83L81 47Z" fill="#FFFFFF"/>
    <path d="M115 10H160L147 68C144 79 135 84 122 84H99L115 10Z" fill="#0DB14B"/>
    <path d="M120 29H151L149 39H138L132 72H120L126 39H117L120 29Z" fill="#FFFFFF"/>
  </g>
  <text x="272" y="56" fill="#0054A6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="800" font-size="27">LIÊN ĐOÀN VOVINAM</text>
  <text x="176" y="104" fill="#F37021" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="800" font-size="28">TỔ CHỨC GIÁO DỤC FPT</text>
  <line x1="176" y1="118" x2="534" y2="118" stroke="#0054A6" stroke-width="2" stroke-opacity="0.3"/>
  <text x="176" y="144" fill="#004B8D" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="700" font-size="20" letter-spacing="0.8">FPT EDU VOVINAM FEDERATION</text>
</svg>`;

// 4. Nguyên bản Logo: CUỘC THI VOVINAM — FPT EDU KHƠI NGUỒN VÕ VIỆT 2026
// Sử dụng chữ cái ASCII nguyên khối ("KHOI" + "NGUON" và "VO" + "VIET") kết hợp dấu Tiếng Việt vẽ bằng Vector Path 3D
// Đảm bảo chữ "NGUỒN" liền khít 100%, TUYỆT ĐỐI KHÔNG BAO GIỜ BỊ CÁCH CHỮ N trên macOS, Windows, iOS, Android!
export const KHOI_NGUON_VO_VIET_2026_SVG_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 295" fill="none">
  <defs>
    <linearGradient id="knGold3D" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFBEB"/>
      <stop offset="30%" stop-color="#FDE047"/>
      <stop offset="70%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#B45309"/>
    </linearGradient>
    <linearGradient id="knRed3D" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FF4D4D"/>
      <stop offset="45%" stop-color="#DC2626"/>
      <stop offset="100%" stop-color="#7F1D1D"/>
    </linearGradient>
    <pattern id="dongSonPattern" width="24" height="24" patternUnits="userSpaceOnUse">
      <rect width="24" height="24" fill="url(#knRed3D)"/>
      <circle cx="12" cy="12" r="9" stroke="#F59E0B" stroke-width="1" stroke-opacity="0.5" fill="none"/>
      <circle cx="12" cy="12" r="4" stroke="#FDE047" stroke-width="0.8" stroke-opacity="0.5" fill="none"/>
      <path d="M0 12H24M12 0V24" stroke="#F59E0B" stroke-width="0.6" stroke-opacity="0.4"/>
    </pattern>
    <filter id="knShadow3D" x="-8%" y="-8%" width="116%" height="116%">
      <feDropShadow dx="0" dy="5" stdDeviation="3" flood-color="#3B0404" flood-opacity="0.95"/>
    </filter>
  </defs>

  <!-- Thanh tiêu đề trên: CUỘC THI VOVINAM + Tia sáng đỏ vàng hai bên -->
  <line x1="96" y1="24" x2="218" y2="24" stroke="#EF4444" stroke-width="3" stroke-linecap="round"/>
  <line x1="502" y1="24" x2="624" y2="24" stroke="#EF4444" stroke-width="3" stroke-linecap="round"/>
  <rect x="214" y="7" width="292" height="33" rx="16.5" fill="#450A0A" stroke="#F59E0B" stroke-width="2"/>
  <text x="360" y="29.5" text-anchor="middle" textLength="188" lengthAdjust="spacingAndGlyphs" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="700" font-size="16">CUỘC THI VOVINAM</text>

  <!-- Hàng 2: Cụm [FPT EDU] + [KHƠI NGUỒN] (Chữ NGUỒN liền khối 100%, không bao giờ bị cách chữ N) -->
  <g filter="url(#knShadow3D)">
    <!-- Khối FPT EDU 2 tầng bên trái -->
    <rect x="34" y="47" width="104" height="65" rx="10" fill="#450A0A" stroke="url(#knGold3D)" stroke-width="2.6"/>
    <text x="86" y="76" text-anchor="middle" textLength="68" lengthAdjust="spacingAndGlyphs" fill="url(#knGold3D)" stroke="#FEF08A" stroke-width="0.6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="700" font-size="27">FPT</text>
    <text x="86" y="104" text-anchor="middle" textLength="68" lengthAdjust="spacingAndGlyphs" fill="url(#knGold3D)" stroke="#FEF08A" stroke-width="0.6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="700" font-size="27">EDU</text>

    <!-- Từ "KHƠI" bằng chữ ASCII "KHOI" nguyên khối + Dấu Móc chữ Ơ bằng Vector Path -->
    <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="700" font-size="60">
      <text x="154" y="105" textLength="156" lengthAdjust="spacingAndGlyphs" fill="#450A0A" stroke="#450A0A" stroke-width="12" stroke-linejoin="round">KHOI</text>
      <text x="154" y="102" textLength="156" lengthAdjust="spacingAndGlyphs" fill="url(#knGold3D)" stroke="#FEF08A" stroke-width="1.5">KHOI</text>
    </g>
    <!-- Dấu móc chữ Ơ (trên vai phải chữ O của KHOI tại x=280, y=58) -->
    <path d="M276 54C285 52 291 58 289 67C287 73 281 76 275 76" stroke="#450A0A" stroke-width="9" stroke-linecap="round" fill="none"/>
    <path d="M276 53C285 51 291 57 289 66C287 72 281 75 275 75" stroke="url(#knGold3D)" stroke-width="5" stroke-linecap="round" fill="none"/>

    <!-- Từ "NGUỒN" bằng chữ ASCII "NGUON" nguyên khối (Chữ O và N liền khít 100% tự nhiên!) + Dấu Mũ & Huyền của chữ Ồ bằng Vector Path -->
    <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="700" font-size="60">
      <text x="332" y="105" textLength="238" lengthAdjust="spacingAndGlyphs" fill="#450A0A" stroke="#450A0A" stroke-width="12" stroke-linejoin="round">NGUON</text>
      <text x="332" y="102" textLength="238" lengthAdjust="spacingAndGlyphs" fill="url(#knGold3D)" stroke="#FEF08A" stroke-width="1.5">NGUON</text>
    </g>
    <!-- Dấu mũ Ô + dấu huyền (Ồ) nằm chính xác trên chữ O của NGUON (tâm chữ O tại x=498) -->
    <path d="M484 55L498 43L512 55" stroke="#450A0A" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M504 38L519 49" stroke="#450A0A" stroke-width="9" stroke-linecap="round" fill="none"/>
    <path d="M484 54L498 42L512 54" stroke="url(#knGold3D)" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M504 37L519 48" stroke="url(#knGold3D)" stroke-width="4.8" stroke-linecap="round" fill="none"/>
  </g>

  <!-- Hàng 3: Cụm chữ trung tâm VÕ [2026] VIỆT (Họa tiết Trống Đồng Đông Sơn Đỏ Vàng 3D) -->
  <g filter="url(#knShadow3D)">
    <!-- Chữ "VÕ" bên trái bằng ASCII "VO" nguyên khối + Dấu Ngã Vector 3D -->
    <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="700" font-size="146">
      <text x="48" y="254" textLength="226" lengthAdjust="spacingAndGlyphs" fill="#450A0A" stroke="#450A0A" stroke-width="18" stroke-linejoin="round">VO</text>
      <text x="48" y="250" textLength="226" lengthAdjust="spacingAndGlyphs" fill="url(#dongSonPattern)" stroke="url(#knGold3D)" stroke-width="4.2">VO</text>
    </g>
    <!-- Dấu Ngã (~) trên chữ O của VÕ (tâm x=212, y=126) -->
    <path d="M182 132C192 118 204 118 212 127C220 136 232 136 242 122" stroke="#450A0A" stroke-width="15" stroke-linecap="round" fill="none"/>
    <path d="M182 130C192 116 204 116 212 125C220 134 232 134 242 120" stroke="url(#knGold3D)" stroke-width="8" stroke-linecap="round" fill="none"/>

    <!-- Thẻ nghiêng 2026 ở giữa VÕ và VIỆT -->
    <g transform="translate(292, 146) skewX(11)">
      <rect x="0" y="0" width="48" height="112" rx="8" fill="url(#knRed3D)" stroke="url(#knGold3D)" stroke-width="3.4"/>
      <text x="24" y="27" text-anchor="middle" fill="url(#knGold3D)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="700" font-size="22">2</text>
      <text x="24" y="53" text-anchor="middle" fill="url(#knGold3D)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="700" font-size="22">0</text>
      <text x="24" y="79" text-anchor="middle" fill="url(#knGold3D)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="700" font-size="22">2</text>
      <text x="24" y="104" text-anchor="middle" fill="url(#knGold3D)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="700" font-size="22">6</text>
    </g>

    <!-- Chữ "VIỆT" bên phải bằng ASCII "VIET" nguyên khối + Dấu Mũ & Nặng của chữ Ệ bằng Vector 3D -->
    <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="700" font-size="136">
      <text x="362" y="254" textLength="312" lengthAdjust="spacingAndGlyphs" fill="#450A0A" stroke="#450A0A" stroke-width="18" stroke-linejoin="round">VIET</text>
      <text x="362" y="250" textLength="312" lengthAdjust="spacingAndGlyphs" fill="url(#dongSonPattern)" stroke="url(#knGold3D)" stroke-width="4.2">VIET</text>
    </g>
    <!-- Dấu Mũ (^) trên chữ E của VIỆT (tâm chữ E tại x=554, y=132) -->
    <path d="M530 140L554 118L578 140" stroke="#450A0A" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M530 138L554 116L578 138" stroke="url(#knGold3D)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <!-- Dấu Nặng (.) dưới chữ E của VIỆT (tâm x=554, y=274) -->
    <circle cx="554" cy="274" r="9.5" fill="#450A0A"/>
    <circle cx="554" cy="272" r="6.5" fill="url(#knGold3D)"/>
  </g>
</svg>`;

export function svgToDataUrl(svgString: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
}

export const DEFAULT_FOUR_EVENT_LOGO_URLS = {
  fptEducation: svgToDataUrl(FPT_EDUCATION_SVG_RAW),
  vovinamShield: svgToDataUrl(VOVINAM_SHIELD_SVG_RAW),
  fptVovinamFederation: svgToDataUrl(FPT_VOVINAM_FEDERATION_SVG_RAW),
  khoiNguonVoViet2026: svgToDataUrl(KHOI_NGUON_VO_VIET_2026_SVG_RAW),
};

export type LogoSlotKey =
  | 'fptEducation'
  | 'vovinamShield'
  | 'fptVovinamFederation'
  | 'khoiNguonVoViet2026';

export interface LogoPresetOption {
  id: string;
  name: string;
  desc: string;
  url: string;
  whiteBadgeBg?: boolean;
}

export const LOGO_SLOT_METADATA: Record<
  LogoSlotKey,
  {
    index: number;
    title: string;
    subtitle: string;
    aspectHint: string;
    presets: LogoPresetOption[];
  }
> = {
  fptEducation: {
    index: 1,
    title: 'Logo 1: Tổ Chức Giáo Dục FPT (Đơn Vị Tổ Chức)',
    subtitle:
      'Logo thương hiệu chủ quản xuất hiện ở vị trí đầu tiên trên Màn hình LED & Thẻ Đại Biểu',
    aspectHint: 'Tỷ lệ ngang (3:1) · PNG/SVG/JPG',
    presets: [
      {
        id: 'fpt_edu_white',
        name: 'Tổ chức Giáo dục FPT (Nền sáng chuẩn)',
        desc: '3 lá FPT + chữ Education (#0066B2) & TỔ CHỨC GIÁO DỤC FPT (#F37021)',
        url: svgToDataUrl(FPT_EDUCATION_SVG_RAW),
        whiteBadgeBg: false,
      },
      {
        id: 'fpt_edu_transparent',
        name: 'Tổ chức Giáo dục FPT (Tách nền cho LED Tím Neon)',
        desc: 'Nền trong suốt hoàn toàn, chữ Education trắng & TỔ CHỨC GIÁO DỤC FPT cam sáng',
        url: svgToDataUrl(FPT_EDUCATION_TRANSPARENT_SVG_RAW),
        whiteBadgeBg: false,
      },
      {
        id: 'fpt_schools',
        name: 'Hệ thống Trường Phổ thông FPT (FPT Schools)',
        desc: 'Logo 3 lá FPT Schools chuẩn nhận diện khối Phổ thông FPT',
        url: svgToDataUrl(FPT_SCHOOLS_SVG_RAW),
        whiteBadgeBg: false,
      },
    ],
  },
  vovinamShield: {
    index: 2,
    title: 'Logo 2: Môn Phái Vovinam Việt Võ Đạo',
    subtitle:
      'Huy hiệu Khiên Vàng Âm Dương & Bản đồ Việt Nam chuẩn nguyên bản môn phái Vovinam',
    aspectHint: 'Tỷ lệ huy hiệu đứng (4:5) · PNG/SVG',
    presets: [
      {
        id: 'vovinam_original',
        name: 'Huy hiệu Vovinam Việt Võ Đạo Nguyên Bản',
        desc: 'Khiên vàng viền xanh, chữ VOVINAM đỏ, vòng Âm Dương & Bản đồ Việt Nam',
        url: svgToDataUrl(VOVINAM_SHIELD_SVG_RAW),
        whiteBadgeBg: false,
      },
    ],
  },
  fptVovinamFederation: {
    index: 3,
    title: 'Logo 3: Liên Đoàn Vovinam FPT Edu',
    subtitle:
      'Hỗ trợ mọi tỷ lệ (Tròn 1:1, Huy hiệu đứng 4:5 hoặc Logo ngang 3:1) · Giữ chuẩn 100% nhận diện gốc',
    aspectHint: 'Tự động căn chuẩn mọi tỷ lệ (1:1 / 3:1) · PNG/SVG/JPG',
    presets: [
      {
        id: 'federation_original_circle',
        name: 'Huy Hiệu Tròn Liên Đoàn Vovinam FPT Edu (Chuẩn Nguyên Bản)',
        desc: 'Huy hiệu tròn trắng viền xanh, cánh cung đỏ-xanh, thân tre, võ sĩ Vovinam & chữ vòng cung',
        url: svgToDataUrl(FPT_VOVINAM_FEDERATION_SVG_RAW),
        whiteBadgeBg: false,
      },
      {
        id: 'federation_horizontal_lockup',
        name: 'Logo Ngang Liên Đoàn Vovinam Tổ Chức Giáo Dục FPT (Bản Đầy Đủ)',
        desc: 'Kết hợp Huy hiệu Liên đoàn Vovinam + 3 lá FPT & chữ LIÊN ĐOÀN VOVINAM TỔ CHỨC GIÁO DỤC FPT',
        url: svgToDataUrl(FPT_VOVINAM_FEDERATION_HORIZONTAL_SVG_RAW),
        whiteBadgeBg: false,
      },
      {
        id: 'federation_white_pedestal',
        name: 'Huy Hiệu Liên Đoàn Vovinam FPT (Khung Nền Trắng Ngọc Trai Nổi Bật)',
        desc: 'Đặt trên khung nền trắng viền vàng kim 24K giúp nổi bật 100% trên màn LED Tím Neon',
        url: svgToDataUrl(FPT_VOVINAM_FEDERATION_SVG_RAW),
        whiteBadgeBg: true,
      },
    ],
  },
  khoiNguonVoViet2026: {
    index: 4,
    title: 'Logo 4: Cuộc Thi FPT EDU Khơi Nguồn Võ Việt 2026',
    subtitle:
      'Key Visual chủ đề sự kiện (Đỏ Vàng 3D họa tiết Trống Đồng Đông Sơn, khóa chuẩn chữ NGUỒN)',
    aspectHint: 'Tỷ lệ ngang (2.4:1) · PNG/SVG',
    presets: [
      {
        id: 'khoinguon_original',
        name: 'Key Visual FPT EDU Khơi Nguồn Võ Việt 2026 Nguyên Bản',
        desc: 'Chữ 3D Vàng - Đỏ Trống Đồng Đông Sơn, liền khít chữ NGUỒN 100%',
        url: svgToDataUrl(KHOI_NGUON_VO_VIET_2026_SVG_RAW),
        whiteBadgeBg: false,
      },
    ],
  },
};

export const DEFAULT_FOUR_LOGOS_CONFIG: FourLogosConfig = {
  fptEducation: {
    url: DEFAULT_FOUR_EVENT_LOGO_URLS.fptEducation,
    scale: 1,
    visible: true,
    whiteBadgeBg: false,
    label: 'Tổ chức Giáo dục FPT',
    isCustomUploaded: false,
  },
  vovinamShield: {
    url: DEFAULT_FOUR_EVENT_LOGO_URLS.vovinamShield,
    scale: 1,
    visible: true,
    whiteBadgeBg: false,
    label: 'Vovinam Việt Võ Đạo',
    isCustomUploaded: false,
  },
  fptVovinamFederation: {
    url: DEFAULT_FOUR_EVENT_LOGO_URLS.fptVovinamFederation,
    scale: 1,
    visible: true,
    whiteBadgeBg: false,
    label: 'FPT Edu Vovinam Federation',
    isCustomUploaded: false,
  },
  khoiNguonVoViet2026: {
    url: DEFAULT_FOUR_EVENT_LOGO_URLS.khoiNguonVoViet2026,
    scale: 1,
    visible: true,
    whiteBadgeBg: false,
    label: 'FPT Edu Khơi Nguồn Võ Việt 2026',
    isCustomUploaded: false,
  },
};

const CUSTOM_LOGOS_STORAGE_KEY = 'auracheck_custom_four_logos_v3';
const CUSTOM_LOGOS_CONFIG_KEY = 'auracheck_four_logos_config_v4';
const LOGOS_IDB_NAME = 'auracheck_four_logos_idb_v1';
const LOGOS_IDB_STORE = 'four_logos_store';
const LOGOS_IDB_KEY = 'active_four_logos_config';

// Authoritative in-memory store so logo updates NEVER fail even when browser localStorage (5MB) is full!
let memoryFourLogosConfig: FourLogosConfig | null = null;
let idbHydrationStarted = false;

function openLogosIndexedDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(LOGOS_IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(LOGOS_IDB_STORE)) {
          db.createObjectStore(LOGOS_IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function persistLogosToIndexedDb(cfg: FourLogosConfig): Promise<void> {
  const db = await openLogosIndexedDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(LOGOS_IDB_STORE, 'readwrite');
      tx.objectStore(LOGOS_IDB_STORE).put(cfg, LOGOS_IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function hydrateLogosFromIndexedDb(): Promise<void> {
  if (idbHydrationStarted || typeof window === 'undefined') return;
  idbHydrationStarted = true;
  const db = await openLogosIndexedDb();
  if (!db) return;
  try {
    const tx = db.transaction(LOGOS_IDB_STORE, 'readonly');
    const req = tx.objectStore(LOGOS_IDB_STORE).get(LOGOS_IDB_KEY);
    req.onsuccess = () => {
      const idbVal = req.result as FourLogosConfig | undefined;
      if (idbVal && typeof idbVal === 'object' && idbVal.fptVovinamFederation) {
        memoryFourLogosConfig = idbVal;
        try {
          window.localStorage.setItem(
            CUSTOM_LOGOS_CONFIG_KEY,
            JSON.stringify(idbVal)
          );
        } catch {
          // Ignore if localStorage is full
        }
        window.dispatchEvent(
          new CustomEvent('auracheck-logos-updated', { detail: idbVal })
        );
      }
    };
  } catch {
    // Ignore IDB error
  }
}

export interface FourLogosState {
  fptEducation: string;
  vovinamShield: string;
  fptVovinamFederation: string;
  khoiNguonVoViet2026: string;
}

export function getActiveFourLogosConfig(customLogoUrl?: string): FourLogosConfig {
  if (typeof window === 'undefined') return DEFAULT_FOUR_LOGOS_CONFIG;
  void hydrateLogosFromIndexedDb();

  if (memoryFourLogosConfig) {
    const cloned: FourLogosConfig = {
      fptEducation: { ...memoryFourLogosConfig.fptEducation },
      vovinamShield: { ...memoryFourLogosConfig.vovinamShield },
      fptVovinamFederation: { ...memoryFourLogosConfig.fptVovinamFederation },
      khoiNguonVoViet2026: { ...memoryFourLogosConfig.khoiNguonVoViet2026 },
    };
    if (customLogoUrl && !cloned.fptEducation.isCustomUploaded) {
      cloned.fptEducation.url = customLogoUrl;
    }
    return cloned;
  }

  try {
    const rawV4 = window.localStorage.getItem(CUSTOM_LOGOS_CONFIG_KEY);
    if (rawV4) {
      const parsed = JSON.parse(rawV4);
      const mergeSlot = (
        key: LogoSlotKey
      ): CustomLogoSlotConfig => {
        const def = DEFAULT_FOUR_LOGOS_CONFIG[key];
        const slot = parsed?.[key];
        if (!slot || typeof slot !== 'object') return { ...def };
        return {
          url: typeof slot.url === 'string' && slot.url ? slot.url : def.url,
          scale:
            typeof slot.scale === 'number' && !Number.isNaN(slot.scale)
              ? Math.min(1.6, Math.max(0.6, slot.scale))
              : 1,
          visible: typeof slot.visible === 'boolean' ? slot.visible : true,
          whiteBadgeBg:
            typeof slot.whiteBadgeBg === 'boolean' ? slot.whiteBadgeBg : false,
          label: typeof slot.label === 'string' && slot.label ? slot.label : def.label,
          isCustomUploaded: Boolean(slot.isCustomUploaded),
        };
      };
      const fptSlot = mergeSlot('fptEducation');
      if (customLogoUrl && !fptSlot.isCustomUploaded) {
        fptSlot.url = customLogoUrl;
      }
      const hydratedConfig: FourLogosConfig = {
        fptEducation: fptSlot,
        vovinamShield: mergeSlot('vovinamShield'),
        fptVovinamFederation: mergeSlot('fptVovinamFederation'),
        khoiNguonVoViet2026: mergeSlot('khoiNguonVoViet2026'),
      };
      memoryFourLogosConfig = hydratedConfig;
      return hydratedConfig;
    }

    // Legacy v3 migration
    const rawV3 = window.localStorage.getItem(CUSTOM_LOGOS_STORAGE_KEY);
    if (rawV3) {
      const parsed = JSON.parse(rawV3);
      const migrated: FourLogosConfig = {
        fptEducation: {
          ...DEFAULT_FOUR_LOGOS_CONFIG.fptEducation,
          url: parsed.fptEducation || DEFAULT_FOUR_EVENT_LOGO_URLS.fptEducation,
        },
        vovinamShield: {
          ...DEFAULT_FOUR_LOGOS_CONFIG.vovinamShield,
          url: parsed.vovinamShield || DEFAULT_FOUR_EVENT_LOGO_URLS.vovinamShield,
        },
        fptVovinamFederation: {
          ...DEFAULT_FOUR_LOGOS_CONFIG.fptVovinamFederation,
          url:
            parsed.fptVovinamFederation ||
            DEFAULT_FOUR_EVENT_LOGO_URLS.fptVovinamFederation,
        },
        khoiNguonVoViet2026: {
          ...DEFAULT_FOUR_LOGOS_CONFIG.khoiNguonVoViet2026,
          url:
            parsed.khoiNguonVoViet2026 ||
            DEFAULT_FOUR_EVENT_LOGO_URLS.khoiNguonVoViet2026,
        },
      };
      memoryFourLogosConfig = migrated;
      return migrated;
    }
    return DEFAULT_FOUR_LOGOS_CONFIG;
  } catch {
    return DEFAULT_FOUR_LOGOS_CONFIG;
  }
}

export function getActiveFourEventLogoUrls(): FourLogosState {
  const cfg = getActiveFourLogosConfig();
  return {
    fptEducation: cfg.fptEducation.url,
    vovinamShield: cfg.vovinamShield.url,
    fptVovinamFederation: cfg.fptVovinamFederation.url,
    khoiNguonVoViet2026: cfg.khoiNguonVoViet2026.url,
  };
}

export function saveFourLogosConfig(next: FourLogosConfig): FourLogosConfig {
  // 1. Always update authoritative in-memory config first so UI never lags or reverts
  memoryFourLogosConfig = {
    fptEducation: { ...next.fptEducation },
    vovinamShield: { ...next.vovinamShield },
    fptVovinamFederation: { ...next.fptVovinamFederation },
    khoiNguonVoViet2026: { ...next.khoiNguonVoViet2026 },
  };

  if (typeof window === 'undefined') return memoryFourLogosConfig;

  // 2. Persist asynchronously to unlimited IndexedDB store
  void persistLogosToIndexedDb(memoryFourLogosConfig);

  // 3. Remove legacy duplicate key to free up localStorage space, then save v4 config
  try {
    window.localStorage.removeItem(CUSTOM_LOGOS_STORAGE_KEY);
    window.localStorage.setItem(
      CUSTOM_LOGOS_CONFIG_KEY,
      JSON.stringify(memoryFourLogosConfig)
    );
  } catch {
    // Even if localStorage 5MB quota is exceeded, memoryFourLogosConfig & IndexedDB hold 100% of the data!
  }

  // 4. Always dispatch update event unconditionally so every component re-renders immediately
  window.dispatchEvent(
    new CustomEvent('auracheck-logos-updated', { detail: memoryFourLogosConfig })
  );

  return memoryFourLogosConfig;
}

export function updateSingleLogoSlot(
  slot: LogoSlotKey,
  patch: Partial<CustomLogoSlotConfig>
): FourLogosConfig {
  const current = getActiveFourLogosConfig();
  const next: FourLogosConfig = {
    ...current,
    [slot]: {
      ...current[slot],
      ...patch,
    },
  };
  return saveFourLogosConfig(next);
}

export function saveCustomEventLogoSlot(
  slot: keyof FourLogosState,
  dataUrl: string
): FourLogosState {
  const updated = updateSingleLogoSlot(slot, {
    url: dataUrl,
    isCustomUploaded: true,
  });
  return {
    fptEducation: updated.fptEducation.url,
    vovinamShield: updated.vovinamShield.url,
    fptVovinamFederation: updated.fptVovinamFederation.url,
    khoiNguonVoViet2026: updated.khoiNguonVoViet2026.url,
  };
}

export function resetSingleLogoSlot(slot: LogoSlotKey): FourLogosConfig {
  const current = getActiveFourLogosConfig();
  const next: FourLogosConfig = {
    ...current,
    [slot]: { ...DEFAULT_FOUR_LOGOS_CONFIG[slot] },
  };
  return saveFourLogosConfig(next);
}

export function resetAllFourLogos(): FourLogosConfig {
  return saveFourLogosConfig(DEFAULT_FOUR_LOGOS_CONFIG);
}

export function openFourLogosManagerModal(focusSlot?: LogoSlotKey) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('auracheck-open-logo-manager', {
      detail: { slot: focusSlot || 'fptEducation' },
    })
  );
}

export const FOUR_EVENT_LOGO_URLS = DEFAULT_FOUR_EVENT_LOGO_URLS;

/**
 * ============================================================================
 * SMART IMAGE CALIBRATION UTILITIES FOR UPLOADED LOGOS
 * - Auto-trim transparent or uniform borders so logos fit accurately
 * - Smart white background removal for JPG/PNG logos
 * ============================================================================
 */
export async function autoTrimLogoDataUrl(
  srcDataUrl: string,
  paddingPx = 6
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const maxDim = 900;
        let w = img.naturalWidth || img.width || 300;
        let h = img.naturalHeight || img.height || 150;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(srcDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        let minX = w;
        let minY = h;
        let maxX = 0;
        let maxY = 0;
        let found = false;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const a = data[idx + 3];
            if (a > 18) {
              found = true;
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (!found || maxX <= minX || maxY <= minY) {
          resolve(srcDataUrl);
          return;
        }

        const cropX = Math.max(0, minX - paddingPx);
        const cropY = Math.max(0, minY - paddingPx);
        const cropW = Math.min(w - cropX, maxX - minX + 1 + paddingPx * 2);
        const cropH = Math.min(h - cropY, maxY - minY + 1 + paddingPx * 2);

        const outCanvas = document.createElement('canvas');
        outCanvas.width = cropW;
        outCanvas.height = cropH;
        const outCtx = outCanvas.getContext('2d');
        if (!outCtx) {
          resolve(srcDataUrl);
          return;
        }
        outCtx.drawImage(
          canvas,
          cropX,
          cropY,
          cropW,
          cropH,
          0,
          0,
          cropW,
          cropH
        );
        resolve(outCanvas.toDataURL('image/png'));
      } catch {
        resolve(srcDataUrl);
      }
    };
    img.onerror = () => resolve(srcDataUrl);
    img.src = srcDataUrl;
  });
}

export async function removeWhiteBackgroundDataUrl(
  srcDataUrl: string,
  threshold = 240
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const maxDim = 900;
        let w = img.naturalWidth || img.width || 300;
        let h = img.naturalHeight || img.height || 150;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(srcDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const d = imageData.data;

        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          const minChannel = Math.min(r, g, b);
          const maxDiff = Math.max(
            Math.abs(r - g),
            Math.abs(g - b),
            Math.abs(r - b)
          );
          if (minChannel >= threshold && maxDiff < 18) {
            d[i + 3] = 0;
          } else if (minChannel >= threshold - 22 && maxDiff < 22) {
            // Smooth anti-aliased edge transition
            const factor = (threshold - minChannel) / 22;
            d[i + 3] = Math.round(d[i + 3] * Math.max(0, Math.min(1, factor)));
          }
        }

        ctx.putImageData(imageData, 0, 0);
        const trimmed = autoTrimLogoDataUrl(canvas.toDataURL('image/png'), 6);
        trimmed.then(resolve);
      } catch {
        resolve(srcDataUrl);
      }
    };
    img.onerror = () => resolve(srcDataUrl);
    img.src = srcDataUrl;
  });
}

/**
 * Balanced, Scientific & Refined 4-Logo Event Bar Component (Neon Purple Edition)
 * Features Tổ chức Giáo dục FPT, Môn phái Vovinam, Liên đoàn Vovinam FPT Edu, and Khơi Nguồn Võ Việt 2026.
 * Supports 1-click Precision Logo Studio modal or direct upload.
 */
export const FourEventLogosBar: React.FC<{
  variant?: 'compact' | 'led_stage' | 'standby_hero';
  customLogoUrl?: string;
  allowDirectUpload?: boolean;
  showCustomizeButton?: boolean;
  showProtocolLabels?: boolean;
  className?: string;
}> = ({
  variant = 'led_stage',
  customLogoUrl,
  allowDirectUpload = true,
  showCustomizeButton = true,
  showProtocolLabels,
  className = '',
}) => {
  const [config, setConfig] = useState<FourLogosConfig>(() =>
    getActiveFourLogosConfig(customLogoUrl)
  );

  useEffect(() => {
    setConfig(getActiveFourLogosConfig(customLogoUrl));
  }, [customLogoUrl]);

  useEffect(() => {
    const refresh = () => setConfig(getActiveFourLogosConfig(customLogoUrl));
    window.addEventListener('auracheck-logos-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('auracheck-logos-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [customLogoUrl]);

  const PROTOCOL_ROLE_MAP: Record<LogoSlotKey, string> = {
    fptEducation: 'ĐƠN VỊ CHỦ QUẢN',
    vovinamShield: 'MÔN PHÁI VOVINAM',
    fptVovinamFederation: 'LIÊN ĐOÀN VOVINAM FPT',
    khoiNguonVoViet2026: 'BIỂU TRƯNG SỰ KIỆN',
  };

  const MAX_WIDTH_RATIO_MAP: Record<LogoSlotKey, number> = {
    fptEducation: 3.6,
    vovinamShield: 3.2,
    fptVovinamFederation: 3.6,
    khoiNguonVoViet2026: 3.6,
  };

  const renderCeremonialDivider = (heightClass = 'h-10') => (
    <div
      className={`relative flex flex-col items-center justify-center ${heightClass} px-0.5 shrink-0 select-none`}
      aria-hidden="true"
    >
      <div className="h-full w-[1.5px] bg-gradient-to-b from-transparent via-amber-300/75 to-transparent" />
      <span className="absolute text-[8px] text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)] leading-none">
        ◆
      </span>
    </div>
  );

  const renderSlotPedestal = (
    slotKey: LogoSlotKey,
    baseHeightPx: number,
    pedestalMinH: number,
    displayRoleLabel: boolean,
    extraImgClass = ''
  ) => {
    const slot = config[slotKey];
    if (!slot.visible) return null;
    const src =
      slotKey === 'fptEducation' && customLogoUrl ? customLogoUrl : slot.url;
    const scaledHeight = Math.round(baseHeightPx * (slot.scale || 1));
    const maxW = Math.round(scaledHeight * MAX_WIDTH_RATIO_MAP[slotKey]);

    return (
      <button
        key={slotKey}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (allowDirectUpload) {
            openFourLogosManagerModal(slotKey);
          }
        }}
        className={`group/logo relative flex flex-col items-center justify-center transition-all duration-200 focus:outline-none ${
          allowDirectUpload ? 'cursor-pointer hover:-translate-y-0.5' : ''
        }`}
        title={`${slot.label} — Chuẩn 100% Nhận Diện Thương Hiệu (Bấm để tải file gốc hoặc căn chỉnh)`}
      >
        {/* Harmonized Ceremonial Pedestal Cell */}
        <div
          style={{ minHeight: `${pedestalMinH}px` }}
          className={`relative flex items-center justify-center transition-all duration-200 ${
            slot.whiteBadgeBg
              ? 'rounded-xl bg-gradient-to-b from-white via-white to-amber-50/20 px-3 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.45),0_0_16px_rgba(251,191,36,0.22)] ring-1 ring-amber-400/85 group-hover/logo:ring-amber-300'
              : 'rounded-xl bg-gradient-to-b from-white/[0.09] to-purple-950/40 px-2.5 py-1.5 ring-1 ring-amber-300/35 shadow-[0_4px_14px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.2)] group-hover/logo:bg-white/[0.14] group-hover/logo:ring-amber-300/70'
          }`}
        >
          {/* Subtle radial gold-violet spotlight behind transparent emblems */}
          {!slot.whiteBadgeBg && (
            <div className="pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.16),rgba(168,85,247,0.12),transparent_72%)]" />
          )}

          <img
            src={src}
            alt={slot.label}
            referrerPolicy="no-referrer"
            style={{
              height: `${scaledHeight}px`,
              maxWidth: `${maxW}px`,
            }}
            className={`relative z-10 w-auto object-contain select-none transition-transform duration-200 group-hover/logo:scale-[1.03] ${extraImgClass}`}
          />
        </div>

        {/* Protocol Role Caption */}
        {displayRoleLabel && (
          <span className="mt-1 text-[8.5px] sm:text-[9px] font-extrabold uppercase tracking-[0.12em] text-amber-200/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
            {PROTOCOL_ROLE_MAP[slotKey]}
          </span>
        )}

        {allowDirectUpload && (
          <span className="pointer-events-none absolute -top-2 -right-1.5 z-20 hidden group-hover/logo:inline-flex items-center gap-0.5 rounded-full border border-amber-300 bg-gradient-to-r from-purple-800 to-fuchsia-700 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-lg">
            <Sliders className="h-2.5 w-2.5 text-amber-300" />
            <span>100%</span>
          </span>
        )}
      </button>
    );
  };

  if (variant === 'standby_hero') {
    const topSlots: { key: LogoSlotKey; baseH: number; minH: number }[] = (
      [
        { key: 'fptEducation', baseH: 50, minH: 64 },
        { key: 'vovinamShield', baseH: 54, minH: 64 },
        { key: 'fptVovinamFederation', baseH: 54, minH: 64 },
      ] as { key: LogoSlotKey; baseH: number; minH: number }[]
    ).filter((item) => config[item.key].visible);

    const shouldShowRoles =
      showProtocolLabels !== undefined ? showProtocolLabels : true;

    return (
      <div
        className={`flex flex-col items-center gap-4 select-none ${className}`}
      >
        {/* Ceremonial Royal Purple & 24K Gold Co-Organizer Plaque */}
        <div className="relative inline-flex flex-wrap items-center justify-center gap-3.5 sm:gap-5 rounded-2xl border border-amber-400/55 bg-gradient-to-r from-[#120529]/95 via-[#230C50]/95 to-[#120529]/95 px-5 sm:px-7 py-3.5 shadow-[0_12px_42px_rgba(8,2,20,0.9),0_0_32px_rgba(168,85,247,0.38),inset_0_1px_1px_rgba(253,224,71,0.4)] ring-1 ring-purple-400/30 backdrop-blur-xl overflow-hidden">
          {/* Top 24K Gold & Bottom Neon Magenta Specular Bars */}
          <div className="pointer-events-none absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
          <div className="pointer-events-none absolute inset-x-14 bottom-0 h-[1.5px] bg-gradient-to-r from-transparent via-fuchsia-400/80 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(250,204,21,0.1),rgba(217,70,239,0.12),transparent_75%)]" />

          {topSlots.map((item, idx) => (
            <React.Fragment key={item.key}>
              {idx > 0 && renderCeremonialDivider('h-12')}
              {renderSlotPedestal(
                item.key,
                item.baseH,
                item.minH,
                shouldShowRoles
              )}
            </React.Fragment>
          ))}

          {allowDirectUpload && showCustomizeButton && (
            <>
              {renderCeremonialDivider('h-10')}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openFourLogosManagerModal('fptEducation');
                }}
                className="relative z-10 inline-flex items-center gap-1.5 rounded-xl border border-amber-300/65 bg-gradient-to-r from-purple-800/90 via-fuchsia-700/90 to-amber-600/90 px-3 py-2 text-[11px] font-extrabold text-white hover:brightness-110 transition-all shadow-[0_0_18px_rgba(245,158,11,0.35)]"
                title="Mở bộ công cụ thay đổi & căn chỉnh chuẩn 100% nhận diện cả 4 logo"
              >
                <Sliders className="h-3.5 w-3.5 text-amber-200" />
                <span>Đổi 4 Logo</span>
              </button>
            </>
          )}
        </div>

        {/* Centerpiece: Slot 4 — CUỘC THI VOVINAM: FPT EDU KHƠI NGUỒN VÕ VIỆT 2026 */}
        {config.khoiNguonVoViet2026.visible && (
          <div className="relative group flex flex-col items-center justify-center px-6 py-2">
            <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-purple-600/35 via-fuchsia-500/35 to-amber-500/30 blur-2xl" />
            {renderSlotPedestal(
              'khoiNguonVoViet2026',
              106,
              116,
              false,
              'drop-shadow-[0_8px_28px_rgba(168,85,247,0.55)]'
            )}
          </div>
        )}
      </div>
    );
  }

  const isCompact = variant === 'compact';
  const shouldShowRoles =
    showProtocolLabels !== undefined ? showProtocolLabels : !isCompact;

  const orderedSlots: { key: LogoSlotKey; baseH: number; minH: number }[] = (
    [
      {
        key: 'fptEducation',
        baseH: isCompact ? 32 : 42,
        minH: isCompact ? 42 : 54,
      },
      {
        key: 'vovinamShield',
        baseH: isCompact ? 34 : 45,
        minH: isCompact ? 42 : 54,
      },
      {
        key: 'fptVovinamFederation',
        baseH: isCompact ? 34 : 45,
        minH: isCompact ? 42 : 54,
      },
      {
        key: 'khoiNguonVoViet2026',
        baseH: isCompact ? 36 : 46,
        minH: isCompact ? 42 : 54,
      },
    ] as { key: LogoSlotKey; baseH: number; minH: number }[]
  ).filter((item) => config[item.key].visible);

  return (
    <div
      className={`relative inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3.5 rounded-2xl border border-amber-400/55 bg-gradient-to-r from-[#120529]/95 via-[#220B4E]/95 to-[#120529]/95 px-3.5 sm:px-5 py-2 sm:py-2.5 shadow-[0_10px_34px_rgba(8,2,20,0.88),0_0_26px_rgba(168,85,247,0.34),inset_0_1px_1px_rgba(253,224,71,0.38)] ring-1 ring-purple-400/30 backdrop-blur-xl select-none overflow-hidden ${className}`}
    >
      {/* Top 24K Gold & Bottom Neon Magenta Specular Crest */}
      <div className="pointer-events-none absolute inset-x-6 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300/95 to-transparent" />
      <div className="pointer-events-none absolute inset-x-12 bottom-0 h-[1.5px] bg-gradient-to-r from-transparent via-fuchsia-400/75 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(250,204,21,0.09),rgba(217,70,239,0.12),transparent_75%)]" />

      {orderedSlots.map((item, idx) => (
        <React.Fragment key={item.key}>
          {idx > 0 && renderCeremonialDivider(isCompact ? 'h-8' : 'h-11')}
          {renderSlotPedestal(
            item.key,
            item.baseH,
            item.minH,
            shouldShowRoles
          )}
        </React.Fragment>
      ))}

      {allowDirectUpload && showCustomizeButton && (
        <>
          {renderCeremonialDivider(isCompact ? 'h-7' : 'h-9')}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openFourLogosManagerModal('fptEducation');
            }}
            className="relative z-10 inline-flex items-center gap-1.5 rounded-xl border border-amber-300/60 bg-gradient-to-r from-purple-800/90 via-fuchsia-700/90 to-amber-600/90 px-2.5 py-1.5 text-[10px] sm:text-[11px] font-extrabold text-white hover:brightness-110 transition-all shadow-[0_0_14px_rgba(245,158,11,0.3)]"
            title="Thay đổi & căn chỉnh chuẩn 100% nhận diện bộ 4 Logo"
          >
            <Sliders className="h-3 w-3 text-amber-200" />
            <span className="hidden sm:inline">Đổi Logo</span>
          </button>
        </>
      )}
    </div>
  );
};

/**
 * Official Tổ Chức Giáo Dục FPT + 4 Event Logos Header Component
 */
export const FptSchoolsLogo: React.FC<FptSchoolsLogoProps> = ({
  customLogoUrl,
  size = 'md',
  className = '',
}) => {
  const [config, setConfig] = useState<FourLogosConfig>(() =>
    getActiveFourLogosConfig(customLogoUrl)
  );

  useEffect(() => {
    setConfig(getActiveFourLogosConfig(customLogoUrl));
  }, [customLogoUrl]);

  useEffect(() => {
    const refresh = () => setConfig(getActiveFourLogosConfig(customLogoUrl));
    window.addEventListener('auracheck-logos-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('auracheck-logos-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [customLogoUrl]);

  const baseHeightPx = size === 'lg' ? 44 : size === 'md' ? 36 : 30;

  const slots: { key: LogoSlotKey; mult: number }[] = [
    { key: 'fptEducation', mult: 0.94 },
    { key: 'vovinamShield', mult: 1.0 },
    { key: 'fptVovinamFederation', mult: 1.0 },
    { key: 'khoiNguonVoViet2026', mult: 1.04 },
  ];

  const visibleSlots = slots.filter(({ key }) => config[key]?.visible);

  return (
    <div
      className={`relative inline-flex items-center gap-1.5 sm:gap-2 rounded-xl border border-amber-400/45 bg-gradient-to-r from-[#14062D]/95 via-[#210B4A]/95 to-[#14062D]/95 px-2.5 py-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.6),0_0_16px_rgba(168,85,247,0.25)] select-none ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-4 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-300/85 to-transparent" />
      {visibleSlots.map(({ key, mult }, idx) => {
        const slot = config[key];
        const src =
          key === 'fptEducation' && customLogoUrl ? customLogoUrl : slot.url;
        const h = Math.round(baseHeightPx * mult * (slot.scale || 1));
        return (
          <React.Fragment key={key}>
            {idx > 0 && (
              <div className="h-6 w-[1px] bg-gradient-to-b from-transparent via-amber-300/55 to-transparent shrink-0" />
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openFourLogosManagerModal(key);
              }}
              title={`${slot.label} — Chuẩn 100% nhận diện thương hiệu (Bấm để đổi/căn chỉnh)`}
              className={`relative group flex items-center justify-center transition-transform hover:scale-105 ${
                slot.whiteBadgeBg
                  ? 'rounded-lg bg-white px-2 py-1 shadow-[0_2px_10px_rgba(0,0,0,0.35)] ring-1 ring-amber-400/80'
                  : 'rounded-lg bg-white/[0.06] px-1.5 py-0.5 ring-1 ring-amber-300/25'
              }`}
            >
              <img
                src={src}
                alt={slot.label}
                referrerPolicy="no-referrer"
                style={{ height: `${h}px` }}
                className="w-auto max-w-[190px] object-contain"
              />
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};

/**
 * ============================================================================
 * TRUNG TÂM QUẢN LÝ & HIỆU CHỈNH BỘ 4 LOGO NHẬN DIỆN CHUẨN XÁC
 * (PRECISION 4-LOGO IDENTITY STUDIO — EMBEDDABLE SECTION & GLOBAL MODAL)
 * ============================================================================
 */
export const FourLogosCustomizerSection: React.FC<{
  initialFocusSlot?: LogoSlotKey;
  onConfigChange?: (next: FourLogosConfig) => void;
  compactMode?: boolean;
}> = ({ initialFocusSlot = 'fptEducation', onConfigChange, compactMode = false }) => {
  const [config, setConfig] = useState<FourLogosConfig>(() =>
    getActiveFourLogosConfig()
  );
  const [activeSlot, setActiveSlot] = useState<LogoSlotKey>(initialFocusSlot);
  const [urlInput, setUrlInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string>('');
  const [slotDimensions, setSlotDimensions] = useState<
    Partial<Record<LogoSlotKey, { w: number; h: number }>>
  >({});
  const fileInputRefs = useRef<Record<LogoSlotKey, HTMLInputElement | null>>({
    fptEducation: null,
    vovinamShield: null,
    fptVovinamFederation: null,
    khoiNguonVoViet2026: null,
  });

  useEffect(() => {
    setActiveSlot(initialFocusSlot);
  }, [initialFocusSlot]);

  useEffect(() => {
    const refresh = () => setConfig(getActiveFourLogosConfig());
    window.addEventListener('auracheck-logos-updated', refresh);
    return () => window.removeEventListener('auracheck-logos-updated', refresh);
  }, []);

  // Support Ctrl+V clipboard image paste directly into the active logo slot
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            processAndSaveFileForSlot(activeSlot, file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeSlot]);

  const showToast = (msg: string) => {
    setStatusBanner(msg);
    window.setTimeout(() => {
      setStatusBanner((prev) => (prev === msg ? '' : prev));
    }, 4200);
  };

  const applySlotPatch = (
    slot: LogoSlotKey,
    patch: Partial<CustomLogoSlotConfig>,
    toastMsg?: string
  ) => {
    const updated = updateSingleLogoSlot(slot, patch);
    setConfig(updated);
    onConfigChange?.(updated);
    if (toastMsg) showToast(toastMsg);
  };

  const normalizeLosslessForStorage = (
    rawDataUrl: string,
    mimeType: string
  ): Promise<string> => {
    // Keep SVG vectors or compact files (< 450KB Base64) 100% byte-for-byte untouched
    if (
      mimeType.includes('svg') ||
      rawDataUrl.startsWith('data:image/svg') ||
      rawDataUrl.length <= 450_000
    ) {
      return Promise.resolve(rawDataUrl);
    }
    // For very large raster files (>450KB), preserve 100% aspect ratio, margins, and transparency in high-DPI PNG
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 1200;
          let w = img.naturalWidth || img.width || 600;
          let h = img.naturalHeight || img.height || 600;
          if (w > maxDim || h > maxDim) {
            const r = Math.min(maxDim / w, maxDim / h);
            w = Math.max(1, Math.round(w * r));
            h = Math.max(1, Math.round(h * r));
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawDataUrl);
            return;
          }
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(rawDataUrl);
        }
      };
      img.onerror = () => resolve(rawDataUrl);
      img.src = rawDataUrl;
    });
  };

  const processAndSaveFileForSlot = (slot: LogoSlotKey, file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        // Preserve 100% lossless original brand proportions, margins & color space while ensuring storage quota safety
        const losslessUrl = await normalizeLosslessForStorage(
          reader.result,
          file.type || ''
        );
        applySlotPatch(
          slot,
          {
            url: losslessUrl,
            isCustomUploaded: true,
          },
          `✓ Đã tải lên & lưu vĩnh viễn chuẩn 100% nhận diện cho "${LOGO_SLOT_METADATA[slot].title}"!`
        );
      }
      setIsProcessing(false);
    };
    reader.onerror = () => setIsProcessing(false);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (
    slot: LogoSlotKey,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processAndSaveFileForSlot(slot, file);
    e.target.value = '';
  };

  const handleAutoTrimSlot = async (slot: LogoSlotKey) => {
    setIsProcessing(true);
    const currentUrl = config[slot].url;
    const trimmed = await autoTrimLogoDataUrl(currentUrl, 2);
    applySlotPatch(
      slot,
      { url: trimmed },
      `Đã cắt sát viền thừa chuẩn xác cho ${LOGO_SLOT_METADATA[slot].title}!`
    );
    setIsProcessing(false);
  };

  const handleRemoveWhiteBgSlot = async (slot: LogoSlotKey) => {
    setIsProcessing(true);
    const currentUrl = config[slot].url;
    const transparentUrl = await removeWhiteBackgroundDataUrl(currentUrl, 238);
    applySlotPatch(
      slot,
      { url: transparentUrl, whiteBadgeBg: false },
      `Đã tách nền trắng sang trong suốt cho ${LOGO_SLOT_METADATA[slot].title}!`
    );
    setIsProcessing(false);
  };

  const handleApplyUrl = (slot: LogoSlotKey) => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    applySlotPatch(
      slot,
      { url: trimmed, isCustomUploaded: true },
      `Đã cập nhật logo từ đường dẫn ảnh cho ${LOGO_SLOT_METADATA[slot].title}!`
    );
    setUrlInput('');
  };

  const slotKeys: LogoSlotKey[] = [
    'fptEducation',
    'vovinamShield',
    'fptVovinamFederation',
    'khoiNguonVoViet2026',
  ];

  const currentMeta = LOGO_SLOT_METADATA[activeSlot];
  const currentSlotConfig = config[activeSlot];

  return (
    <div className="space-y-5">
      {/* Live Synchronized Preview Bar across LED Stage & Printable Badge */}
      <div className="rounded-2xl border border-purple-500/45 bg-gradient-to-br from-[#16082F] via-[#100522] to-[#0B0318] p-4 sm:p-5 shadow-[0_0_35px_rgba(168,85,247,0.22)]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/40 bg-purple-500/15 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-purple-200">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Xem Trước Thực Tế Trên Màn Hình LED & Thẻ Đại Biểu In Ấn
            </span>
            <p className="mt-1 text-xs text-purple-200/75">
              Bấm vào bất kỳ ô logo nào bên dưới để tải file ảnh gốc từ máy tính (PNG/JPG/SVG/WebP), dán ảnh (Ctrl+V), tách nền trắng hoặc chỉnh tỷ lệ kích thước chuẩn xác.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              const next = resetAllFourLogos();
              setConfig(next);
              onConfigChange?.(next);
              showToast('Đã khôi phục toàn bộ 4 Logo về nguyên bản gốc!');
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-amber-400/50 hover:text-amber-300 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Khôi phục cả 4 Logo gốc</span>
          </button>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl border border-purple-400/30 bg-[#0D041C] py-4 px-4">
          <FourEventLogosBar
            variant="led_stage"
            allowDirectUpload={false}
            showCustomizeButton={false}
          />
          <p className="mt-2.5 text-[11px] text-purple-300/70">
            ● Mọi thay đổi được đồng bộ tức thì lên Màn hình LED Check-in, Màn hình chờ Standby và File xuất in Thẻ Đại Biểu.
          </p>
        </div>

        {/* Dedicated 1-Click Quick Switcher & Uploader for Logo 3: Liên Đoàn Vovinam FPT */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-amber-400/45 bg-gradient-to-r from-[#1E0A42] via-[#2A0E5C] to-[#1E0A42] px-3.5 py-2.5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-slate-950">
              3
            </span>
            <div>
              <p className="text-xs font-extrabold text-amber-200">
                Đổi Nhanh Logo 3: Liên Đoàn Vovinam FPT (Chuẩn Quy Cách 100%)
              </p>
              <p className="text-[11px] text-purple-200/80">
                Hỗ trợ tự động cả Logo Tròn (1:1), Huy Hiệu Đứng hoặc Logo Ngang (3:1) không bị bóp méo
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveSlot('fptVovinamFederation');
                fileInputRefs.current.fptVovinamFederation?.click();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-3 py-1.5 text-xs font-black text-slate-950 shadow-[0_0_14px_rgba(251,191,36,0.45)] hover:brightness-110 transition-all"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Tải File Logo Liên Đoàn FPT Từ Máy</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSlot('fptVovinamFederation');
                applySlotPatch(
                  'fptVovinamFederation',
                  {
                    url: svgToDataUrl(FPT_VOVINAM_FEDERATION_HORIZONTAL_SVG_RAW),
                    whiteBadgeBg: false,
                    isCustomUploaded: false,
                  },
                  'Đã chuyển sang mẫu chuẩn "Logo Ngang Liên Đoàn Vovinam Tổ Chức Giáo Dục FPT"!'
                );
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-300/50 bg-purple-950/80 px-2.5 py-1.5 text-[11px] font-bold text-amber-200 hover:bg-purple-900 transition-colors"
            >
              <span>Mẫu Ngang FPT + Vovinam</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSlot('fptVovinamFederation');
                applySlotPatch(
                  'fptVovinamFederation',
                  {
                    url: svgToDataUrl(FPT_VOVINAM_FEDERATION_SVG_RAW),
                    whiteBadgeBg: false,
                    isCustomUploaded: false,
                  },
                  'Đã chuyển sang mẫu chuẩn "Huy Hiệu Tròn Liên Đoàn Vovinam FPT Edu"!'
                );
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-purple-400/40 bg-purple-950/80 px-2.5 py-1.5 text-[11px] font-bold text-purple-200 hover:bg-purple-900 transition-colors"
            >
              <span>Mẫu Huy Hiệu Tròn</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSlot('fptVovinamFederation');
                const currentBg = config.fptVovinamFederation.whiteBadgeBg;
                applySlotPatch(
                  'fptVovinamFederation',
                  { whiteBadgeBg: !currentBg },
                  `${!currentBg ? 'Đã bật' : 'Đã tắt'} khung nền trắng ngọc trai cho Logo Liên Đoàn Vovinam FPT!`
                );
              }}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                config.fptVovinamFederation.whiteBadgeBg
                  ? 'border-amber-300 bg-white text-slate-900'
                  : 'border-purple-400/40 bg-purple-950/80 text-purple-200 hover:bg-purple-900'
              }`}
            >
              <span>
                {config.fptVovinamFederation.whiteBadgeBg
                  ? '✓ Đang Bật Nền Trắng'
                  : 'Bật Nền Trắng'}
              </span>
            </button>
          </div>
        </div>

        {statusBanner && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-950/60 px-3.5 py-2 text-xs font-semibold text-emerald-200">
            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{statusBanner}</span>
          </div>
        )}
      </div>

      {/* 4 Slot Selector Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {slotKeys.map((key) => {
          const meta = LOGO_SLOT_METADATA[key];
          const slot = config[key];
          const isSelected = activeSlot === key;

          return (
            <div
              key={key}
              onClick={() => setActiveSlot(key)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                setActiveSlot(key);
                const file = e.dataTransfer.files?.[0];
                if (file && file.type.startsWith('image/')) {
                  processAndSaveFileForSlot(key, file);
                }
              }}
              className={`group relative cursor-pointer rounded-xl border p-3.5 transition-all flex flex-col justify-between ${
                isSelected
                  ? 'border-purple-400 bg-[#1B0B38] ring-2 ring-purple-500/40 shadow-[0_0_24px_rgba(168,85,247,0.3)]'
                  : 'border-slate-800 bg-slate-900/70 hover:border-purple-500/40 hover:bg-slate-900'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-[11px] font-extrabold text-white">
                      {meta.index}
                    </span>
                    <span className="truncate">{slot.label}</span>
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      applySlotPatch(
                        key,
                        { visible: !slot.visible },
                        `${!slot.visible ? 'Đã bật hiển thị' : 'Đã ẩn'} ${slot.label}`
                      );
                    }}
                    className={`rounded-md p-1 text-xs transition-colors ${
                      slot.visible
                        ? 'text-emerald-400 hover:bg-emerald-500/15'
                        : 'text-slate-500 hover:bg-slate-800'
                    }`}
                    title={slot.visible ? 'Đang hiển thị (Bấm để ẩn)' : 'Đang ẩn (Bấm để hiện)'}
                  >
                    {slot.visible ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {/* Logo Preview Box */}
                <div className="relative flex h-24 items-center justify-center overflow-hidden rounded-lg border border-amber-400/30 bg-[radial-gradient(circle_at_center,#1E0B40_0%,#0B0319_100%)] p-2">
                  <div
                    className={`flex items-center justify-center transition-transform ${
                      slot.whiteBadgeBg
                        ? 'rounded-lg bg-white px-3 py-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.45)] ring-1 ring-amber-400/80'
                        : 'rounded-lg bg-white/[0.06] px-2.5 py-1 ring-1 ring-amber-300/25'
                    }`}
                    style={{ transform: `scale(${slot.scale || 1})` }}
                  >
                    <img
                      src={slot.url}
                      alt={slot.label}
                      referrerPolicy="no-referrer"
                      onLoad={(e) => {
                        const el = e.currentTarget;
                        if (el.naturalWidth && el.naturalHeight) {
                          setSlotDimensions((prev) => ({
                            ...prev,
                            [key]: { w: el.naturalWidth, h: el.naturalHeight },
                          }));
                        }
                      }}
                      className={`max-h-16 w-auto object-contain ${
                        !slot.visible ? 'opacity-35 grayscale' : ''
                      }`}
                    />
                  </div>

                  <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-emerald-950/90 border border-emerald-400/40 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                    ✓ Chuẩn 100%
                  </span>

                  <span className="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 font-mono-tabular text-[9px] text-amber-200/90">
                    {slotDimensions[key]
                      ? `${slotDimensions[key]!.w}×${slotDimensions[key]!.h}px`
                      : 'Vector / HD'}
                  </span>

                  <span className="absolute bottom-1.5 right-2 rounded bg-black/70 px-1.5 py-0.5 font-mono-tabular text-[10px] font-bold text-purple-200">
                    {Math.round((slot.scale || 1) * 100)}%
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSlot(key);
                    fileInputRefs.current[key]?.click();
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 via-fuchsia-600 to-amber-500 hover:brightness-110 px-2.5 py-1.5 text-xs font-extrabold text-white shadow-sm transition-all"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Up Chuẩn 100%</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = resetSingleLogoSlot(key);
                    setConfig(next);
                    onConfigChange?.(next);
                    showToast(`Đã khôi phục ${meta.title} về mặc định!`);
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-800/90 p-1.5 text-slate-300 hover:border-amber-400/50 hover:text-amber-300"
                  title="Khôi phục logo gốc"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>

                <input
                  ref={(el) => {
                    fileInputRefs.current[key] = el;
                  }}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(key, e)}
                  className="hidden"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Precision Controls for Selected Logo Slot */}
      <div className="rounded-2xl border border-purple-500/40 bg-slate-900/90 p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
                {currentMeta.index}
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Đang Hiệu Chỉnh: {currentMeta.title}
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              {currentMeta.subtitle} ({currentMeta.aspectHint})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRefs.current[activeSlot]?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-600 px-3.5 py-2 text-xs font-bold text-white shadow-[0_0_16px_rgba(168,85,247,0.4)] hover:from-purple-500 hover:to-fuchsia-500"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Chọn File Logo Từ Máy (PNG / SVG / JPG)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Image Processing & Scale Calibration */}
          <div className="lg:col-span-7 space-y-4">
            {/* Smart Calibration Toolbar */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <Wand2 className="h-3.5 w-3.5 text-amber-400" />
                <span>Công Cụ Xử Lý Chuẩn Xác Cho Logo Tải Lên</span>
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleAutoTrimSlot(activeSlot)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-950/50 px-3 py-1.5 text-xs font-semibold text-purple-200 hover:bg-purple-900/70 transition-colors"
                >
                  <Crop className="h-3.5 w-3.5 text-purple-300" />
                  <span>Cắt Sát Viền Thừa (Auto-Trim)</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleRemoveWhiteBgSlot(activeSlot)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-fuchsia-500/40 bg-fuchsia-950/50 px-3 py-1.5 text-xs font-semibold text-fuchsia-200 hover:bg-fuchsia-900/70 transition-colors"
                >
                  <Wand2 className="h-3.5 w-3.5 text-fuchsia-300" />
                  <span>Tách Nền Trắng Sang Trong Suốt</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    applySlotPatch(
                      activeSlot,
                      { whiteBadgeBg: !currentSlotConfig.whiteBadgeBg },
                      `${
                        !currentSlotConfig.whiteBadgeBg
                          ? 'Đã bật khung nền trắng nổi bật'
                          : 'Đã tắt khung nền trắng'
                      } cho ${currentSlotConfig.label}`
                    )
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    currentSlotConfig.whiteBadgeBg
                      ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <Square className="h-3.5 w-3.5" />
                  <span>
                    {currentSlotConfig.whiteBadgeBg
                      ? 'Đang bật Khung Nền Sáng'
                      : 'Bật Khung Nền Trắng (Cho logo chữ tối)'}
                  </span>
                </button>
              </div>

              {/* Scale Slider */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <ZoomIn className="h-3.5 w-3.5 text-amber-400" />
                    <span>Căn Chỉnh Tỷ Lệ Kích Thước Hiển Thị (Scale):</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-tabular font-bold text-amber-300">
                      {Math.round((currentSlotConfig.scale || 1) * 100)}%
                    </span>
                    {currentSlotConfig.scale !== 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          applySlotPatch(activeSlot, { scale: 1 })
                        }
                        className="text-[11px] text-purple-300 hover:underline"
                      >
                        Đặt lại 100%
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="range"
                  min={0.65}
                  max={1.5}
                  step={0.05}
                  value={currentSlotConfig.scale || 1}
                  onChange={(e) =>
                    applySlotPatch(activeSlot, {
                      scale: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* Direct Image URL Input */}
              {!compactMode && (
                <div className="pt-2 border-t border-slate-800/80">
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Hoặc dán trực tiếp đường dẫn ảnh (URL PNG/SVG) hoặc bấm <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-purple-200">Ctrl+V</kbd> để dán ảnh từ bộ nhớ tạm:
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Link2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                      <input
                        type="text"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://.../logo-chuan.png"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 pl-8 pr-3 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyUrl(activeSlot)}
                      className="rounded-lg border border-purple-500/40 bg-purple-600/25 px-3 py-1.5 text-xs font-semibold text-purple-200 hover:bg-purple-600/40"
                    >
                      Áp dụng URL
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Official Vector Preset Selector */}
          <div className="lg:col-span-5 space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" />
              <span>Mẫu Nhận Diện Chuẩn Của Vị Trí Số {currentMeta.index}</span>
            </p>

            <div className="space-y-2">
              {currentMeta.presets.map((preset) => {
                const isCurrent = currentSlotConfig.url === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      applySlotPatch(
                        activeSlot,
                        {
                          url: preset.url,
                          whiteBadgeBg: Boolean(preset.whiteBadgeBg),
                          isCustomUploaded: false,
                        },
                        `Đã chọn mẫu chuẩn "${preset.name}"!`
                      )
                    }
                    className={`w-full flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all ${
                      isCurrent
                        ? 'border-amber-400/70 bg-purple-950/60 ring-1 ring-amber-400/40'
                        : 'border-slate-800 bg-slate-950/60 hover:border-purple-500/40'
                    }`}
                  >
                    <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-[#0D051D] p-1.5">
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="max-h-9 w-auto object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">
                        {preset.name}
                      </p>
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {preset.desc}
                      </p>
                    </div>
                    {isCurrent && (
                      <span className="shrink-0 rounded-full bg-emerald-500/20 p-1 text-emerald-300">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Global Modal that can be opened from anywhere (Header, Welcome LED Stage, Standby, Printable Badge Modal)
 */
export const FourLogosManagerModal: React.FC<{
  onConfigChange?: (next: FourLogosConfig) => void;
}> = ({ onConfigChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusSlot, setFocusSlot] = useState<LogoSlotKey>('fptEducation');

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ slot?: LogoSlotKey }>;
      if (customEvent.detail?.slot) {
        setFocusSlot(customEvent.detail.slot);
      }
      setIsOpen(true);
    };
    window.addEventListener('auracheck-open-logo-manager', handleOpen);
    return () =>
      window.removeEventListener('auracheck-open-logo-manager', handleOpen);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-md animate-fadeIn">
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-purple-500/50 bg-[#0E051F] shadow-[0_0_60px_rgba(168,85,247,0.45)]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-purple-500/30 bg-gradient-to-r from-[#1A0938] via-[#130628] to-[#1A0938] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-400/50 bg-purple-600/25 text-amber-300 shadow-inner">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                Trung Tâm Thay Đổi & Căn Chỉnh Chuẩn Xác Bộ 4 Logo Nhận Diện
              </h2>
              <p className="text-xs text-purple-200/80">
                Tải file ảnh gốc (PNG/SVG/JPG), tách nền trắng, cắt sát viền thừa và căn chỉnh tỷ lệ cho Màn hình LED & Thẻ Đại Biểu
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-xl border border-purple-400/30 bg-purple-950/60 p-2 text-purple-200 hover:border-purple-400 hover:bg-purple-900 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <FourLogosCustomizerSection
            initialFocusSlot={focusSlot}
            onConfigChange={onConfigChange}
          />
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-purple-500/25 bg-[#090314] px-5 py-3.5">
          <p className="text-xs text-purple-300/80">
            Mẹo: Bạn có thể bấm <kbd className="rounded border border-purple-500/40 bg-purple-950 px-1.5 py-0.5 text-[11px] text-white">Ctrl + V</kbd> để dán nhanh ảnh logo vừa chụp hoặc sao chép vào vị trí đang chọn.
          </p>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-amber-500 px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:opacity-95"
          >
            <Check className="h-4 w-4" />
            <span>Hoàn Tất & Áp Dụng Ngay</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Helper to draw the 4 Official Event Logos onto an HTML5 2D Canvas
 * with scientific spacing, individual slot scale/visibility/badge support, and crisp borders.
 */
export interface LoadedFourLogos {
  fptEduImg: HTMLImageElement | null;
  vovinamShieldImg: HTMLImageElement | null;
  federationImg: HTMLImageElement | null;
  voViet2026Img: HTMLImageElement | null;
}

function drawRoundedPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function drawFourLogosRowOnCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  targetHeight: number,
  logos: LoadedFourLogos,
  customLogoImg?: HTMLImageElement | null,
  dividerGap = 16,
  showProtocolLabels = false
): number {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  let cursorX = x;
  const activeConfig = getActiveFourLogosConfig();

  const items: {
    key: LogoSlotKey;
    img: HTMLImageElement | null;
    baseHFactor: number;
    maxWFactor: number;
    protocolRole: string;
  }[] = [
    {
      key: 'fptEducation',
      img: customLogoImg || logos.fptEduImg,
      baseHFactor: 0.86,
      maxWFactor: 2.95,
      protocolRole: 'ĐƠN VỊ CHỦ QUẢN',
    },
    {
      key: 'vovinamShield',
      img: logos.vovinamShieldImg,
      baseHFactor: 0.94,
      maxWFactor: 2.6,
      protocolRole: 'MÔN PHÁI VOVINAM',
    },
    {
      key: 'fptVovinamFederation',
      img: logos.federationImg,
      baseHFactor: 0.94,
      maxWFactor: 3.1,
      protocolRole: 'LIÊN ĐOÀN VOVINAM FPT',
    },
    {
      key: 'khoiNguonVoViet2026',
      img: logos.voViet2026Img,
      baseHFactor: 0.98,
      maxWFactor: 3.1,
      protocolRole: 'BIỂU TRƯNG SỰ KIỆN',
    },
  ];

  const visibleItems = items.filter(
    (item) => activeConfig[item.key]?.visible !== false && item.img
  );

  const drawCeremonialDivider = (gap = dividerGap) => {
    cursorX += gap;
    const topY = y + targetHeight * 0.12;
    const botY = y + targetHeight * 0.88;
    const midY = (topY + botY) / 2;

    const divGrad = ctx.createLinearGradient(cursorX, topY, cursorX, botY);
    divGrad.addColorStop(0, 'rgba(250, 204, 21, 0.05)');
    divGrad.addColorStop(0.5, 'rgba(250, 204, 21, 0.75)');
    divGrad.addColorStop(1, 'rgba(250, 204, 21, 0.05)');

    ctx.strokeStyle = divGrad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cursorX, topY);
    ctx.lineTo(cursorX, botY);
    ctx.stroke();

    // Center diamond accent node
    ctx.fillStyle = '#FDE047';
    ctx.beginPath();
    ctx.moveTo(cursorX, midY - 3.5);
    ctx.lineTo(cursorX + 3.5, midY);
    ctx.lineTo(cursorX, midY + 3.5);
    ctx.lineTo(cursorX - 3.5, midY);
    ctx.closePath();
    ctx.fill();

    cursorX += gap;
  };

  visibleItems.forEach((item, index) => {
    if (index > 0) {
      drawCeremonialDivider(dividerGap);
    }
    const img = item.img!;
    const slotCfg = activeConfig[item.key];
    const scale = slotCfg?.scale || 1;
    let h = targetHeight * item.baseHFactor * scale;
    const maxW = targetHeight * item.maxWFactor * scale;
    const natW = img.naturalWidth || img.width || 100;
    const natH = img.naturalHeight || img.height || 100;
    const ratio = natW / natH;
    let w = h * ratio;
    if (w > maxW) {
      w = maxW;
      h = w / ratio;
    }
    const offsetY = y + (targetHeight - h) / 2 - (showProtocolLabels ? 5 : 0);

    if (slotCfg?.whiteBadgeBg) {
      const padX = Math.max(10, Math.round(targetHeight * 0.16));
      const padY = Math.max(6, Math.round(targetHeight * 0.1));
      const badgeW = w + padX * 2;
      const badgeH = h + padY * 2;
      const badgeY = offsetY - padY;

      // Soft ambient shadow for white porcelain pedestal
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 3;
      const badgeGrad = ctx.createLinearGradient(
        cursorX,
        badgeY,
        cursorX,
        badgeY + badgeH
      );
      badgeGrad.addColorStop(0, '#FFFFFF');
      badgeGrad.addColorStop(1, '#F8FAFC');
      ctx.fillStyle = badgeGrad;
      drawRoundedPill(ctx, cursorX, badgeY, badgeW, badgeH, 12);
      ctx.fill();
      ctx.restore();

      // 24K Gold & Pearl Border around white pedestal
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
      ctx.lineWidth = 1.5;
      drawRoundedPill(ctx, cursorX, badgeY, badgeW, badgeH, 12);
      ctx.stroke();

      ctx.drawImage(img, cursorX + padX, offsetY, w, h);

      if (showProtocolLabels) {
        ctx.fillStyle = 'rgba(253, 224, 71, 0.92)';
        ctx.font = `700 ${Math.max(8, Math.round(targetHeight * 0.13))}px "Plus Jakarta Sans", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(
          item.protocolRole,
          cursorX + badgeW / 2,
          badgeY + badgeH + Math.max(11, Math.round(targetHeight * 0.18))
        );
      }

      cursorX += badgeW;
    } else {
      const padX = Math.max(8, Math.round(targetHeight * 0.12));
      const padY = Math.max(5, Math.round(targetHeight * 0.08));
      const glassW = w + padX * 2;
      const glassH = h + padY * 2;
      const glassY = offsetY - padY;

      // Subtle Velvet Glass Pedestal for Emblems/Shields
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      drawRoundedPill(ctx, cursorX, glassY, glassW, glassH, 12);
      ctx.fill();

      ctx.strokeStyle = 'rgba(216, 180, 254, 0.28)';
      ctx.lineWidth = 1;
      drawRoundedPill(ctx, cursorX, glassY, glassW, glassH, 12);
      ctx.stroke();

      ctx.drawImage(img, cursorX + padX, offsetY, w, h);

      if (showProtocolLabels) {
        ctx.fillStyle = 'rgba(253, 224, 71, 0.92)';
        ctx.font = `700 ${Math.max(8, Math.round(targetHeight * 0.13))}px "Plus Jakarta Sans", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(
          item.protocolRole,
          cursorX + glassW / 2,
          glassY + glassH + Math.max(11, Math.round(targetHeight * 0.18))
        );
      }

      cursorX += glassW;
    }
  });

  ctx.restore();
  return cursorX;
}

/**
 * Draws all visible official logos mathematically centered inside a ceremonial container box `(boxX, boxY, boxW, boxH)`
 */
export function drawFourLogosCenteredInBox(
  ctx: CanvasRenderingContext2D,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  targetHeight: number,
  logos: LoadedFourLogos,
  customLogoImg?: HTMLImageElement | null,
  dividerGap = 18,
  showProtocolLabels = false
) {
  const activeConfig = getActiveFourLogosConfig();
  const items: {
    key: LogoSlotKey;
    img: HTMLImageElement | null;
    baseHFactor: number;
    maxWFactor: number;
  }[] = [
    {
      key: 'fptEducation',
      img: customLogoImg || logos.fptEduImg,
      baseHFactor: 0.86,
      maxWFactor: 2.95,
    },
    {
      key: 'vovinamShield',
      img: logos.vovinamShieldImg,
      baseHFactor: 0.94,
      maxWFactor: 2.6,
    },
    {
      key: 'fptVovinamFederation',
      img: logos.federationImg,
      baseHFactor: 0.94,
      maxWFactor: 3.1,
    },
    {
      key: 'khoiNguonVoViet2026',
      img: logos.voViet2026Img,
      baseHFactor: 0.98,
      maxWFactor: 3.1,
    },
  ];

  const visibleItems = items.filter(
    (item) => activeConfig[item.key]?.visible !== false && item.img
  );

  const measureRowWidth = (hTarget: number, gap: number) => {
    const widths = visibleItems.map((item) => {
      const img = item.img!;
      const slotCfg = activeConfig[item.key];
      const scale = slotCfg?.scale || 1;
      let h = hTarget * item.baseHFactor * scale;
      const maxW = hTarget * item.maxWFactor * scale;
      const natW = img.naturalWidth || img.width || 100;
      const natH = img.naturalHeight || img.height || 100;
      const ratio = natW / natH;
      let baseW = h * ratio;
      if (baseW > maxW) {
        baseW = maxW;
        h = baseW / ratio;
      }
      const padX = slotCfg?.whiteBadgeBg
        ? Math.max(10, Math.round(hTarget * 0.16))
        : Math.max(8, Math.round(hTarget * 0.12));
      return baseW + padX * 2;
    });
    const sumW = widths.reduce((acc, val) => acc + val, 0);
    const dividerCount = Math.max(0, visibleItems.length - 1);
    return sumW + dividerCount * gap * 2;
  };

  let fittedHeight = targetHeight;
  let fittedGap = dividerGap;
  let totalRowWidth = measureRowWidth(fittedHeight, fittedGap);

  // Automatically scale row down if user uploaded wide horizontal lockups so all 4 logos fit inside the box without clipping
  const maxBoxContentW = boxW - 24;
  if (totalRowWidth > maxBoxContentW && totalRowWidth > 0) {
    const fitFactor = maxBoxContentW / totalRowWidth;
    fittedHeight = Math.max(28, Math.round(targetHeight * fitFactor));
    fittedGap = Math.max(8, Math.round(dividerGap * fitFactor));
    totalRowWidth = measureRowWidth(fittedHeight, fittedGap);
  }

  const startX = boxX + Math.max(12, (boxW - totalRowWidth) / 2);
  const startY = boxY + (boxH - fittedHeight) / 2;

  drawFourLogosRowOnCanvas(
    ctx,
    startX,
    startY,
    fittedHeight,
    logos,
    customLogoImg,
    fittedGap,
    showProtocolLabels
  );
}

export function drawFptSchoolsLogoOnCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  customLogoImg?: HTMLImageElement | null
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  if (customLogoImg) {
    const targetH = 64;
    const ratio = customLogoImg.width / (customLogoImg.height || 1);
    const targetW = Math.min(220, targetH * ratio);
    ctx.drawImage(customLogoImg, 0, 0, targetW, targetH);
    ctx.restore();
    return;
  }

  ctx.fillStyle = '#0066B2';
  ctx.beginPath();
  ctx.moveTo(10, 10);
  ctx.lineTo(42, 10);
  ctx.lineTo(32, 60);
  ctx.lineTo(0, 60);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'italic 700 30px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('F', 11, 46);

  ctx.fillStyle = '#F37021';
  ctx.beginPath();
  ctx.moveTo(44, 2);
  ctx.lineTo(76, 2);
  ctx.lineTo(64, 72);
  ctx.lineTo(32, 72);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('P', 43, 46);

  ctx.fillStyle = '#0DB14B';
  ctx.beginPath();
  ctx.moveTo(78, 10);
  ctx.lineTo(110, 10);
  ctx.lineTo(100, 60);
  ctx.lineTo(68, 60);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('T', 76, 46);

  ctx.fillStyle = '#F37021';
  ctx.font = '700 24px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('TỔ CHỨC GIÁO DỤC FPT', 122, 48);

  ctx.restore();
}

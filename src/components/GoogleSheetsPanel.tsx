import React, { useState } from 'react';
import { GuestRecord } from '../types/attendance';
import {
  SpreadsheetMetadata,
  SheetAttendanceRow,
} from '../services/googleSheets';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  Link2,
  LogOut,
  Plus,
  RefreshCw,
  UploadCloud,
} from 'lucide-react';
import { User } from 'firebase/auth';

interface GoogleSheetsPanelProps {
  user: User | null;
  needsAuth: boolean;
  isLoggingIn: boolean;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
  sheetMeta: SpreadsheetMetadata | null;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onCreateNewSheet: () => Promise<void>;
  onConnectExistingSheet: (urlOrId: string) => Promise<void>;
  onSyncAllGuestsToSheet: () => Promise<void>;
  onReadLiveSheetRows: () => Promise<void>;
  liveSheetRows: SheetAttendanceRow[];
  isSheetBusy: boolean;
  sheetStatusMessage: string | null;
  sheetError: string | null;
  guests: GuestRecord[];
  autoSyncEnabled: boolean;
  onToggleAutoSync: (val: boolean) => void;
}

export const GoogleSheetsPanel: React.FC<GoogleSheetsPanelProps> = ({
  user,
  needsAuth,
  isLoggingIn,
  onGoogleLogin,
  onGoogleLogout,
  sheetMeta,
  activeTab,
  onSelectTab,
  onCreateNewSheet,
  onConnectExistingSheet,
  onSyncAllGuestsToSheet,
  onReadLiveSheetRows,
  liveSheetRows,
  isSheetBusy,
  sheetStatusMessage,
  sheetError,
  guests,
  autoSyncEnabled,
  onToggleAutoSync,
}) => {
  const [sheetUrlInput, setSheetUrlInput] = useState('');
  const [showConfirmBulkSyncModal, setShowConfirmBulkSyncModal] = useState(false);

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetUrlInput.trim()) return;
    await onConnectExistingSheet(sheetUrlInput.trim());
  };

  return (
    <div className="space-y-6">
      {/* Top Connection Card */}
      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">
                Đồng Bộ Điểm Danh Thời Gian Thực Với Google Sheets
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Tự động ghi nhận Họ và Tên, Chức vụ, Giờ Vào (Check-in), Giờ Ra (Check-out) và Thời gian lưu trú trực tiếp lên bảng tính Google Sheets của bạn.
            </p>
          </div>

          {/* Auth Status / Official Sign in with Google button */}
          <div className="flex items-center gap-3">
            {needsAuth || !user ? (
              <button
                type="button"
                onClick={onGoogleLogin}
                disabled={isLoggingIn}
                className="gsi-material-button"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      style={{ display: 'block' }}
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      ></path>
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      ></path>
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      ></path>
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      ></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">
                    {isLoggingIn ? 'Đang kết nối...' : 'Sign in with Google'}
                  </span>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs font-semibold text-white">
                    {user.displayName || user.email}
                  </p>
                  <p className="text-xs text-emerald-400">
                    Đã cấp quyền Google Sheets
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onGoogleLogout}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors whitespace-nowrap"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status / Error Feedback */}
        {sheetError && (
          <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-xs text-rose-200 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{sheetError}</span>
          </div>
        )}

        {sheetStatusMessage && (
          <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-4 py-3 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{sheetStatusMessage}</span>
          </div>
        )}

        {/* Sheet Setup Controls */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Option A: Create New Sheet automatically */}
          <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Khởi tạo nhanh Bảng tính Sự kiện mới
              </h3>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Tự động tạo một file Google Sheets chuẩn cấu trúc 12 cột (Mã khách, Họ tên, Chức vụ, Đơn vị, Giờ vào, Giờ ra, Thời lượng...) trên tài khoản Google của bạn.
              </p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                disabled={isSheetBusy}
                onClick={onCreateNewSheet}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                <span>
                  {isSheetBusy
                    ? 'Đang xử lý với Google Sheets...'
                    : 'Tạo Bảng Điểm Danh Google Sheets Mới'}
                </span>
              </button>
            </div>
          </div>

          {/* Option B: Connect existing Sheet URL/ID */}
          <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Hoặc kết nối với Google Sheet có sẵn
              </h3>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Dán đường dẫn URL hoặc Spreadsheet ID của bảng tính Google Sheets bạn muốn dùng để lưu dữ liệu điểm danh.
              </p>
            </div>
            <form onSubmit={handleConnectSubmit} className="mt-4 flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                placeholder="Dán link Google Sheets (https://docs.google.com/spreadsheets/d/...) hoặc ID"
                value={sheetUrlInput}
                onChange={(e) => setSheetUrlInput(e.target.value)}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSheetBusy || !sheetUrlInput.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                <Link2 className="h-4 w-4" />
                <span>Kết nối Bảng tính</span>
              </button>
            </form>
          </div>
        </div>

        {/* Connected Spreadsheet Active Bar */}
        {sheetMeta && (
          <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                  <span>Đang kết nối bảng tính:</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular text-slate-300">
                    ID: {sheetMeta.spreadsheetId}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <h4 className="text-base font-semibold text-white">
                    {sheetMeta.title}
                  </h4>
                  <a
                    href={sheetMeta.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:underline whitespace-nowrap"
                  >
                    <span>Mở trên Google Sheets</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Sheet Tab Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Tab trang tính:</span>
                  <select
                    value={activeTab}
                    onChange={(e) => onSelectTab(e.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {sheetMeta.sheetTitles.map((tab) => (
                      <option key={tab} value={tab}>
                        {tab}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Auto-sync toggle */}
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={autoSyncEnabled}
                    onChange={(e) => onToggleAutoSync(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500"
                  />
                  <span>Tự động ghi Giờ Vào/Ra khi khách quét mặt</span>
                </label>

                <button
                  type="button"
                  disabled={isSheetBusy}
                  onClick={onReadLiveSheetRows}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors whitespace-nowrap"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSheetBusy ? 'animate-spin' : ''}`} />
                  <span>Tải dữ liệu từ Sheet</span>
                </button>

                <button
                  type="button"
                  disabled={isSheetBusy}
                  onClick={() => setShowConfirmBulkSyncModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors whitespace-nowrap"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>Đồng bộ toàn bộ ({guests.length} khách)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Preview of Google Sheets Data if loaded */}
      {sheetMeta && liveSheetRows.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Dữ Liệu Thực Tế Đang Lưu Trên Google Sheets (Tab: {activeTab})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Hiển thị trực tiếp các dòng đọc từ API Google Sheets v4
              </p>
            </div>
            <span className="font-mono-tabular text-xs text-slate-400">
              Tổng số: {liveSheetRows.length} dòng
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400">
                  <th className="py-2.5 px-3 font-medium">Dòng</th>
                  <th className="py-2.5 px-3 font-medium">Mã Khách</th>
                  <th className="py-2.5 px-3 font-medium">Họ và Tên</th>
                  <th className="py-2.5 px-3 font-medium">Đơn Vị / Chức Vụ</th>
                  <th className="py-2.5 px-3 font-medium">Giờ Vào (Check-in)</th>
                  <th className="py-2.5 px-3 font-medium">Giờ Ra (Check-out)</th>
                  <th className="py-2.5 px-3 font-medium">Thời Lượng</th>
                  <th className="py-2.5 px-3 font-medium">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {liveSheetRows.map((row) => (
                  <tr key={row.rowIndex} className="hover:bg-slate-900/60">
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-500">
                      #{row.rowIndex}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-300">
                      {row.code}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-white">
                      {row.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {row.role} · {row.company}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-emerald-400">
                      {row.checkInTime}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-amber-300">
                      {row.checkOutTime}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-300">
                      {row.durationText}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {row.statusText}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mandatory User Confirmation Dialog for Overwriting/Updating Spreadsheet Data */}
      {showConfirmBulkSyncModal && sheetMeta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-[#0F172A] p-6 text-slate-100 shadow-2xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-semibold text-white">
                  Xác nhận cập nhật dữ liệu Google Sheets
                </h3>
                <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                  Bạn sắp ghi đè và cập nhật toàn bộ{' '}
                  <strong className="text-white">{guests.length} hồ sơ khách mời</strong>{' '}
                  (bao gồm Họ tên, Giờ vào, Giờ ra và Trạng thái) vào bảng tính{' '}
                  <strong className="text-emerald-400">“{sheetMeta.title}”</strong> trên tab{' '}
                  <strong className="text-white">“{activeTab}”</strong>.
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Hành động này sẽ làm mới vùng dữ liệu từ cột A đến cột L trên trang tính đã chọn. Bạn có chắc chắn muốn tiếp tục?
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setShowConfirmBulkSyncModal(false)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors whitespace-nowrap"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowConfirmBulkSyncModal(false);
                  await onSyncAllGuestsToSheet();
                }}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors whitespace-nowrap"
              >
                Xác nhận cập nhật Google Sheets
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

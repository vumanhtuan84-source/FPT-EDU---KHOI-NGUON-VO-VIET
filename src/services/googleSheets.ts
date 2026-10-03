import { getAccessToken } from './googleAuth';
import { GuestRecord } from '../types/attendance';

export interface SpreadsheetMetadata {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheetTitles: string[];
}

export interface SheetAttendanceRow {
  rowIndex: number;
  code: string;
  name: string;
  role: string;
  company: string;
  tier: string;
  seatZone: string;
  checkInTime: string;
  checkOutTime: string;
  durationText: string;
  statusText: string;
  confidenceText: string;
  updatedAt: string;
}

export const SHEET_HEADERS = [
  'Mã Khách',
  'Họ và Tên',
  'Chức Vụ',
  'Đơn Vị / Công Ty',
  'Hạng Khách',
  'Khu Vực / Bàn',
  'Giờ Vào (Check-in)',
  'Giờ Ra (Check-out)',
  'Thời Gian Lưu Trú',
  'Trạng Thái',
  'Độ Chính Xác AI',
  'Cập Nhật Lúc',
];

export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

function formatStatusLabel(status: GuestRecord['status']): string {
  if (status === 'checked_in') return 'Đang tham dự (Đã Check-in)';
  if (status === 'checked_out') return 'Đã ra về (Đã Check-out)';
  return 'Chưa đến';
}

export function guestToSheetRow(guest: GuestRecord): string[] {
  const nowStr = new Date().toLocaleString('vi-VN', { hour12: false });
  return [
    guest.code,
    `${guest.honorific} ${guest.name}`,
    guest.role,
    guest.company,
    guest.tier,
    guest.seatZone,
    guest.checkInTime || '—',
    guest.checkOutTime || '—',
    guest.durationText || '—',
    formatStatusLabel(guest.status),
    guest.lastConfidence ? `${guest.lastConfidence.toFixed(1)}%` : '—',
    nowStr,
  ];
}

export async function fetchSpreadsheetMeta(
  spreadsheetIdOrUrl: string
): Promise<SpreadsheetMetadata> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('NEEDS_AUTH');
  }

  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (res.status === 401 || res.status === 403) {
    throw new Error('NEEDS_AUTH');
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message ||
        'Không thể truy cập Google Sheet. Vui lòng kiểm tra ID hoặc quyền truy cập.'
    );
  }

  const data = await res.json();
  const sheetTitles: string[] = (data.sheets || [])
    .map((s: any) => s?.properties?.title)
    .filter(Boolean);

  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || 'Bảng Điểm Danh Sự Kiện',
    spreadsheetUrl:
      data.spreadsheetUrl ||
      `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    sheetTitles: sheetTitles.length > 0 ? sheetTitles : ['DiemDanhSuKien'],
  };
}

export async function createEventSpreadsheet(
  eventName: string,
  guests: GuestRecord[]
): Promise<{ meta: SpreadsheetMetadata; activeTab: string }> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('NEEDS_AUTH');
  }

  const tabTitle = 'DiemDanhSuKien';
  const createRes = await fetch(
    'https://sheets.googleapis.com/v4/spreadsheets',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: `Điểm Danh Khuôn Mặt — ${eventName}`,
        },
        sheets: [
          {
            properties: {
              title: tabTitle,
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
        ],
      }),
    }
  );

  if (createRes.status === 401 || createRes.status === 403) {
    throw new Error('NEEDS_AUTH');
  }

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message || 'Không thể tạo bảng tính Google Sheets mới.'
    );
  }

  const createdData = await createRes.json();
  const spreadsheetId = createdData.spreadsheetId;
  const actualTabTitle =
    createdData.sheets?.[0]?.properties?.title || tabTitle;

  // Populate headers and initial guest rows
  const values = [SHEET_HEADERS, ...guests.map((g) => guestToSheetRow(g))];
  const range = `'${actualTabTitle}'!A1:L${values.length}`;

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values,
      }),
    }
  );

  return {
    meta: {
      spreadsheetId,
      title: createdData.properties?.title || `Điểm Danh — ${eventName}`,
      spreadsheetUrl:
        createdData.spreadsheetUrl ||
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      sheetTitles: [actualTabTitle],
    },
    activeTab: actualTabTitle,
  };
}

export async function readAttendanceFromSheet(
  spreadsheetId: string,
  sheetTitle: string
): Promise<SheetAttendanceRow[]> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('NEEDS_AUTH');
  }

  const range = `'${sheetTitle}'!A1:L500`;
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(range)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (res.status === 401 || res.status === 403) {
    throw new Error('NEEDS_AUTH');
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message || 'Không thể đọc dữ liệu từ tab Google Sheets.'
    );
  }

  const data = await res.json();
  const rows: string[][] = data.values || [];
  if (rows.length <= 1) return [];

  return rows.slice(1).map((r, idx) => ({
    rowIndex: idx + 2,
    code: r[0] || '',
    name: r[1] || '',
    role: r[2] || '',
    company: r[3] || '',
    tier: r[4] || '',
    seatZone: r[5] || '',
    checkInTime: r[6] || '—',
    checkOutTime: r[7] || '—',
    durationText: r[8] || '—',
    statusText: r[9] || '—',
    confidenceText: r[10] || '—',
    updatedAt: r[11] || '—',
  }));
}

export async function upsertGuestRowInSheet(
  spreadsheetId: string,
  sheetTitle: string,
  guest: GuestRecord
): Promise<void> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('NEEDS_AUTH');
  }

  // First read existing rows to see if headers and this guest's code already exist
  const rangeAll = `'${sheetTitle}'!A1:L500`;
  const readRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(rangeAll)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (readRes.status === 401 || readRes.status === 403) {
    throw new Error('NEEDS_AUTH');
  }

  const readData = await readRes.json().catch(() => ({ values: [] }));
  const existingRows: string[][] = readData.values || [];

  // Ensure header row exists if sheet is empty
  if (existingRows.length === 0) {
    const headerRange = `'${sheetTitle}'!A1:L1`;
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        spreadsheetId
      )}/values/${encodeURIComponent(headerRange)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [SHEET_HEADERS] }),
      }
    );
  }

  const targetRowValues = guestToSheetRow(guest);
  const existingIndex = existingRows.findIndex(
    (row, idx) => idx > 0 && row[0]?.trim() === guest.code.trim()
  );

  if (existingIndex !== -1) {
    const sheetRowNumber = existingIndex + 1;
    const updateRange = `'${sheetTitle}'!A${sheetRowNumber}:L${sheetRowNumber}`;
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        spreadsheetId
      )}/values/${encodeURIComponent(updateRange)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [targetRowValues] }),
      }
    );
    if (!updateRes.ok) {
      throw new Error('Lỗi khi cập nhật thời gian Vào/Ra trên Google Sheets.');
    }
  } else {
    const appendRange = `'${sheetTitle}'!A1:L1`;
    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        spreadsheetId
      )}/values/${encodeURIComponent(
        appendRange
      )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [targetRowValues] }),
      }
    );
    if (!appendRes.ok) {
      throw new Error('Lỗi khi ghi dòng điểm danh mới vào Google Sheets.');
    }
  }
}

export async function syncFullGuestListToSheet(
  spreadsheetId: string,
  sheetTitle: string,
  guests: GuestRecord[]
): Promise<void> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('NEEDS_AUTH');
  }

  const values = [SHEET_HEADERS, ...guests.map((g) => guestToSheetRow(g))];
  const range = `'${sheetTitle}'!A1:L500`;

  // Clear first to avoid leftover stale rows when guests are deleted
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(range)}:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const writeRange = `'${sheetTitle}'!A1:L${values.length}`;
  const putRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(writeRange)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  );

  if (!putRes.ok) {
    throw new Error('Không thể đồng bộ toàn bộ danh sách lên Google Sheets.');
  }
}

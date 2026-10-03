import * as XLSX from 'xlsx';
import { GuestRecord, GuestTier, INITIAL_GUESTS } from '../types/attendance';
import { extractSignatureFromUrl } from './biometrics';

export interface ExcelImportStats {
  totalRows: number;
  addedCount: number;
  updatedCount: number;
  detectedColumns: string[];
  guests: GuestRecord[];
}

function normalizeHeader(h: string): string {
  return String(h || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');
}

function normalizeHonorific(raw: string): GuestRecord['honorific'] {
  const val = String(raw || '').trim();
  const valid: GuestRecord['honorific'][] = [
    'Ông',
    'Bà',
    'Anh',
    'Chị',
    'TS.',
    'Diễn giả',
    'Đối tác',
    'Phụ huynh',
    'Đại biểu',
  ];
  const matched = valid.find((v) => v.toLowerCase() === val.toLowerCase());
  if (matched) return matched;
  if (val.toLowerCase().includes('tiến sĩ') || val.toLowerCase().includes('ts'))
    return 'TS.';
  if (val.toLowerCase().includes('bà')) return 'Bà';
  if (val.toLowerCase().includes('chị')) return 'Chị';
  if (val.toLowerCase().includes('anh')) return 'Anh';
  if (val.toLowerCase().includes('phụ huynh')) return 'Phụ huynh';
  if (val.toLowerCase().includes('đối tác')) return 'Đối tác';
  if (val.toLowerCase().includes('diễn giả')) return 'Diễn giả';
  if (val.toLowerCase().includes('đại biểu')) return 'Đại biểu';
  return 'Ông';
}

function normalizeGuestTier(raw: string): GuestTier {
  const val = String(raw || '').trim().toLowerCase();
  if (val.includes('vvip')) return 'VVIP';
  if (val.includes('vip')) return 'VIP';
  if (
    val.includes('diễn giả') ||
    val.includes('dien gia') ||
    val.includes('speaker')
  )
    return 'Diễn giả';
  if (
    val.includes('đối tác') ||
    val.includes('doi tac') ||
    val.includes('partner')
  )
    return 'Đối tác';
  if (
    val.includes('phụ huynh') ||
    val.includes('phu huynh') ||
    val.includes('parent')
  )
    return 'Phụ huynh';
  if (
    val.includes('ban tổ chức') ||
    val.includes('btc') ||
    val.includes('organizer')
  )
    return 'Ban tổ chức';
  return 'Khách mời';
}

const KNOWN_FIELD_ALIASES: Record<string, string[]> = {
  name: [
    'hoten',
    'hovaten',
    'tenkhach',
    'tenkhachmoi',
    'tendaibieu',
    'daibieu',
    'fullname',
    'name',
    'guestname',
  ],
  code: [
    'makhach',
    'madaibieu',
    'madinhdanh',
    'ma',
    'code',
    'guestcode',
    'id',
  ],
  honorific: ['danhxung', 'honorific', 'xungho', 'titleprefix'],
  role: [
    'chucvu',
    'vaitro',
    'chucvuvaitro',
    'role',
    'position',
    'jobtitle',
    'chucdanh',
  ],
  company: [
    'donvi',
    'donvicongtac',
    'coquan',
    'congty',
    'tochuc',
    'company',
    'organization',
    'workplace',
  ],
  department: ['phongban', 'bophan', 'khoi', 'department', 'division'],
  phone: ['sodienthoai', 'dienthoai', 'sdt', 'phone', 'mobile', 'tel'],
  email: ['email', 'thu', 'thudientu', 'mail'],
  adminNotes: [
    'noidungbosung',
    'ghichu',
    'ghichuadmin',
    'thongtinbosung',
    'noidungadmin',
    'quatang',
    'luuy',
    'notes',
    'adminnotes',
    'remark',
  ],
  tier: ['hangkhach', 'hangdaibieu', 'phanloai', 'nhomkhach', 'tier', 'category'],
  seatZone: [
    'vitribanghe',
    'vitriban',
    'banghe',
    'khuvuc',
    'khuvucghe',
    'ghe',
    'seat',
    'seatzone',
    'table',
  ],
  checkInGate: ['cong', 'congdon', 'congdontiep', 'gate', 'checkingate'],
  cccdNumber: ['socccd', 'cccd', 'cmnd', 'cancuoc', 'citizenid'],
  dateOfBirth: ['ngaysinh', 'namsinh', 'dob', 'dateofbirth', 'birthday'],
  gender: ['gioitinh', 'gender', 'sex'],
  hometown: ['quequan', 'diachi', 'noithuongtru', 'hometown', 'address'],
  cccdIssueDate: ['ngaycap', 'issuedate', 'cccdissuedate'],
  avatarUrl: ['anhdaidien', 'anh', 'hinhanh', 'avatar', 'avatarurl', 'photo'],
  customGreeting: ['loichaoviet', 'loichao', 'loichaodontiep', 'greetingvi', 'customgreeting'],
};

function getFieldFromRow(
  row: Record<string, any>,
  aliases: string[]
): string {
  const normalizedAliases = aliases.map(normalizeHeader);
  for (const [key, value] of Object.entries(row)) {
    const normKey = normalizeHeader(key);
    if (normalizedAliases.some((a) => normKey === a || normKey.includes(a))) {
      const str = String(value ?? '').trim();
      if (str) return str;
    }
  }
  return '';
}

function extractCustomExtraFields(
  row: Record<string, any>
): Record<string, string> {
  const allKnownAliases = Object.values(KNOWN_FIELD_ALIASES)
    .flat()
    .map(normalizeHeader);
  allKnownAliases.push('stt', 'sothutu', 'index', 'no');

  const extra: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    const normKey = normalizeHeader(key);
    if (!normKey) continue;
    const isKnown = allKnownAliases.some(
      (a) => normKey === a || normKey.includes(a)
    );
    if (!isKnown) {
      const valStr = String(value ?? '').trim();
      if (valStr) {
        extra[key.trim()] = valStr;
      }
    }
  }
  return extra;
}

export async function parseExcelGuestFile(
  file: File,
  existingGuests: GuestRecord[],
  mode: 'merge' | 'replace' = 'merge'
): Promise<ExcelImportStats> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
    defval: '',
  });

  const detectedColumns =
    rows.length > 0 ? Object.keys(rows[0]).filter((k) => !k.startsWith('__EMPTY')) : [];

  const defaultPortraits = INITIAL_GUESTS.map((g) => g.avatarUrl);
  const workingList: GuestRecord[] =
    mode === 'merge' ? [...existingGuests] : [];

  let addedCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = getFieldFromRow(row, KNOWN_FIELD_ALIASES.name);
    if (!name) continue;

    const code =
      getFieldFromRow(row, KNOWN_FIELD_ALIASES.code) ||
      `DB-${String(workingList.length + i + 1).padStart(3, '0')}`;

    const honorificRaw = getFieldFromRow(row, KNOWN_FIELD_ALIASES.honorific);
    const role =
      getFieldFromRow(row, KNOWN_FIELD_ALIASES.role) || 'Đại biểu / Khách mời';
    const company =
      getFieldFromRow(row, KNOWN_FIELD_ALIASES.company) ||
      'Đơn vị Khách mời & Đối tác';
    const department = getFieldFromRow(row, KNOWN_FIELD_ALIASES.department);
    const phone = getFieldFromRow(row, KNOWN_FIELD_ALIASES.phone);
    const email = getFieldFromRow(row, KNOWN_FIELD_ALIASES.email);
    const adminNotesRaw = getFieldFromRow(row, KNOWN_FIELD_ALIASES.adminNotes);
    const extraFields = extractCustomExtraFields(row);

    const combinedAdminNotes =
      adminNotesRaw ||
      Object.entries(extraFields)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ');

    const tierRaw = getFieldFromRow(row, KNOWN_FIELD_ALIASES.tier);
    const seatZone =
      getFieldFromRow(row, KNOWN_FIELD_ALIASES.seatZone) ||
      `Bàn VIP A${(i % 4) + 1} · Ghế 0${(i % 8) + 1}`;
    const checkInGate =
      getFieldFromRow(row, KNOWN_FIELD_ALIASES.checkInGate) ||
      'Cổng Đón Tiếp VIP Sảnh A1';

    const cccdNumber = getFieldFromRow(row, KNOWN_FIELD_ALIASES.cccdNumber);
    const dateOfBirth = getFieldFromRow(row, KNOWN_FIELD_ALIASES.dateOfBirth);
    const genderRaw = getFieldFromRow(row, KNOWN_FIELD_ALIASES.gender);
    const hometown = getFieldFromRow(row, KNOWN_FIELD_ALIASES.hometown);
    const cccdIssueDate = getFieldFromRow(
      row,
      KNOWN_FIELD_ALIASES.cccdIssueDate
    );

    const avatarUrlInput = getFieldFromRow(row, KNOWN_FIELD_ALIASES.avatarUrl);
    const customGreeting = getFieldFromRow(
      row,
      KNOWN_FIELD_ALIASES.customGreeting
    );

    const honorific = normalizeHonorific(
      honorificRaw || (genderRaw.toLowerCase().includes('nữ') ? 'Bà' : 'Ông')
    );
    const tier = normalizeGuestTier(tierRaw || honorificRaw);
    const gender: 'Nam' | 'Nữ' | 'Khác' = genderRaw
      .toLowerCase()
      .includes('nữ')
      ? 'Nữ'
      : 'Nam';

    // Check if guest already exists in workingList by code, CCCD, or exact name
    const existingIdx = workingList.findIndex(
      (g) =>
        g.code.toLowerCase() === code.toLowerCase() ||
        (cccdNumber && g.cccdNumber && g.cccdNumber === cccdNumber) ||
        g.name.toLowerCase() === name.toLowerCase()
    );

    if (existingIdx >= 0) {
      const prev = workingList[existingIdx];
      const nextAvatar =
        avatarUrlInput && avatarUrlInput.length > 5
          ? avatarUrlInput
          : prev.avatarUrl;
      const sig =
        nextAvatar !== prev.avatarUrl
          ? await extractSignatureFromUrl(nextAvatar)
          : prev.biometricSignature;

      workingList[existingIdx] = {
        ...prev,
        code: code || prev.code,
        name,
        honorific,
        role: role || prev.role,
        company: company || prev.company,
        department: department || prev.department,
        phone: phone || prev.phone,
        email: email || prev.email,
        adminNotes: combinedAdminNotes || prev.adminNotes,
        customFields: {
          ...(prev.customFields || {}),
          ...extraFields,
        },
        tier: tierRaw ? tier : prev.tier,
        seatZone: seatZone || prev.seatZone,
        checkInGate: checkInGate || prev.checkInGate,
        cccdNumber: cccdNumber || prev.cccdNumber,
        dateOfBirth: dateOfBirth || prev.dateOfBirth,
        gender: genderRaw ? gender : prev.gender,
        hometown: hometown || prev.hometown,
        cccdIssueDate: cccdIssueDate || prev.cccdIssueDate,
        faceIdVerified: prev.faceIdVerified ?? Boolean(cccdNumber),
        avatarUrl: nextAvatar,
        originalAvatarUrl: prev.originalAvatarUrl || nextAvatar,
        biometricSignature: sig,
        customGreeting: customGreeting || prev.customGreeting,
      };
      updatedCount++;
    } else {
      const assignedAvatar =
        avatarUrlInput && avatarUrlInput.length > 5
          ? avatarUrlInput
          : defaultPortraits[(workingList.length + i) % defaultPortraits.length];
      const sig = await extractSignatureFromUrl(assignedAvatar);

      const newGuest: GuestRecord = {
        id: `guest-excel-${Date.now()}-${i}`,
        code,
        name,
        honorific,
        role,
        company,
        department: department || undefined,
        phone: phone || undefined,
        email: email || undefined,
        adminNotes: combinedAdminNotes || undefined,
        customFields:
          Object.keys(extraFields).length > 0 ? extraFields : undefined,
        tier,
        seatZone,
        checkInGate,
        avatarUrl: assignedAvatar,
        originalAvatarUrl: assignedAvatar,
        biometricSignature: sig,
        cccdNumber: cccdNumber || undefined,
        dateOfBirth: dateOfBirth || undefined,
        gender,
        hometown: hometown || undefined,
        cccdIssueDate: cccdIssueDate || undefined,
        faceIdVerified: true,
        verificationCount: 0,
        failedAttempts: 0,
        customGreeting:
          customGreeting ||
          `Trân trọng đón tiếp và nhiệt liệt chào mừng ${honorific} ${name} (${role} — ${company}) đến tham dự sự kiện!`,
        checkInTime: null,
        checkInTimestamp: null,
        checkOutTime: null,
        checkOutTimestamp: null,
        durationText: null,
        status: 'pending',
        lastConfidence: null,
        syncedToSheets: false,
      };
      workingList.push(newGuest);
      addedCount++;
    }
  }

  return {
    totalRows: rows.length,
    addedCount,
    updatedCount,
    detectedColumns,
    guests: workingList,
  };
}

export function downloadSampleExcelTemplate() {
  const sampleRows = [
    {
      'Mã đại biểu': 'VIP-001',
      'Danh xưng': 'Ông',
      'Họ và tên': 'Nguyễn Minh Quân',
      'Chức vụ / Vai trò': 'Giám Đốc Điều Hành Khối Công Nghệ Giáo Dục',
      'Đơn vị công tác': 'Tập đoàn FPT / Khối Giáo dục FPT Education',
      'Phòng ban / Bộ phận': 'Ban Điều Hành Cấp Cao',
      'Hạng đại biểu': 'VVIP',
      'Vị trí bàn ghế': 'Bàn VVIP A1 · Ghế 01 (Hàng Đầu)',
      'Cổng đón tiếp': 'Cổng Đón Tiếp VIP Sảnh A1',
      'Số điện thoại': '0903 128 899',
      Email: 'quannm@fpt.edu.vn',
      'Nội dung bổ sung (Admin)':
        'Đại biểu Chủ tọa Phiên Khai mạc · Đón tiếp tại Phòng Khách VVIP Sảnh A1',
      'Lời chào đón tiếp':
        'Trân trọng đón tiếp và nhiệt liệt chào mừng Diễn giả chính phiên Khai mạc — Ông Nguyễn Minh Quân đến với Hội nghị FPT Schools 2026!',
    },
    {
      'Mã đại biểu': 'VIP-002',
      'Danh xưng': 'Bà',
      'Họ và tên': 'Trần Vũ Thanh Hà',
      'Chức vụ / Vai trò': 'Giám Đốc Chiến Lược & Phát Triển Học Thuật',
      'Đơn vị công tác': 'Hệ Thống Phổ Thông FPT (FPT Schools)',
      'Phòng ban / Bộ phận': 'Hội Đồng Học Thuật & Đổi Mới Sáng Tạo',
      'Hạng đại biểu': 'VIP',
      'Vị trí bàn ghế': 'Bàn VIP A2 · Ghế 04',
      'Cổng đón tiếp': 'Cổng Đón Tiếp VIP Sảnh A1',
      'Số điện thoại': '0912 456 789',
      Email: 'hatvt@fpt.edu.vn',
      'Nội dung bổ sung (Admin)':
        'Khách mời Danh dự · Tặng bộ ấn phẩm Chuyển đổi số Giáo dục 2026',
      'Lời chào đón tiếp':
        'Hân hạnh đón tiếp Bà Trần Vũ Thanh Hà đến với Hội nghị Chuyển đổi số & Giáo dục Sáng tạo FPT Schools!',
    },
    {
      'Mã đại biểu': 'SPK-003',
      'Danh xưng': 'TS.',
      'Họ và tên': 'Lê Hoàng Nam',
      'Chức vụ / Vai trò': 'Kiến Trúc Sư Trưởng Trí Tuệ Nhân Tạo & Robotics',
      'Đơn vị công tác': 'Viện Nghiên Cứu Công Nghệ & AI Quốc Gia',
      'Phòng ban / Bộ phận': 'Khối Nghiên Cứu AI & STEM',
      'Hạng đại biểu': 'Diễn giả',
      'Vị trí bàn ghế': 'Bàn Diễn Giả S1 · Ghế 02',
      'Cổng đón tiếp': 'Cổng Diễn Giả Sảnh Chính',
      'Số điện thoại': '0988 776 554',
      Email: 'namlh@ai-institute.vn',
      'Nội dung bổ sung (Admin)':
        'Diễn giả Tọa đàm Chuyên sâu · Hỗ trợ kỹ thuật trình chiếu tại Bàn S1',
      'Lời chào đón tiếp':
        'Trân trọng chào mừng TS. Lê Hoàng Nam — Chuyên gia dẫn dắt Tọa đàm AI & Robotics trong trường học tương lai!',
    },
    {
      'Mã đại biểu': 'PAR-005',
      'Danh xưng': 'Phụ huynh',
      'Họ và tên': 'Đỗ Thu Trang',
      'Chức vụ / Vai trò': 'Trưởng Ban Đại Diện Cha Mẹ Học Sinh',
      'Đơn vị công tác': 'Hội đồng Phụ huynh FPT Schools',
      'Phòng ban / Bộ phận': 'Ban Đại Diện Phụ Huynh Khối THPT',
      'Hạng đại biểu': 'Phụ huynh',
      'Vị trí bàn ghế': 'Bàn Phụ Huynh P1 · Ghế 03',
      'Cổng đón tiếp': 'Cổng Đón Tiếp Sảnh Chính',
      'Số điện thoại': '0945 223 118',
      Email: 'trangdt@gmail.com',
      'Nội dung bổ sung (Admin)':
        'Đại diện Phụ huynh phát biểu tham luận · Tặng quà lưu niệm của Nhà trường',
      'Lời chào đón tiếp':
        'Trân trọng chào mừng Quý Phụ huynh Đỗ Thu Trang đã đến tham dự sự kiện cùng nhà trường!',
    },
    {
      'Mã đại biểu': 'PTN-006',
      'Danh xưng': 'Ông',
      'Họ và tên': 'Vũ Quốc Khánh',
      'Chức vụ / Vai trò': 'Tổng Giám Đốc Khu Vực Đông Nam Á',
      'Đơn vị công tác': 'Tập đoàn Công nghệ Giáo dục TechEdu',
      'Phòng ban / Bộ phận': 'Ban Giám Đốc Điều Hành',
      'Hạng đại biểu': 'Đối tác',
      'Vị trí bàn ghế': 'Bàn Đối Tác VIP B1 · Ghế 02',
      'Cổng đón tiếp': 'Cổng Đón Tiếp VIP Sảnh A1',
      'Số điện thoại': '0938 991 205',
      Email: 'khanhvq@techedu.vn',
      'Nội dung bổ sung (Admin)':
        'Đối tác Ký kết MOU · Bố trí khu vực phỏng vấn báo chí',
      'Lời chào đón tiếp':
        'Nhiệt liệt chào mừng Quý Đối tác chiến lược — Ông Vũ Quốc Khánh đến với sự kiện!',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleRows);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 12 },
    { wch: 24 },
    { wch: 38 },
    { wch: 36 },
    { wch: 28 },
    { wch: 14 },
    { wch: 28 },
    { wch: 26 },
    { wch: 16 },
    { wch: 24 },
    { wch: 48 },
    { wch: 55 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Danh_Sach_Dai_Bieu');
  XLSX.writeFile(wb, 'Mau_Danh_Sach_Dai_Bieu_Khach_Moi.xlsx');
}

export function exportGuestsToExcel(guests: GuestRecord[]) {
  const rows = guests.map((g, idx) => ({
    STT: idx + 1,
    'Mã đại biểu': g.code,
    'Danh xưng': g.honorific,
    'Họ và tên': g.name,
    'Chức vụ / Vai trò': g.role,
    'Đơn vị công tác': g.company,
    'Phòng ban / Bộ phận': g.department || '',
    'Hạng đại biểu': g.tier,
    'Vị trí bàn ghế': g.seatZone,
    'Cổng đón tiếp': g.checkInGate || 'Cổng Đón Tiếp VIP Sảnh A1',
    'Số điện thoại': g.phone || '',
    Email: g.email || '',
    'Nội dung bổ sung (Admin)': g.adminNotes || '',
    'Số lần xác thực (Tối đa 2)': `${g.verificationCount || (g.checkInTime ? 1 : 0)}/2`,
    'Trạng thái Check-in':
      g.status === 'checked_in'
        ? 'Đã Check-in'
        : g.status === 'checked_out'
        ? 'Đã Check-out'
        : 'Chưa Check-in',
    'Giờ Check-in': g.checkInTime || '',
    'Giờ Check-out': g.checkOutTime || '',
    'Thời lượng tham dự': g.durationText || '',
    'Độ tương đồng khuôn mặt (%)': g.lastConfidence
      ? `${g.lastConfidence.toFixed(1)}%`
      : '',
    'Lời chào đón tiếp': g.customGreeting || '',
    ...(g.customFields || {}),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ket_Qua_Dai_Bieu_CheckIn');
  XLSX.writeFile(wb, 'Danh_Sach_Dai_Bieu_CheckIn_FPT.xlsx');
}

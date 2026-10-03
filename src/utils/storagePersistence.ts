import {
  AttendanceLogItem,
  BrandConfig,
  CameraScanSpeedMode,
  EventAgendaConfig,
  GuestRecord,
  INITIAL_AGENDA_CONFIG,
  INITIAL_BRAND_CONFIG,
  INITIAL_GUESTS,
  KioskActionMode,
} from '../types/attendance';
import { SpreadsheetMetadata } from '../services/googleSheets';
import { formatTimestampVi, interpolateGreeting, interpolateGreetingEn } from './biometrics';

const LS_KEY_MAIN = 'auracheck_persistent_state_v2';
const IDB_NAME = 'auracheck_persistent_db_v2';
const IDB_STORE = 'system_state';
const IDB_RECORD_KEY = 'active_system_snapshot';

export interface ScannerPersistedSettings {
  cameraScanSpeedMode: CameraScanSpeedMode;
  autoScanCamera: boolean;
  cameraFastTouchpointMode: boolean;
  kioskMode: KioskActionMode;
}

export interface PersistedSystemSnapshot {
  version: number;
  updatedAt: number;
  isAdminInitialized: boolean;
  brandConfig: BrandConfig;
  agendaConfig: EventAgendaConfig;
  guests: GuestRecord[];
  logs: AttendanceLogItem[];
  sheetMeta: SpreadsheetMetadata | null;
  activeSheetTab: string;
  autoSyncEnabled: boolean;
  scannerSettings: ScannerPersistedSettings;
}

export const DEFAULT_SCANNER_SETTINGS: ScannerPersistedSettings = {
  cameraScanSpeedMode: 'balanced_accurate',
  autoScanCamera: true,
  cameraFastTouchpointMode: false,
  kioskMode: 'auto',
};

function buildInitialDefaultLogs(
  _guests: GuestRecord[],
  _brand: BrandConfig
): AttendanceLogItem[] {
  return [];
}

export function createDefaultSystemSnapshot(): PersistedSystemSnapshot {
  return {
    version: 2,
    updatedAt: 0,
    isAdminInitialized: false,
    brandConfig: INITIAL_BRAND_CONFIG,
    agendaConfig: INITIAL_AGENDA_CONFIG,
    guests: INITIAL_GUESTS,
    logs: buildInitialDefaultLogs(INITIAL_GUESTS, INITIAL_BRAND_CONFIG),
    sheetMeta: null,
    activeSheetTab: 'DiemDanhSuKien',
    autoSyncEnabled: true,
    scannerSettings: DEFAULT_SCANNER_SETTINGS,
  };
}

function normalizeSnapshot(raw: any): PersistedSystemSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  if (!Array.isArray(raw.guests) || !raw.brandConfig) return null;

  const mergedBrand: BrandConfig = {
    ...INITIAL_BRAND_CONFIG,
    ...raw.brandConfig,
  };

  if (!raw.brandConfig?.neonPurpleUpgradedV3) {
    mergedBrand.themeId = 'neon_purple';
    mergedBrand.customPrimaryHex = '#A855F7';
    mergedBrand.customSecondaryHex = '#D946EF';
    mergedBrand.customAccentHex = '#F5B324';
    mergedBrand.neonPurpleUpgradedV3 = true;
    if (
      !mergedBrand.brandName ||
      mergedBrand.brandName.includes('FPT SCHOOLS') ||
      mergedBrand.brandName.includes('PHỔ THÔNG FPT')
    ) {
      mergedBrand.brandName = 'TỔ CHỨC GIÁO DỤC FPT (FPT EDUCATION)';
    }
    if (
      !mergedBrand.eventName ||
      mergedBrand.eventName.includes('FPT Schools 2026')
    ) {
      mergedBrand.eventName =
        'Hội Nghị & Sự Kiện Tổ Chức Giáo Dục FPT — Khơi Nguồn Võ Việt 2026';
    }
    if (
      !mergedBrand.eventLocation ||
      mergedBrand.eventLocation.includes('FPT Schools')
    ) {
      mergedBrand.eventLocation =
        'Hội Trường Lớn — Tổ Chức Giáo Dục FPT (FPT Education)';
    }
  }

  return {
    version: 2,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
    isAdminInitialized: Boolean(raw.isAdminInitialized ?? true),
    brandConfig: mergedBrand,
    agendaConfig: {
      ...INITIAL_AGENDA_CONFIG,
      ...(raw.agendaConfig || {}),
      items: Array.isArray(raw.agendaConfig?.items)
        ? raw.agendaConfig.items
        : INITIAL_AGENDA_CONFIG.items,
    },
    guests: raw.guests,
    logs: Array.isArray(raw.logs)
      ? raw.logs.filter((l: any) => l && l.id !== 'log-init-1')
      : [],
    sheetMeta: raw.sheetMeta || null,
    activeSheetTab: raw.activeSheetTab || 'DiemDanhSuKien',
    autoSyncEnabled:
      typeof raw.autoSyncEnabled === 'boolean' ? raw.autoSyncEnabled : true,
    scannerSettings: {
      ...DEFAULT_SCANNER_SETTINGS,
      ...(raw.scannerSettings || {}),
      cameraFastTouchpointMode: false,
    },
  };
}

/**
 * Synchronous load from localStorage so the very first React render preserves Admin data
 * without flashing or resetting to initial defaults.
 */
export function loadInitialSystemStateSync(): PersistedSystemSnapshot {
  if (typeof window === 'undefined') {
    return createDefaultSystemSnapshot();
  }
  try {
    const rawStr = window.localStorage.getItem(LS_KEY_MAIN);
    if (rawStr) {
      const parsed = JSON.parse(rawStr);
      const normalized = normalizeSnapshot(parsed);
      if (normalized) {
        return normalized;
      }
    }
  } catch {
    // Ignore localStorage parse error and fall back to IndexedDB / Server hydration
  }
  return createDefaultSystemSnapshot();
}

function openIndexedDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function readFromIndexedDb(): Promise<PersistedSystemSnapshot | null> {
  const db = await openIndexedDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const getReq = store.get(IDB_RECORD_KEY);
      getReq.onsuccess = () => {
        resolve(normalizeSnapshot(getReq.result));
      };
      getReq.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function writeToIndexedDb(snapshot: PersistedSystemSnapshot): Promise<void> {
  const db = await openIndexedDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(snapshot, IDB_RECORD_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function readFromServerDisk(): Promise<PersistedSystemSnapshot | null> {
  try {
    const res = await fetch('/api/system-state', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return normalizeSnapshot(data?.snapshot || data);
  } catch {
    return null;
  }
}

async function writeToServerDisk(snapshot: PersistedSystemSnapshot): Promise<void> {
  try {
    await fetch('/api/system-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshot }),
    });
  } catch {
    // Ignore network error if offline
  }
}

/**
 * Hydrates from IndexedDB and Server Disk (`/api/system-state`) and returns whichever snapshot
 * is newest (`updatedAt`), guaranteeing that Admin guests, face signatures, logos, and themes
 * never reset across upgrades, server restarts, or browser storage limits.
 */
export async function hydrateLatestSystemState(
  localSyncSnapshot: PersistedSystemSnapshot
): Promise<PersistedSystemSnapshot> {
  const [idbSnap, serverSnap] = await Promise.all([
    readFromIndexedDb(),
    readFromServerDisk(),
  ]);

  const candidates = [localSyncSnapshot, idbSnap, serverSnap].filter(
    (c): c is PersistedSystemSnapshot => Boolean(c && c.isAdminInitialized)
  );

  if (candidates.length === 0) {
    return localSyncSnapshot;
  }

  // Pick the snapshot with the highest updatedAt timestamp
  candidates.sort((a, b) => b.updatedAt - a.updatedAt);
  const newest = candidates[0];

  // Ensure all 3 storage layers are synchronized with the newest snapshot
  try {
    window.localStorage.setItem(LS_KEY_MAIN, JSON.stringify(newest));
  } catch {
    // If base64 images exceed 5MB localStorage quota, store compact metadata in localStorage
    try {
      const compact: PersistedSystemSnapshot = {
        ...newest,
        guests: newest.guests.map((g) => ({
          ...g,
          biometricSignature: undefined,
        })),
      };
      window.localStorage.setItem(LS_KEY_MAIN, JSON.stringify(compact));
    } catch {
      // IndexedDB and Server Disk still hold the full uncompressed data
    }
  }
  await Promise.all([writeToIndexedDb(newest), writeToServerDisk(newest)]);

  return newest;
}

/**
 * Saves the complete system state to LocalStorage, IndexedDB, and Server Disk.
 */
export async function saveSystemStatePersistently(
  snapshot: Omit<PersistedSystemSnapshot, 'version' | 'updatedAt' | 'isAdminInitialized'>
): Promise<number> {
  const updatedAt = Date.now();
  const fullSnapshot: PersistedSystemSnapshot = {
    ...snapshot,
    version: 2,
    updatedAt,
    isAdminInitialized: true,
  };

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(LS_KEY_MAIN, JSON.stringify(fullSnapshot));
    } catch {
      try {
        const compact: PersistedSystemSnapshot = {
          ...fullSnapshot,
          guests: fullSnapshot.guests.map((g) => ({
            ...g,
            biometricSignature: undefined,
          })),
        };
        window.localStorage.setItem(LS_KEY_MAIN, JSON.stringify(compact));
      } catch {
        // Fallback to IndexedDB + Server Disk
      }
    }
  }

  await Promise.all([
    writeToIndexedDb(fullSnapshot),
    writeToServerDisk(fullSnapshot),
  ]);

  return updatedAt;
}

export function exportSystemSnapshotFile(snapshot: PersistedSystemSnapshot): void {
  const jsonContent = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sao-luu-he-thong-checkin-ai-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function parseImportedSystemSnapshotFile(
  file: File
): Promise<PersistedSystemSnapshot | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (typeof reader.result !== 'string') {
          resolve(null);
          return;
        }
        const parsed = JSON.parse(reader.result);
        const normalized = normalizeSnapshot(parsed?.snapshot || parsed);
        if (normalized) {
          normalized.updatedAt = Date.now();
          normalized.isAdminInitialized = true;
        }
        resolve(normalized);
      } catch {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}

/**
 * Offline Travel Vault — stores confirmed boarding passes, hotel local-language address cards,
 * emergency contacts, and .ics calendar payloads in IndexedDB (with localStorage fallback).
 */

export interface OfflineVaultEntry {
  id: string;
  destination: string;
  savedAt: string;
  bookingRef?: string;
  flightNumber?: string;
  hotelName?: string;
  hotelAddressLocal?: string;
  emergencyPhone?: string;
  icsContent?: string;
  summaryText?: string;
}

const DB_NAME = "wanderlust_offline_vault";
const STORE_NAME = "vault_entries";
const LS_FALLBACK_KEY = "wanderlust_offline_vault_v1";

function openVaultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveToOfflineVault(entry: OfflineVaultEntry): Promise<void> {
  try {
    const db = await openVaultDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback to localStorage
  }

  try {
    const existing = await loadOfflineVault();
    const filtered = existing.filter((e) => e.id !== entry.id);
    localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify([entry, ...filtered].slice(0, 20)));
  } catch {
    // Ignore
  }
}

export async function loadOfflineVault(): Promise<OfflineVaultEntry[]> {
  try {
    const db = await openVaultDb();
    const rows = await new Promise<OfflineVaultEntry[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve((req.result as OfflineVaultEntry[]) || []);
      req.onerror = () => reject(req.error);
    });
    if (rows.length > 0) return rows;
  } catch {
    // Fallback to localStorage
  }

  try {
    const raw = localStorage.getItem(LS_FALLBACK_KEY);
    return raw ? (JSON.parse(raw) as OfflineVaultEntry[]) : [];
  } catch {
    return [];
  }
}

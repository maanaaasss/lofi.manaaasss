const USER_ID_KEY = "lofi_user_id";
const TIME_PREFIX = "lofi_listening_time_";
const FLUSH_INTERVAL = 30_000;

let pendingSeconds = 0;
let lastFlush = Date.now();
let cachedTotal: number | null = null;

function getUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

function storageKey(): string {
  return TIME_PREFIX + getUserId();
}

function loadTotal(): number {
  const raw = localStorage.getItem(storageKey());
  return raw ? Number(raw) || 0 : 0;
}

function flush() {
  if (pendingSeconds <= 0) return;
  const total = loadTotal() + pendingSeconds;
  localStorage.setItem(storageKey(), String(total));
  cachedTotal = total;
  pendingSeconds = 0;
  lastFlush = Date.now();
}

export function addListeningTime(seconds: number): void {
  pendingSeconds += seconds;
  cachedTotal = null;
  if (Date.now() - lastFlush >= FLUSH_INTERVAL) {
    flush();
  }
}

export function getListeningTime(): number {
  if (cachedTotal !== null) return cachedTotal + pendingSeconds;
  cachedTotal = loadTotal();
  return cachedTotal + pendingSeconds;
}

export function formatListeningTime(totalSeconds: number): string {
  if (totalSeconds < 60) return "<1m";

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours === 0) return `${minutes}m`;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function flushOnUnload(): void {
  flush();
}

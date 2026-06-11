const CACHE_VERSION = 'v2026-06-11-hb-label-tidy';
const CACHE_NAME = 'wangplan-' + CACHE_VERSION;

// รับข้อความจากหน้าเว็บให้ข้ามคิว waiting (ใช้ตอนตรวจเจอ SW ใหม่)
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// ไฟล์ที่ต้อง cache ไว้ใช้ตอน offline
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png',
  './apple-touch-icon.png',
  './wangplan_icon.svg'
];

// Install: cache ทุกไฟล์ทันที แล้วข้ามไปทำงานเลย
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: ลบ cache เก่าทุกเวอร์ชัน แล้วคุมทุกแท็บทันที
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: Network First → ลองโหลดของใหม่จากเน็ตก่อนเสมอ
// ถ้าโหลดได้ใช้ของใหม่ + อัปเดต cache; ถ้าไม่มีเน็ตค่อยใช้ cache (offline ได้)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // ปล่อย Firebase/Sheets ผ่านไปตามปกติ (app จัดการ offline เอง)
  if (url.hostname.includes('firestore.googleapis.com') ||
      url.hostname.includes('firebase') ||
      url.hostname.includes('script.google.com')) return;

  e.respondWith(
    fetch(e.request).then(res => {
      // โหลดจากเน็ตได้ → เก็บลง cache ไว้เผื่อ offline แล้วคืนของใหม่
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
      }
      return res;
    }).catch(() =>
      // ไม่มีเน็ต → ใช้ของเก่าจาก cache
      caches.open(CACHE_NAME).then(cache =>
        cache.match(e.request).then(cached =>
          cached || (e.request.mode === 'navigate' ? cache.match('./index.html') : undefined)
        )
      )
    )
  );
});

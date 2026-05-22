const CACHE_VERSION = 'v2026-05-21-offline';
const CACHE_NAME = 'wangplan-' + CACHE_VERSION;

// ไฟล์ที่ต้อง cache ตั้งแต่ครั้งแรก
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png',
  './apple-touch-icon.png',
  './wangplan_icon.svg'
];

// Install: cache ทุกไฟล์ทันที
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: ลบ cache เก่า
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: Cache First → ใช้ cache ก่อนเสมอ (offline-first)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // ปล่อย Firebase/Sheets ผ่านไปตามปกติ (app จัดการ offline เอง)
  if (url.hostname.includes('firestore.googleapis.com') ||
      url.hostname.includes('firebase') ||
      url.hostname.includes('script.google.com')) return;

  e.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(e.request).then(cached => {
        if (cached) return cached; // มี cache → ใช้เลย (offline ได้)

        // ไม่มี cache → ดึง network แล้ว cache ไว้
        return fetch(e.request).then(res => {
          if (res && res.status === 200) {
            cache.put(e.request, res.clone());
          }
          return res;
        }).catch(() =>
          // ไม่มีเน็ต ไม่มี cache → fallback ไป index.html
          e.request.mode === 'navigate' ? cache.match('./index.html') : undefined
        );
      })
    )
  );
});

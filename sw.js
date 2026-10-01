// Service worker: aplikacija se otvara i bez interneta (prikazuje poslednju sačuvanu verziju).
// Uvek prvo pokušava mrežu, pa telefon odmah dobija nove verzije posle objave.
// Firebase i ostali spoljni zahtevi idu mimo ovoga.
const CACHE = 'majstori-v1';
const OSNOVA = ['/', '/index.html', '/privatnost.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(OSNOVA)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const kopija = res.clone(); caches.open(CACHE).then(c => c.put(req, kopija)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('/index.html') : Response.error())))
  );
});

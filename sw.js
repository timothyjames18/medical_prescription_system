const CACHE_NAME = 'rx-v1';
const urlsToCache = ['/', '/index.html', '/styles.css', '/script.js'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener('fetch', e => {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
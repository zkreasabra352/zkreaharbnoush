const CACHE_NAME = 'admin-v1';
const urlsToCache = ['/','/index.html','/customer.html','/debts.html','/reports.html','/style.css','/script.js'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
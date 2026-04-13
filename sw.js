const CACHE_NAME = 'customers-v3';

const urlsToCache = [
  './',
  './login.html',
  './index.html',
  './customer.html',
  './style.css',
  './script.js',
  './manifest.json'
];

// ================== INSTALL ==================
self.addEventListener('install', event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // ✅ تجاهل أخطاء preload
      return cache.addAll(urlsToCache).catch(error => {
        console.log('Cache preload failed (normal):', error);
      });
    })
  );
});

// ================== ACTIVATE ==================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );

  self.clients.claim();
});

// ================== FETCH ==================
self.addEventListener('fetch', event => {

  // ✅ الحل الرئيسي: تجاهل Firebase تماماً (يحل خطأ Cache.put())
  if (event.request.url.includes('googleapis.com') || 
      event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('gstatic.com') ||
      event.request.url.includes('cdnjs.cloudflare.com')) {
    return;
  }

  // تجاهل كل الطلبات غير GET
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // ✅ حفظ فقط الاستجابات الناجحة
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          
          caches.open(CACHE_NAME).then(cache => {
            // ✅ try-catch لتجنب أخطاء Cache.put()
            try {
              cache.put(event.request, clone);
            } catch (error) {
              console.log('Cache save failed (ignored):', error);
            }
          });
        }
        return response;
      })
      .catch(() => {
        // ✅ Offline fallback محسّن
        return caches.match(event.request).then(cached => {
          // للصفحات: login.html كـ fallback
          if (event.request.destination === 'document') {
            return cached || caches.match('./login.html');
          }
          // للملفات الأخرى: أي cached content
          return cached;
        });
      })
  );
});
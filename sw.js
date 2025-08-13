const CACHE_NAME = 'lsh-shop-v1.0.0';
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/js/bootstrap.bundle.min.js'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache opened');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Static resources cached');
        return self.skipWaiting();
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Обработка fetch запросов
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  
  // Стратегия Cache First для статических ресурсов
  if (STATIC_CACHE_URLS.some(url => event.request.url.includes(url.replace('/', '')))) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then((response) => {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
            return response;
          });
        })
        .catch(() => {
          // Возврат офлайн страницы для HTML запросов
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('/index.html');
          }
        })
    );
  }
  // Стратегия Network First для данных Google Sheets
  else if (requestUrl.hostname === 'docs.google.com') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Кешируем успешные ответы от Google Sheets
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Возвращаем кешированные данные при отсутствии сети
          return caches.match(event.request);
        })
    );
  }
  // Стратегия Cache First для изображений
  else if (event.request.destination === 'image') {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then((response) => {
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          });
        })
    );
  }
  // Для всех остальных запросов - стандартная обработка
  else {
    event.respondWith(fetch(event.request));
  }
});

// Обработка push уведомлений (опционально)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Новые товары в магазине ЛШ!',
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey || 'default'
      },
      actions: [
        {
          action: 'explore',
          title: 'Посмотреть товары',
          icon: '/icon-96x96.png'
        },
        {
          action: 'close',
          title: 'Закрыть',
          icon: '/icon-96x96.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Магазин ЛШ 2025', options)
    );
  }
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Периодическая синхронизация (опционально)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Здесь можно добавить логику для синхронизации данных
      console.log('Background sync triggered')
    );
  }
});

// Обработка обновления приложения
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
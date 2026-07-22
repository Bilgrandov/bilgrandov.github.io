/**
 * sw.js — Service Worker for Bilgrandov Portfolio PWA
 * 
 * Provides offline capabilities, instant shell loading, and static asset caching.
 */

const CACHE_NAME = 'bilgrandov-v1';

// Static application shell assets to pre-cache on installation
const PRECACHE_ASSETS = [
  './',
  'index.html',
  'skills.html',
  'projects.html',
  'posts.html',
  'contact.html',
  'style.css',
  'script.js',
  'supabase.config.js',
  'manifest.json',
  'data/projects.json',
  'data/skills.json',
  'assets/icon.webp',
  'assets/profile.jpg'
];

// Service Worker Installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Cache Activation & Cleanup
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Interception Strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Skip non-GET requests or browser extension requests
  if (request.method !== 'GET' || !request.url.startsWith('http')) return;

  // Network-First strategy for dynamic HTML navigations & API calls
  if (request.mode === 'navigate' || request.url.includes('/rest/v1/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            // Fallback for HTML navigations if offline and uncached
            if (request.mode === 'navigate') {
              return caches.match('index.html');
            }
          });
        })
    );
    return;
  }

  // Cache-First strategy for static assets (CSS, JS, Fonts, Images)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Silent fallback for missing assets
      });
    })
  );
});

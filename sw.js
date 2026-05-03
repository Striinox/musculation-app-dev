// Service Worker — cache-first pour les images d'exercices Supabase Storage.
// Objectif : éliminer l'egress Supabase pour les images déjà vues par un utilisateur.
// Bump le numéro de version (v1 → v2 → ...) si tu as ré-uploadé les images
// (ex: passage en WebP, retouche). Cela invalide tout l'ancien cache.
const CACHE_NAME = 'exercise-images-v2';
const IMG_PATH = '/storage/v1/object/public/exercise-images/';
const SUPABASE_HOST = 'rqymrinhvihfrlgklkfi.supabase.co';

self.addEventListener('install', function(event) {
  // Active immédiatement la nouvelle version sans attendre le reload
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  // Nettoie les anciens caches d'images quand on bump la version
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) {
        if (k.startsWith('exercise-images-') && k !== CACHE_NAME) return caches.delete(k);
      }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  let url;
  try { url = new URL(event.request.url); } catch (e) { return; }
  if (url.host !== SUPABASE_HOST) return;
  if (!url.pathname.includes(IMG_PATH)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.match(event.request).then(function(cached) {
        if (cached) return cached;
        return fetch(event.request).then(function(response) {
          // On ne met en cache que les réponses utilisables (200 OK, type basic/cors).
          // Les opaque (mode no-cors) ne sont pas ré-utilisables côté JS mais OK pour <img>.
          if (response && (response.status === 200 || response.type === 'opaque')) {
            try { cache.put(event.request, response.clone()); } catch (e) {}
          }
          return response;
        }).catch(function() {
          // Hors ligne et pas en cache : on laisse l'erreur réseau remonter
          return cached || Response.error();
        });
      });
    })
  );
});

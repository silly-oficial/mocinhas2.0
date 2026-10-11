// No offline API/media cache: access must always be authorized by the server.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('mocinhas-')).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

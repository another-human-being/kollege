// Kollege service worker: shows push notifications and opens the place they point to.
// No caching, no offline mode – only notifications.
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { body: event.data ? event.data.text() : '' }; }
  const url = typeof d.url === 'string' && d.url.startsWith('/') ? d.url : '/heute';
  event.waitUntil(self.registration.showNotification(d.title || 'Kollege', {
    body: d.body || '', tag: d.tag || 'kollege', data: { url }, icon: '/icon.svg', badge: '/icon.svg', lang: 'de',
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data && event.notification.data.url ? event.notification.data.url : '/heute', self.location.origin).href;
  event.waitUntil((async () => {
    const offen = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of offen) {
      if (new URL(c.url).origin === self.location.origin && 'navigate' in c) { await c.focus(); return c.navigate(url); }
    }
    return self.clients.openWindow(url);
  })());
});

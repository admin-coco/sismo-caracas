// Service worker for web push notifications.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "SismoVenezuela", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "SismoVenezuela";
  const options = {
    body: data.body || "Nuevo reporte en el mapa.",
    icon: "/og.jpg",
    badge: "/og.jpg",
    // Same tag → new pushes replace the previous one instead of stacking,
    // so a burst of reports shows as a single updating notification.
    tag: "nuevo-reporte",
    renotify: true,
    data: { url: data.url || "https://sismovenezuela.org" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "https://sismovenezuela.org";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((list) => {
      for (const c of list) {
        if (c.url === url && "focus" in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});

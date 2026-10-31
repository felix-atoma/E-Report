// Chargé dans le service worker (importScripts) AVANT les routes Workbox.
// Un onglet resté ouvert sur une ancienne version de l'application appelle encore l'adresse d'un
// ancien serveur (supprimé) : on redirige ces appels vers le serveur actuel, sans rechargement.
const OLD_API_HOSTS = ['e-report-y4g9.onrender.com', 'e-report-c47o.onrender.com'];
const CURRENT_API_HOST = 'novabulletin-api.onrender.com';

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (!OLD_API_HOSTS.includes(url.host)) return;
  url.host = CURRENT_API_HOST;
  event.respondWith((async () => {
    const req = event.request;
    const hasBody = !['GET', 'HEAD'].includes(req.method);
    return fetch(url.toString(), {
      method: req.method,
      headers: req.headers,
      body: hasBody ? await req.clone().arrayBuffer() : undefined,
      mode: 'cors',
      credentials: req.credentials,
      redirect: req.redirect,
    });
  })());
});

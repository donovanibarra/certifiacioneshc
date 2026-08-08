/* Celsius Hornos HT — funciona sin internet después de la primera visita */
var CACHE = "celsius-v1";
var BASE = ["./", "./index.html", "./manifest.json", "./accesos.json", "./icono-192.png", "./icono-512.png"];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(BASE); }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(claves){
      return Promise.all(claves.map(function(k){ if(k !== CACHE) return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var url = new URL(e.request.url);
  if(url.origin !== location.origin) return;

  // accesos.json: primero red (para que revocaciones y códigos nuevos lleguen), cae al caché sin internet
  if(url.pathname.endsWith("/accesos.json") || url.pathname === "/accesos.json"){
    e.respondWith(
      fetch(e.request).then(function(r){
        var copia = r.clone();
        caches.open(CACHE).then(function(c){ c.put("./accesos.json", copia); });
        return r;
      }).catch(function(){ return caches.match("./accesos.json"); })
    );
    return;
  }

  // lo demás: primero caché, y si no está, red (guardando copia)
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function(enCache){
      if(enCache) return enCache;
      return fetch(e.request).then(function(r){
        var copia = r.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, copia); });
        return r;
      }).catch(function(){
        if(e.request.mode === "navigate") return caches.match("./index.html");
      });
    })
  );
});

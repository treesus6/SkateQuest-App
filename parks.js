(() => {
  const parksLayer = L.layerGroup();
  let loaded = false;

  async function loadParks() {
    if (loaded) return;
    try {
      const res = await fetch('data/parks.json', { cache: 'no-cache' });
      const parks = await res.json();
      parks.forEach(p => {
        const marker = L.marker([p.lat, p.lng], { title: p.name })
          .bindPopup(
            `<strong>${p.name}</strong><br/>${p.city ?? ''}` +
            (Array.isArray(p.features) && p.features.length ? `<br/>${p.features.join(', ')}` : '') +
            (p.url ? `<br/><a href="${p.url}" target="_blank" rel="noopener">Open in Maps</a>` : '')
          );
        marker.addTo(parksLayer);
      });
      loaded = true;
    } catch (e) {
      console.error('Failed to load parks.json', e);
    }
  }

  function withMap(cb) {
    if (window.sqMap && typeof window.sqMap.addLayer === 'function') return cb(window.sqMap);
    const t = setInterval(() => {
      if (window.sqMap && typeof window.sqMap.addLayer === 'function') {
        clearInterval(t);
        cb(window.sqMap);
      }
    }, 150);
  }

  async function applyToggle(on) {
    await loadParks();
    withMap(map => {
      if (on) parksLayer.addTo(map);
      else parksLayer.removeFrom(map);
    });
  }

  function init() {
    const toggle = document.getElementById('parks-toggle');
    if (!toggle) return;
    applyToggle(toggle.checked);
    toggle.addEventListener('change', e => applyToggle(e.target.checked));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();(() => {
  const parksLayer = L.layerGroup();
  let loaded = false;

  async function loadParks() {
    if (loaded) return;
    try {
      const res = await fetch('data/parks.json', { cache: 'no-cache' });
      const parks = await res.json();
      parks.forEach(p => {
        const marker = L.marker([p.lat, p.lng], { title: p.name })
          .bindPopup(
            `<strong>${p.name}</strong><br/>${p.city ?? ''}` +
            (Array.isArray(p.features) && p.features.length ? `<br/>${p.features.join(', ')}` : '') +
            (p.url ? `<br/><a href="${p.url}" target="_blank" rel="noopener">Open in Maps</a>` : '')
          );
        marker.addTo(parksLayer);
      });
      loaded = true;
    } catch (e) {
      console.error('Failed to load parks.json', e);
    }
  }

  function withMap(cb) {
    if (window.sqMap && typeof window.sqMap.addLayer === 'function') return cb(window.sqMap);
    const t = setInterval(() => {
      if (window.sqMap && typeof window.sqMap.addLayer === 'function') {
        clearInterval(t);
        cb(window.sqMap);
      }
    }, 150);
  }

  async function applyToggle(on) {
    await loadParks();
    withMap(map => {
      if (on) parksLayer.addTo(map);
      else parksLayer.removeFrom(map);
    });
  }

  function init() {
    const toggle = document.getElementById('parks-toggle');
    if (!toggle) return;
    applyToggle(toggle.checked);
    toggle.addEventListener('change', e => applyToggle(e.target.checked));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
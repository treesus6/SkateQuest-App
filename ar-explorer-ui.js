/**
 * SkateQuest - AR Explorer UI
 * AR camera view with overlay markers
 * Copyright (c) 2024 SkateQuest. All Rights Reserved.
 */

export function renderARExplorer(container) {
    const html = `
        <div class="ar-explorer">
            <div class="ar-header">
                <h2>🔍 AR Spot Explorer</h2>
                <p>Point your camera at spots to see AR overlays</p>
            </div>

            <div class="ar-controls">
                <button class="ar-btn" onclick="window.startAR()">Start AR</button>
                <button class="ar-btn" onclick="window.toggleGhost()">Ghost Mode</button>
            </div>

            <div id="ar-view" class="ar-view" style="display:none;">
                <video id="ar-video" autoplay playsinline></video>
                <canvas id="ar-canvas"></canvas>
                <div id="ar-markers"></div>

                <div class="ar-overlay-controls">
                    <button onclick="window.stopAR()">Exit AR</button>
                    <button onclick="window.captureAR()">📸</button>
                </div>
            </div>

            <div class="ar-info">
                <h3>AR Features</h3>
                <div class="ar-feature-grid">
                    <div class="ar-feature-card">
                        <div class="ar-feature-icon">🎯</div>
                        <div class="ar-feature-title">Trick Markers</div>
                        <div class="ar-feature-desc">See who landed tricks at this spot</div>
                    </div>
                    <div class="ar-feature-card">
                        <div class="ar-feature-icon">📍</div>
                        <div class="ar-feature-title">Spot Info</div>
                        <div class="ar-feature-desc">View ratings and details overlay</div>
                    </div>
                    <div class="ar-feature-card">
                        <div class="ar-feature-icon">👻</div>
                        <div class="ar-feature-title">Ghost Mode</div>
                        <div class="ar-feature-desc">Follow AR ghost of pro tricks</div>
                    </div>
                    <div class="ar-feature-card">
                        <div class="ar-feature-icon">🛹</div>
                        <div class="ar-feature-title">Best Lines</div>
                        <div class="ar-feature-desc">AR paths showing optimal routes</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// ====== AR SESSION MANAGEMENT ======

window.startAR = async function() {
    if (!window.arExplorer) {
        alert('AR Explorer not available');
        return;
    }

    const success = await window.arExplorer.startARSession();

    if (success) {
        // Show AR view
        const arView = document.getElementById('ar-view');
        const arVideo = document.getElementById('ar-video');

        if (arView && arVideo) {
            arView.style.display = 'block';

            // Attach video stream
            if (window.arExplorer.videoStream) {
                arVideo.srcObject = window.arExplorer.videoStream;
            }

            // Start rendering AR markers
            startARMarkerRendering();
        }
    }
};

window.stopAR = async function() {
    if (!window.arExplorer) return;

    await window.arExplorer.stopARSession();

    // Hide AR view
    const arView = document.getElementById('ar-view');
    if (arView) {
        arView.style.display = 'none';
    }

    stopARMarkerRendering();
};

window.toggleGhost = function() {
    if (!window.arExplorer) return;

    const isActive = window.arExplorer.toggleGhostMode();
    alert(isActive ? 'Ghost Mode Activated!' : 'Ghost Mode Deactivated');
};

window.captureAR = function() {
    const video = document.getElementById('ar-video');
    const canvas = document.getElementById('ar-canvas');

    if (!video || !canvas) return;

    // Create canvas screenshot
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Download image
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `skatequest-ar-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
    });
};

// ====== AR MARKER RENDERING ======

let markerRenderInterval;

function startARMarkerRendering() {
    markerRenderInterval = setInterval(() => {
        if (!window.arExplorer || !window.arExplorer.isActive()) {
            stopARMarkerRendering();
            return;
        }

        renderARMarkers();
    }, 100); // Update at 10 FPS
}

function stopARMarkerRendering() {
    if (markerRenderInterval) {
        clearInterval(markerRenderInterval);
        markerRenderInterval = null;
    }
}

function renderARMarkers() {
    const container = document.getElementById('ar-markers');
    if (!container || !window.arExplorer) return;

    const markers = window.arExplorer.getARMarkers();

    container.innerHTML = markers.map(marker => {
        const pos = marker.screenPosition;
        if (!pos || !pos.visible) return '';

        let markerHTML = '';

        switch (marker.type) {
            case 'trick':
                markerHTML = `
                    <div class="ar-marker ar-trick-marker"
                         style="left: ${pos.x}px; top: ${pos.y}px; transform: scale(${pos.scale});">
                        <div class="ar-marker-icon">🎯</div>
                        <div class="ar-marker-label">${marker.data.trickName}</div>
                        <div class="ar-marker-info">${marker.data.landedBy.length} landed</div>
                    </div>
                `;
                break;

            case 'spot':
                markerHTML = `
                    <div class="ar-marker ar-spot-marker"
                         style="left: ${pos.x}px; top: ${pos.y}px; transform: scale(${pos.scale});">
                        <div class="ar-marker-icon">📍</div>
                        <div class="ar-marker-label">${marker.data.name}</div>
                        <div class="ar-marker-info">⭐ ${marker.data.rating}/5</div>
                    </div>
                `;
                break;

            case 'line':
                markerHTML = `
                    <div class="ar-marker ar-line-marker"
                         style="left: ${pos.x}px; top: ${pos.y}px; transform: scale(${pos.scale});">
                        <div class="ar-marker-icon">🛹</div>
                        <div class="ar-marker-label">Best Line</div>
                    </div>
                `;
                break;

            case 'path_point':
                markerHTML = `
                    <div class="ar-marker ar-path-marker"
                         style="left: ${pos.x}px; top: ${pos.y}px; transform: scale(${pos.scale});">
                        <div class="ar-path-number">${marker.data.order + 1}</div>
                    </div>
                `;
                break;
        }

        return markerHTML;
    }).join('');
}

// Export
export default { renderARExplorer };

if (typeof window !== 'undefined') {
    window.renderARExplorer = renderARExplorer;
}

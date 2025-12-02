/**
 * SkateQuest - AR Spot Explorer
 * Augmented reality overlays for skateboarding spots
 * Copyright (c) 2024 SkateQuest. All Rights Reserved.
 */

class ARExplorerManager {
    constructor() {
        this.isARActive = false;
        this.videoStream = null;
        this.currentSpot = null;
        this.arMarkers = [];
        this.ghostMode = false;
        this.animationFrame = null;

        // Device orientation for AR
        this.deviceOrientation = { alpha: 0, beta: 0, gamma: 0 };
        this.devicePosition = { lat: null, lng: null };

        this.init();
    }

    init() {
        console.log('✓ AR Explorer initializing...');

        // Check for device capabilities
        this.checkARCapabilities();

        // Set up device orientation listener
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', (e) => {
                this.deviceOrientation = {
                    alpha: e.alpha || 0, // Z-axis rotation
                    beta: e.beta || 0,   // X-axis rotation
                    gamma: e.gamma || 0  // Y-axis rotation
                };
            });
        }

        console.log('✓ AR Explorer ready');
    }

    checkARCapabilities() {
        this.capabilities = {
            camera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            orientation: 'DeviceOrientationEvent' in window,
            geolocation: 'geolocation' in navigator,
            accelerometer: 'DeviceMotionEvent' in window
        };

        return this.capabilities;
    }

    // ====== AR SESSION MANAGEMENT ======

    async startARSession(spotId = null) {
        if (this.isARActive) {
            console.warn('AR session already active');
            return;
        }

        try {
            // Request camera permission
            this.videoStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // Use back camera
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            // Get user's current location
            await this.updateUserLocation();

            // Load spot data if provided
            if (spotId) {
                await this.loadSpotData(spotId);
            } else {
                await this.loadNearbySpots();
            }

            this.isARActive = true;
            this.startARRendering();

            return true;
        } catch (error) {
            console.error('Error starting AR session:', error);
            alert('Unable to access camera. Please check permissions.');
            return false;
        }
    }

    async stopARSession() {
        if (!this.isARActive) return;

        // Stop video stream
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
            this.videoStream = null;
        }

        // Stop rendering loop
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        this.isARActive = false;
        this.arMarkers = [];
    }

    async updateUserLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject('Geolocation not supported');
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.devicePosition = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    resolve(this.devicePosition);
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    reject(error);
                }
            );
        });
    }

    async loadSpotData(spotId) {
        // Load specific spot data from database
        if (!window.supabaseClient) return;

        try {
            const { data, error } = await window.supabaseClient
                .from('skate_spots')
                .select('*')
                .eq('id', spotId)
                .single();

            if (error) throw error;

            this.currentSpot = data;
            this.createARMarkersForSpot(data);
        } catch (error) {
            console.error('Error loading spot data:', error);
        }
    }

    async loadNearbySpots() {
        // Load spots within 1km radius
        if (!window.skateSpots || !this.devicePosition.lat) return;

        const nearbySpots = window.skateSpots.filter(spot => {
            const distance = this.calculateDistance(
                this.devicePosition.lat,
                this.devicePosition.lng,
                spot.lat,
                spot.lng
            );
            return distance < 1000; // Within 1km
        });

        // Create AR markers for nearby spots
        nearbySpots.forEach(spot => {
            this.createARMarkersForSpot(spot);
        });
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    // ====== AR MARKERS ======

    createARMarkersForSpot(spot) {
        // Create marker for trick attempts
        if (spot.tricks && spot.tricks.length > 0) {
            spot.tricks.forEach(trick => {
                this.arMarkers.push({
                    type: 'trick',
                    spotId: spot.id,
                    position: { lat: spot.lat, lng: spot.lng },
                    data: {
                        trickName: trick.name,
                        landedBy: trick.landedBy || [],
                        attempts: trick.attempts || 0
                    }
                });
            });
        }

        // Create marker for best lines
        if (spot.bestLines) {
            this.arMarkers.push({
                type: 'line',
                spotId: spot.id,
                position: { lat: spot.lat, lng: spot.lng },
                data: {
                    path: spot.bestLines,
                    difficulty: spot.difficulty
                }
            });
        }

        // Create general spot marker
        this.arMarkers.push({
            type: 'spot',
            spotId: spot.id,
            position: { lat: spot.lat, lng: spot.lng },
            data: {
                name: spot.name,
                type: spot.type,
                rating: spot.rating || 0
            }
        });
    }

    // ====== AR RENDERING ======

    startARRendering() {
        const renderLoop = () => {
            if (!this.isARActive) return;

            // Update AR markers based on device orientation
            this.updateARMarkerPositions();

            // Continue rendering loop
            this.animationFrame = requestAnimationFrame(renderLoop);
        };

        renderLoop();
    }

    updateARMarkerPositions() {
        if (!this.devicePosition.lat) return;

        this.arMarkers.forEach(marker => {
            // Calculate bearing and distance to marker
            const bearing = this.calculateBearing(
                this.devicePosition.lat,
                this.devicePosition.lng,
                marker.position.lat,
                marker.position.lng
            );

            const distance = this.calculateDistance(
                this.devicePosition.lat,
                this.devicePosition.lng,
                marker.position.lat,
                marker.position.lng
            );

            // Calculate screen position based on device orientation
            const relativeAngle = bearing - this.deviceOrientation.alpha;
            marker.screenPosition = this.worldToScreen(relativeAngle, distance);
        });
    }

    calculateBearing(lat1, lon1, lat2, lon2) {
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
        const θ = Math.atan2(y, x);

        return ((θ * 180 / Math.PI) + 360) % 360; // Convert to degrees
    }

    worldToScreen(angle, distance) {
        // Convert world coordinates to screen coordinates
        // This is simplified - real AR would use more complex projection
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        // Normalize angle to -180 to 180
        let normalizedAngle = angle;
        if (normalizedAngle > 180) normalizedAngle -= 360;

        // Calculate screen position
        const fov = 60; // Field of view in degrees
        const x = (normalizedAngle / fov) * screenWidth + screenWidth / 2;

        // Y position based on device tilt and distance
        const tilt = this.deviceOrientation.beta || 0;
        const y = screenHeight / 2 + (tilt * 2);

        // Scale based on distance (closer = larger)
        const scale = Math.max(0.5, Math.min(2, 100 / distance));

        return {
            x: Math.max(0, Math.min(screenWidth, x)),
            y: Math.max(0, Math.min(screenHeight, y)),
            scale: scale,
            visible: Math.abs(normalizedAngle) < fov / 2 && distance < 500
        };
    }

    // ====== GHOST MODE ======

    toggleGhostMode(trickId = null) {
        this.ghostMode = !this.ghostMode;

        if (this.ghostMode && trickId) {
            this.loadGhostTrickAnimation(trickId);
        } else {
            this.ghostAnimation = null;
        }

        return this.ghostMode;
    }

    async loadGhostTrickAnimation(trickId) {
        // Load professional trick animation data
        // This would typically come from a database of pro skater footage
        this.ghostAnimation = {
            trickId: trickId,
            keyframes: [
                { time: 0, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
                { time: 0.5, position: { x: 0, y: 50, z: 50 }, rotation: { x: 90, y: 180, z: 0 } },
                { time: 1.0, position: { x: 0, y: 0, z: 100 }, rotation: { x: 0, y: 360, z: 0 } }
            ],
            duration: 1000 // milliseconds
        };
    }

    // ====== AR TRICK ANIMATIONS ======

    playTrickAnimation(trickId) {
        const trick = window.getTrickById(trickId);
        if (!trick) return;

        // Create animation overlay
        const animation = {
            trickId: trickId,
            trickName: trick.name,
            startTime: Date.now(),
            duration: 2000
        };

        // This would trigger visual effects in the AR view
        if (this.onTrickAnimation) {
            this.onTrickAnimation(animation);
        }
    }

    // ====== PATH VISUALIZATION ======

    showBestLine(spotId) {
        const spot = window.skateSpots?.find(s => s.id === spotId);
        if (!spot || !spot.bestLines) return;

        // Create AR path markers
        spot.bestLines.forEach((point, index) => {
            this.arMarkers.push({
                type: 'path_point',
                spotId: spotId,
                position: point,
                data: {
                    order: index,
                    isStart: index === 0,
                    isEnd: index === spot.bestLines.length - 1
                }
            });
        });
    }

    // ====== PUBLIC API ======

    getARMarkers() {
        return this.arMarkers.filter(m => m.screenPosition?.visible);
    }

    getCurrentSpot() {
        return this.currentSpot;
    }

    isActive() {
        return this.isARActive;
    }
}

// Initialize AR Explorer
let arExplorer;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initARExplorer);
} else {
    initARExplorer();
}

function initARExplorer() {
    try {
        arExplorer = new ARExplorerManager();
        window.arExplorer = arExplorer;
        console.log('✓ AR Explorer ready');
    } catch (error) {
        console.error('Failed to initialize AR Explorer:', error);
    }
}

export { ARExplorerManager };
export default arExplorer;

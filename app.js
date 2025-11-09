// SkateQuest App - Upgraded Version 2.0
// Copyright (c) 2024 SkateQuest. All Rights Reserved.

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Firebase to initialize
    await new Promise(resolve => {
        const interval = setInterval(() => {
            if (window.firebaseInstances) {
                clearInterval(interval);
                resolve();
            }
        }, 100);
    });

    const { 
        db, auth, storage, functions,
        doc, getDoc, setDoc, addDoc, onSnapshot, collection, 
        serverTimestamp, updateDoc, increment, runTransaction,
        query, where, orderBy, limit, getDocs, collectionGroup,
        ref, uploadBytes, getDownloadURL, 
        signInAnonymously, onAuthStateChanged,
        httpsCallable,
        appId 
    } = window.firebaseInstances;

    // ====== MAP INITIALIZATION ======
    const map = L.map('map').setView([45.6387, -122.6615], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // ====== STATE VARIABLES ======
    let skateSpots = [];
    let userProfile = {};
    let markers = [];
    let currentUserId = null;
    let userLocationMarker = null;
    let currentUserPosition = null;
    let mediaRecorder, recordedChunks = [], recordedVideoUrl = null, videoStream = null;
    let mapClickToAdd = false;
    let tempAddMarker = null;
    let dailyChallengeData = null;
    let givingBackStats = { raised: 0, boardsDonated: 0, activeQRs: 0 };
    let userQRStats = { hidden: 0, found: 0 };

    // ====== DOM ELEMENTS ======
    const content = document.getElementById('content');
    const discoverBtn = document.getElementById('discoverBtn');
    const addSpotBtn = document.getElementById('addSpotBtn');
    const challengesBtn = document.getElementById('challengesBtn');
    const qrHuntBtn = document.getElementById('qrHuntBtn');
    const givingBackBtn = document.getElementById('givingBackBtn');
    const profileBtn = document.getElementById('profileBtn');
    const legalBtn = document.getElementById('legalBtn');
    
    // Modals
    const customModal = document.getElementById('customModal');
    const modalText = document.getElementById('modalText');
    const cameraModal = document.getElementById('cameraModal');
    const cameraPreview = document.getElementById('cameraPreview');
    const legalModal = document.getElementById('legalModal');
    const legalText = document.getElementById('legalText');
    
    // Camera controls
    const recordBtn = document.getElementById('recordBtn');
    const stopRecordBtn = document.getElementById('stopRecordBtn');
    const saveVideoBtn = document.getElementById('saveVideoBtn');
    const cancelCameraBtn = document.getElementById('cancelCameraBtn');
    const closeCameraBtn = document.getElementById('closeCameraBtn');

    // ====== MODAL HANDLERS ======
    document.querySelectorAll('.close-button').forEach(btn => {
        btn.onclick = () => btn.closest('.modal').style.display = 'none';
    });
    
    window.onclick = (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = "none";
        }
    };

    function showModal(message) {
        if (modalText && customModal) {
            modalText.textContent = message;
            customModal.style.display = "block";
        } else {
            console.warn('Modal elements not found:', message);
        }
    }

    function showToast(message) {
        const existingToast = document.querySelector('.toast');
        if (existingToast) existingToast.remove();
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), 3000);
    }

    // ====== NAVIGATION ======
    function setActiveButton(activeBtn) {
        if (!activeBtn) return;
        [discoverBtn, addSpotBtn, challengesBtn, qrHuntBtn, givingBackBtn, profileBtn, legalBtn]
            .filter(btn => btn)
            .forEach(btn => btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    // ====== MAP CLICK HANDLER ======
    map.on('click', (e) => {
        if (!mapClickToAdd) return;
        const { lat, lng } = e.latlng;
        if (!tempAddMarker) {
            tempAddMarker = L.marker([lat, lng]).addTo(map);
        } else {
            tempAddMarker.setLatLng([lat, lng]);
        }
        showAddSpotForm(lat.toFixed(6), lng.toFixed(6));
    });

    // ====== AUTHENTICATION ======
    onAuthStateChanged(auth, user => {
        if (user) {
            currentUserId = user.uid;
            console.log('✓ User authenticated:', currentUserId);
            setupRealtimeListeners();
            startGpsTracking();
            loadDailyChallenge();
            loadGivingBackStats();
            loadUserQRStats();
            document.querySelectorAll('nav button').forEach(b => b.disabled = false);
            if (discoverBtn) discoverBtn.click();
        } else {
            currentUserId = null;
            document.querySelectorAll('nav button').forEach(b => b.disabled = true);
            signIn();
        }
    });

    async function signIn() {
        try {
            await signInAnonymously(auth);
            console.log('✓ Signed in anonymously');
        } catch (error) {
            console.error("Error signing in:", error);
            showModal("Could not connect. Please refresh.");
        }
    }

    // ====== REALTIME LISTENERS ======
    function setupRealtimeListeners() {
        if (!currentUserId) return;

        // Listen to skate spots
        const spotsPath = `/artifacts/${appId}/public/data/skate_spots`;
        onSnapshot(collection(db, spotsPath), snapshot => {
            skateSpots = [];
            snapshot.forEach(d => skateSpots.push({ id: d.id, ...d.data() }));
            renderMarkers();
            updateSpotSelect();
        }, error => console.error('Spots listener error:', error));

        // Listen to user profile
        const profilePath = `/artifacts/${appId}/users/${currentUserId}/profile/data`;
        onSnapshot(doc(db, profilePath), async docSnap => {
            if (docSnap.exists()) {
                userProfile = docSnap.data();
            } else {
                const newProfile = {
                    username: `Skater${Math.floor(Math.random() * 1000)}`,
                    level: 1,
                    xp: 0,
                    spotsAdded: 0,
                    challengesCompleted: [],
                    streak: 0,
                    createdAt: serverTimestamp()
                };
                await setDoc(doc(db, profilePath), newProfile);
                userProfile = newProfile;
            }
            
            // Update profile view if active
            if (profileBtn && profileBtn.classList.contains('active')) {
                renderProfile();
            }
            
            // Update leaderboard
            updateLeaderboard();
        }, error => console.error('Profile listener error:', error));

        // Listen to pending challenges
        const challengesPath = `/artifacts/${appId}/public/data/challenges`;
        onSnapshot(collection(db, challengesPath), snapshot => {
            const challenges = [];
            snapshot.forEach(d => challenges.push({ id: d.id, ...d.data() }));
            renderPendingChallenges(challenges);
        }, error => console.error('Challenges listener error:', error));
    }

    // ====== GPS TRACKING ======
    function startGpsTracking() {
        if (!navigator.geolocation) {
            return showModal("Geolocation is not supported.");
        }

        const userIcon = L.divIcon({
            className: 'user-location-marker',
            iconSize: [20, 20]
        });

        navigator.geolocation.watchPosition(
            pos => {
                currentUserPosition = [pos.coords.latitude, pos.coords.longitude];
                if (!userLocationMarker) {
                    userLocationMarker = L.marker(currentUserPosition, { icon: userIcon }).addTo(map);
                    map.setView(currentUserPosition, 16);
                } else {
                    userLocationMarker.setLatLng(currentUserPosition);
                }
            },
            error => {
                if (error.code === 1) showModal("Please enable location services.");
            },
            { enableHighAccuracy: true }
        );
    }

    // ====== RENDER MARKERS ======
    function renderMarkers() {
        markers.forEach(m => map.removeLayer(m));
        markers = [];

        skateSpots.forEach(spot => {
            if (spot.coords && spot.coords.latitude && spot.coords.longitude) {
                const marker = L.marker([spot.coords.latitude, spot.coords.longitude]).addTo(map);

                let popupContent = `
                    <div style="min-width:200px;">
                        <strong style="font-size:1.2rem; color:#FF5722;">${spot.name}</strong><br/>
                        ${spot.imageUrl ? `<img src="${spot.imageUrl}" alt="${spot.name}" style="max-width:200px; border-radius:8px; margin:8px 0;"/><br/>` : ''}
                        <strong>Difficulty:</strong> ${spot.difficulty}<br/>
                        <strong>Tricks:</strong> ${spot.tricks ? spot.tricks.join(', ') : 'None'}<br/>
                        ${spot.videoUrl ? `<br/><video src="${spot.videoUrl}" controls style="max-width:200px; border-radius:8px;"></video><br/>` : ''}
                        
                        <div style="margin-top:12px;">
                            <h4 style="color:#FF5722; margin:8px 0;">Challenges:</h4>
                            <ul id="challengesList-${spot.id}" style="padding-left:20px; margin:8px 0;"></ul>
                            
                            <form id="addChallengeForm-${spot.id}" style="margin-top:12px;">
                                <label style="display:block; margin-bottom:4px; font-weight:600;">New Challenge:</label>
                                <input type="text" 
                                       id="challengeText-${spot.id}" 
                                       placeholder="e.g., Land a kickflip down the stairs" 
                                       required 
                                       style="width:100%; padding:8px; border-radius:6px; border:1px solid #ddd; margin-bottom:8px;">
                                <button type="submit" style="background:#FF5722; color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; width:100%;">
                                    Add Challenge
                                </button>
                            </form>
                        </div>
                    </div>
                `;

                marker.bindPopup(popupContent);
                markers.push(marker);

                marker.on('popupopen', () => {
                    const popup = marker.getPopup();
                    if (popup && popup._contentNode) {
                        popup._contentNode.dataset.spotId = spot.id;
                    }
                    
                    const form = document.getElementById(`addChallengeForm-${spot.id}`);
                    if (form) {
                        form.onsubmit = (e) => {
                            e.preventDefault();
                            addChallengeToSpot(spot.id);
                        };
                    }
                    
                    renderChallengesForSpot(spot.id);
                });
            }
        });
    }

    // ====== CHALLENGE MANAGEMENT ======
    async function addChallengeToSpot(spotId) {
        if (!currentUserId) {
            showModal("You must be logged in to add a challenge.");
            return;
        }

        const challengeText = document.getElementById(`challengeText-${spotId}`)?.value;
        if (!challengeText || !challengeText.trim()) {
            return;
        }

        try {
            await addDoc(collection(db, `/artifacts/${appId}/public/data/skate_spots/${spotId}/challenges`), {
                description: challengeText,
                addedBy: currentUserId,
                createdAt: serverTimestamp(),
                completedBy: []
            });
            
            const input = document.getElementById(`challengeText-${spotId}`);
            if (input) input.value = '';
            
            showToast("Challenge added! 🔥");
        } catch (error) {
            console.error("Error adding challenge:", error);
            showModal("Failed to add challenge.");
        }
    }

    function renderChallengesForSpot(spotId) {
        const challengesList = document.getElementById(`challengesList-${spotId}`);
        if (!challengesList) return;

        onSnapshot(
            collection(db, `/artifacts/${appId}/public/data/skate_spots/${spotId}/challenges`),
            snapshot => {
                challengesList.innerHTML = '';
                snapshot.forEach(docSnap => {
                    const challenge = docSnap.data();
                    const li = document.createElement('li');
                    li.style.marginBottom = '8px';
                    li.innerHTML = `
                        <span>${challenge.description}</span>
                        <button class="complete-challenge-btn" 
                                data-challenge-id="${docSnap.id}" 
                                data-spot-id="${spotId}"
                                style="background:#2ecc71; color:white; border:none; padding:4px 12px; border-radius:4px; cursor:pointer; margin-left:8px; font-size:0.85rem;">
                            ✓ Complete
                        </button>
                    `;
                    challengesList.appendChild(li);
                });
            },
            error => {
                console.error("Error getting challenges:", error);
                challengesList.innerHTML = '<li style="color:#e74c3c;">Failed to load challenges.</li>';
            }
        );
    }

    // Event delegation for challenge completion
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('complete-challenge-btn')) {
            const challengeId = e.target.dataset.challengeId;
            const spotId = e.target.dataset.spotId;
            if (challengeId && spotId) {
                completeChallenge(spotId, challengeId);
            }
        }
    });

    async function completeChallenge(spotId, challengeId) {
        if (!currentUserId) {
            showModal("You must be logged in to complete a challenge.");
            return;
        }

        showToast("Completing challenge...");

        try {
            const challengeRef = doc(db, `/artifacts/${appId}/public/data/skate_spots/${spotId}/challenges/${challengeId}`);
            const challengeDoc = await getDoc(challengeRef);
            
            if (!challengeDoc.exists()) {
                showModal("Challenge not found.");
                return;
            }

            const challengeData = challengeDoc.data();
            const completedBy = [...(challengeData.completedBy || []), currentUserId];
            
            await updateDoc(challengeRef, { completedBy });
            await updateDoc(doc(db, `/artifacts/${appId}/users/${currentUserId}/profile/data`), {
                xp: increment(100),
                challengesCompleted: increment(1)
            });

            showToast("Challenge completed! +100 XP! 🔥");
        } catch (error) {
            console.error("Error completing challenge:", error);
            showModal("Failed to complete challenge.");
        }
    }

    // ====== RENDER PENDING CHALLENGES ======
    function renderPendingChallenges(challenges) {
        const pendingList = document.getElementById('pending-challenges-list');
        if (!pendingList) return;

        if (challenges.length === 0) {
            pendingList.innerHTML = `
                <div style="text-align:center; padding:2rem; color:var(--text-secondary);">
                    No active challenges yet. Be the first to issue one! 🚀
                </div>
            `;
            return;
        }

        pendingList.innerHTML = '';
        
        challenges.forEach(challenge => {
            const card = document.createElement('div');
            card.className = 'challenge-card';
            
            const difficultyClass = 
                challenge.difficulty === 'Insane' ? 'difficulty-insane' :
                challenge.difficulty === 'Gnarly' ? 'difficulty-gnarly' :
                'difficulty-medium';
            
            const statusClass = challenge.status === 'in_progress' ? 'status-in-progress' : '';
            
            card.innerHTML = `
                <div class="challenge-header">
                    <div>
                        <div style="font-size:0.9rem; color:var(--text-secondary); margin-bottom:0.5rem;">
                            <strong style="color:var(--primary-orange);">${challenge.challengerName || 'Anonymous'}</strong> called out:
                        </div>
                        <h3 class="challenge-title">${challenge.trick || 'Unknown Trick'}</h3>
                        ${challenge.title ? `<p style="margin:0.5rem 0; color:var(--text-secondary);">${challenge.title}</p>` : ''}
                    </div>
                    <div class="challenge-stake">${challenge.xp || 500} pts</div>
                </div>
                
                <div class="challenge-info">
                    <span class="challenge-badge ${difficultyClass}">
                        ${challenge.difficulty || 'Medium'}
                    </span>
                    ${challenge.status === 'in_progress' ? `
                        <span class="challenge-badge status-in-progress">In Progress</span>
                    ` : ''}
                    <span style="color:var(--text-secondary); font-size:0.9rem;">
                        📍 ${challenge.spotName || 'Unknown Location'}
                    </span>
                </div>
                
                ${challenge.description ? `
                    <p style="margin-top:1rem; color:var(--text-secondary); font-size:0.9rem;">
                        ${challenge.description}
                    </p>
                ` : ''}
                
                <div style="display:flex; gap:1rem; margin-top:1rem; padding-top:1rem; border-top:1px solid rgba(255,255,255,0.1);">
                    <button class="btn-primary" style="flex:1;" onclick="acceptChallenge('${challenge.id}')">
                        🎥 Accept & Film
                    </button>
                </div>
            `;
            
            pendingList.appendChild(card);
        });
    }

    window.acceptChallenge = function(challengeId) {
        showToast("Open camera to film your proof! 🎥");
        openCamera();
    };

    // ====== LEADERBOARD ======
    async function updateLeaderboard() {
        const leaderboardList = document.getElementById('leaderboard-list');
        if (!leaderboardList) return;

        try {
            const usersQuery = query(
                collectionGroup(db, 'profile'),
                orderBy('xp', 'desc'),
                limit(10)
            );
            
            const snapshot = await getDocs(usersQuery);
            
            if (snapshot.empty) {
                leaderboardList.innerHTML = '<div style="text-align:center; padding:1rem; color:var(--text-secondary);">No skaters yet!</div>';
                return;
            }

            leaderboardList.innerHTML = '';
            let rank = 1;
            
            snapshot.forEach(docSnap => {
                const profile = docSnap.data();
                const div = document.createElement('div');
                
                const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
                
                div.innerHTML = `
                    <div style="display:flex; align-items:center; gap:1rem;">
                        <span style="font-size:1.5rem; font-weight:900;">${rankEmoji}</span>
                        <div style="flex:1;">
                            <div style="font-weight:700; font-size:1.1rem;">${profile.username || 'Unknown'}</div>
                            <div style="font-size:0.85rem; color:var(--text-secondary);">
                                Level ${profile.level || 1} • ${profile.xp || 0} XP
                                ${profile.streak > 0 ? `• 🔥 ${profile.streak} day streak` : ''}
                            </div>
                        </div>
                    </div>
                `;
                
                leaderboardList.appendChild(div);
                rank++;
            });
        } catch (error) {
            console.error('Error updating leaderboard:', error);
            leaderboardList.innerHTML = '<div style="color:var(--danger);">Failed to load leaderboard</div>';
        }
    }

    // ====== DAILY CHALLENGE ======
    async function loadDailyChallenge() {
        const banner = document.getElementById('daily-challenge-banner');
        if (!banner) return;

        try {
            const dailyChallengeDoc = await getDoc(doc(db, `/artifacts/${appId}/public/data/daily_challenges/current`));
            
            if (dailyChallengeDoc.exists()) {
                dailyChallengeData = dailyChallengeDoc.data();
                
                document.getElementById('daily-challenge-trick').textContent = dailyChallengeData.trick || 'Mystery Trick';
                document.getElementById('daily-challenge-points').textContent = `${dailyChallengeData.xp || 500} pts`;
                document.getElementById('daily-challenge-time').textContent = '⏰ 24h remaining';
                
                const meta = document.getElementById('daily-challenge-meta');
                meta.innerHTML = `
                    <span class="challenge-badge difficulty-${dailyChallengeData.difficulty.toLowerCase()}">${dailyChallengeData.difficulty}</span>
                    <span>👥 ${dailyChallengeData.participants || 0} attempting</span>
                `;
                
                banner.style.display = 'block';
            } else {
                // Create a default daily challenge
                const defaultChallenge = {
                    trick: 'Kickflip over 5-stair',
                    difficulty: 'Medium',
                    xp: 500,
                    participants: 0,
                    createdAt: serverTimestamp()
                };
                
                await setDoc(doc(db, `/artifacts/${appId}/public/data/daily_challenges/current`), defaultChallenge);
                dailyChallengeData = defaultChallenge;
                
                banner.style.display = 'block';
                loadDailyChallenge(); // Reload to display
            }
        } catch (error) {
            console.error('Error loading daily challenge:', error);
        }
    }

    document.getElementById('accept-daily-challenge')?.addEventListener('click', () => {
        showToast("Daily challenge accepted! Film your trick! 🎥");
        openCamera();
    });

    // ====== GIVING BACK STATS ======
    async function loadGivingBackStats() {
        try {
            const statsDoc = await getDoc(doc(db, `/artifacts/${appId}/public/data/giving_back/stats`));
            
            if (statsDoc.exists()) {
                givingBackStats = statsDoc.data();
            } else {
                givingBackStats = { raised: 0, boardsDonated: 0, activeQRs: 0 };
                await setDoc(doc(db, `/artifacts/${appId}/public/data/giving_back/stats`), givingBackStats);
            }
            
            updateGivingBackDisplay();
        } catch (error) {
            console.error('Error loading giving back stats:', error);
        }
    }

    function updateGivingBackDisplay() {
        document.getElementById('total-raised').textContent = `$${givingBackStats.raised.toLocaleString()}`;
        document.getElementById('boards-donated').textContent = givingBackStats.boardsDonated;
        document.getElementById('active-qrs').textContent = givingBackStats.activeQRs;
    }

    // ====== USER QR STATS ======
    async function loadUserQRStats() {
        if (!currentUserId) return;
        
        try {
            const userQRDoc = await getDoc(doc(db, `/artifacts/${appId}/users/${currentUserId}/qr_stats/data`));
            
            if (userQRDoc.exists()) {
                userQRStats = userQRDoc.data();
            } else {
                userQRStats = { hidden: 0, found: 0 };
            }
            
            document.getElementById('user-qrs-hidden').textContent = userQRStats.hidden;
            document.getElementById('user-qrs-found').textContent = userQRStats.found;
        } catch (error) {
            console.error('Error loading user QR stats:', error);
        }
    }

    // ====== NAVIGATION HANDLERS ======
    if (discoverBtn) {
        discoverBtn.onclick = () => {
            setActiveButton(discoverBtn);
            
            // Show map-related elements
            document.getElementById('daily-challenge-banner').style.display = 'block';
            document.getElementById('leaderboard').style.display = 'block';
            document.getElementById('pending-challenges').style.display = 'block';
            
            // Hide other sections
            document.getElementById('challenge-panel')?.style.display = 'none';
            document.getElementById('qr-hunt-section')?.style.display = 'none';
            document.getElementById('giving-back-banner')?.style.display = 'none';
            
            content.scrollIntoView({ behavior: 'smooth' });
        };
    }

    if (challengesBtn) {
        challengesBtn.onclick = () => {
            setActiveButton(challengesBtn);
            
            document.getElementById('pending-challenges').style.display = 'block';
            document.getElementById('challenge-panel').style.display = 'block';
            
            document.getElementById('daily-challenge-banner').style.display = 'none';
            document.getElementById('leaderboard').style.display = 'none';
            document.getElementById('qr-hunt-section')?.style.display = 'none';
            document.getElementById('giving-back-banner')?.style.display = 'none';
        };
    }

    if (qrHuntBtn) {
        qrHuntBtn.onclick = () => {
            setActiveButton(qrHuntBtn);
            
            document.getElementById('qr-hunt-section').style.display = 'block';
            
            document.getElementById('daily-challenge-banner').style.display = 'none';
            document.getElementById('leaderboard').style.display = 'none';
            document.getElementById('pending-challenges').style.display = 'none';
            document.getElementById('challenge-panel')?.style.display = 'none';
            document.getElementById('giving-back-banner')?.style.display = 'none';
        };
    }

    if (givingBackBtn) {
        givingBackBtn.onclick = () => {
            setActiveButton(givingBackBtn);
            
            document.getElementById('giving-back-banner').style.display = 'block';
            
            document.getElementById('daily-challenge-banner').style.display = 'none';
            document.getElementById('leaderboard').style.display = 'none';
            document.getElementById('pending-challenges').style.display = 'none';
            document.getElementById('challenge-panel')?.style.display = 'none';
            document.getElementById('qr-hunt-section')?.style.display = 'none';
        };
    }

    if (addSpotBtn) {
        addSpotBtn.onclick = () => {
            if (mapClickToAdd) {
                mapClickToAdd = false;
                if (tempAddMarker) {
                    map.removeLayer(tempAddMarker);
                    tempAddMarker = null;
                }
                setActiveButton(null);
                showToast("Map click-to-add canceled.");
                return;
            }
            
            mapClickToAdd = true;
            setActiveButton(addSpotBtn);
            showToast("Click anywhere on the map to add a new spot!");
        };
    }

    if (profileBtn) {
        profileBtn.onclick = () => {
            setActiveButton(profileBtn);
            renderProfile();
            
            // Hide other sections
            document.getElementById('daily-challenge-banner').style.display = 'none';
            document.getElementById('leaderboard').style.display = 'none';
            document.getElementById('pending-challenges').style.display = 'none';
            document.getElementById('challenge-panel')?.style.display = 'none';
            document.getElementById('qr-hunt-section')?.style.display = 'none';
            document.getElementById('giving-back-banner')?.style.display = 'none';
        };
    }

    if (legalBtn) {
        legalBtn.onclick = () => {
            setActiveButton(legalBtn);
            showLegalModal();
        };
    }

    // ====== ADD SPOT FORM ======
    function showAddSpotForm(lat = '', lng = '') {
        setActiveButton(addSpotBtn);
        recordedVideoUrl = null;
        
        // Hide other sections
        document.getElementById('daily-challenge-banner').style.display = 'none';
        document.getElementById('leaderboard').style.display = 'none';
        document.getElementById('pending-challenges').style.display = 'none';
        
        content.innerHTML = `
            <div class="panel">
                <h2>Add New Skate Spot</h2>
                <p style="margin-bottom:1.5rem; color:var(--text-secondary);">
                    Fill in the details below to add this spot to the map.
                </p>
                
                <form id="addSpotForm">
                    <label>Spot Name:</label>
                    <input type="text" id="spotName" placeholder="e.g., Downtown 10-stair" required />
                    
                    <label>Latitude:</label>
                    <input type="number" step="any" id="spotLat" value="${lat}" required />
                    
                    <label>Longitude:</label>
                    <input type="number" step="any" id="spotLng" value="${lng}" required />
                    
                    <label>Difficulty:</label>
                    <select id="spotDifficulty">
                        <option>Beginner</option>
                        <option>Intermediate</option>
                        <option selected>Advance

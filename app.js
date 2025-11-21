// Copyright (c) 2024 Your Name / SkateQuest. All Rights Reserved.

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Firebase with timeout protection
    await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            console.warn('Firebase initialization timeout, proceeding anyway...');
            resolve();
        }, 10000); // 10 second timeout

        const interval = setInterval(() => {
            if (window.firebaseInstances) {
                clearInterval(interval);
                clearTimeout(timeout);
                resolve();
            }
        }, 100);
    });

    // Safely extract Firebase instances with error handling
    let db, auth, storage, doc, getDoc, setDoc, addDoc, onSnapshot, collection, serverTimestamp, updateDoc, increment, ref, uploadBytes, getDownloadURL, signInAnonymously, onAuthStateChanged, appId, query, where, getDocs;

    try {
        const instances = window.firebaseInstances || {};
        ({ db, auth, storage, doc, getDoc, setDoc, addDoc, onSnapshot, collection, serverTimestamp, updateDoc, increment, ref, uploadBytes, getDownloadURL, signInAnonymously, onAuthStateChanged, appId, query, where, getDocs } = instances);

        if (!db || !auth) {
            console.error('Firebase not properly initialized');
            showModal('App initialization error. Please refresh the page.');
            return;
        }
    } catch (error) {
        console.error('Error loading Firebase instances:', error);
        return;
    }

    // Initialize map with error handling
    let map;
    try {
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('Map element not found');
            return;
        }

        // Use the map created in main.js
        map = window.map;
        
        if (!map) {
            throw new Error('Map not initialized in main.js');
        }

        // Expose map globally for error recovery
        window.map = map;
        // Make the map available to integrations (parks layer, etc.)
        window.sqMap = map;

        // Fix map rendering on resize
        window.addEventListener('resize', () => {
            if (map) {
                setTimeout(() => map.invalidateSize(), 100);
            }
        });
    } catch (error) {
        console.error('Map initialization error:', error);
        showModal('Map failed to load. Please refresh the page.');
        return;
    }

    // When user clicks on the map while in add mode, show the add form at that coord
    map.on('click', (e) => {
        if (!mapClickToAdd) return;
        const { lat, lng } = e.latlng;
        // add or move temporary marker
        if (!tempAddMarker) tempAddMarker = L.marker([lat, lng]).addTo(map);
        else tempAddMarker.setLatLng([lat, lng]);
        showAddSpotForm(lat.toFixed(6), lng.toFixed(6));
    });

    let skateSpots = [], userProfile = {}, markers = [];
    let skateShops = [], shopMarkers = [];
    let showShops = false;
    let currentUserId = null, userLocationMarker = null, currentUserPosition = null;
    let mediaRecorder, recordedChunks = [], recordedVideoUrl = null, videoStream = null;
    let mapClickToAdd = false, tempAddMarker = null;

    const content = document.getElementById('content');
    const discoverBtn = document.getElementById('discoverBtn');
    const addSpotBtn = document.getElementById('addSpotBtn');
    const shopsBtn = document.getElementById('shopsBtn');
    const profileBtn = document.getElementById('profileBtn');
    const centerMapBtn = document.getElementById('centerMapBtn');
    const legalBtn = document.getElementById('legalBtn');
    const modal = document.getElementById('customModal');
    const modalText = document.getElementById('modalText');
    const closeButton = document.querySelector('.close-button');
    const cameraModal = document.getElementById('cameraModal');
    const cameraPreview = document.getElementById('cameraPreview');
    const recordBtn = document.getElementById('recordBtn');
    const stopRecordBtn = document.getElementById('stopRecordBtn');
    const saveVideoBtn = document.getElementById('saveVideoBtn');
    const cancelCameraBtn = document.getElementById('cancelCameraBtn');
    const legalModal = document.getElementById('legalModal');
    const legalText = document.getElementById('legalText');
    const shopsToggle = document.getElementById('shops-toggle');

    document.querySelectorAll('.close-button').forEach(btn => btn.onclick = () => {
        btn.closest('.modal').style.display = 'none';
    });
    window.onclick = (event) => { if (event.target.classList.contains('modal')) event.target.style.display = "none"; };
    function showModal(message) { 
        if (modalText && modal) {
            modalText.textContent = message;
            modal.style.display = "block";
        } else {
            console.warn('Modal elements not found:', message);
        }
    }
    function setActiveButton(activeBtn) {
        if (!activeBtn) return;
        [discoverBtn, addSpotBtn, shopsBtn, profileBtn, legalBtn].filter(btn => btn).forEach(btn => btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    console.log('Button check:', {discoverBtn, addSpotBtn, shopsBtn, profileBtn, legalBtn});

    onAuthStateChanged(auth, user => {
        if (user) {
            currentUserId = user.uid;
            setupRealtimeListeners();
            startGpsTracking();
            document.querySelectorAll('nav button').forEach(b => b.disabled = false);
            if (discoverBtn) discoverBtn.click();
        } else {
            currentUserId = null;
            document.querySelectorAll('nav button').forEach(b => b.disabled = true);
        }
    });

    async function signIn() {
        try {
            if (!auth) {
                console.error('Auth not initialized');
                return;
            }
            await window.firebaseRetry(async () => {
                await signInAnonymously(auth);
            }, 'Sign in');
        } catch (error) {
            console.error("Error signing in:", error);
            showModal("Could not connect. Check your internet and refresh.");
        }
    }

    if (legalBtn && legalText && legalModal) {
    if (challengesBtn) {
        challengesBtn.onclick = () => {
            setActiveButton(challengesBtn);
            content.innerHTML = '<h2>Challenges</h2><p>View and participate in skating challenges. Feature coming soon!</p>';
        };
    }

    if (profileBtn) {
        profileBtn.onclick = () => {
            setActiveButton(profileBtn);
            content.innerHTML = '<h2>Profile</h2><p>Your skater profile and stats. Feature coming soon!</p>';
        };
    }


        legalBtn.onclick = () => {
            setActiveButton(legalBtn);
            legalText.innerHTML = `
            <p><em>Last Updated: August 16, 2025</em></p>
            <p><strong>Legal Disclaimer:</strong> These documents are provided as a starting point. It is strongly recommended that you consult with a qualified legal professional to ensure these policies are complete and appropriate for your specific situation before launching your application.</p>
            
            <hr>

            <h3>Terms of Service</h3>
            <p>Welcome to SkateQuest (the "App"). By accessing or using our App, you agree to be bound by these Terms of Service and our Privacy Policy.</p>
            
            <h4>1. Acknowledgment and Assumption of Risk</h4>
            <p>Skateboarding is an activity with inherent and significant risks of property damage, serious bodily injury, or death. By using this App, you expressly acknowledge, understand, and agree that you are participating in this activity at your own sole risk. You are responsible for your own safety and the safety of others around you. The creators of SkateQuest are not liable for any accidents, injuries, or damages that may occur in connection with your use of the App.</p>

            <h4>2. User Responsibilities and Conduct</h4>
            <ul>
                <li><strong>Safety First:</strong> Always wear appropriate protective gear, including a helmet.</li>
                <li><strong>Respect Property:</strong> Do not trespass on private property. Only add and visit spots that are legally accessible to the public. You are solely responsible for any legal consequences of trespassing.</li>
                <li><strong>Obey Laws:</strong> You must obey all local, state, and federal laws, including traffic laws and regulations regarding skateboarding in public areas.</li>
                <li><strong>Content:</strong> Do not create spots or upload videos that are dangerous, illegal, obscene, or encourage reckless behavior. We reserve the right to remove any content we deem inappropriate.</li>
            </ul>

            <h4>3. User-Generated Content</h4>
            <p>You grant SkateQuest a worldwide, non-exclusive, royalty-free license to use, display, and share the content (spots, videos) you upload within the App. You affirm that you have the necessary rights to the content you post.</p>
            
            <h4>4. Governing Law</h4>
            <p>These terms shall be governed by the laws of the State of Oregon, United States, without regard to its conflict of law provisions.</p>

            <hr>

            <h3>Privacy Policy</h3>
            <p>Your privacy is important to us. This policy outlines how we handle your data.</p>

            <h4>1. Information We Collect</h4>
            <ul>
                <li><strong>Anonymous User ID:</strong> To save your game progress (level, XP, challenges), we assign you a unique, anonymous ID using Firebase Authentication. We do not require or store personal information like your name or email.</li>
                <li><strong>Geolocation Data:</strong> We require access to your device's GPS to show your live location on the map. This is essential for the core functionality of exploring and adding spots. This location data is not stored historically.</li>
                <li><strong>Uploaded Content:</strong> We collect and store the skate spots and videos you voluntarily create and upload. This content is stored in Firebase and may be publicly visible to other users of the App.</li>
            </ul>

            <h4>2. How We Use Information</h4>
            <p>Your data is used exclusively to operate, maintain, and improve the SkateQuest app. We do not sell or share your data with third-party marketers.</p>

            <h4>3. Data Security</h4>
            <p>We use Google Firebase services to store and protect your data, relying on their robust security infrastructure to keep your information safe.</p>
        `;
            legalModal.style.display = 'block';
        };
    }

    signIn();

    function setupRealtimeListeners() {
        if (!currentUserId) return;
        const spotsPath = `/artifacts/${appId}/public/data/skate_spots`;
        onSnapshot(collection(db, spotsPath), s => { skateSpots = []; s.forEach(d => skateSpots.push({ id: d.id, ...d.data() })); renderMarkers(); }, e => console.error(e));
        
        // Listen to skate shops collection
        onSnapshot(collection(db, 'shops'), s => { 
            skateShops = []; 
            s.forEach(d => skateShops.push({ id: d.id, ...d.data() })); 
            renderShopMarkers(); 
        }, e => console.error('Error loading shops:', e));
        
        const profilePath = `/artifacts/${appId}/users/${currentUserId}/profile/data`;
        onSnapshot(doc(db, profilePath), async d => {
            if (d.exists()) { userProfile = d.data(); } 
            else { const p = { username: `Skater${Math.floor(Math.random() * 1000)}`, level: 1, xp: 0, spotsAdded: 0, challengesCompleted: [], createdAt: serverTimestamp() }; await setDoc(doc(db, profilePath), p); userProfile = p; }
            if (profileBtn.classList.contains('active')) renderProfile();
        }, e => console.error(e));
    }

    function startGpsTracking() {
        if (!navigator.geolocation) return showModal("Geolocation is not supported.");
        const userIcon = L.divIcon({ className: 'user-location-marker', iconSize: [18, 18] });
        navigator.geolocation.watchPosition(pos => {
            currentUserPosition = [pos.coords.latitude, pos.coords.longitude];
            if (!userLocationMarker) { userLocationMarker = L.marker(currentUserPosition, { icon: userIcon }).addTo(map); map.setView(currentUserPosition, 16); } 
            else { userLocationMarker.setLatLng(currentUserPosition); }
        }, e => { if (e.code === 1) showModal("Please enable location services."); }, { enableHighAccuracy: true });
    }

    if (centerMapBtn) {
        centerMapBtn.onclick = () => {
            if (currentUserPosition) map.setView(currentUserPosition, 16);
            else showModal("Finding your location...");
        };
    }

    function renderMarkers() {
        markers.forEach(m => map.removeLayer(m));
        markers = [];
        skateSpots.forEach(spot => {
            if (spot.coords && spot.coords.latitude && spot.coords.longitude) {
                const marker = L.marker([spot.coords.latitude, spot.coords.longitude]).addTo(map);
        
                let popupContent = `
                    <strong>${spot.name}</strong><br/>
                    ${spot.imageUrl ? `<img src="${spot.imageUrl}" alt="${spot.name}" style="max-width:150px;border-radius:8px;margin-top:5px;"/><br/>` : ''}
                    Difficulty: ${spot.difficulty}<br/>
                    Tricks: ${spot.tricks ? spot.tricks.join(', ') : 'None'}<br/>
                    ${spot.videoUrl ? `<br/><video src="${spot.videoUrl}" controls></video><br/>` : ''}

                    <h4>Challenges:</h4>
                    <ul id="challengesList-${spot.id}"></ul>
                    <br/>

                    <form id="addChallengeForm-${spot.id}">
                        <label>New Challenge:<br/>
                        <input type="text" id="challengeText-${spot.id}" placeholder="e.g., Land a kickflip down the stairs" required></label>
                        <button type="submit">Add Challenge</button>
                    </form>
                `;
        
                marker.bindPopup(popupContent);
                markers.push(marker);
        
                marker.on('popupopen', () => {
                    // Add the spot ID to the popup's HTML element
                    marker.getPopup()._content.parentElement.dataset.spotId = spot.id;
                    const form = document.getElementById(`addChallengeForm-${spot.id}`);
                    form.onsubmit = (e) => {
                        e.preventDefault();
                        addChallengeToSpot(spot.id);
                    };
                    renderChallengesForSpot(spot.id);
                });
            }
        });
    }

    // Helper function to escape HTML to prevent XSS
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Render skate shop markers on the map
    function renderShopMarkers() {
        // Remove existing shop markers
        shopMarkers.forEach(m => map.removeLayer(m));
        shopMarkers = [];
        
        // Only render if shops toggle is enabled
        if (!showShops) return;
        
        skateShops.forEach(shop => {
            if (shop.coords && shop.coords.latitude && shop.coords.longitude) {
                // Create custom icon for shops (different from skate spots)
                const shopIcon = L.divIcon({
                    className: 'shop-marker',
                    html: '<div style="background:#4CAF50;width:30px;height:30px;border-radius:50%;border:3px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><span style="color:white;font-size:18px;">🛒</span></div>',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                });
                
                const marker = L.marker([shop.coords.latitude, shop.coords.longitude], { icon: shopIcon }).addTo(map);
        
                let popupContent = `
                    <div style="min-width:200px;">
                        <h3 style="margin:0 0 10px 0;color:#4CAF50;">🛹 ${escapeHtml(shop.name)}</h3>
                        ${shop.address ? `<p style="margin:5px 0;"><strong>📍 Address:</strong><br/>${escapeHtml(shop.address)}</p>` : ''}
                        ${shop.phone ? `<p style="margin:5px 0;"><strong>📞 Phone:</strong><br/><a href="tel:${escapeHtml(shop.phone)}">${escapeHtml(shop.phone)}</a></p>` : ''}
                        ${shop.website ? `<p style="margin:5px 0;"><strong>🌐 Website:</strong><br/><a href="${escapeHtml(shop.website)}" target="_blank" rel="noopener">${escapeHtml(shop.website)}</a></p>` : ''}
                        ${shop.hours ? `<p style="margin:5px 0;"><strong>🕐 Hours:</strong><br/>${escapeHtml(shop.hours)}</p>` : ''}
                        ${shop.verified ? '<p style="margin:5px 0;color:#4CAF50;">✓ Verified Shop</p>' : ''}
                    </div>
                `;
        
                marker.bindPopup(popupContent);
                shopMarkers.push(marker);
            }
        });
    }

    // New function to add a challenge to a spot
    async function addChallengeToSpot(spotId) {
        if (!currentUserId) {
            showModal("You must be logged in to add a challenge.");
            return;
        }
        const challengeText = document.getElementById(`challengeText-${spotId}`).value;
        if (!challengeText.trim()) {
            return;
        }

        try {
            await addDoc(collection(db, `/artifacts/${appId}/public/data/skate_spots/${spotId}/challenges`), {
                description: challengeText,
                addedBy: currentUserId,
                createdAt: serverTimestamp(),
                completedBy: []
            });
            document.getElementById(`challengeText-${spotId}`).value = '';
            showModal("Challenge added!");
        } catch (error) {
            console.error("Error adding challenge: ", error);
            showModal("Failed to add challenge.");
        }
    }

    // Updated function to render challenges for a specific spot with a "Complete" button
    function renderChallengesForSpot(spotId) {
        const challengesList = document.getElementById(`challengesList-${spotId}`);
        if (!challengesList) return;

        onSnapshot(collection(db, `/artifacts/${appId}/public/data/skate_spots/${spotId}/challenges`), (snapshot) => {
            challengesList.innerHTML = '';
            snapshot.forEach(doc => {
                const challenge = doc.data();
                const li = document.createElement('li');
                li.innerHTML = `
                    ${challenge.description}
                    <button class="complete-challenge-btn" data-challenge-id="${doc.id}">Complete</button>
                `;
                challengesList.appendChild(li);
            });
        }, (error) => {
            console.error("Error getting challenges: ", error);
            challengesList.innerHTML = '<li>Failed to load challenges.</li>';
        });
    }

    // New event listener for all "Complete" buttons
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('complete-challenge-btn')) {
            const challengeId = e.target.dataset.challengeId;
            const spotId = e.target.closest('.leaflet-popup-pane').dataset.spotId;
            completeChallenge(spotId, challengeId);
        }
    });

    // New function to handle challenge completion
    async function completeChallenge(spotId, challengeId) {
        if (!currentUserId) {
            showModal("You must be logged in to complete a challenge.");
            return;
        }
        
        showModal("Completing challenge... please wait.");
        
        try {
            const challengeRef = doc(db, `/artifacts/${appId}/public/data/skate_spots/${spotId}/challenges/${challengeId}`);
            const challengeDoc = await getDoc(challengeRef);
            const challengeData = challengeDoc.data();
            
            // Add user to the list of people who have completed this challenge
            const completedBy = [...(challengeData.completedBy || []), currentUserId];
            await updateDoc(challengeRef, { completedBy: completedBy });

            // Reward the user with XP
            await updateDoc(doc(db, `/artifacts/${appId}/users/${currentUserId}/profile/data`), { xp: increment(100) });

            showModal("Challenge completed! You earned 100 XP!");
        } catch (error) {
            console.error("Error completing challenge: ", error);
            showModal("Failed to complete challenge.");
        }
    }

    if (discoverBtn) {
        discoverBtn.onclick = () => { setActiveButton(discoverBtn); content.innerHTML = '<p>Use the map to discover skate spots. Tap markers for details.</p>'; };
    }

    // Helper to show the Add Spot form for given coordinates
    function showAddSpotForm(lat = '', lng = '') {
        setActiveButton(addSpotBtn);
        recordedVideoUrl = null;
        content.innerHTML = `
            <h3>Add New Spot</h3>
            <p>Tap Save to add the spot at the selected location.</p>
            <form id="addSpotForm">
                <label>Name:<br/><input type="text" id="spotName" required /></label>
                <label>Latitude:<br/><input type="number" step="any" id="spotLat" value="${lat}" required /></label>
                <label>Longitude:<br/><input type="number" step="any" id="spotLng" value="${lng}" required /></label>
                <label>Difficulty:<br/><select id="spotDifficulty"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>
                <label>Tricks (comma separated):<br/><input type="text" id="spotTricks" /></label>
                <label>Photo (optional):<br/><input type="file" id="spotImageInput" accept="image/*" /></label>
                <div id="spotImagePreview"></div>
                <button type="button" id="recordVideoBtn">Record Trick 🎥</button>
                <div id="videoStatus"></div>
                <button type="submit">Add Spot</button>
                <button type="button" id="cancelAddSpotBtn">Cancel</button>
            </form>
        `;
        document.getElementById('recordVideoBtn').onclick = () => openCamera();
        document.getElementById('cancelAddSpotBtn').onclick = () => { 
            mapClickToAdd = false; 
            if (tempAddMarker) { map.removeLayer(tempAddMarker); tempAddMarker = null; }
            content.innerHTML = ''; 
            setActiveButton(discoverBtn); 
        };

        // Spot image handling
        const spotImageInput = document.getElementById('spotImageInput');
        const spotImagePreview = document.getElementById('spotImagePreview');
        let selectedSpotImageFile = null;
        spotImageInput.onchange = (ev) => {
            const f = ev.target.files && ev.target.files[0];
            if (!f) { selectedSpotImageFile = null; spotImagePreview.innerHTML = ''; return; }
            // quick client-side checks
            if (f.size > 5 * 1024 * 1024) { showModal('Image too large (max 5MB).'); spotImageInput.value = ''; selectedSpotImageFile = null; spotImagePreview.innerHTML = ''; return; }
            if (!f.type.startsWith('image/')) { showModal('Only image files are allowed.'); spotImageInput.value = ''; selectedSpotImageFile = null; spotImagePreview.innerHTML = ''; return; }
            selectedSpotImageFile = f;
            spotImagePreview.innerHTML = `<img src="${URL.createObjectURL(f)}" style="max-width:200px;border-radius:8px;margin-top:0.5em;"/>`;
        };

        document.getElementById('addSpotForm').onsubmit = async (e) => {
            e.preventDefault();
            if (!currentUserId) return showModal("You must be signed in.");
            const newSpot = {
                name: document.getElementById('spotName').value.trim(),
                coords: { latitude: parseFloat(document.getElementById('spotLat').value), longitude: parseFloat(document.getElementById('spotLng').value) },
                difficulty: document.getElementById('spotDifficulty').value,
                tricks: document.getElementById('spotTricks').value.split(',').map(t => t.trim()).filter(Boolean),
                addedBy: currentUserId, createdAt: serverTimestamp(),
                ...(recordedVideoUrl && { videoUrl: recordedVideoUrl })
            };
            try {
                showModal('Adding spot...');

                // If a spot image was selected, upload it first and attach URL with retry
                if (selectedSpotImageFile) {
                    await window.firebaseRetry(async () => {
                        const imgName = `${currentUserId}/${Date.now()}_${selectedSpotImageFile.name}`;
                        const imgRef = ref(storage, `spot_images/${imgName}`);
                        const uploadResult = await uploadBytes(imgRef, selectedSpotImageFile);
                        newSpot.imageUrl = await getDownloadURL(uploadResult.ref);
                    }, 'Image upload');
                }

                // Add spot with retry
                await window.firebaseRetry(async () => {
                    await addDoc(collection(db, `/artifacts/${appId}/public/data/skate_spots`), newSpot);
                    await updateDoc(doc(db, `/artifacts/${appId}/users/${currentUserId}/profile/data`), { spotsAdded: increment(1), xp: increment(100) });
                }, 'Add spot');

                showModal('Spot added! You earned 100 XP!');
                mapClickToAdd = false;
                if (tempAddMarker) { map.removeLayer(tempAddMarker); tempAddMarker = null; }
                if (discoverBtn) discoverBtn.click();
            } catch (error) {
                console.error("Error adding spot: ", error);
                showModal("Failed to add spot. Please check your connection and try again.");
            }
        };
    }

    if (addSpotBtn) {
        addSpotBtn.onclick = () => {
            // Toggle map-click-to-add mode. When enabled, user clicks map to place a spot.
            if (mapClickToAdd) {
                mapClickToAdd = false;
                if (tempAddMarker) { map.removeLayer(tempAddMarker); tempAddMarker = null; }
                setActiveButton(null);
                content.innerHTML = '<p>Map click-to-add canceled.</p>';
                return;
            }
            mapClickToAdd = true;
            setActiveButton(addSpotBtn);
            content.innerHTML = '<p>Click anywhere on the map to add a new spot. Click the "Add Spot" button again to cancel.</p>';
        };
    }

    // Shops button handler
    if (shopsBtn) {
        shopsBtn.onclick = () => {
            setActiveButton(shopsBtn);
            renderShopsPanel();
        };
    }

    // Shops toggle handler
    if (shopsToggle) {
        shopsToggle.onchange = () => {
            showShops = shopsToggle.checked;
            renderShopMarkers();
        };
    }

    function renderShopsPanel() {
        content.innerHTML = `
            <div style="padding:1rem;">
                <h2>🛹 Skate Shops</h2>
                <p>Discover local skate shops near you!</p>
                
                <div style="margin-bottom:1rem;">
                    <label style="display:flex;align-items:center;gap:0.5rem;">
                        <input type="checkbox" id="toggle-shops-panel" ${showShops ? 'checked' : ''} />
                        Show shops on map
                    </label>
                </div>

                <div id="shops-list" style="margin-top:1rem;">
                    <h3>Nearby Shops</h3>
                    <div id="shops-items"></div>
                </div>

                <hr style="margin:2rem 0;" />

                <h3>Add a Skate Shop</h3>
                <form id="add-shop-form" style="display:flex;flex-direction:column;gap:0.8rem;">
                    <label>
                        Shop Name *
                        <input type="text" id="shop-name" required placeholder="e.g., Local Skate Shop" />
                    </label>
                    <label>
                        Address *
                        <input type="text" id="shop-address" required placeholder="123 Main St, Portland, OR" />
                    </label>
                    <label>
                        Latitude *
                        <input type="number" id="shop-lat" step="any" required placeholder="45.5231" />
                    </label>
                    <label>
                        Longitude *
                        <input type="number" id="shop-lng" step="any" required placeholder="-122.6765" />
                    </label>
                    <label>
                        Phone
                        <input type="tel" id="shop-phone" placeholder="(555) 123-4567" />
                    </label>
                    <label>
                        Website
                        <input type="url" id="shop-website" placeholder="https://example.com" />
                    </label>
                    <label>
                        Hours
                        <input type="text" id="shop-hours" placeholder="Mon-Fri 10am-8pm, Sat-Sun 11am-6pm" />
                    </label>
                    <button type="submit" style="background:#4CAF50;color:white;padding:0.8rem;border:none;border-radius:8px;font-weight:bold;cursor:pointer;">
                        Add Shop
                    </button>
                </form>
            </div>
        `;

        // Hook up toggle in panel
        const toggleShopsPanel = document.getElementById('toggle-shops-panel');
        if (toggleShopsPanel) {
            toggleShopsPanel.onchange = () => {
                showShops = toggleShopsPanel.checked;
                if (shopsToggle) shopsToggle.checked = showShops;
                renderShopMarkers();
            };
        }

        // Display shops list
        renderShopsList();

        // Handle form submission
        const form = document.getElementById('add-shop-form');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                await addShop();
            };
        }
    }

    function renderShopsList() {
        const shopsItems = document.getElementById('shops-items');
        if (!shopsItems) return;

        if (skateShops.length === 0) {
            shopsItems.innerHTML = '<p style="color:#666;">No shops added yet. Be the first to add one!</p>';
            return;
        }

        shopsItems.innerHTML = skateShops.map((shop, index) => `
            <div style="padding:1rem;margin-bottom:0.8rem;border:1px solid #ddd;border-radius:8px;background:#f9f9f9;">
                <h4 style="margin:0 0 0.5rem 0;color:#4CAF50;">${escapeHtml(shop.name)}</h4>
                ${shop.address ? `<p style="margin:0.3rem 0;">📍 ${escapeHtml(shop.address)}</p>` : ''}
                ${shop.phone ? `<p style="margin:0.3rem 0;">📞 ${escapeHtml(shop.phone)}</p>` : ''}
                ${shop.website ? `<p style="margin:0.3rem 0;">🌐 <a href="${escapeHtml(shop.website)}" target="_blank" rel="noopener">${escapeHtml(shop.website)}</a></p>` : ''}
                ${shop.hours ? `<p style="margin:0.3rem 0;">🕐 ${escapeHtml(shop.hours)}</p>` : ''}
                <button data-shop-index="${index}" class="view-shop-btn" style="margin-top:0.5rem;padding:0.4rem 0.8rem;background:#d2673d;color:white;border:none;border-radius:6px;cursor:pointer;">
                    View on Map
                </button>
            </div>
        `).join('');
        
        // Add event listeners to view shop buttons
        document.querySelectorAll('.view-shop-btn').forEach(btn => {
            btn.onclick = (e) => {
                const shopIndex = parseInt(e.target.getAttribute('data-shop-index'));
                const shop = skateShops[shopIndex];
                if (shop && shop.coords) {
                    map.setView([shop.coords.latitude, shop.coords.longitude], 16);
                }
            };
        });
    }

    async function addShop() {
        if (!currentUserId) {
            showModal("You must be signed in to add a shop.");
            return;
        }

        const name = document.getElementById('shop-name').value.trim();
        const address = document.getElementById('shop-address').value.trim();
        const lat = parseFloat(document.getElementById('shop-lat').value);
        const lng = parseFloat(document.getElementById('shop-lng').value);
        const phone = document.getElementById('shop-phone').value.trim();
        const website = document.getElementById('shop-website').value.trim();
        const hours = document.getElementById('shop-hours').value.trim();

        if (!name || !address || isNaN(lat) || isNaN(lng)) {
            showModal("Please fill out all required fields (Name, Address, Latitude, Longitude).");
            return;
        }

        // Validate coordinate ranges
        if (lat < -90 || lat > 90) {
            showModal("Latitude must be between -90 and 90 degrees.");
            return;
        }
        if (lng < -180 || lng > 180) {
            showModal("Longitude must be between -180 and 180 degrees.");
            return;
        }

        try {
            const shopData = {
                name,
                address,
                coords: {
                    latitude: lat,
                    longitude: lng
                },
                phone: phone || null,
                website: website || null,
                hours: hours || null,
                addedBy: currentUserId,
                verified: false,
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, 'shops'), shopData);
            showModal("Shop added successfully!");
            
            // Clear form
            document.getElementById('add-shop-form').reset();
            
            // Refresh shops list
            renderShopsList();
            
            // Enable shops on map
            showShops = true;
            if (shopsToggle) shopsToggle.checked = true;
            renderShopMarkers();

        } catch (error) {
            console.error("Error adding shop:", error);
            showModal("Failed to add shop. Please try again.");
        }
    }

    async function openCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return showModal("Camera not supported on your browser.");
        if (!cameraModal || !cameraPreview || !recordBtn || !stopRecordBtn || !saveVideoBtn) {
            return showModal("Camera UI not available.");
        }
        try {
            videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true });
            cameraModal.style.display = "block";
            cameraPreview.srcObject = videoStream;
            recordBtn.style.display = 'inline-block';
            stopRecordBtn.style.display = 'none';
            saveVideoBtn.style.display = 'none';
        } catch (err) { console.error("Camera Error:", err); showModal("Could not access camera. Please check permissions."); }
    }

    if (recordBtn) {
        recordBtn.onclick = () => {
            recordedChunks = [];
            mediaRecorder = new MediaRecorder(videoStream);
            mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
            mediaRecorder.onstop = () => {
                const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
                if (cameraPreview) {
                    cameraPreview.srcObject = null;
                    cameraPreview.src = URL.createObjectURL(videoBlob);
                }
                if (saveVideoBtn) saveVideoBtn.style.display = 'inline-block';
            };
            mediaRecorder.start();
            recordBtn.style.display = 'none';
            if (stopRecordBtn) stopRecordBtn.style.display = 'inline-block';
        };
    }

    if (stopRecordBtn) {
        stopRecordBtn.onclick = () => { mediaRecorder.stop(); stopRecordBtn.style.display = 'none'; };
    }
    
    if (saveVideoBtn) {
        saveVideoBtn.onclick = async () => {
        showModal("Uploading video...");
        const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
        const videoFileName = `${currentUserId}_${Date.now()}.webm`;
        const storageRef = ref(storage, `skate_spots_videos/${videoFileName}`);
        try {
            const snapshot = await uploadBytes(storageRef, videoBlob);
            recordedVideoUrl = await getDownloadURL(snapshot.ref);
            document.getElementById('videoStatus').innerHTML = `<p>✅ Video attached!</p>`;
            closeCamera();
            showModal("Video uploaded successfully!");
        } catch (error) {
            console.error("Upload failed", error);
            showModal("Video upload failed. Please try again. (Note: Storage setup may be incomplete).");
        }
        };
    }

    function closeCamera() {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
        }
        if (cameraModal) cameraModal.style.display = "none";
        if (cameraPreview) {
            cameraPreview.srcObject = null;
            cameraPreview.src = '';
        }
    }

    function renderProfile() {
        content.innerHTML = `
            <h3>My Profile</h3>
            <p><strong>Username:</strong> ${userProfile.username || 'Anonymous'}</p>
            <p><strong>XP:</strong> ${userProfile.xp || 0}</p>
            <p><strong>Spots Added:</strong> ${userProfile.spotsAdded || 0}</p>
            <button id="callOutBtn">Call-Out User</button>
            <div id="callOutFormContainer" style="display:none;">
                <h4>Issue a Trick Call-Out</h4>
                <form id="callOutForm">
                    <label>Target Username:<br/><input type="text" id="targetUsername" required /></label>
                    <label>Trick:<br/><input type="text" id="trickName" required /></label>
                    <button type="submit">Send Call-Out</button>
                </form>
            </div>
            <h4>My Call-Outs</h4>
            <div id="callOutsList"></div>
        `;

        document.getElementById('callOutBtn').onclick = () => {
            document.getElementById('callOutFormContainer').style.display = 'block';
        };

        document.getElementById('callOutForm').onsubmit = async (e) => {
            e.preventDefault();
            const targetUsername = document.getElementById('targetUsername').value.trim();
            const trickName = document.getElementById('trickName').value.trim();
            if (!targetUsername || !trickName) return showModal("Please fill out all fields.");

            try {
                // Find user by username (requires a query)
                const usersRef = collection(db, `/artifacts/${appId}/users`);
                const q = query(usersRef, where("username", "==", targetUsername));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    return showModal("User not found.");
                }

                const targetUser = querySnapshot.docs[0];
                const targetId = targetUser.id;

                await addDoc(collection(db, `/artifacts/${appId}/trick_callouts`), {
                    challengerId: currentUserId,
                    challengerUsername: userProfile.username,
                    targetId: targetId,
                    targetUsername: targetUsername,
                    trick: trickName,
                    status: 'pending',
                    createdAt: serverTimestamp()
                });

                showModal("Call-Out sent!");
                document.getElementById('callOutFormContainer').style.display = 'none';
            } catch (error) {
                console.error("Error sending call-out: ", error);
                showModal("Failed to send call-out.");
            }
        };

        // Load and display call-outs
        loadCallOuts();
    }

    async function loadCallOuts() {
        const callOutsList = document.getElementById('callOutsList');
        if (!callOutsList) return;

        const sentQuery = query(collection(db, `/artifacts/${appId}/trick_callouts`), where("challengerId", "==", currentUserId));
        const receivedQuery = query(collection(db, `/artifacts/${appId}/trick_callouts`), where("targetId", "==", currentUserId));

        const [sentSnapshot, receivedSnapshot] = await Promise.all([getDocs(sentQuery), getDocs(receivedQuery)]);

        let html = '<h4>Sent</h4><ul>';
        sentSnapshot.forEach(doc => {
            const callout = doc.data();
            html += `<li>vs ${callout.targetUsername} - ${callout.trick} (${callout.status})</li>`;
        });
        html += '</ul><h4>Received</h4><ul>';
        receivedSnapshot.forEach(doc => {
            const callout = doc.data();
            html += `<li>from ${callout.challengerUsername} - ${callout.trick} (${callout.status}) <button class="complete-callout" data-id="${doc.id}">Complete</button></li>`;
        });
        html += '</ul>';
        callOutsList.innerHTML = html;

        document.querySelectorAll('.complete-callout').forEach(button => {
            button.onclick = (e) => {
                const calloutId = e.target.dataset.id;
                // Here you would trigger the video recording flow
                showModal(`Completing call-out ${calloutId}... (video recording not implemented yet)`);
            };
        });
    }
});

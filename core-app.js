// Copyright (c) 2024 SkateQuest. All Rights Reserved.

// Defensive guard: ignore malformed JSON coming from browser extensions or other storage writers.
// Some browser extensions write non-JSON values into storage which can cause uncaught JSON.parse
// errors in content scripts or page handlers. This listener swallows parse errors for storage events
// so they don't crash the app. Adjust `expectedKeys` below to limit parsing to keys your app actually uses.
(() => {
    const expectedKeys = null; // set to an array of keys like ['myAppKey'] to limit parsing
    window.addEventListener('storage', ev => {
        try {
            if (!ev || ev.newValue == null) return;
            if (expectedKeys && !expectedKeys.includes(ev.key)) return;
            // Try to parse; if it's invalid JSON this will throw and be caught below.
            JSON.parse(ev.newValue);
        } catch (err) {
            // Ignore malformed JSON from external writers (extensions). Keep a light log for debugging.
            // Do not rethrow so the error is not an uncaught rejection.
            // console.debug('Ignored non-JSON storage update for key', ev && ev.key, err && err.message);
        }
    });
})();

// This function will wait until the firebaseInstances object is available on the window
async function waitForFirebase() {
    return new Promise(resolve => {
        const interval = setInterval(() => {
            if (window.firebaseInstances) {
                clearInterval(interval);
                resolve(window.firebaseInstances);
            }
        }, 50); // Check every 50ms
    });
}

// Main app logic starts here
async function main() {
    const { db, auth, storage, doc, getDoc, setDoc, addDoc, onSnapshot, collection, serverTimestamp, updateDoc, increment, ref, uploadBytes, getDownloadURL, signInAnonymously, onAuthStateChanged, appId } = await waitForFirebase();

    const map = L.map('map').setView([45.6387, -122.6615], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // When user clicks on the map while in add mode, show the add form at that coord
    let tempAddMarker = null;
    map.on('click', (e) => {
        if (!mapClickToAdd) return;
        const { lat, lng } = e.latlng;
        // add or move temporary marker
        if (!tempAddMarker) tempAddMarker = L.marker([lat, lng]).addTo(map);
        else tempAddMarker.setLatLng([lat, lng]);
        showAddSpotForm(lat.toFixed(6), lng.toFixed(6));
    });

    let skateSpots = [], userProfile = {}, markers = [];
    let currentUserId = null, userLocationMarker = null, currentUserPosition = null;
    let mapClickToAdd = false;
    let mediaRecorder, recordedChunks = [], recordedVideoUrl = null, videoStream = null;

    const challenges = [
        { id: 1, name: 'Land an Ollie', xp: 50 },
        { id: 2, name: 'Kickflip Challenge', xp: 100 },
        { id: 3, name: '50-50 Grind', xp: 150 },
    ];

    const content = document.getElementById('content');
    const discoverBtn = document.getElementById('discoverBtn'), addSpotBtn = document.getElementById('addSpotBtn'), challengesBtn = document.getElementById('challengesBtn'), profileBtn = document.getElementById('profileBtn'), centerMapBtn = document.getElementById('centerMapBtn'), legalBtn = document.getElementById('legalBtn');
    const modal = document.getElementById('customModal'), modalText = document.getElementById('modalText'), closeButton = document.querySelector('.close-button');
    const cameraModal = document.getElementById('cameraModal'), cameraPreview = document.getElementById('cameraPreview'), recordBtn = document.getElementById('recordBtn'), stopRecordBtn = document.getElementById('stopRecordBtn'), saveVideoBtn = document.getElementById('saveVideoBtn'), cancelCameraBtn = document.getElementById('cancelCameraBtn');
    const legalModal = document.getElementById('legalModal'), legalText = document.getElementById('legalText');

    document.querySelectorAll('.close-button').forEach(btn => btn.onclick = () => {
        btn.closest('.modal').style.display = 'none';
    });
    window.onclick = (event) => { if (event.target.classList.contains('modal')) event.target.style.display = "none"; };
    function showModal(message) { 
        if (modalText) modalText.textContent = message; 
        if (modal) modal.style.display = "block"; 
    }
    function setActiveButton(activeBtn) {
        // Clear active state from all nav buttons
        [discoverBtn, addSpotBtn, challengesBtn, profileBtn, legalBtn].forEach(btn => {
            if (btn && btn.classList) btn.classList.remove('active');
        });
        // Only add the active class if a valid button element was provided
        if (activeBtn && activeBtn.classList) activeBtn.classList.add('active');
    }

    onAuthStateChanged(auth, user => {
        if (user) {
            currentUserId = user.uid;
            setupRealtimeListeners();
            startGpsTracking();
            document.querySelectorAll('nav button').forEach(b => b.disabled = false);
            discoverBtn.click();
        } else {
            currentUserId = null;
            document.querySelectorAll('nav button').forEach(b => b.disabled = true);
        }
    });

    async function signIn() {
        try {
            await signInAnonymously(auth);
        } catch (error) { console.error("Error signing in:", error); showModal("Could not connect. Please refresh."); }
    }

    if (legalBtn) {
        legalBtn.onclick = () => {
            setActiveButton(legalBtn);
            if (legalText) {
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
            }
            if (legalModal) {
                legalModal.style.display = 'block';
            }
        };
    }

    signIn();

    function setupRealtimeListeners() {
        if (!currentUserId) return;
        const spotsPath = `/artifacts/${appId}/public/data/skate_spots`;
        onSnapshot(collection(db, spotsPath), s => { skateSpots = []; s.forEach(d => skateSpots.push({ id: d.id, ...d.data() })); renderMarkers(); }, e => console.error(e));
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
                let popupContent = `<strong>${spot.name}</strong><br/>Difficulty: ${spot.difficulty}<br/>Tricks: ${spot.tricks ? spot.tricks.join(', ') : 'None'}`;
                if (spot.videoUrl) {
                    popupContent += `<br/><video src="${spot.videoUrl}" controls></video>`;
                }
                marker.bindPopup(popupContent);
                markers.push(marker);
            }
        });
    }

    if (discoverBtn) {
        discoverBtn.onclick = () => { setActiveButton(discoverBtn); if (content) content.innerHTML = '<p>Use the map to discover skate spots. Tap markers for details.</p>'; };
    }

    if (addSpotBtn) {
        addSpotBtn.onclick = () => {
            // Toggle map-click-to-add mode. When enabled, user clicks map to place a spot.
            if (mapClickToAdd) {
                mapClickToAdd = false;
                setActiveButton(null);
                if (content) content.innerHTML = '<p>Map click-to-add canceled.</p>';
                return;
            }
            mapClickToAdd = true;
            setActiveButton(addSpotBtn);
            if (content) content.innerHTML = '<p>Click anywhere on the map to add a new spot. Click the "Add Spot" button again to cancel.</p>';
        };
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

        document.getElementById('recordVideoBtn').onclick = () => openCamera();
        document.getElementById('cancelAddSpotBtn').onclick = () => { mapClickToAdd = false; content.innerHTML = ''; setActiveButton(discoverBtn); };
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
                // If a spot image was selected, upload it first and attach URL
                if (selectedSpotImageFile) {
                    const imgName = `${currentUserId}/${Date.now()}_${selectedSpotImageFile.name}`;
                    const sRef = ref(storage, `skate_spots_images/${imgName}`);
                    const snap = await uploadBytes(sRef, selectedSpotImageFile);
                    const imgUrl = await getDownloadURL(snap.ref);
                    newSpot.imageUrl = imgUrl;
                }
                await addDoc(collection(db, `/artifacts/${appId}/public/data/skate_spots`), newSpot);
                await updateDoc(doc(db, `/artifacts/${appId}/users/${currentUserId}/profile/data`), { spotsAdded: increment(1), xp: increment(100) });
                showModal('Spot added! You earned 100 XP!');
                mapClickToAdd = false;
                discoverBtn.click();
            } catch (error) {
                console.error("Error adding spot: ", error);
                const msg = (error && error.code) ? `${error.code}: ${error.message || ''}` : (error && error.message) ? error.message : 'Unknown error';
                showModal(`Failed to add spot. ${msg}`);
            }
        };
    }

    async function openCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return showModal("Camera not supported on your browser.");
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
        stopRecordBtn.onclick = () => { 
            if (mediaRecorder) mediaRecorder.stop(); 
            stopRecordBtn.style.display = 'none'; 
        };
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
                const videoStatus = document.getElementById('videoStatus');
                if (videoStatus) videoStatus.innerHTML = `<p>✅ Video attached!</p>`;
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

    if (challengesBtn) {
        challengesBtn.onclick = () => {
            setActiveButton(challengesBtn);
            let html = '<h3>Skate Challenges</h3><ul>';
            challenges.forEach(c => {
                const isDone = userProfile.challengesCompleted && userProfile.challengesCompleted.includes(c.id);
                html += `<li>${c.name} - ${c.xp} XP <button class="complete-challenge-btn" data-challenge-id="${c.id}" ${isDone ? 'disabled' : ''}>${isDone ? 'Completed' : 'Complete'}</button></li>`;
            });
            if (content) content.innerHTML = html + '</ul>';
        };
    }

    if (content) {
        content.addEventListener('click', async e => {
            if (e.target && e.target.classList.contains('complete-challenge-btn')) {
                const cId = parseInt(e.target.dataset.challengeId);
                const c = challenges.find(ch => ch.id === cId);
                if (c && currentUserId && !(userProfile.challengesCompleted && userProfile.challengesCompleted.includes(cId))) {
                    const profileRef = doc(db, `/artifacts/${appId}/users/${currentUserId}/profile/data`);
                    const updatedCs = [...(userProfile.challengesCompleted || []), cId];
                    try { await updateDoc(profileRef, { challengesCompleted: updatedCs, xp: increment(c.xp) }); showModal(`Challenge "${c.name}" done! +${c.xp} XP!`); } 
                    catch (err) { console.error(err); showModal("Failed to complete challenge."); }
                }
            }
        });
    }
    
    // Selected file for profile picture upload
    let selectedProfilePicFile = null;

    function renderProfile() {
        if (!content) return;
        const xpNext = (userProfile.level || 1) * 100;
        const photoHtml = userProfile.photoUrl ? `<img src="${userProfile.photoUrl}" alt="profile" style="width:96px;height:96px;border-radius:8px;display:block;margin:0.5em 0;object-fit:cover;"/>` : '';
        content.innerHTML = `
            <h3>${userProfile.username || 'Skater'}'s Profile</h3>
            ${photoHtml}
            <p><strong>User ID:</strong> ${currentUserId}</p>
            <p>Level: ${userProfile.level || 1}</p>
            <p>XP: ${userProfile.xp || 0} / ${xpNext}</p>
            <progress value="${userProfile.xp || 0}" max="${xpNext}"></progress>
            <p>Spots Added: ${userProfile.spotsAdded || 0}</p>
            <p>Challenges Completed: ${userProfile.challengesCompleted ? userProfile.challengesCompleted.length : 0}</p>
            <p><button id="editProfileBtn">Edit Profile</button></p>
            <h4>Your Spots & Videos</h4>
            <div id="userSpotsList"><p>Loading your spots...</p></div>
        `;

        const editProfileBtn = document.getElementById('editProfileBtn');
        if (editProfileBtn) {
            editProfileBtn.onclick = showEditProfileForm;
        }

        // Show user's spots (from skateSpots cached in memory)
        const userSpots = skateSpots.filter(s => s.addedBy === currentUserId);
        const spotsEl = document.getElementById('userSpotsList');
        if (!userSpots.length) {
            spotsEl.innerHTML = '<p>No spots added yet.</p>';
        } else {
            spotsEl.innerHTML = userSpots.map(sp => `
                <div style="border-bottom:1px solid #eee;padding:0.5em 0;">
                    <strong>${sp.name}</strong><br/>
                    ${sp.difficulty ? `Difficulty: ${sp.difficulty}<br/>` : ''}
                    ${sp.tricks && sp.tricks.length ? `Tricks: ${sp.tricks.join(', ')}<br/>` : ''}
                    ${sp.videoUrl ? `<video src="${sp.videoUrl}" controls style="max-width:100%;height:120px;margin-top:0.5em"></video>` : ''}
                </div>
            `).join('');
        }
    }

    function showEditProfileForm() {
        if (!currentUserId) return showModal('You must be signed in to edit your profile.');
        content.innerHTML = `
            <h3>Edit Profile</h3>
            <form id="editProfileForm">
                <label>Display name:<br/><input type="text" id="profileName" value="${userProfile.username || ''}" required /></label>
                <label>Profile picture:<br/><input type="file" id="profilePicInput" accept="image/*" /></label>
                <div id="profilePicPreview"></div>
                <p>
                    <button type="submit">Save</button>
                    <button type="button" id="cancelEditProfile">Cancel</button>
                </p>
            </form>
        `;

        const picInput = document.getElementById('profilePicInput');
        const preview = document.getElementById('profilePicPreview');
        selectedProfilePicFile = null;
        picInput.onchange = (e) => {
            const f = e.target.files && e.target.files[0];
            if (!f) { selectedProfilePicFile = null; preview.innerHTML = ''; return; }
            selectedProfilePicFile = f;
            const url = URL.createObjectURL(f);
            preview.innerHTML = `<img src="${url}" style="max-width:120px;border-radius:8px;margin-top:0.5em;"/>`;
        };

        const cancelEditBtn = document.getElementById('cancelEditProfile');
        if (cancelEditBtn) {
            cancelEditBtn.onclick = () => { renderProfile(); };
        }

        const editProfileForm = document.getElementById('editProfileForm');
        if (editProfileForm) {
            editProfileForm.onsubmit = async (e) => {
                e.preventDefault();
                const newName = document.getElementById('profileName').value.trim();
                const profilePath = `/artifacts/${appId}/users/${currentUserId}/profile/data`;
                try {
                    let photoUrl = userProfile.photoUrl || null;
                    if (selectedProfilePicFile) {
                        const fname = `profile_pics/${currentUserId}_${Date.now()}_${selectedProfilePicFile.name}`;
                        const sRef = ref(storage, fname);
                        const snapshot = await uploadBytes(sRef, selectedProfilePicFile);
                        photoUrl = await getDownloadURL(snapshot.ref);
                    }
                    await updateDoc(doc(db, profilePath), { username: newName, photoUrl });
                    showModal('Profile updated');
                    // refresh UI will happen from onSnapshot listener
                } catch (err) {
                    console.error('Failed to update profile', err);
                    showModal(`Failed to update profile: ${err && err.message ? err.message : err}`);
                }
            };
        }
    }

    if (profileBtn) {
        profileBtn.onclick = () => { setActiveButton(profileBtn); renderProfile(); };
    }
}

// Start the main application logic ONLY after the page is fully loaded
document.addEventListener('DOMContentLoaded', main);

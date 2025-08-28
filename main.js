// main.js
import './Untitled-2.js';
document.addEventListener('DOMContentLoaded', function() {
    const spotSelect = document.getElementById('spot-select');
    const trickSelect = document.getElementById('trick-select');
    const challengerInput = document.getElementById('challenger-input');
    const issueChallengeButton = document.getElementById('issue-challenge');
    
    // Populate the dropdown boxes with suitable spots to upload
    // Small API helper. Use relative endpoints like '/spots' or pass a full URL.
    async function apiFetch(endpoint, options) {
        const base = 'https://api.skatequest.app/v1';
        const url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        // Attach Firebase auth token when available
        const headers = (options && options.headers) ? { ...options.headers } : {};
        try {
            if (window.firebaseInstances && window.firebaseInstances.auth && window.firebaseInstances.auth.currentUser && window.firebaseInstances.auth.currentUser.getIdToken) {
                const token = await window.firebaseInstances.auth.currentUser.getIdToken(/* forceRefresh */ false);
                if (token) headers['Authorization'] = 'Bearer ' + token;
            }
        } catch (e) {
            // ignore token errors, continue without auth header
            console.debug('apiFetch: could not get id token', e && e.message);
        }
        const res = await fetch(url, { ...(options || {}), headers });
        if (!res.ok) throw new Error(`API request failed: ${res.status} ${res.statusText}`);
        return res.json();
    }

    // Helper to populate a <select> with items from an API
    async function populateSelect(endpointOrUrl, selectEl, textKey = 'name') {
        if (!selectEl) return;
        // show loading state
        selectEl.disabled = true;
        selectEl.innerHTML = '';
        const loadingOption = document.createElement('option');
        loadingOption.textContent = 'Loading...';
        loadingOption.disabled = true;
        loadingOption.selected = true;
        selectEl.appendChild(loadingOption);
        try {
            const data = await apiFetch(endpointOrUrl);
            // clear and optionally restore placeholder
            const placeholder = selectEl.querySelector('option[disabled][data-placeholder]');
            selectEl.innerHTML = '';
            if (placeholder) selectEl.appendChild(placeholder);
            if (!Array.isArray(data) || !data.length) {
                const empty = document.createElement('option');
                empty.textContent = 'No items found';
                empty.disabled = true;
                selectEl.appendChild(empty);
                return;
            }
            data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = item[textKey] || item.name || item.id;
                selectEl.appendChild(option);
            });
        } catch (err) {
            console.error(`Error fetching ${endpointOrUrl}:`, err);
            // show error option
            selectEl.innerHTML = '';
            const errOpt = document.createElement('option');
            errOpt.textContent = 'Failed to load';
            errOpt.disabled = true;
            selectEl.appendChild(errOpt);
            showToast('Failed to load data from server', 'error');
        } finally {
            selectEl.disabled = false;
        }
    }

    // Tiny toast helper for transient messages
    function showToast(message, type = 'info', ttl = 3500) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.position = 'fixed';
            container.style.right = '1rem';
            container.style.bottom = '1rem';
            container.style.zIndex = 10000;
            document.body.appendChild(container);
        }
        const t = document.createElement('div');
        t.textContent = message;
        t.style.marginTop = '0.5rem';
        t.style.padding = '0.6rem 0.9rem';
        t.style.borderRadius = '6px';
        t.style.background = (type === 'error') ? '#c44' : '#333';
        t.style.color = '#fff';
        t.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
        container.appendChild(t);
        setTimeout(() => t.remove(), ttl);
    }

    // Populate both selects in parallel using short endpoints
    populateSelect('/spots', spotSelect, 'name');
    populateSelect('/tricks', trickSelect, 'name');

    // Render leaderboard on load
    renderLeaderboard();

    // ...existing code can hook up challenge issuance, form handling, etc.
    // Issue challenge button handler: create a challenge in Firestore if possible, otherwise POST to API
    if (issueChallengeButton) {
        issueChallengeButton.addEventListener('click', async () => {
            const spotId = spotSelect && spotSelect.value;
            const trickId = trickSelect && trickSelect.value;
            const titleInput = document.getElementById('challenge-title');
            const descInput = document.getElementById('challenge-desc');
            const xpInput = document.getElementById('challenge-xp');
            let challenger = challengerInput && challengerInput.value && challengerInput.value.trim();
            // default challenger to signed-in Firebase user ID if not provided
            try {
                if ((!challenger || challenger.length === 0) && window.firebaseInstances && window.firebaseInstances.auth && window.firebaseInstances.auth.currentUser) {
                    challenger = window.firebaseInstances.auth.currentUser.uid;
                }
            } catch (e) { /* ignore */ }
            if (!spotId || !trickId || !challenger) {
                alert('Please select a spot, select a trick, and enter a challenger ID.');
                return;
            }
            issueChallengeButton.disabled = true;
            try {
                // Prefer Firestore if firebaseInstances are ready
                if (window.firebaseInstances && window.firebaseInstances.addDoc && window.firebaseInstances.collection) {
                    const { db, addDoc, collection, serverTimestamp } = window.firebaseInstances;
                    // Build payload with optional title/description/xp
                    const payload = {
                        spotId,
                        trick: trickId,
                        challengerId: challenger,
                        status: 'pending',
                        title: (titleInput && titleInput.value && titleInput.value.trim()) || `Challenge: ${trickId} at ${spotId}`,
                        description: (descInput && descInput.value && descInput.value.trim()) || '',
                        xp: (xpInput && parseInt(xpInput.value, 10)) || 50,
                        createdBy: challenger,
                        timestamp: Date.now(),
                        createdAt: serverTimestamp()
                    };
                    const docRef = await addDoc(collection(db, 'challenges'), payload);
                    showToast('Challenge created', 'info');
                    // Refresh leaderboard after XP-impacting events
                    renderLeaderboard();
                } else {
                    // Fallback to POSTing to API
                    const apiPayload = {
                        spotId,
                        trick: trickId,
                        challengerId: challenger,
                        title: (titleInput && titleInput.value && titleInput.value.trim()) || `Challenge: ${trickId} at ${spotId}`,
                        description: (descInput && descInput.value && descInput.value.trim()) || '',
                        xp: (xpInput && parseInt(xpInput.value, 10)) || 50,
                        createdBy: challenger,
                        timestamp: Date.now()
                    };
                    await apiFetch('/challenges', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(apiPayload)
                    });
                    showToast('Challenge created via API', 'info');
                    renderLeaderboard();
                }
            } catch (err) {
                console.error('Failed to create challenge', err);
                showToast('Failed to create challenge: ' + (err && err.message ? err.message : 'unknown error'), 'error');
            } finally {
                issueChallengeButton.disabled = false;
            }
        });
    }

    // Rating submit wiring: default to selected spot if available
    const ratingBtn = document.getElementById('rating-submit');
    if (ratingBtn) {
        ratingBtn.addEventListener('click', async () => {
            const rating = parseInt(document.getElementById('rating-select').value, 10);
            // prefer currently selected spot
            const selectedSpotId = (spotSelect && spotSelect.value) ? spotSelect.value : 'spotId123';
            await rateSpot(selectedSpotId, rating);
        });
    }

    // Complete a challenge: award XP to a user
    async function completeChallenge(challengeId, userId) {
        try {
            if (!window.firebaseInstances) throw new Error('Firebase not initialized');
            const { db, doc, getDoc, updateDoc } = window.firebaseInstances;
            const challengeRef = doc(db, 'challenges', challengeId);
            const challengeSnap = await getDoc(challengeRef);
            if (!challengeSnap.exists()) throw new Error('Challenge not found');
            const xpEarned = (challengeSnap.data() && challengeSnap.data().xp) || 0;
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, { xp: window.firebaseInstances.increment ? window.firebaseInstances.increment(xpEarned) : xpEarned });
            showToast(`Challenge complete! You earned ${xpEarned} XP 🛹`, 'info');
        } catch (err) {
            console.error('completeChallenge error', err);
            showToast('Failed to complete challenge', 'error');
        }
    }

    // Spot filter UI wiring
    const spotFilter = document.getElementById('spotFilter');
    if (spotFilter) {
        spotFilter.addEventListener('change', (e) => {
            const type = e.target.value;
            renderSpots(type);
        });
    }

    async function renderSpots(filterType = 'all') {
        try {
            if (!window.firebaseInstances) return;
            const { db, collection, getDocs } = window.firebaseInstances;
            const snaps = await getDocs(collection(db, 'spots'));
            // remove existing markers (assume `map` is global)
            if (window.map && map.eachLayer) {
                map.eachLayer(layer => { if (layer instanceof L.Marker) map.removeLayer(layer); });
            }
            snaps.forEach(d => {
                const spot = d.data();
                if (filterType === 'all' || spot.type === filterType) {
                    L.marker([spot.lat, spot.lng]).addTo(map).bindPopup(spot.name);
                }
            });
        } catch (err) {
            console.error('renderSpots error', err);
        }
    }

    // Leaderboard rendering
    async function renderLeaderboard() {
        try {
            if (!window.firebaseInstances) return;
            const { db, collection, getDocs, query, orderBy, limit } = window.firebaseInstances;
            const leaderboardEl = document.getElementById('leaderboard');
            if (!leaderboardEl) return;
            leaderboardEl.innerHTML = '<h2>Top Skaters</h2>';
            const q = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(10));
            const snaps = await getDocs(q);
            snaps.forEach(docSnap => {
                const user = docSnap.data();
                const entry = document.createElement('div');
                entry.textContent = `${user.displayName || docSnap.id}: ${user.xp || 0} XP`;
                leaderboardEl.appendChild(entry);
            });
        } catch (err) {
            console.error('renderLeaderboard error', err);
        }
    }

    // Rate a spot
    async function rateSpot(spotId, newRating) {
        try {
            if (!window.firebaseInstances) throw new Error('Firebase not initialized');
            const { db, doc, getDoc, updateDoc } = window.firebaseInstances;
            const spotRef = doc(db, 'spots', spotId);
            const spotSnap = await getDoc(spotRef);
            if (!spotSnap.exists()) throw new Error('Spot not found');
            const spot = spotSnap.data();
            const total = (spot.rating || 0) * (spot.ratingCount || 0);
            const updatedCount = (spot.ratingCount || 0) + 1;
            const updatedRating = (total + newRating) / updatedCount;
            await updateDoc(spotRef, { rating: updatedRating, ratingCount: updatedCount });
            showToast(`Thanks for rating! This spot now has ${updatedRating.toFixed(1)} stars`, 'info');
        } catch (err) {
            console.error('rateSpot error', err);
            showToast('Failed to rate spot', 'error');
        }
    }

    // Streak update utility after challenge completion
    async function updateStreak(userId) {
        try {
            if (!window.firebaseInstances) return;
            const { db, doc, getDoc, updateDoc } = window.firebaseInstances;
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);
            const user = userSnap.exists() ? userSnap.data() : {};
            const last = user.lastCompleted || 0;
            const now = Date.now();
            const oneDay = 86400000;
            if (!last || (now - last) > oneDay) {
                await updateDoc(userRef, { streak: 1, lastCompleted: now });
            } else if ((now - last) <= oneDay) {
                await updateDoc(userRef, { streak: (user.streak || 0) + 1, lastCompleted: now });
            }
        } catch (err) {
            console.error('updateStreak error', err);
        }
    }
});
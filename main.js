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

    // ...existing code can hook up challenge issuance, form handling, etc.
    // Issue challenge button handler: create a challenge in Firestore if possible, otherwise POST to API
    if (issueChallengeButton) {
        issueChallengeButton.addEventListener('click', async () => {
            const spotId = spotSelect && spotSelect.value;
            const trickId = trickSelect && trickSelect.value;
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
                    const payload = {
                        spotId,
                        trick: trickId,
                        challengerId: challenger,
                        status: 'pending',
                        createdAt: serverTimestamp()
                    };
                    const docRef = await addDoc(collection(db, 'challenges'), payload);
                    showToast('Challenge created', 'info');
                } else {
                    // Fallback to POSTing to API
                    await apiFetch('/challenges', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ spotId, trickId, challenger })
                    });
                    showToast('Challenge created via API', 'info');
                }
            } catch (err) {
                console.error('Failed to create challenge', err);
                showToast('Failed to create challenge: ' + (err && err.message ? err.message : 'unknown error'), 'error');
            } finally {
                issueChallengeButton.disabled = false;
            }
        });
    }
});
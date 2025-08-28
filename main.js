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
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`API request failed: ${res.status} ${res.statusText}`);
        return res.json();
    }

    // Helper to populate a <select> with items from an API
    async function populateSelect(endpointOrUrl, selectEl, textKey = 'name') {
        if (!selectEl) return;
        try {
            const data = await apiFetch(endpointOrUrl);
            // clear existing (but keep a placeholder at index 0 if present)
            const placeholder = selectEl.querySelector('option[disabled]');
            selectEl.innerHTML = '';
            if (placeholder) selectEl.appendChild(placeholder);
            data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = item[textKey] || item.name || item.id;
                selectEl.appendChild(option);
            });
        } catch (err) {
            console.error(`Error fetching ${url}:`, err);
        }
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
            const challenger = challengerInput && challengerInput.value && challengerInput.value.trim();
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
                    alert('Challenge created (id: ' + (docRef && docRef.id ? docRef.id : 'unknown') + ')');
                } else {
                    // Fallback to POSTing to API
                    await apiFetch('/challenges', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ spotId, trickId, challenger })
                    });
                    alert('Challenge created via API');
                }
            } catch (err) {
                console.error('Failed to create challenge', err);
                alert('Failed to create challenge: ' + (err && err.message ? err.message : 'unknown error'));
            } finally {
                issueChallengeButton.disabled = false;
            }
        });
    }
});
/**
 * SkateQuest - Skate Lounge UI Components
 * Chat interface, session planner, and live stream viewer
 * Copyright (c) 2024 SkateQuest. All Rights Reserved.
 */

export function renderSkateLounge(container) {
    const html = `
        <div class="skate-lounge">
            <div class="lounge-header">
                <h2>💬 The Skate Lounge</h2>
                <p>Real-time community hangout space</p>
            </div>

            <div class="lounge-tabs">
                <button class="lounge-tab active" data-tab="chat">Chat</button>
                <button class="lounge-tab" data-tab="sessions">Sessions</button>
                <button class="lounge-tab" data-tab="streams">Live Streams</button>
                <button class="lounge-tab" data-tab="projects">Projects</button>
            </div>

            <div class="lounge-content">
                <div id="chat-tab" class="lounge-tab-content active"></div>
                <div id="sessions-tab" class="lounge-tab-content"></div>
                <div id="streams-tab" class="lounge-tab-content"></div>
                <div id="projects-tab" class="lounge-tab-content"></div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Set up tab switching
    document.querySelectorAll('.lounge-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchLoungeTab(tabName);
        });
    });

    // Load initial content
    renderChatTab();
}

function switchLoungeTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.lounge-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.lounge-tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const activeContent = document.getElementById(`${tabName}-tab`);
    if (activeContent) {
        activeContent.classList.add('active');
    }

    // Load content for active tab
    switch (tabName) {
        case 'chat':
            renderChatTab();
            break;
        case 'sessions':
            renderSessionsTab();
            break;
        case 'streams':
            renderStreamsTab();
            break;
        case 'projects':
            renderProjectsTab();
            break;
    }
}

// ====== CHAT TAB ======

function renderChatTab() {
    const container = document.getElementById('chat-tab');
    if (!container || !window.loungeManager) return;

    const rooms = window.loungeManager.getAvailableRooms();
    const currentRoom = window.loungeManager.currentRoom;

    let html = `
        <div class="chat-container">
            <div class="chat-rooms">
                ${rooms.map(room => `
                    <button class="room-btn ${room.id === currentRoom ? 'active' : ''}"
                            onclick="window.switchChatRoom('${room.id}')">
                        <span class="room-icon">${room.icon}</span>
                        <span class="room-name">${room.name}</span>
                    </button>
                `).join('')}
            </div>

            <div class="chat-messages" id="chat-messages">
                ${renderMessages()}
            </div>

            <div class="chat-input-container">
                <input type="text" id="chat-input" placeholder="Type a message..." />
                <button onclick="window.sendChatMessage()">Send</button>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Auto-scroll to bottom
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Set up enter key to send
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                window.sendChatMessage();
            }
        });
    }
}

function renderMessages() {
    if (!window.loungeManager) return '<p>Loading messages...</p>';

    const messages = window.loungeManager.messages;

    if (messages.length === 0) {
        return '<p class="no-messages">No messages yet. Start the conversation!</p>';
    }

    return messages.map(msg => {
        const userColor = window.loungeManager.getUserColor(msg.user_id);
        const time = window.loungeManager.formatTime(msg.created_at);

        return `
            <div class="chat-message">
                <div class="message-header">
                    <span class="message-user" style="color: ${userColor}">
                        User ${msg.user_id.substring(0, 6)}
                    </span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-content">${msg.message}</div>
            </div>
        `;
    }).join('');
}

// ====== SESSIONS TAB ======

function renderSessionsTab() {
    const container = document.getElementById('sessions-tab');
    if (!container || !window.loungeManager) return;

    const sessions = window.loungeManager.sessions;

    let html = `
        <div class="sessions-container">
            <div class="sessions-header">
                <h3>Upcoming Skate Sessions</h3>
                <button class="action-button" onclick="window.showCreateSessionModal()">
                    Create Session
                </button>
            </div>

            <div class="sessions-list">
                ${sessions.length === 0 ? '<p>No upcoming sessions. Create one!</p>' : ''}
                ${sessions.map(session => renderSessionCard(session)).join('')}
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function renderSessionCard(session) {
    const date = new Date(session.scheduled_time);
    const isCreator = session.creator_id === window.currentUserId;
    const hasJoined = session.participants.includes(window.currentUserId);
    const isFull = session.participants.length >= session.max_participants;

    return `
        <div class="session-card">
            <div class="session-title">${session.title}</div>
            <div class="session-description">${session.description}</div>
            <div class="session-details">
                <div class="session-time">🕒 ${date.toLocaleString()}</div>
                <div class="session-participants">
                    👥 ${session.participants.length} / ${session.max_participants}
                </div>
            </div>
            <div class="session-actions">
                ${hasJoined ? `
                    <button class="leave-session-btn" onclick="window.leaveSkateSession('${session.id}')">
                        Leave Session
                    </button>
                ` : `
                    <button class="join-session-btn"
                            onclick="window.joinSkateSession('${session.id}')"
                            ${isFull ? 'disabled' : ''}>
                        ${isFull ? 'Full' : 'Join Session'}
                    </button>
                `}
            </div>
        </div>
    `;
}

// ====== STREAMS TAB ======

function renderStreamsTab() {
    const container = document.getElementById('streams-tab');
    if (!container || !window.loungeManager) return;

    const streams = window.loungeManager.liveStreams;

    let html = `
        <div class="streams-container">
            <div class="streams-header">
                <h3>🔴 Live Now</h3>
                <button class="action-button" onclick="window.startLiveStream()">
                    Go Live
                </button>
            </div>

            <div class="streams-grid">
                ${streams.length === 0 ? '<p>No live streams right now</p>' : ''}
                ${streams.map(stream => `
                    <div class="stream-card" onclick="window.watchStream('${stream.id}')">
                        <div class="stream-thumbnail">
                            <div class="live-badge">🔴 LIVE</div>
                        </div>
                        <div class="stream-info">
                            <div class="stream-title">${stream.title}</div>
                            <div class="stream-streamer">By User ${stream.streamer_id.substring(0, 6)}</div>
                            <div class="stream-viewers">👁 ${stream.viewer_count} watching</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// ====== PROJECTS TAB ======

function renderProjectsTab() {
    const container = document.getElementById('projects-tab');
    if (!container) return;

    let html = `
        <div class="projects-container">
            <div class="projects-header">
                <h3>Crew Projects</h3>
                <button class="action-button" onclick="window.createCrewProject()">
                    New Project
                </button>
            </div>

            <p>Collaborate with your crew on videos, events, and challenges!</p>

            <div class="project-types">
                <div class="project-type-card" onclick="window.createCrewProject('video')">
                    <div class="project-type-icon">🎥</div>
                    <div class="project-type-name">Video Project</div>
                </div>
                <div class="project-type-card" onclick="window.createCrewProject('event')">
                    <div class="project-type-icon">📅</div>
                    <div class="project-type-name">Event</div>
                </div>
                <div class="project-type-card" onclick="window.createCrewProject('challenge')">
                    <div class="project-type-icon">🏆</div>
                    <div class="project-type-name">Challenge</div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// ====== WINDOW FUNCTIONS ======

window.switchChatRoom = async function(roomId) {
    if (!window.loungeManager) return;
    await window.loungeManager.switchRoom(roomId);
    renderChatTab();
};

window.sendChatMessage = async function() {
    const input = document.getElementById('chat-input');
    if (!input || !window.loungeManager) return;

    const message = input.value.trim();
    if (message) {
        await window.loungeManager.sendMessage(message);
        input.value = '';
        renderChatTab();
    }
};

window.joinSkateSession = async function(sessionId) {
    if (!window.loungeManager) return;
    const success = await window.loungeManager.joinSession(sessionId);
    if (success) {
        renderSessionsTab();
    }
};

window.leaveSkateSession = async function(sessionId) {
    if (!window.loungeManager) return;
    const success = await window.loungeManager.leaveSession(sessionId);
    if (success) {
        renderSessionsTab();
    }
};

window.showCreateSessionModal = function() {
    alert('Session creation modal - Coming soon!');
};

window.startLiveStream = function() {
    alert('Live streaming feature - Coming soon!');
};

window.watchStream = function(streamId) {
    alert(`Watching stream ${streamId} - Coming soon!`);
};

window.createCrewProject = function(type) {
    alert(`Creating ${type || 'new'} project - Coming soon!`);
};

// Export
export default { renderSkateLounge };

if (typeof window !== 'undefined') {
    window.renderSkateLounge = renderSkateLounge;
}

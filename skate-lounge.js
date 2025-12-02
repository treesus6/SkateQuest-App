/**
 * SkateQuest - The Skate Lounge (Community Hub)
 * Real-time chat, session planning, live streams, and crew collaboration
 * Copyright (c) 2024 SkateQuest. All Rights Reserved.
 */

class SkateLoungeManager {
    constructor() {
        this.supabase = window.supabaseClient;
        this.currentUserId = null;
        this.currentRoom = 'global';
        this.messages = [];
        this.sessions = [];
        this.liveStreams = [];
        this.subscription = null;

        this.init();
    }

    async init() {
        console.log('✓ Skate Lounge initializing...');

        // Wait for authentication
        await this.waitForAuth();

        // Load initial data
        await this.loadMessages();
        await this.loadSessions();
        await this.loadLiveStreams();

        // Set up real-time listeners
        this.setupRealtimeListeners();

        console.log('✓ Skate Lounge ready');
    }

    async waitForAuth() {
        return new Promise((resolve) => {
            const checkAuth = setInterval(() => {
                if (window.currentUserId) {
                    this.currentUserId = window.currentUserId;
                    clearInterval(checkAuth);
                    resolve();
                }
            }, 100);

            setTimeout(() => {
                clearInterval(checkAuth);
                resolve();
            }, 10000);
        });
    }

    // ====== REAL-TIME CHAT ======

    async loadMessages(limit = 50) {
        try {
            const { data, error } = await this.supabase
                .from('lounge_messages')
                .select('*')
                .eq('room', this.currentRoom)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            this.messages = (data || []).reverse();
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    async sendMessage(message, type = 'text') {
        if (!this.currentUserId) {
            alert('Please sign in to send messages');
            return;
        }

        try {
            const { data, error } = await this.supabase
                .from('lounge_messages')
                .insert([{
                    room: this.currentRoom,
                    user_id: this.currentUserId,
                    message: message,
                    type: type,
                    created_at: new Date().toISOString()
                }])
                .select();

            if (error) throw error;

            return data[0];
        } catch (error) {
            console.error('Error sending message:', error);
            return null;
        }
    }

    async switchRoom(roomName) {
        this.currentRoom = roomName;
        await this.loadMessages();

        // Update UI if callback is registered
        if (this.onRoomSwitch) {
            this.onRoomSwitch(roomName);
        }
    }

    getAvailableRooms() {
        return [
            { id: 'global', name: 'Global Chat', icon: '🌍' },
            { id: 'street', name: 'Street Skating', icon: '🛹' },
            { id: 'park', name: 'Park Sessions', icon: '🏞️' },
            { id: 'vert', name: 'Vert & Bowl', icon: '🏔️' },
            { id: 'tricks', name: 'Trick Tips', icon: '💡' },
            { id: 'gear', name: 'Gear Talk', icon: '🛠️' },
            { id: 'spots', name: 'Spot Discoveries', icon: '📍' }
        ];
    }

    // ====== SESSION PLANNING ======

    async loadSessions() {
        try {
            const now = new Date().toISOString();

            const { data, error } = await this.supabase
                .from('skate_sessions')
                .select('*')
                .gte('scheduled_time', now)
                .order('scheduled_time', { ascending: true })
                .limit(20);

            if (error) throw error;

            this.sessions = data || [];
        } catch (error) {
            console.error('Error loading sessions:', error);
        }
    }

    async createSession(sessionData) {
        if (!this.currentUserId) {
            alert('Please sign in to create a session');
            return;
        }

        try {
            const { data, error } = await this.supabase
                .from('skate_sessions')
                .insert([{
                    creator_id: this.currentUserId,
                    title: sessionData.title,
                    description: sessionData.description,
                    spot_id: sessionData.spotId,
                    scheduled_time: sessionData.scheduledTime,
                    max_participants: sessionData.maxParticipants || 20,
                    participants: [this.currentUserId],
                    status: 'upcoming',
                    created_at: new Date().toISOString()
                }])
                .select();

            if (error) throw error;

            this.sessions.push(data[0]);
            return data[0];
        } catch (error) {
            console.error('Error creating session:', error);
            return null;
        }
    }

    async joinSession(sessionId) {
        if (!this.currentUserId) {
            alert('Please sign in to join a session');
            return;
        }

        try {
            // Get current session
            const { data: session, error: fetchError } = await this.supabase
                .from('skate_sessions')
                .select('*')
                .eq('id', sessionId)
                .single();

            if (fetchError) throw fetchError;

            // Check if already joined
            if (session.participants.includes(this.currentUserId)) {
                alert('You have already joined this session');
                return;
            }

            // Check if session is full
            if (session.participants.length >= session.max_participants) {
                alert('Session is full');
                return;
            }

            // Add user to participants
            const updatedParticipants = [...session.participants, this.currentUserId];

            const { error: updateError } = await this.supabase
                .from('skate_sessions')
                .update({ participants: updatedParticipants })
                .eq('id', sessionId);

            if (updateError) throw updateError;

            // Update local data
            const sessionIndex = this.sessions.findIndex(s => s.id === sessionId);
            if (sessionIndex !== -1) {
                this.sessions[sessionIndex].participants = updatedParticipants;
            }

            return true;
        } catch (error) {
            console.error('Error joining session:', error);
            return false;
        }
    }

    async leaveSession(sessionId) {
        if (!this.currentUserId) return;

        try {
            const { data: session, error: fetchError } = await this.supabase
                .from('skate_sessions')
                .select('*')
                .eq('id', sessionId)
                .single();

            if (fetchError) throw fetchError;

            const updatedParticipants = session.participants.filter(id => id !== this.currentUserId);

            const { error: updateError } = await this.supabase
                .from('skate_sessions')
                .update({ participants: updatedParticipants })
                .eq('id', sessionId);

            if (updateError) throw updateError;

            // Update local data
            const sessionIndex = this.sessions.findIndex(s => s.id === sessionId);
            if (sessionIndex !== -1) {
                this.sessions[sessionIndex].participants = updatedParticipants;
            }

            return true;
        } catch (error) {
            console.error('Error leaving session:', error);
            return false;
        }
    }

    // ====== LIVE STREAMS ======

    async loadLiveStreams() {
        try {
            const { data, error } = await this.supabase
                .from('live_streams')
                .select('*')
                .eq('status', 'live')
                .order('viewer_count', { ascending: false })
                .limit(10);

            if (error) throw error;

            this.liveStreams = data || [];
        } catch (error) {
            console.error('Error loading live streams:', error);
        }
    }

    async startLiveStream(streamData) {
        if (!this.currentUserId) {
            alert('Please sign in to start a live stream');
            return;
        }

        try {
            const { data, error } = await this.supabase
                .from('live_streams')
                .insert([{
                    streamer_id: this.currentUserId,
                    title: streamData.title,
                    description: streamData.description,
                    spot_id: streamData.spotId,
                    status: 'live',
                    viewer_count: 0,
                    started_at: new Date().toISOString()
                }])
                .select();

            if (error) throw error;

            return data[0];
        } catch (error) {
            console.error('Error starting stream:', error);
            return null;
        }
    }

    async endLiveStream(streamId) {
        try {
            const { error } = await this.supabase
                .from('live_streams')
                .update({
                    status: 'ended',
                    ended_at: new Date().toISOString()
                })
                .eq('id', streamId);

            if (error) throw error;

            return true;
        } catch (error) {
            console.error('Error ending stream:', error);
            return false;
        }
    }

    // ====== CREW COLLABORATION ======

    async createCrewProject(projectData) {
        if (!this.currentUserId) {
            alert('Please sign in to create a project');
            return;
        }

        try {
            const { data, error } = await this.supabase
                .from('crew_projects')
                .insert([{
                    crew_id: projectData.crewId,
                    creator_id: this.currentUserId,
                    title: projectData.title,
                    description: projectData.description,
                    type: projectData.type, // 'video', 'event', 'challenge'
                    status: 'planning',
                    members: [this.currentUserId],
                    created_at: new Date().toISOString()
                }])
                .select();

            if (error) throw error;

            return data[0];
        } catch (error) {
            console.error('Error creating project:', error);
            return null;
        }
    }

    async updateProjectStatus(projectId, status) {
        try {
            const { error } = await this.supabase
                .from('crew_projects')
                .update({ status: status })
                .eq('id', projectId);

            if (error) throw error;

            return true;
        } catch (error) {
            console.error('Error updating project:', error);
            return false;
        }
    }

    // ====== REAL-TIME LISTENERS ======

    setupRealtimeListeners() {
        // Subscribe to messages in current room
        this.subscription = this.supabase
            .channel(`lounge:${this.currentRoom}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'lounge_messages', filter: `room=eq.${this.currentRoom}` },
                (payload) => {
                    this.messages.push(payload.new);
                    if (this.onMessageReceived) {
                        this.onMessageReceived(payload.new);
                    }
                }
            )
            .subscribe();

        // Subscribe to session updates
        this.supabase
            .channel('sessions')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'skate_sessions' },
                (payload) => {
                    this.loadSessions();
                }
            )
            .subscribe();

        // Subscribe to live stream updates
        this.supabase
            .channel('streams')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'live_streams' },
                (payload) => {
                    this.loadLiveStreams();
                }
            )
            .subscribe();
    }

    // ====== EVENT CALLBACKS ======

    onMessageReceived(callback) {
        this.onMessageReceived = callback;
    }

    onRoomSwitch(callback) {
        this.onRoomSwitch = callback;
    }

    // ====== UTILITY FUNCTIONS ======

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        // Less than 1 minute
        if (diff < 60000) return 'Just now';

        // Less than 1 hour
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes}m ago`;
        }

        // Less than 24 hours
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours}h ago`;
        }

        // More than 24 hours
        return date.toLocaleDateString();
    }

    getUserColor(userId) {
        // Generate consistent color for user
        const colors = [
            '#FF5722', '#E91E63', '#9C27B0', '#673AB7',
            '#3F51B5', '#2196F3', '#00BCD4', '#009688',
            '#4CAF50', '#8BC34A', '#FFEB3B', '#FF9800'
        ];

        const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    }
}

// Initialize Skate Lounge
let loungeManager;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSkateLounge);
} else {
    initSkateLounge();
}

function initSkateLounge() {
    try {
        loungeManager = new SkateLoungeManager();
        window.loungeManager = loungeManager;
        console.log('✓ Skate Lounge ready');
    } catch (error) {
        console.error('Failed to initialize Skate Lounge:', error);
    }
}

export { SkateLoungeManager };
export default loungeManager;

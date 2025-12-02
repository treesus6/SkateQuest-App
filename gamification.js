/**
 * SkateQuest - Enhanced Gamification System
 * Visual trick trees, battle passes, daily challenges, and charity rewards
 * Copyright (c) 2024 SkateQuest. All Rights Reserved.
 */

class GamificationManager {
    constructor() {
        this.supabase = window.supabaseClient;
        this.currentUserId = null;
        this.userProgress = {};
        this.currentSeason = this.getCurrentSeason();
        this.dailyChallenge = null;
        this.weeklyChallenge = null;

        this.init();
    }

    async init() {
        console.log('✓ Gamification Manager initializing...');

        // Wait for user authentication
        await this.waitForAuth();

        // Load user progress
        await this.loadUserProgress();

        // Generate daily/weekly challenges
        await this.generateChallenges();

        // Initialize trick tree
        this.initializeTrickTree();

        // Initialize battle pass
        this.initializeBattlePass();

        console.log('✓ Gamification Manager ready');
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

            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkAuth);
                resolve();
            }, 10000);
        });
    }

    getCurrentSeason() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        // Seasons: Winter (12-2), Spring (3-5), Summer (6-8), Fall (9-11)
        if (month >= 2 && month <= 4) return `Spring ${year}`;
        if (month >= 5 && month <= 7) return `Summer ${year}`;
        if (month >= 8 && month <= 10) return `Fall ${year}`;
        return `Winter ${year}`;
    }

    async loadUserProgress() {
        if (!this.currentUserId) return;

        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('uid', this.currentUserId)
                .single();

            if (error) throw error;

            this.userProgress = {
                unlockedTricks: data.unlocked_tricks || [],
                completedChallenges: data.completed_challenges || [],
                battlePassLevel: data.battle_pass_level || 0,
                battlePassXP: data.battle_pass_xp || 0,
                totalXP: data.xp || 0,
                badges: data.badges || [],
                charityPoints: data.charity_points || 0
            };
        } catch (error) {
            console.error('Error loading user progress:', error);
        }
    }

    async saveUserProgress() {
        if (!this.currentUserId) return;

        try {
            const { error } = await this.supabase
                .from('profiles')
                .update({
                    unlocked_tricks: this.userProgress.unlockedTricks,
                    completed_challenges: this.userProgress.completedChallenges,
                    battle_pass_level: this.userProgress.battlePassLevel,
                    battle_pass_xp: this.userProgress.battlePassXP,
                    charity_points: this.userProgress.charityPoints
                })
                .eq('uid', this.currentUserId);

            if (error) throw error;
        } catch (error) {
            console.error('Error saving user progress:', error);
        }
    }

    // ====== TRICK TREE SYSTEM ======

    initializeTrickTree() {
        // Define trick dependencies (what tricks unlock what)
        this.trickTree = {
            // Beginner unlocks
            'ollie': { requires: [], unlocks: ['kickflip', 'heelflip', 'nollie', '50-50'] },
            'push': { requires: [], unlocks: ['manual', 'kickturn'] },
            'manual': { requires: ['push'], unlocks: ['nose-manual'] },
            'kickturn': { requires: ['push'], unlocks: ['fs180', 'bs180'] },

            // Rotation progression
            'fs180': { requires: ['kickturn'], unlocks: ['fs-180-kickflip', 'fs-360'] },
            'bs180': { requires: ['kickturn'], unlocks: ['bs-180-kickflip', 'bs-360'] },

            // Flip trick progression
            'kickflip': { requires: ['ollie'], unlocks: ['varial-kickflip', 'fs-180-kickflip', 'tre-flip'] },
            'heelflip': { requires: ['ollie'], unlocks: ['varial-heelflip', 'inward-heelflip'] },

            // Grind progression
            '50-50': { requires: ['ollie'], unlocks: ['5-0', 'nosegrind', 'crooked-grind'] },
            '5-0': { requires: ['50-50'], unlocks: ['smith-grind', 'feeble-grind'] },

            // Advanced tricks
            'tre-flip': { requires: ['kickflip', 'pop-shuvit'], unlocks: ['nollie-tre', 'switch-tre', 'fakie-tre'] },
            'hardflip': { requires: ['kickflip'], unlocks: ['laser-flip'] },

            // Expert tricks
            'nollie-tre': { requires: ['tre-flip', 'nollie'], unlocks: [] },
            'switch-tre': { requires: ['tre-flip'], unlocks: [] },
            'double-flip': { requires: ['kickflip'], unlocks: ['triple-flip'] },
            'triple-flip': { requires: ['double-flip'], unlocks: [] }
        };
    }

    isTrickUnlocked(trickId) {
        // Beginner tricks are always unlocked
        const beginnerTricks = window.getTricksByLevel('beginner').map(t => t.id);
        if (beginnerTricks.includes(trickId)) return true;

        // Check if user has unlocked this trick
        return this.userProgress.unlockedTricks.includes(trickId);
    }

    canUnlockTrick(trickId) {
        const requirements = this.trickTree[trickId]?.requires || [];

        // If no requirements, it's unlockable
        if (requirements.length === 0) return true;

        // Check if all requirements are met
        return requirements.every(reqId => this.isTrickUnlocked(reqId));
    }

    async unlockTrick(trickId) {
        if (this.isTrickUnlocked(trickId)) {
            return { success: false, message: 'Trick already unlocked' };
        }

        if (!this.canUnlockTrick(trickId)) {
            return { success: false, message: 'Prerequisites not met' };
        }

        // Unlock the trick
        this.userProgress.unlockedTricks.push(trickId);
        await this.saveUserProgress();

        return { success: true, message: `${trickId} unlocked!` };
    }

    getTrickTreeData() {
        const allTricks = window.getAllTricks();

        return allTricks.map(trick => ({
            ...trick,
            unlocked: this.isTrickUnlocked(trick.id),
            canUnlock: this.canUnlockTrick(trick.id),
            requirements: this.trickTree[trick.id]?.requires || [],
            unlocks: this.trickTree[trick.id]?.unlocks || []
        }));
    }

    // ====== BATTLE PASS SYSTEM ======

    initializeBattlePass() {
        this.battlePassTiers = [
            // Free tier rewards
            { level: 1, xpRequired: 100, reward: { type: 'badge', name: 'Rookie' }, free: true },
            { level: 2, xpRequired: 250, reward: { type: 'trick_unlock', trickId: 'kickflip' }, free: true },
            { level: 3, xpRequired: 500, reward: { type: 'charity_points', amount: 10 }, free: true },
            { level: 4, xpRequired: 800, reward: { type: 'badge', name: 'Street Skater' }, free: false },
            { level: 5, xpRequired: 1200, reward: { type: 'trick_unlock', trickId: 'heelflip' }, free: true },
            { level: 6, xpRequired: 1600, reward: { type: 'charity_points', amount: 25 }, free: false },
            { level: 7, xpRequired: 2100, reward: { type: 'badge', name: 'Park Rider' }, free: true },
            { level: 8, xpRequired: 2700, reward: { type: 'trick_unlock', trickId: 'tre-flip' }, free: false },
            { level: 9, xpRequired: 3400, reward: { type: 'charity_points', amount: 50 }, free: true },
            { level: 10, xpRequired: 4200, reward: { type: 'badge', name: 'Skate Legend' }, free: false },
            { level: 11, xpRequired: 5100, reward: { type: 'trick_unlock', trickId: 'hardflip' }, free: true },
            { level: 12, xpRequired: 6100, reward: { type: 'charity_points', amount: 100 }, free: false },
            { level: 13, xpRequired: 7200, reward: { type: 'badge', name: 'Pro Skater' }, free: true },
            { level: 14, xpRequired: 8400, reward: { type: 'trick_unlock', trickId: 'switch-flip' }, free: false },
            { level: 15, xpRequired: 9700, reward: { type: 'charity_points', amount: 200 }, free: true },
            { level: 16, xpRequired: 11100, reward: { type: 'badge', name: 'Hall of Fame' }, free: false },
            { level: 17, xpRequired: 12600, reward: { type: 'trick_unlock', trickId: 'nollie-tre' }, free: false },
            { level: 18, xpRequired: 14200, reward: { type: 'charity_points', amount: 300 }, free: false },
            { level: 19, xpRequired: 15900, reward: { type: 'badge', name: 'Skateboarding Icon' }, free: true },
            { level: 20, xpRequired: 18000, reward: { type: 'charity_points', amount: 500 }, free: false }
        ];
    }

    addBattlePassXP(amount) {
        this.userProgress.battlePassXP += amount;

        // Check for level ups
        const nextTier = this.battlePassTiers[this.userProgress.battlePassLevel];

        if (nextTier && this.userProgress.battlePassXP >= nextTier.xpRequired) {
            this.levelUpBattlePass();
        }

        this.saveUserProgress();
    }

    async levelUpBattlePass() {
        this.userProgress.battlePassLevel++;
        const tier = this.battlePassTiers[this.userProgress.battlePassLevel - 1];

        if (tier) {
            await this.grantReward(tier.reward);
            this.showNotification(`Battle Pass Level ${this.userProgress.battlePassLevel}!`, tier.reward);
        }
    }

    async grantReward(reward) {
        switch (reward.type) {
            case 'badge':
                if (!this.userProgress.badges.includes(reward.name)) {
                    this.userProgress.badges.push(reward.name);
                }
                break;
            case 'trick_unlock':
                await this.unlockTrick(reward.trickId);
                break;
            case 'charity_points':
                this.userProgress.charityPoints += reward.amount;
                break;
        }

        await this.saveUserProgress();
    }

    getBattlePassProgress() {
        const currentLevel = this.userProgress.battlePassLevel;
        const currentXP = this.userProgress.battlePassXP;
        const nextTier = this.battlePassTiers[currentLevel];
        const previousTier = this.battlePassTiers[currentLevel - 1];

        return {
            level: currentLevel,
            xp: currentXP,
            xpToNextLevel: nextTier ? nextTier.xpRequired - currentXP : 0,
            nextReward: nextTier?.reward,
            progress: nextTier ? (currentXP / nextTier.xpRequired) * 100 : 100,
            season: this.currentSeason
        };
    }

    // ====== DAILY/WEEKLY CHALLENGES ======

    async generateChallenges() {
        const today = new Date().toDateString();
        const lastGenerated = localStorage.getItem('skq_last_challenge_date');

        // Generate new challenges if it's a new day
        if (lastGenerated !== today) {
            this.generateDailyChallenge();

            // Generate weekly challenge on Mondays
            const dayOfWeek = new Date().getDay();
            if (dayOfWeek === 1) {
                this.generateWeeklyChallenge();
            }

            localStorage.setItem('skq_last_challenge_date', today);
        } else {
            // Load existing challenges
            this.dailyChallenge = JSON.parse(localStorage.getItem('skq_daily_challenge'));
            this.weeklyChallenge = JSON.parse(localStorage.getItem('skq_weekly_challenge'));
        }
    }

    generateDailyChallenge() {
        const challengeTypes = [
            { type: 'land_trick', trick: this.getRandomTrick('beginner'), xp: 50 },
            { type: 'visit_spots', count: 3, xp: 75 },
            { type: 'land_tricks', count: 5, xp: 100 },
            { type: 'complete_challenge', count: 1, xp: 80 },
            { type: 'earn_xp', amount: 200, xp: 100 }
        ];

        this.dailyChallenge = challengeTypes[Math.floor(Math.random() * challengeTypes.length)];
        this.dailyChallenge.progress = 0;
        this.dailyChallenge.completed = false;

        localStorage.setItem('skq_daily_challenge', JSON.stringify(this.dailyChallenge));
    }

    generateWeeklyChallenge() {
        const challengeTypes = [
            { type: 'land_trick_combo', tricks: [this.getRandomTrick('intermediate'), this.getRandomTrick('intermediate')], xp: 250 },
            { type: 'visit_spots', count: 15, xp: 300 },
            { type: 'land_tricks', count: 50, xp: 400 },
            { type: 'earn_xp', amount: 1000, xp: 500 },
            { type: 'join_events', count: 3, xp: 350 }
        ];

        this.weeklyChallenge = challengeTypes[Math.floor(Math.random() * challengeTypes.length)];
        this.weeklyChallenge.progress = 0;
        this.weeklyChallenge.completed = false;

        localStorage.setItem('skq_weekly_challenge', JSON.stringify(this.weeklyChallenge));
    }

    getRandomTrick(level) {
        const tricks = window.getTricksByLevel(level);
        return tricks[Math.floor(Math.random() * tricks.length)];
    }

    updateChallengeProgress(challengeType, data) {
        // Update daily challenge
        if (this.dailyChallenge && !this.dailyChallenge.completed) {
            if (this.dailyChallenge.type === challengeType) {
                this.dailyChallenge.progress++;

                const target = this.dailyChallenge.count || this.dailyChallenge.amount || 1;
                if (this.dailyChallenge.progress >= target) {
                    this.completeChallenge('daily');
                }

                localStorage.setItem('skq_daily_challenge', JSON.stringify(this.dailyChallenge));
            }
        }

        // Update weekly challenge
        if (this.weeklyChallenge && !this.weeklyChallenge.completed) {
            if (this.weeklyChallenge.type === challengeType) {
                this.weeklyChallenge.progress++;

                const target = this.weeklyChallenge.count || this.weeklyChallenge.amount || 1;
                if (this.weeklyChallenge.progress >= target) {
                    this.completeChallenge('weekly');
                }

                localStorage.setItem('skq_weekly_challenge', JSON.stringify(this.weeklyChallenge));
            }
        }
    }

    completeChallenge(type) {
        const challenge = type === 'daily' ? this.dailyChallenge : this.weeklyChallenge;

        if (challenge) {
            challenge.completed = true;
            this.addBattlePassXP(challenge.xp);
            this.showNotification(`${type === 'daily' ? 'Daily' : 'Weekly'} Challenge Complete!`, `+${challenge.xp} XP`);

            localStorage.setItem(`skq_${type}_challenge`, JSON.stringify(challenge));
        }
    }

    getChallenges() {
        return {
            daily: this.dailyChallenge,
            weekly: this.weeklyChallenge
        };
    }

    // ====== NOTIFICATIONS ======

    showNotification(title, message) {
        const notification = document.createElement('div');
        notification.className = 'gamification-notification';
        notification.innerHTML = `
            <div class="notification-title">${title}</div>
            <div class="notification-message">${typeof message === 'string' ? message : JSON.stringify(message)}</div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // ====== PUBLIC API ======

    async landTrick(trickId) {
        // Update challenge progress
        this.updateChallengeProgress('land_trick', { trickId });
        this.updateChallengeProgress('land_tricks', { trickId });

        // Add battle pass XP
        const trick = window.getTrickById(trickId);
        if (trick) {
            const xpReward = trick.difficulty * 10;
            this.addBattlePassXP(xpReward);
        }

        // Check for trick unlock
        if (this.canUnlockTrick(trickId)) {
            await this.unlockTrick(trickId);
        }
    }

    visitSpot(spotId) {
        this.updateChallengeProgress('visit_spots', { spotId });
    }

    completeUserChallenge(challengeId) {
        this.updateChallengeProgress('complete_challenge', { challengeId });
    }

    earnXP(amount) {
        this.updateChallengeProgress('earn_xp', { amount });
        this.addBattlePassXP(amount);
    }
}

// Initialize gamification manager
let gamificationManager;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGamification);
} else {
    initGamification();
}

function initGamification() {
    try {
        gamificationManager = new GamificationManager();
        window.gamificationManager = gamificationManager;
        console.log('✓ Gamification system ready');
    } catch (error) {
        console.error('Failed to initialize gamification:', error);
    }
}

export { GamificationManager };
export default gamificationManager;

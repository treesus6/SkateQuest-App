/**
 * SkateQuest - Gamification UI Components
 * Visual trick tree, battle pass display, and challenge cards
 * Copyright (c) 2024 SkateQuest. All Rights Reserved.
 */

export function renderTrickTree(container) {
    if (!window.gamificationManager) {
        container.innerHTML = '<p>Loading trick tree...</p>';
        return;
    }

    const trickData = window.gamificationManager.getTrickTreeData();
    const levels = ['beginner', 'intermediate', 'advanced', 'expert'];

    let html = `
        <div class="trick-tree-container">
            <h2>🎯 Trick Progression Tree</h2>
            <p class="trick-tree-subtitle">Master tricks to unlock advanced maneuvers</p>
    `;

    levels.forEach(level => {
        const tricks = trickData.filter(t => window.getTricksByLevel(level).find(lt => lt.id === t.id));

        html += `
            <div class="trick-level-section">
                <h3 class="trick-level-title">${level.toUpperCase()}</h3>
                <div class="trick-cards-grid">
        `;

        tricks.forEach(trick => {
            const statusClass = trick.unlocked ? 'unlocked' : trick.canUnlock ? 'can-unlock' : 'locked';
            const icon = trick.unlocked ? '✅' : trick.canUnlock ? '🔓' : '🔒';

            html += `
                <div class="trick-card ${statusClass}" data-trick-id="${trick.id}">
                    <div class="trick-card-icon">${icon}</div>
                    <div class="trick-card-name">${trick.name}</div>
                    <div class="trick-card-difficulty">Difficulty: ${trick.difficulty}/10</div>
                    <div class="trick-card-category">${trick.category}</div>
                    ${!trick.unlocked && trick.requirements.length > 0 ? `
                        <div class="trick-card-requirements">
                            Requires: ${trick.requirements.join(', ')}
                        </div>
                    ` : ''}
                    ${trick.canUnlock && !trick.unlocked ? `
                        <button class="unlock-trick-btn" onclick="window.gamificationUI.unlockTrick('${trick.id}')">
                            Unlock
                        </button>
                    ` : ''}
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

export function renderBattlePass(container) {
    if (!window.gamificationManager) {
        container.innerHTML = '<p>Loading battle pass...</p>';
        return;
    }

    const progress = window.gamificationManager.getBattlePassProgress();
    const tiers = window.gamificationManager.battlePassTiers;

    let html = `
        <div class="battle-pass-container">
            <div class="battle-pass-header">
                <h2>🏆 Battle Pass</h2>
                <div class="battle-pass-season">${progress.season}</div>
            </div>

            <div class="battle-pass-progress-bar">
                <div class="battle-pass-level">Level ${progress.level}</div>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: ${progress.progress}%"></div>
                    <div class="progress-bar-text">${progress.xp} / ${progress.xp + progress.xpToNextLevel} XP</div>
                </div>
            </div>

            <div class="battle-pass-tiers">
    `;

    tiers.forEach((tier, index) => {
        const isUnlocked = index < progress.level;
        const isCurrent = index === progress.level;
        const statusClass = isUnlocked ? 'tier-unlocked' : isCurrent ? 'tier-current' : 'tier-locked';
        const tierIcon = tier.free ? '🆓' : '⭐';

        let rewardText = '';
        switch (tier.reward.type) {
            case 'badge':
                rewardText = `Badge: ${tier.reward.name}`;
                break;
            case 'trick_unlock':
                rewardText = `Unlock: ${tier.reward.trickId}`;
                break;
            case 'charity_points':
                rewardText = `${tier.reward.amount} Charity Points`;
                break;
        }

        html += `
            <div class="battle-pass-tier ${statusClass}">
                <div class="tier-level">${tierIcon} Lv ${tier.level}</div>
                <div class="tier-xp">${tier.xpRequired} XP</div>
                <div class="tier-reward">${rewardText}</div>
                ${isUnlocked ? '<div class="tier-checkmark">✓</div>' : ''}
            </div>
        `;
    });

    html += `
            </div>
        </div>
    `;

    container.innerHTML = html;
}

export function renderChallenges(container) {
    if (!window.gamificationManager) {
        container.innerHTML = '<p>Loading challenges...</p>';
        return;
    }

    const challenges = window.gamificationManager.getChallenges();

    let html = `
        <div class="challenges-container">
            <h2>⚡ Daily & Weekly Challenges</h2>
    `;

    // Daily Challenge
    if (challenges.daily) {
        const daily = challenges.daily;
        const target = daily.count || daily.amount || 1;
        const progressPercent = (daily.progress / target) * 100;

        html += `
            <div class="challenge-card daily-challenge ${daily.completed ? 'completed' : ''}">
                <div class="challenge-header">
                    <div class="challenge-type">☀️ DAILY CHALLENGE</div>
                    <div class="challenge-xp">+${daily.xp} XP</div>
                </div>
                <div class="challenge-description">${getChallengeDescription(daily)}</div>
                <div class="challenge-progress">
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${progressPercent}%"></div>
                        <div class="progress-bar-text">${daily.progress} / ${target}</div>
                    </div>
                </div>
                ${daily.completed ? '<div class="challenge-complete-badge">✓ COMPLETED</div>' : ''}
            </div>
        `;
    }

    // Weekly Challenge
    if (challenges.weekly) {
        const weekly = challenges.weekly;
        const target = weekly.count || weekly.amount || 1;
        const progressPercent = (weekly.progress / target) * 100;

        html += `
            <div class="challenge-card weekly-challenge ${weekly.completed ? 'completed' : ''}">
                <div class="challenge-header">
                    <div class="challenge-type">📅 WEEKLY CHALLENGE</div>
                    <div class="challenge-xp">+${weekly.xp} XP</div>
                </div>
                <div class="challenge-description">${getChallengeDescription(weekly)}</div>
                <div class="challenge-progress">
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${progressPercent}%"></div>
                        <div class="progress-bar-text">${weekly.progress} / ${target}</div>
                    </div>
                </div>
                ${weekly.completed ? '<div class="challenge-complete-badge">✓ COMPLETED</div>' : ''}
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
}

function getChallengeDescription(challenge) {
    switch (challenge.type) {
        case 'land_trick':
            return `Land a ${challenge.trick.name}`;
        case 'visit_spots':
            return `Visit ${challenge.count} different skate spots`;
        case 'land_tricks':
            return `Land ${challenge.count} tricks`;
        case 'complete_challenge':
            return `Complete ${challenge.count} challenge${challenge.count > 1 ? 's' : ''}`;
        case 'earn_xp':
            return `Earn ${challenge.amount} XP`;
        case 'land_trick_combo':
            return `Land combo: ${challenge.tricks.map(t => t.name).join(' → ')}`;
        case 'join_events':
            return `Join ${challenge.count} events`;
        default:
            return 'Complete the challenge';
    }
}

export function renderCharityRewards(container) {
    if (!window.gamificationManager) {
        container.innerHTML = '<p>Loading charity rewards...</p>';
        return;
    }

    const charityPoints = window.gamificationManager.userProgress.charityPoints || 0;

    let html = `
        <div class="charity-rewards-container">
            <h2>❤️ Charity Rewards</h2>
            <div class="charity-points-display">
                <div class="charity-points-amount">${charityPoints}</div>
                <div class="charity-points-label">Charity Points</div>
            </div>

            <p class="charity-description">
                Earn Charity Points through the Battle Pass and donate them to skateboarding charities!
            </p>

            <div class="charity-options">
                <div class="charity-option">
                    <div class="charity-name">Skateistan</div>
                    <div class="charity-desc">Empowering youth through skateboarding</div>
                    <button class="donate-btn" onclick="window.gamificationUI.donate('skateistan', 50)" ${charityPoints < 50 ? 'disabled' : ''}>
                        Donate 50 Points
                    </button>
                </div>

                <div class="charity-option">
                    <div class="charity-name">The Skatepark Project</div>
                    <div class="charity-desc">Building skateparks in underserved communities</div>
                    <button class="donate-btn" onclick="window.gamificationUI.donate('skatepark-project', 100)" ${charityPoints < 100 ? 'disabled' : ''}>
                        Donate 100 Points
                    </button>
                </div>

                <div class="charity-option">
                    <div class="charity-name">Harold Hunter Foundation</div>
                    <div class="charity-desc">Supporting NYC youth skateboarding programs</div>
                    <button class="donate-btn" onclick="window.gamificationUI.donate('harold-hunter', 200)" ${charityPoints < 200 ? 'disabled' : ''}>
                        Donate 200 Points
                    </button>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// UI Helper Functions
export const gamificationUI = {
    async unlockTrick(trickId) {
        if (!window.gamificationManager) return;

        const result = await window.gamificationManager.unlockTrick(trickId);

        if (result.success) {
            // Refresh the trick tree display
            const container = document.getElementById('content');
            if (container) {
                renderTrickTree(container);
            }
        } else {
            alert(result.message);
        }
    },

    async donate(charity, amount) {
        if (!window.gamificationManager) return;

        const currentPoints = window.gamificationManager.userProgress.charityPoints;

        if (currentPoints < amount) {
            alert('Not enough Charity Points!');
            return;
        }

        // Deduct points
        window.gamificationManager.userProgress.charityPoints -= amount;
        await window.gamificationManager.saveUserProgress();

        // Show success message
        window.gamificationManager.showNotification(
            'Donation Successful!',
            `${amount} points donated to ${charity}`
        );

        // Refresh display
        const container = document.getElementById('content');
        if (container) {
            renderCharityRewards(container);
        }
    }
};

// Expose to window
if (typeof window !== 'undefined') {
    window.gamificationUI = gamificationUI;
    window.renderTrickTree = renderTrickTree;
    window.renderBattlePass = renderBattlePass;
    window.renderChallenges = renderChallenges;
    window.renderCharityRewards = renderCharityRewards;
}

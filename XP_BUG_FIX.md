# XP Calculation Bug Fix

## Problem

When a user completed a challenge in the SkateQuest app, their XP (experience points) was being **reset** instead of **incremented** in certain scenarios.

### Root Cause

In `main.js`, the `completeChallenge` function had a fallback path for when Firebase's `increment` function was not available. However, this fallback was incorrectly implemented:

```javascript
// BEFORE (buggy code)
tx.update(userRef, { 
    xp: window.firebaseInstances.increment 
        ? window.firebaseInstances.increment(xpEarned) 
        : xpEarned  // ❌ BUG: Sets XP to earned amount instead of adding to existing XP
});
```

### Impact

If a user had 200 XP and completed a challenge worth 50 XP:
- **Expected result**: 200 + 50 = 250 XP
- **Actual result (with bug)**: 50 XP (lost 200 XP!)

This would cause users to lose all their accumulated progress whenever they completed a challenge and the fallback path was used.

## Solution

Updated both the transaction-based and non-transaction code paths to properly add the earned XP to the user's existing XP when the increment function is not available:

```javascript
// AFTER (fixed code)
if (window.firebaseInstances.increment) {
    tx.update(userRef, { xp: window.firebaseInstances.increment(xpEarned) });
} else {
    // Fetch current XP and add to it
    const userSnap = await tx.get(userRef);
    const currentXp = (userSnap.exists() && userSnap.data().xp) || 0;
    tx.update(userRef, { xp: currentXp + xpEarned });  // ✅ Correctly adds to existing XP
}
```

## Changes Made

### File: `main.js`

1. **Lines 330-349** (Transaction-based path)
   - Added proper fallback logic to fetch current XP and add earned XP to it
   - Maintains atomicity within the transaction

2. **Lines 354-371** (Non-transaction path)
   - Added proper fallback logic to fetch current XP and add earned XP to it
   - Sequential update with proper XP accumulation

## Testing

Created test scenarios in `/tmp/test-xp-calculation.js` that verify:
- ✅ XP correctly increments when using Firebase's increment function
- ✅ XP correctly accumulates when using manual addition (fallback)
- ✅ Edge case: Works correctly when user starts with 0 XP
- ✅ Demonstrates what the bug was doing (resetting XP)

## Validation

- ✅ JavaScript syntax validated with `node -c main.js`
- ✅ No other files have the same bug pattern
- ✅ Existing increment calls in app.js and Untitled-2.js use Firebase's increment directly (no fallback, so no bug)

## Result

Users' XP will now correctly accumulate when completing challenges, even when the Firebase increment function is unavailable. Their progress will be preserved and properly incremented.

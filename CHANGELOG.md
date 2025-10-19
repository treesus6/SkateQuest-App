# SkateQuest Changelog

## Recent Updates

### Code Cleanup (October 2025)
- **Removed redundant files**: Removed duplicate/test versions of core files
  - `app.js` (older version, replaced by `core-app.js`)
  - `Untitled-1.html`, `Untitled-3.css`, `Untitled-4.json` (test versions)
  - `const CACHE_NAME = 'skatequest-cache-v1'.js` (improperly named file)
- **Removed backup files**: `firestore.rules.bak`, `firestore.rules.local`
- **Removed temporary scripts**: `validate-fixes.js`
- **Renamed for clarity**: `Untitled-2.js` → `core-app.js`
- **Consolidated documentation**: Merged multiple fix documentation files into this CHANGELOG

### JavaScript Error Fixes (October 2025)

#### Firebase Query Functions
- **Issue**: `orderBy is not a function`, `where is not a function`
- **Fix**: Added missing Firebase v9+ imports (`query`, `where`, `orderBy`, `limit`, `getDocs`) to `index.html`
- **Files Modified**: `index.html`, `core-app.js` (formerly Untitled-2.js)

#### API Endpoint Configuration
- **Issue**: `ERR_NAME_NOT_RESOLVED` for `api.skatequest.app`
- **Fix**: Changed API base URL to `/.netlify/functions` and added error handling
- **Files Modified**: `main.js`

#### DOM Safety
- **Issue**: `Cannot set properties of null` errors throughout the app
- **Fix**: Added comprehensive null checks before accessing DOM elements
- **Files Modified**: `core-app.js`, `main.js`

#### Firestore Permissions
- **Issue**: `Missing or insufficient permissions` errors
- **Fix**: Updated Firestore security rules to allow proper read/write access
- **Files Modified**: `firestore.rules`

#### XP Calculation Bug
- **Issue**: User XP was being reset instead of incremented when completing challenges
- **Fix**: Properly implemented fallback logic to add earned XP to existing XP
- **Files Modified**: `main.js`

### Current File Structure
```
/
├── index.html           # Main entry point with Firebase config
├── core-app.js          # Core application logic with safety checks
├── main.js              # Additional features (challenges, leaderboards, badges)
├── style.css            # Global styles
├── pwa.js               # PWA installation handling
├── service-worker.js    # Service worker for offline support
├── manifest.json        # PWA manifest
├── firestore.rules      # Firestore security rules
└── storage.rules        # Firebase Storage security rules
```

## Features

### Core Features (core-app.js)
- Interactive map with Leaflet.js
- Discover and view skate spots
- Add new skate spots with photos/videos
- Camera integration for trick recording
- User profiles with XP and progress tracking
- Anonymous authentication with Firebase
- Real-time spot updates
- GPS tracking and location services
- Legal information modal

### Extended Features (main.js)
- Challenge management system
- Global leaderboard with real-time updates
- Badge system (XP milestones, streaks)
- Challenge feed with proof uploads
- Spot rating system
- Streak tracking
- "Skate Rat" companion feature
- API integration for spots and tricks
- Challenge timer and expiration

## Deployment

### Firebase
```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage:rules
```

### Netlify
- Automatically deploys on push to main branch
- Functions can be added to `/netlify/functions/`
- Current configuration in `netlify.toml`

## Testing

### Manual Testing Checklist
- [ ] Open app in browser (no console errors)
- [ ] Navigate through all tabs (Discover, Add Spot, Challenges, Profile, Legal)
- [ ] Test GPS location tracking
- [ ] Test adding a new spot with photo/video
- [ ] Test completing a challenge
- [ ] Test profile updates
- [ ] Verify Firebase authentication works
- [ ] Check that data persists in Firestore

### Expected Behavior
✅ No JavaScript errors in console  
✅ All navigation buttons work  
✅ Modals open and close properly  
✅ Firebase authentication works (anonymous sign-in)  
✅ Can read/write to Firestore  
✅ Map displays and is interactive  
✅ GPS tracking shows user location  

## Known Issues
- API endpoints (`/.netlify/functions/spots`, `/.netlify/functions/tricks`) are not implemented yet
- App gracefully handles missing API endpoints with proper error messages

## Future Improvements
- Implement Netlify Functions for spots and tricks API
- Add more badges and achievements
- Improve offline support with better caching
- Add social features (friend system, challenges between users)
- Add trick library with difficulty ratings
- Implement spot search and filtering

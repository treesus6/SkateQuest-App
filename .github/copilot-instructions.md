# SkateQuest - Copilot Instructions

## Project Overview

SkateQuest is a Progressive Web App (PWA) that helps skateboarders discover, share, and track local skating spots. Users can join challenges, earn badges and XP, and connect with the skating community.

## Technology Stack

### Frontend
- **HTML/CSS/JavaScript**: Vanilla JavaScript (no framework) with modern ES6+ features
- **Leaflet.js**: Interactive mapping library for displaying skate spots
- **PWA**: Progressive Web App with service worker and manifest
- **Firebase SDK**: Client-side Firebase integration via CDN

### Backend
- **Firebase**: Backend-as-a-Service
  - Firestore: NoSQL database for spots, challenges, users, and leaderboards
  - Firebase Storage: Image and media storage
  - Firebase Authentication: User authentication
  - Firebase Functions: Serverless cloud functions (Node.js 18)
- **Netlify**: Static site hosting and serverless functions

### Build & Deployment
- **Netlify**: Primary hosting platform
- **Firebase Hosting**: Alternative/supplementary hosting
- **GitHub Actions**: CI/CD pipeline for automated deployment and monitoring

## Project Structure

```
SkateQuest-App/
├── .github/
│   ├── workflows/          # GitHub Actions CI/CD workflows
│   └── copilot-instructions.md
├── functions/              # Firebase Cloud Functions
├── netlify/
├── pages/
├── scripts/
├── icons/
├── index.html
├── main.js
├── app.js
├── style.css
├── pwa.js
├── service-worker.js
├── manifest.json
├── firebase.json
└── package.json
```

## Key Files and Their Purpose

- `index.html`: Main entry point with Firebase SDK loaded via CDN
- `main.js`: Core app logic including challenge system, spot/trick selection, API helpers
- `app.js`: Extended functionality for user features
- `service-worker.js`: Caches assets for offline functionality
- `firestore.rules`: Security rules for Firestore database access
- `functions/index.js`: Cloud Functions for secure backend operations (e.g., `completeChallenge`)

## How Copilot Coding Agent should behave in this repo

Use these instructions to guide the Copilot coding agent when contributing to or editing this repository.

- Repository type: static web app (Vanilla JS) + Firebase backend + Netlify functions.
- Avoid adding build tools or frameworks. Keep changes lightweight and compatible with static hosting.
- When adding runtime code that depends on Firebase, use the `window.firebaseInstances` pattern used throughout the repo (Firebase SDKs are loaded via CDN in the browser).
- Prefer small, incremental commits that are easy to review.
- For any operation that modifies Firestore or awards XP, prefer adding or updating a Cloud Function in `functions/` or `netlify/functions/` and ensure proper auth checks in server-side code.

### Safety and Secrets

- Do not add secrets or private credentials to the repository. Firebase config in `index.html` is expected to be client-safe and protected by Firestore rules.
- For CI tokens, use GitHub Actions secrets.

### Testing and Validation

- This is primarily a static site—manual browser testing is expected. Recommended local dev steps are in `START.md` and `DEPLOY.md`.
- Quick local server commands (examples):
  - `python3 -m http.server 8000` or `npm run serve-local` if present.
- When adding JS code, prefer small unit tests if a test harness is added; otherwise, add a short manual test checklist in the PR description.

### Linting and Formatting

- Keep code ES6+ and consistent with the existing style (no transpilation). Use `npx eslint` where configured.

### Cloud Functions

- Use Node.js 18 runtime. Keep functions minimal and validate user identity before any sensitive operation.

## Onboarding checklist for new contributors (Copilot agent helpers)

1. Read `README.md`, `START.md`, and `DEPLOY.md`.
2. Inspect `index.html` to understand Firebase initialization and `window.firebaseInstances` usage.
3. Run a quick local server and open the app to smoke test UI changes.
4. If changing rules, run `firebase emulators:start` locally (if contributors have emulators configured) and validate.

## Guidance for PRs created by the agent

- Include a brief summary of changes and a short QA checklist.
- If touching Cloud Functions or Firestore rules, include rationale for security considerations and suggested testing steps.

## Troubleshooting / Common fixes

- If service worker caching causes stale assets, increment the cache name in `service-worker.js` and mention the change in the PR. See `clear-cache.html` for local cache clearing hints.
- If Firebase connectivity fails, validate the project config in `index.html` and check console errors.

## Contact / References

- Repository: https://github.com/treesus6/SkateQuest-App
- Firebase project (for maintainers): skatequest-666

---

This file is intentionally concise and focused on actionable guidance for an automated coding agent and human contributors. Keep it updated if project structure or workflows change.
# SkateQuest - Copilot Instructions

## Project Overview

SkateQuest is a Progressive Web App (PWA) that helps skateboarders discover, share, and track local skating spots. Users can join challenges, earn badges and XP, and connect with the skating community.

## Technology Stack

### Frontend
- **HTML/CSS/JavaScript**: Vanilla JavaScript (no framework) with modern ES6+ features
- **Leaflet.js**: Interactive mapping library for displaying skate spots
- **PWA**: Progressive Web App with service worker and manifest
- **Firebase SDK**: Client-side Firebase integration via CDN

### Backend
- **Firebase**: Backend-as-a-Service
  - Firestore: NoSQL database for spots, challenges, users, and leaderboards
  - Firebase Storage: Image and media storage
  - Firebase Authentication: User authentication
  - Firebase Functions: Serverless cloud functions (Node.js 18)
- **Netlify**: Static site hosting and serverless functions

### Build & Deployment
- **Netlify**: Primary hosting platform
- **Firebase Hosting**: Alternative/supplementary hosting
- **GitHub Actions**: CI/CD pipeline for automated deployment and monitoring

## Project Structure

```
SkateQuest-App/
├── .github/
│   ├── workflows/          # GitHub Actions CI/CD workflows
│   └── copilot-instructions.md
├── functions/              # Firebase Cloud Functions
│   ├── index.js           # Cloud Functions (completeChallenge, etc.)
│   └── package.json
├── netlify/
│   └── functions/         # Netlify serverless functions
├── pages/                 # Additional page components
├── scripts/               # Utility scripts
├── icons/                 # PWA icons and app images
├── index.html             # Main application entry point
├── main.js                # Core application logic
├── app.js                 # Additional app functionality
├── style.css              # Main stylesheet
├── pwa.js                 # PWA registration and service worker setup
├── service-worker.js      # Service worker for offline functionality
├── manifest.json          # PWA manifest
├── firebase.json          # Firebase project configuration
├── firestore.rules        # Firestore security rules
├── storage.rules          # Firebase Storage security rules
├── netlify.toml           # Netlify configuration
└── package.json           # Project dependencies (minimal - static site)
```

## Key Files and Their Purpose

- **index.html**: Main entry point with Firebase SDK loaded via CDN
- **main.js**: Core app logic including challenge system, spot/trick selection, API helpers
- **app.js**: Extended functionality for user features
- **service-worker.js**: Caches assets for offline functionality
- **firestore.rules**: Security rules for Firestore database access
- **storage.rules**: Security rules for Firebase Storage access
- **functions/index.js**: Cloud Functions for secure backend operations (e.g., `completeChallenge`)

## Firebase Integration

Firebase modules are loaded via CDN in `index.html` and exposed as `window.firebaseInstances`. This pattern avoids module resolution errors in browser JavaScript.

Example usage:
```javascript
const { db, storage, doc, getDocs } = window.firebaseInstances;
```

**Important**: Never use bare module specifiers (e.g., `import { ... } from 'firebase/firestore'`) in browser JavaScript files.

## Development Workflow

### Local Development

1. **Start local server**:
   ```bash
   npm run serve-local
   # or
   python3 -m http.server 8000
   ```

2. **Access the app**: Open `http://localhost:8000` in your browser

3. **Test Firebase**: Ensure Firebase project `skatequest-666` is properly configured in the console

### Testing

- **No automated tests**: This is a static site with minimal test infrastructure
- **Manual testing**: Test in browser with DevTools console open
- **Test PWA features**: Use Chrome DevTools > Application tab > Service Workers

### Linting

Basic linting is done via GitHub Actions:
```bash
npx eslint app.js
```

## Deployment

### Automatic Deployment (Recommended)

Push to `main` branch triggers automatic deployment via GitHub Actions:
1. Lints JavaScript files
2. Validates HTML and Firebase config
3. Deploys Firebase rules
4. Monitors site health

### Manual Deployment

**Firebase Rules**:
```bash
./deploy.sh
# or
firebase deploy --only firestore:rules,storage:rules --project skatequest-666
```

**Netlify**: Automatically deploys when connected to GitHub repository

## Coding Standards and Best Practices

### JavaScript
- Use modern ES6+ syntax (const/let, arrow functions, async/await)
- Avoid polluting global namespace - use closures and DOMContentLoaded
- Handle errors gracefully with try/catch blocks
- Use `console.debug` for debug logs, `console.error` for errors
- Never commit Firebase API keys or secrets (they're already exposed client-side safely)

### HTML/CSS
- Semantic HTML5 elements
- Mobile-first responsive design
- Use CSS custom properties for theming
- Maintain accessibility (ARIA labels, alt text, keyboard navigation)

### Firebase
- Always use security rules to protect data
- Use Firebase Authentication for user-specific operations
- Leverage Firestore transactions for atomic operations
- Use Cloud Functions for sensitive operations (e.g., awarding XP)

### API Integration
- Use the `apiFetch` helper in `main.js` for API calls
- Automatically attaches Firebase auth token to requests
- Gracefully handle network errors

## Common Tasks

### Adding a New Feature
1. Update relevant HTML in `index.html`
2. Add JavaScript logic in `main.js` or `app.js`
3. Update styles in `style.css`
4. Test locally with `npm run serve-local`
5. If backend logic needed, add Cloud Function in `functions/index.js`
6. Update Firestore/Storage rules if needed

### Adding a New Challenge Type
1. Define challenge structure in Firestore (see existing challenges collection)
2. Update UI in `index.html` challenge panel
3. Add handling logic in `main.js`
4. Update `completeChallenge` Cloud Function if needed
5. Test XP awarding and status updates

### Updating Security Rules
1. Edit `firestore.rules` or `storage.rules`
2. Test locally: `firebase emulators:start`
3. Deploy: `firebase deploy --only firestore:rules` or `./deploy.sh`
4. Verify in Firebase Console

### PWA Updates
1. Update `manifest.json` for app metadata
2. Update `service-worker.js` for caching strategy
3. Increment cache version in service-worker to force update
4. Test in Chrome DevTools > Application > Service Workers

## Environment and Configuration

### Firebase Project
- **Project ID**: `skatequest-666`
- **Hosting**: Firebase Hosting (supplementary)
- **Functions Region**: Default (us-central1)

### Netlify
- **Site**: skatequest.netlify.app
- **Custom Domain**: www.sk8quest.com (configured via DNS)
- **Functions**: `.netlify/functions/` directory

### GitHub Actions Secrets
- `FIREBASE_TOKEN`: Firebase CI token for automated deployments

## Security Considerations

- Firebase security rules enforce read/write permissions
- User authentication required for challenge completion
- Cloud Functions validate user identity before awarding XP
- Client-side code only - API keys are safe to expose (protected by Firebase rules)
- Always validate user input and sanitize data before Firestore writes

## Troubleshooting

### Common Issues

1. **Firebase connection errors**: Check Firebase config in `index.html`
2. **Module resolution errors**: Ensure using `window.firebaseInstances`, not bare imports
3. **Service worker not updating**: Clear cache and increment CACHE_NAME version
4. **Netlify Functions 404**: Verify function paths in `netlify/functions/`
5. **Security rules denying access**: Review and update `firestore.rules`

### Debug Tips
- Open browser DevTools console for JavaScript errors
- Check Network tab for failed API requests
- Use Firebase Console to inspect Firestore data and rules
- Check GitHub Actions logs for deployment issues

## Documentation

Additional documentation files:
- **AUTOMATION.md**: Complete automation setup guide
- **DEPLOY.md**: Deployment instructions
- **PRODUCTION.md**: Production environment setup
- **START.md**: Quick start guide
- **QUICK_REFERENCE.md**: Quick reference for common tasks

## Contact and Support

- **Repository**: https://github.com/treesus6/SkateQuest-App
- **Live Site**: https://www.sk8quest.com
- **Firebase Console**: https://console.firebase.google.com/project/skatequest-666

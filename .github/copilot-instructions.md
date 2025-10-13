# GitHub Copilot Instructions for SkateQuest App

## Project Overview
SkateQuest is a Progressive Web App (PWA) for discovering and sharing skateboarding spots. It's a static web application with Firebase backend services, deployed on Netlify.

## Technology Stack
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Backend Services**: Firebase (Firestore, Authentication, Storage, Functions)
- **Maps**: Leaflet.js with heatmap plugin
- **Deployment**: Netlify with serverless functions
- **Build**: No build step - pure static site

## Project Structure
- `index.html` - Main application entry point
- `main.js` - Core application logic and Firebase initialization
- `Untitled-2.js` - UI interactions and DOM manipulation
- `app.js` - Additional application features
- `style.css`, `Untitled-3.css` - Styling
- `netlify/functions/` - Serverless API endpoints
- `functions/` - Firebase Cloud Functions
- `pages/` - Additional page components

## Code Style and Best Practices

### JavaScript
- Use ES6+ features (const/let, arrow functions, template literals, async/await)
- Always use modular Firebase imports (v9+ syntax)
- Add null checks before DOM manipulations (e.g., `if (element) { ... }`)
- Use try-catch blocks for async operations and API calls
- Prefer `async/await` over Promise chains for readability
- No TypeScript - this is a vanilla JavaScript project

### Firebase Integration
- Import Firebase modules using CDN: `https://www.gstatic.com/firebasejs/10.12.2/`
- Always import required Firestore query functions: `query`, `where`, `orderBy`, `limit`, `getDocs`
- Use modular syntax: `collection(db, 'collectionName')` not `db.collection()`
- Ensure Firebase instances are exposed to global scope when needed via `window.firebaseInstances`
- Test Firestore rules before deploying (rules in `firestore.rules`)

### API Endpoints
- Use Netlify Functions path: `/.netlify/functions/` for API calls
- Add error handling for all fetch operations
- Return proper HTTP status codes and JSON responses
- Handle CORS appropriately in serverless functions

### DOM Manipulation
- Always check if elements exist before manipulating them
- Use event delegation where appropriate
- Ensure elements are loaded before accessing them (DOMContentLoaded or defer/async)
- Clear previous content before updating innerHTML

### Error Handling
- Wrap Firebase operations in try-catch blocks
- Provide user-friendly error messages
- Log errors to console for debugging
- Handle network failures gracefully
- Don't expose sensitive error details to users

## Testing and Validation
- Run `node validate-fixes.js` to verify Firebase imports and configurations
- Test locally with `python -m http.server 8000` or VS Code Live Server
- Check browser console for errors before committing
- Test all navigation paths and UI interactions
- Verify Firebase operations work (auth, read, write)

## Deployment
- **Netlify**: Automatic deployment on push to main branch
- **Firebase Rules**: Deploy with `firebase deploy --only firestore:rules`
- No build command needed - static site served from root
- Check `netlify.toml` for deployment configuration

## Security
- Keep Firebase config in code (public keys for web apps)
- Implement proper Firestore security rules (never allow unrestricted access)
- Use Firebase Authentication for protected operations
- Don't commit sensitive credentials or API keys to environment files
- Follow `.gitignore` patterns for excluded files

## Documentation
- Update relevant documentation files when making significant changes:
  - `FIXES_SUMMARY.md` - Document bug fixes and solutions
  - `QUICK_REFERENCE.md` - Quick troubleshooting guide
  - `README.md` - Deployment and setup instructions
- Use clear commit messages describing what changed and why
- Document any new dependencies or setup steps

## Common Issues and Solutions

### Firebase Query Functions Not Found
- Ensure `query`, `where`, `orderBy`, `limit`, `getDocs` are imported in HTML files
- Check the import statement on lines 179 (index.html) and 72 (Untitled-1.html)

### DOM Null Reference Errors
- Add null checks: `if (element) { element.innerHTML = '...'; }`
- Verify element IDs match between HTML and JavaScript
- Use `defer` attribute on script tags or wrap in DOMContentLoaded

### API Endpoint Failures
- Check that serverless functions exist in `netlify/functions/`
- Verify API base URL is `/.netlify/functions/` not external domains
- Test locally with `netlify dev` if implementing new endpoints

### Firebase Permission Errors
- Review and update `firestore.rules` for proper access control
- Deploy rules after changes: `firebase deploy --only firestore:rules`
- Ensure user authentication is working for protected operations

## Key Dependencies
- Firebase SDK v10.12.2 (via CDN)
- Leaflet.js v1.9.4 (maps)
- Leaflet.heat (heatmap plugin)
- No npm dependencies for frontend (pure static site)

## Development Workflow
1. Make changes to relevant files
2. Test locally with a simple HTTP server
3. Check browser console for errors
4. Run validation script if touching Firebase code
5. Commit with descriptive message
6. Push to trigger Netlify deployment
7. Monitor deployment and test live site

## Notes
- This is a static site with no build process
- All JavaScript runs client-side in the browser
- Firebase handles backend data and authentication
- Netlify Functions provide serverless API endpoints when needed
- PWA features enable offline functionality and app-like experience

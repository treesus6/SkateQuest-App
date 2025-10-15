# GitHub Copilot Instructions for SkateQuest

## Project Overview
SkateQuest is a Progressive Web App (PWA) for discovering, sharing, and tracking skateboarding spots. The app is built with vanilla JavaScript, HTML, and CSS, and uses Firebase for backend services.

## Technology Stack
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Mapping**: Leaflet.js for interactive maps
- **Backend**: Firebase (Firestore, Authentication, Storage)
- **Functions**: Firebase Cloud Functions (Node.js 18)
- **Deployment**: Netlify
- **PWA**: Service Worker, Web App Manifest

## Code Style and Standards

### JavaScript
- Use modern ES6+ syntax (const/let, arrow functions, async/await, destructuring)
- Use 4-space indentation for consistency with the existing codebase
- Follow consistent semicolon usage as seen in existing code
- Use async/await for asynchronous operations rather than callbacks
- Prefer template literals for string interpolation
- Keep functions small and focused on single responsibilities
- Use descriptive variable and function names

### HTML
- Use semantic HTML5 elements
- Use 4-space indentation for consistency with the existing codebase
- Include appropriate ARIA attributes for accessibility
- Keep meta tags comprehensive for SEO and social media

### CSS
- Follow existing naming conventions in style.css
- Use CSS custom properties (variables) for theming
- Ensure responsive design for mobile-first approach
- Test on various screen sizes

## Firebase Integration

### Firestore
- Always use the Firebase instances from `window.firebaseInstances`
- Use serverTimestamp() for timestamp fields
- Implement proper error handling for all database operations
- Use real-time listeners (onSnapshot) for data that updates frequently
- Structure documents logically: users/{userId}, spots/{spotId}, challenges/{challengeId}

### Authentication
- Use Firebase Anonymous Authentication by default
- Handle authentication state changes with onAuthStateChanged
- Always check if user is authenticated before database operations
- Store user profile data in Firestore under users/{userId}

### Storage
- Use Firebase Storage for user-uploaded media (images, videos)
- Implement proper file size and type validation
- Generate unique filenames to prevent collisions
- Store references to media URLs in Firestore documents

### Security
- Firebase client configuration (apiKey, authDomain, etc.) is safe to include in frontend code
- Never expose server-side secrets or private keys in code (use environment variables for these)
- Follow Firestore security rules defined in firestore.rules
- Validate all user input before storing in database
- Sanitize user-generated content to prevent XSS attacks

## PWA Best Practices
- Update service-worker.js when adding new cacheable resources
- Maintain manifest.json with correct icon paths and app metadata
- Test offline functionality after changes
- Ensure app is installable on mobile devices

## File Organization
- Main app logic: `app.js`
- Additional features: `main.js`
- PWA functionality: `pwa.js`, `service-worker.js`
- Firebase Functions: `functions/index.js`
- Styles: `style.css`
- Entry point: `index.html`

## Testing and Validation
- Test all features in browser DevTools
- Verify Firebase operations in Firebase Console
- Check PWA functionality with Lighthouse
- Test on multiple browsers (Chrome, Firefox, Safari)
- Validate responsive design on mobile devices
- Use validate-fixes.js for automated validation where applicable

## Deployment
- Code deploys automatically to Netlify on push
- Firebase Functions deploy separately with `firebase deploy --only functions`
- Test changes locally before pushing
- Review Netlify build logs for any deployment issues

## Common Patterns

### Adding a New Feature
1. Update UI in index.html if needed
2. Add event listeners and logic in app.js or main.js
3. Update Firebase security rules if new data structures are added
4. Update service worker cache if new resources are added
5. Test thoroughly in development environment

### Working with Geolocation
- Request user location permission appropriately
- Handle location errors gracefully
- Update map markers when location changes
- Store coordinates in GeoPoint format for Firestore

### Handling User-Generated Content
- Validate all input fields
- Sanitize HTML content
- Implement rate limiting for submissions
- Store metadata (timestamp, userId) with all content

## Error Handling
- Use try/catch blocks for all async operations
- Provide user-friendly error messages via the modal system (showModal function)
- Log errors to console for debugging
- Never expose sensitive error details to users

## Performance
- Minimize DOM manipulations
- Use event delegation where appropriate
- Lazy load images and media
- Optimize Firebase queries with proper indexing
- Cache static assets in service worker

## Accessibility
- Ensure keyboard navigation works for all interactive elements
- Use semantic HTML elements
- Provide alt text for images
- Ensure sufficient color contrast
- Test with screen readers when adding new features

## Documentation
- Add comments for complex logic or non-obvious code
- Keep README.md updated with setup instructions
- Document any new Firebase collections or fields
- Update this file when adding new conventions or patterns

## Dependencies
- Minimize external dependencies
- When adding new libraries, ensure they are loaded from CDN or properly bundled
- Keep Firebase SDK versions consistent between main app and functions
- Document any new dependencies in package.json

## Git Workflow
- Write clear, descriptive commit messages
- Keep commits focused on single features or fixes
- Test changes locally before committing
- Review .gitignore to ensure no sensitive files are committed

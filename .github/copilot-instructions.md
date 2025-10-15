# GitHub Copilot Instructions for SkateQuest

## Project Overview

SkateQuest is a Progressive Web App (PWA) that helps skateboarders discover, share, and track local skating spots. Users can join challenges, earn XP and badges, and connect with the skating community.

## Technology Stack

### Frontend
- **Vanilla JavaScript** (ES6+) - No framework, pure JavaScript
- **HTML5** - Semantic markup
- **CSS3** - Custom styling with modern features
- **Leaflet.js** - Interactive maps for spot visualization
- **Firebase SDK** - Client-side Firebase integration

### Backend & Services
- **Firebase**
  - Firestore - NoSQL database for spots, users, and challenges
  - Authentication - Anonymous and user authentication
  - Storage - Media storage for videos and images
  - Functions - Cloud Functions for server-side logic
- **Netlify** - Static site hosting and serverless functions

### Build & Deployment
- **Netlify** - Continuous deployment
- **Cypress** - End-to-end testing (configured but minimal tests)
- **Service Worker** - PWA offline capabilities

## Project Structure

```
/
├── .github/              # GitHub configuration and workflows
├── functions/            # Firebase Cloud Functions
├── netlify/functions/    # Netlify serverless functions
├── icons/                # App icons for PWA
├── pages/                # Additional page components
├── scripts/              # Utility scripts
├── index.html            # Main entry point
├── app.js                # Main application logic
├── style.css             # Global styles
├── service-worker.js     # PWA service worker
├── manifest.json         # PWA manifest
└── netlify.toml          # Netlify configuration
```

## Coding Standards

### JavaScript

- Use modern ES6+ syntax (const/let, arrow functions, async/await)
- Use meaningful variable and function names (camelCase)
- Keep functions small and focused on a single responsibility
- Always handle errors with try-catch blocks for async operations
- Use Firebase SDK methods directly (avoid wrappers unless necessary)
- Document complex logic with inline comments
- Add copyright headers to new files: `// Copyright (c) 2024 SkateQuest. All Rights Reserved.`

### HTML

- Use semantic HTML5 elements (header, nav, main, section, etc.)
- Maintain accessibility with proper ARIA labels where needed
- Keep structure clean and properly indented
- Include meta tags for SEO and social sharing

### CSS

- Use class-based styling (avoid IDs for styling)
- Follow mobile-first responsive design principles
- Group related styles together
- Use CSS custom properties (variables) for consistent theming
- Maintain existing color scheme and design patterns

### Firebase Integration

- **Firestore Collections:**
  - `users` - User profiles with XP, badges, streaks
  - `skateSpots` - Skating locations with coordinates, ratings
  - `challenges` - User challenges with status and XP rewards
  - `leaderboard` - Rankings based on XP

- Always use transactions for operations that modify XP or other critical data
- Use serverTimestamp() for timestamp fields
- Implement proper security rules (check firestore.rules)
- Use cloud functions for operations requiring server-side validation

### Testing

- Write Cypress tests for critical user flows
- Test authentication flows
- Test CRUD operations on spots and challenges
- Test map interactions where possible
- Keep tests in `cypress/` directory (if adding)

## Development Workflow

1. **Local Development:**
   - Serve locally with `python -m http.server 8000` or Live Server
   - Test PWA features using Chrome DevTools
   - Check console for errors and Firebase logs

2. **Firebase Development:**
   - Test functions locally with Firebase emulators when possible
   - Use Firebase console for database inspection
   - Monitor function logs for debugging

3. **Deployment:**
   - Push to main branch triggers Netlify deployment
   - Netlify builds are automatic (no build step for frontend)
   - Firebase functions deployed separately via Firebase CLI

## Best Practices

### Security

- Firebase client API keys are designed to be public and safe to commit (security is enforced via Firestore security rules)
- **Never** commit Firebase Admin SDK service account keys or private keys
- Implement proper Firestore security rules to protect data
- Validate all user inputs on both client and server side
- Use Firebase Auth to verify user identity
- Use Cloud Functions for sensitive operations (e.g., awarding XP) to prevent client-side manipulation

### Performance

- Optimize images and videos before upload
- Use Firestore queries efficiently (add indexes as needed)
- Implement pagination for large datasets
- Minimize DOM manipulations
- Cache static assets in service worker

### PWA

- Maintain manifest.json for app installation
- Update service-worker.js cache version when deploying changes
- Test offline functionality
- Ensure responsive design works on all device sizes

### Code Organization

- Keep related functionality grouped together
- Separate concerns (data fetching, UI rendering, event handling)
- Use helper functions for repeated operations
- Avoid global state where possible

## Common Tasks

### Adding a New Feature

1. Update HTML structure if needed
2. Add event listeners in app.js
3. Create Firebase queries/mutations
4. Update UI rendering logic
5. Style with CSS
6. Test locally
7. Add Firestore security rules if needed

### Adding a New Firebase Collection

1. Define collection structure in comments
2. Create initial document with proper schema
3. Update security rules in firestore.rules
4. Add CRUD operations in app.js or functions/
5. Update UI to display/modify data

### Updating PWA

1. Modify service-worker.js cache name
2. Update version in manifest.json
3. Test installation and updates
4. Verify offline functionality

## Troubleshooting

- **Firebase not loading:** Check console for SDK initialization errors
- **Map not displaying:** Verify Leaflet CSS and JS are loaded
- **Auth issues:** Check Firebase console for auth settings
- **Deploy failures:** Review Netlify deploy logs
- **Function errors:** Check Firebase function logs in console

## Documentation

- Update README.md for major feature changes
- Document breaking changes in commit messages
- Keep this file updated as project evolves
- Add inline comments for complex algorithms

## References

- [Firebase Documentation](https://firebase.google.com/docs)
- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [MDN Web Docs](https://developer.mozilla.org/)
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Netlify Documentation](https://docs.netlify.com/)

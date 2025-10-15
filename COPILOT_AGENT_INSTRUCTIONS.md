# Copilot Coding Agent Instructions for SkateQuest-App

## Project Overview
SkateQuest-App is a web application with a Node.js backend (functions/), a frontend (index.html, main.js, style.css), and PWA/service worker support. It uses Firestore for data storage and is deployed via Netlify.

## Coding Agent Best Practices

### 1. File and Directory Conventions
- **Backend code:** Place all backend/serverless functions in `functions/` or `netlify/functions/`.
- **Frontend code:** Place all client-side code in the root or `pages/`.
- **Static assets:** Use `icons/` for images/icons.
- **Configuration:** Use root-level files for configs (e.g., `manifest.json`, `netlify.toml`).

### 2. Code Style
- Use consistent 2-space indentation for JavaScript and JSON.
- Prefer ES6+ syntax (const/let, arrow functions, template literals).
- Use single quotes for strings in JS.
- Add JSDoc comments for exported functions.

### 3. Testing & Validation
- Validate all changes to backend functions with sample payloads.
- Ensure PWA/service worker changes do not break offline support.
- Run `npm install` in `functions/` if dependencies are added.

### 4. Pull Request & Commit Messages
- Use clear, descriptive commit messages (e.g., `fix: correct offline caching in service worker`).
- Reference related files or issues in PR descriptions.

### 5. Security & Data
- Never commit secrets or API keys.
- Follow Firestore security rules in `firestore.rules`.

### 6. Documentation
- Update `README.md` and `QUICK_REFERENCE.md` for major changes.
- Summarize fixes in `FIXES_SUMMARY.md` if relevant.

### 7. Automation
- Use `validate-fixes.js` to check for common issues after major changes.

---

For more, see [Best practices for Copilot coding agent in your repository](https://gh.io/copilot-coding-agent-tips).

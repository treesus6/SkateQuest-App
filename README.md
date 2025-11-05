SkateQuest — Deploying to Netlify

This folder contains a static site (HTML, CSS, JS) for SkateQuest.
Use one of the methods below to deploy to Netlify.

## Setting up GitHub Actions Secrets and Variables

To enable automated Firebase deployments via GitHub Actions, configure these secrets and variables:

### Required Secrets
1. Go to your repository's **Settings → Secrets and variables → Actions → Secrets**
2. Add a new secret:
   - **Name**: `FIREBASE_TOKEN`
   - **Value**: Get your token by running `firebase login:ci` in your terminal
   
### Required Variables
1. Go to your repository's **Settings → Secrets and variables → Actions → Variables**
2. Add a new variable:
   - **Name**: `FIREBASE_PROJECT_ID`
   - **Value**: Your Firebase project ID (e.g., skatequest-666)

Once configured, the GitHub Actions workflow will automatically deploy Firebase security rules when you push to the main branch.

Quick options

1) Drag & Drop (fastest)
- Zip the contents of this folder (or open the folder in your file manager and select all files).
- Go to https://app.netlify.com/drop and drop the folder/zip.
- Netlify will publish a site and give you a URL.

2) Connect a Git repository (recommended for updates)
- Create a GitHub repository and push this project.
  ```bash
  cd /path/to/SkateQuest-App
  git init
  git add .
  git commit -m "Initial SkateQuest site"
  # create repo on GitHub and push (replace URL)
  git remote add origin https://github.com/<your-username>/<repo>.git
  git push -u origin main
  ```
- In Netlify: Sites → New site → Import from Git → choose Git provider and repository.
- During setup, set the "Publish directory" to the project root (leave blank or put "."). There's no build command.

3) Netlify CLI (for power users)
- Install the CLI and deploy directly:
  ```bash
  npm i -g netlify-cli
  netlify login
  netlify deploy --prod --dir="."
  ```

Notes & tips
- This is a static site; no build required. `netlify.toml` sets the publish directory to the project root.
- Keep your Firebase config keys safe. They are already included in the code for this demo. If you want to lock read/write rules, configure your Firebase console security rules.
- If you see issues with icons or the manifest, make sure the `icons/` directory is present and was uploaded.

Local testing
- Quick local server:
  ```bash
  cd /path/to/SkateQuest-App
  python -m http.server 8000
  # open http://localhost:8000
  ```
- Or use Live Server extension in VS Code.

If you want I can:
- Prepare a GitHub repo for you (you'll need to provide access or do the push yourself).
- Walk through the Netlify Connect-from-Git flow step-by-step while you do the clicks.
- Configure environment variables in Netlify for any secrets.

---

Quick local test for the new gameplay UI (pending challenges & completion):

1) Serve the project locally:

```bash
cd /path/to/SkateQuest-App
python -m http.server 8000
# then open http://localhost:8000 in a browser
```

2) Open the app in the browser, open DevTools -> Console to watch logs.
3) Use the Challenge panel to create an issue (Issue Challenge).
4) In the Pending Challenges panel, click Complete for the new challenge.
5) Verify XP and streak updates, badges, and leaderboard changes.

If you want, I can push these edits to the repo and trigger a Netlify deploy. Say "push and deploy" and I'll make the commit and push.

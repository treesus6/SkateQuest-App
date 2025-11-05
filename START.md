# 🎯 3-STEP LAUNCH CHECKLIST

## ✅ STEP 1: Deploy Firebase Rules (2 minutes)

**Go here:** https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/firestore/rules

(Replace ${FIREBASE_PROJECT_ID} with your actual Firebase project ID)

1. Click the link above
2. You'll see a code editor
3. **DELETE everything** in that editor
4. **COPY all text** from your `/workspaces/SkateQuest-App/firestore.rules` file
5. **PASTE** it into the Firebase editor
6. Click **"Publish"** button (blue button, top right)
7. ✅ Done!

**Then go here:** https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/storage/rules

(Replace ${FIREBASE_PROJECT_ID} with your actual Firebase project ID)

1. Click the link above
2. You'll see another code editor  
3. **DELETE everything** in that editor
4. **COPY all text** from your `/workspaces/SkateQuest-App/storage.rules` file
5. **PASTE** it into the Firebase editor
6. Click **"Publish"** button
7. ✅ Done!

---

## ✅ STEP 2: Connect Your Domain www.sk8quest.com (5 minutes)

**Go here:** https://app.netlify.com

1. Login to Netlify
2. Find your site (probably named "skatequest" or similar)
3. Click on it
4. Go to **"Domain settings"** (in the left sidebar)
5. Click **"Add custom domain"**
6. Type: `www.sk8quest.com`
7. Click **"Verify"**
8. Netlify will show you DNS settings
9. **Copy those DNS settings**
10. Go to wherever you bought sk8quest.com (GoDaddy, Namecheap, etc.)
11. Add the DNS records Netlify showed you
12. Wait 10-60 minutes
13. ✅ Done!

**Your site will be live at:**
- https://www.sk8quest.com (your domain)
- https://skatequest.netlify.app (backup URL)

---

## ✅ STEP 3: Enable Auto-Monitoring (Optional, 3 minutes)

**Get Firebase Token:**
```bash
cd /workspaces/SkateQuest-App
firebase login:ci
```
Copy the token it prints.

**Add to GitHub:**
1. Go to: https://github.com/treesus6/SkateQuest-App/settings/secrets/actions
2. Click **"New repository secret"**
3. Name: `FIREBASE_TOKEN`
4. Value: Paste the token from above
5. Click **"Add secret"**

**Add Firebase Project ID:**
1. Go to: https://github.com/treesus6/SkateQuest-App/settings/variables/actions
2. Click **"New repository variable"**
3. Name: `FIREBASE_PROJECT_ID`
4. Value: Your Firebase project ID (e.g., skatequest-666)
5. Click **"Add variable"**
6. ✅ Done!

**What this does:**
- Automatically deploys Firebase rules when you push code
- Checks site health every hour
- Creates GitHub issues if bugs are detected
- You can go away and it keeps working!

---

## 🎉 THAT'S IT!

After these 3 steps:
- ✅ App is fully live
- ✅ Firebase backend working
- ✅ Custom domain active
- ✅ Automated monitoring running
- ✅ You can walk away!

**Your live site:** https://www.sk8quest.com

Go show sponsors! 🛹

---

## 🆘 Need Help?

**Firebase Console:** https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}

(Replace ${FIREBASE_PROJECT_ID} with your actual Firebase project ID)
**Netlify Dashboard:** https://app.netlify.com
**GitHub Actions:** https://github.com/treesus6/SkateQuest-App/actions

**Can't find your Netlify site?**
Look for a site that ends in `.netlify.app` in your dashboard.

**Domain not working yet?**
DNS can take up to 48 hours. Use skatequest.netlify.app in the meantime.

**GitHub Actions failing?**
Skip Step 3 for now - it's optional. Your site still works!

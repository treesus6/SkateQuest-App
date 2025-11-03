#!/bin/bash
# Auto-deploy script for SkateQuest production

echo "🚀 SkateQuest Auto-Deploy Starting..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "Installing Firebase CLI..."
    npm install -g firebase-tools
fi

# Login to Firebase (will use token in CI/CD)
echo "📝 Deploying Firebase Rules..."
firebase deploy --only firestore:rules,storage:rules --project skatequest-666

# Deploy to Netlify (happens automatically via Git push)
echo "✅ Firebase rules deployed!"
echo "✅ Netlify deployment triggered automatically"
echo "🎉 Production deployment complete!"
echo ""
echo "Live site: https://www.sk8quest.com"
echo "Firebase Console: https://console.firebase.google.com/project/skatequest-666"

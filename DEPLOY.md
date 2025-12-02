# 🚀 SkateQuest - Quick Deploy Guide

## ⚡ **FASTEST PATH TO DEPLOYMENT** (5 minutes)

### **Step 1: Database Setup** (2 minutes)

1. **Go to Supabase SQL Editor:**
   - Visit: https://supabase.com/dashboard/project/hreeuqdgrwvnxquxohod/sql/new

2. **Copy & Paste:**
   - Open `database-setup.sql`
   - Copy ALL the SQL
   - Paste into Supabase SQL Editor
   - Click **"RUN"**
   - ✅ Done! All tables created automatically

3. **Enable Realtime:**
   - Go to: Database → Replication
   - Toggle ON for these tables:
     - `lounge_messages`
     - `skate_sessions`
     - `live_streams`
     - `crew_projects`

### **Step 2: Deploy to Netlify** (1 minute)

You already have Netlify configured! Just:

```bash
# Merge the feature branch
git checkout main
git merge claude/add-video-loops-01JoCcqrt3ich6dwds47BvbF
git push origin main
```

Netlify will auto-deploy to: **https://sk8.quest** ✅

### **Step 3: Test** (2 minutes)

1. Visit: https://sk8.quest
2. Background video should auto-play
3. Navigate to test features
4. Try AR Explorer (needs camera permission)
5. Test Skate Lounge chat

---

## 🎯 **ONE-COMMAND DEPLOY**

```bash
# Do it all at once:
\
git checkout main && \
git merge claude/add-video-loops-01JoCcqrt3ich6dwds47BvbF && \
git push origin main && \
echo "✅ Deployed! Visit https://sk8.quest in 2 minutes"
```

---

## ✨ **That's It!**

Your award-winning skate app is now live! 🛹🏆

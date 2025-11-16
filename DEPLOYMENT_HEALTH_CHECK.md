# Deployment Health Check

## Overview

The deployment workflow (`.github/workflows/deploy.yml`) includes robust health-check steps that verify deployments are successful before the workflow completes. This prevents false failures from transient 404 errors that can occur while sites are being published.

## How It Works

After deploying to Netlify and Firebase, the workflow:

1. **Waits for the deployment to propagate** by retrying the health check multiple times
2. **Checks the deployed site URL** using curl to verify it returns HTTP 200
3. **Logs each attempt** so you can see the deployment status progression
4. **Fails the workflow** only if the site is still not responding after all retries

## Configuration

### Environment Variables

The health-check behavior can be configured via environment variables in the workflow:

```yaml
env:
  DEPLOY_SITE_URL: ${{ vars.DEPLOY_SITE_URL || '' }}
  HEALTH_CHECK_MAX_TRIES: 12
  HEALTH_CHECK_SLEEP_SEC: 10
```

- **`DEPLOY_SITE_URL`**: Override the default site URL to check
- **`HEALTH_CHECK_MAX_TRIES`**: Number of retry attempts (default: 12)
- **`HEALTH_CHECK_SLEEP_SEC`**: Seconds to wait between retries (default: 10)

### Default URLs

- **Netlify**: `https://www.sk8quest.com`
- **Firebase**: `https://skatequest-666.web.app`

### Override Site URL

To check a different URL (e.g., during testing or for staging environments):

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions** → **Variables** tab
3. Click **New repository variable**
4. Name: `DEPLOY_SITE_URL`
5. Value: Your custom URL (e.g., `https://staging.sk8quest.com`)
6. Click **Add variable**

The workflow will now check your custom URL instead of the default.

### Adjust Retry Count or Interval

To change the number of retries or the wait time between retries:

1. Edit `.github/workflows/deploy.yml`
2. Modify the values in the `env` section:
   ```yaml
   HEALTH_CHECK_MAX_TRIES: 20  # More retries
   HEALTH_CHECK_SLEEP_SEC: 15  # Longer wait between retries
   ```
3. Commit and push the changes

## Deployment Action Outputs

The Firebase health-check step automatically uses the deployment URL from the Firebase action output if available:

```yaml
FIREBASE_URL: ${{ steps.firebase_deploy.outputs.url || '' }}
```

This ensures we're checking the actual deployed URL rather than a hard-coded one.

## Troubleshooting

### Deployment check fails after all retries

If the health check fails after all retries (2+ minutes by default):

1. **Check the site manually**: Visit the URL in your browser
2. **Review deployment logs**: Check the Netlify/Firebase deployment step logs
3. **Verify URL is correct**: Ensure the default URL or `DEPLOY_SITE_URL` is correct
4. **Check site status**: The site might be down or have issues independent of deployment

### Site is slow to deploy

If your site consistently takes longer than 2 minutes to become available:

1. Increase `HEALTH_CHECK_MAX_TRIES` to allow more retries
2. Or increase `HEALTH_CHECK_SLEEP_SEC` for longer waits between checks
3. Consider optimizing your deployment process

### False positives (site is up but check fails)

If the site is up but the health check fails:

1. **Check for redirects**: The health check expects HTTP 200, not 301/302
2. **Verify URL accessibility**: Ensure the URL is publicly accessible
3. **Check for authentication**: The health check can't authenticate, ensure the URL doesn't require login
4. **Review curl output**: Check the STATUS code in the logs

## Example Workflow Run

```
Checking Netlify deployment at: https://www.sk8quest.com
Attempt 1/12: status 404 — retrying in 10 s...
Attempt 2/12: status 404 — retrying in 10 s...
Attempt 3/12: status 200
✓ Site is live and responding
```

## Benefits

- ✅ **Prevents false failures** from transient 404 errors during deployment
- ✅ **Detailed logging** of each health check attempt
- ✅ **Flexible configuration** via environment variables
- ✅ **Independent validation** of Netlify and Firebase deployments
- ✅ **Smart URL detection** using deployment action outputs when available

## Related Files

- `.github/workflows/deploy.yml` - Main deployment workflow with health checks
- `AUTOMATION.md` - Complete automation and CI/CD documentation
- `DEPLOY.md` - Deployment instructions and troubleshooting

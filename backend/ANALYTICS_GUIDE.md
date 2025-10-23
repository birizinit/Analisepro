# Analytics and Logging System Guide

## Overview

The analytics and logging system provides comprehensive tracking of user activity, system usage, and performance metrics across all white label clients.

## Features

### 1. Automatic Activity Logging
- All API requests are automatically logged via middleware
- Captures: action type, timestamp, IP address, user agent, duration
- Action types: login, logout, settings_change, token_created, token_deleted, api_call

### 2. Daily Analytics Aggregation
- Automatically aggregates data daily for each client
- Metrics tracked:
  - Total logins (admin + token users)
  - Unique tokens used
  - Total API calls
  - Active tokens count

### 3. Real-time Analytics
- Client admins can view their own analytics
- Super admins can view system-wide analytics
- Customizable time ranges (7, 30, 90 days)

## API Endpoints

### Client Analytics (Client Admin)

**Get Analytics Summary**
\`\`\`
GET /api/analytics/client/summary?days=30
\`\`\`

**Get Daily Analytics**
\`\`\`
GET /api/analytics/client/daily?days=30
\`\`\`

**Get Activity Logs**
\`\`\`
GET /api/analytics/client/activity?limit=50&action_type=login
\`\`\`

**Manually Update Analytics**
\`\`\`
POST /api/analytics/client/update
\`\`\`

### System Analytics (Super Admin)

**Get System Summary**
\`\`\`
GET /api/analytics/system/summary?days=30
\`\`\`

**Update All Clients Analytics**
\`\`\`
POST /api/analytics/system/update-all
\`\`\`

**Get Specific Client Analytics**
\`\`\`
GET /api/analytics/client/{client_id}/summary?days=30
GET /api/analytics/client/{client_id}/activity?limit=100
\`\`\`

### Manual Activity Logging

**Log Custom Activity**
\`\`\`
POST /api/analytics/log
{
  "action_type": "api_call",
  "action_details": "Generated trading signal for BTCUSDT"
}
\`\`\`

## Scheduled Tasks

### Daily Analytics Update

The system should run daily analytics aggregation once per day. There are two ways to set this up:

#### Option 1: Cron Job (Recommended for Production)

Add to crontab:
\`\`\`bash
# Run at midnight every day
0 0 * * * cd /path/to/backend && python -c "from tasks.scheduler import run_daily_analytics_update; run_daily_analytics_update()"
\`\`\`

Or use the provided script:
\`\`\`bash
chmod +x run_analytics.sh
0 0 * * * /path/to/backend/run_analytics.sh
\`\`\`

#### Option 2: APScheduler (Alternative)

Install APScheduler:
\`\`\`bash
pip install apscheduler
\`\`\`

Add to `app.py`:
\`\`\`python
from apscheduler.schedulers.background import BackgroundScheduler
from tasks.scheduler import run_daily_analytics_update

scheduler = BackgroundScheduler()
scheduler.add_job(run_daily_analytics_update, 'cron', hour=0, minute=0)
scheduler.start()
\`\`\`

## Logging Middleware

The logging middleware automatically captures:
- Request path and method
- Response status code
- Request duration
- Client ID and token ID (if authenticated)
- IP address and user agent

### Customizing Logged Actions

Edit `middleware/logging_middleware.py` to customize which actions are logged:

\`\`\`python
def determine_action_type(path, method):
    # Add custom action types here
    if '/custom/endpoint' in path:
        return 'custom_action'
    return None
\`\`\`

## Analytics Utilities

### Update Analytics Programmatically

\`\`\`python
from utils.analytics import update_daily_analytics, get_client_analytics_summary

# Update analytics for a specific client
analytics = update_daily_analytics(client_id=1)

# Get analytics summary
summary = get_client_analytics_summary(client_id=1, days=30)
\`\`\`

### Query Activity Logs

\`\`\`python
from models import ActivityLog
from datetime import datetime, timedelta

# Get recent logins
recent_logins = ActivityLog.query.filter_by(
    client_id=1,
    action_type='login'
).filter(
    ActivityLog.timestamp >= datetime.utcnow() - timedelta(days=7)
).all()
\`\`\`

## Performance Considerations

1. **Indexing**: The database schema includes indexes on frequently queried columns (client_id, timestamp, action_type)

2. **Pagination**: Use limit parameters when querying activity logs to avoid loading too much data

3. **Caching**: Consider caching analytics summaries for frequently accessed data

4. **Archiving**: Implement log archiving for old activity logs (e.g., move logs older than 90 days to archive table)

## Monitoring

### Check Analytics Status

\`\`\`bash
# Check if analytics are up to date
python -c "from models import Analytics; from datetime import date; print(Analytics.query.filter_by(date=date.today()).count())"
\`\`\`

### View Recent Activity

\`\`\`bash
# View last 10 activities
python -c "from models import ActivityLog; logs = ActivityLog.query.order_by(ActivityLog.timestamp.desc()).limit(10).all(); [print(f'{log.timestamp} - {log.action_type} - Client {log.client_id}') for log in logs]"
\`\`\`

## Troubleshooting

### Analytics Not Updating

1. Check if cron job is running:
\`\`\`bash
crontab -l
\`\`\`

2. Check cron logs:
\`\`\`bash
grep CRON /var/log/syslog
\`\`\`

3. Manually run analytics update:
\`\`\`bash
python -c "from tasks.scheduler import run_daily_analytics_update; run_daily_analytics_update()"
\`\`\`

### Missing Activity Logs

1. Check if middleware is enabled in `app.py`
2. Verify JWT tokens are being passed correctly
3. Check database connection

### High Database Load

1. Reduce logging frequency for high-traffic endpoints
2. Implement log batching
3. Archive old logs regularly

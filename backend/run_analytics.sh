#!/bin/bash
# Script to run daily analytics update
# Add to crontab: 0 0 * * * /path/to/run_analytics.sh

cd "$(dirname "$0")"
python -c "from tasks.scheduler import run_daily_analytics_update; run_daily_analytics_update()"

"""
Background task scheduler for analytics updates
Can be run via cron job or APScheduler
"""

from datetime import date
from utils.analytics import update_all_clients_analytics

def run_daily_analytics_update():
    """
    Run daily analytics update for all clients
    Should be scheduled to run once per day (e.g., at midnight)
    
    Cron example: 0 0 * * * python -c "from tasks.scheduler import run_daily_analytics_update; run_daily_analytics_update()"
    """
    print(f"[Analytics] Starting daily analytics update for {date.today()}")
    
    results = update_all_clients_analytics()
    
    success_count = len([r for r in results if r['status'] == 'success'])
    error_count = len([r for r in results if r['status'] == 'error'])
    
    print(f"[Analytics] Completed: {success_count} successful, {error_count} errors")
    
    if error_count > 0:
        print("[Analytics] Errors:")
        for result in results:
            if result['status'] == 'error':
                print(f"  - Client {result['client_id']} ({result['client_name']}): {result['error']}")
    
    return results

if __name__ == '__main__':
    # Allow running directly for testing
    run_daily_analytics_update()

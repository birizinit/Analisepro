from datetime import datetime, date, timedelta
from sqlalchemy import func
from models import db, Analytics, ActivityLog, UserToken, WhiteLabelClient

def update_daily_analytics(client_id, analytics_date=None):
    """
    Update or create daily analytics for a specific client
    Called by background task or manually
    """
    if analytics_date is None:
        analytics_date = date.today()
    
    # Get or create analytics record for this date
    analytics = Analytics.query.filter_by(
        client_id=client_id,
        date=analytics_date
    ).first()
    
    if not analytics:
        analytics = Analytics(client_id=client_id, date=analytics_date)
        db.session.add(analytics)
    
    # Calculate metrics for the day
    start_of_day = datetime.combine(analytics_date, datetime.min.time())
    end_of_day = datetime.combine(analytics_date, datetime.max.time())
    
    # Total logins (both admin and token users)
    total_logins = ActivityLog.query.filter(
        ActivityLog.client_id == client_id,
        ActivityLog.action_type == 'login',
        ActivityLog.timestamp >= start_of_day,
        ActivityLog.timestamp <= end_of_day
    ).count()
    
    # Unique tokens used
    unique_tokens = db.session.query(func.count(func.distinct(ActivityLog.token_id))).filter(
        ActivityLog.client_id == client_id,
        ActivityLog.token_id.isnot(None),
        ActivityLog.timestamp >= start_of_day,
        ActivityLog.timestamp <= end_of_day
    ).scalar() or 0
    
    # Total API calls
    total_api_calls = ActivityLog.query.filter(
        ActivityLog.client_id == client_id,
        ActivityLog.action_type == 'api_call',
        ActivityLog.timestamp >= start_of_day,
        ActivityLog.timestamp <= end_of_day
    ).count()
    
    # Active tokens (tokens that are currently active)
    active_tokens = UserToken.query.filter_by(
        client_id=client_id,
        is_active=True
    ).count()
    
    # Update analytics
    analytics.total_logins = total_logins
    analytics.unique_tokens_used = unique_tokens
    analytics.total_api_calls = total_api_calls
    analytics.active_tokens = active_tokens
    
    db.session.commit()
    
    return analytics

def update_all_clients_analytics(analytics_date=None):
    """
    Update analytics for all active clients
    Should be run daily via cron job or scheduler
    """
    if analytics_date is None:
        analytics_date = date.today()
    
    clients = WhiteLabelClient.query.filter_by(is_active=True).all()
    
    results = []
    for client in clients:
        try:
            analytics = update_daily_analytics(client.id, analytics_date)
            results.append({
                'client_id': client.id,
                'client_name': client.client_name,
                'status': 'success',
                'analytics': analytics.to_dict()
            })
        except Exception as e:
            results.append({
                'client_id': client.id,
                'client_name': client.client_name,
                'status': 'error',
                'error': str(e)
            })
    
    return results

def get_client_analytics_summary(client_id, days=30):
    """
    Get analytics summary for a client over a period
    """
    start_date = date.today() - timedelta(days=days)
    
    analytics = Analytics.query.filter(
        Analytics.client_id == client_id,
        Analytics.date >= start_date
    ).order_by(Analytics.date).all()
    
    if not analytics:
        return {
            'total_logins': 0,
            'total_api_calls': 0,
            'avg_daily_logins': 0,
            'avg_daily_api_calls': 0,
            'unique_tokens_used': 0,
            'daily_data': []
        }
    
    total_logins = sum(a.total_logins for a in analytics)
    total_api_calls = sum(a.total_api_calls for a in analytics)
    
    return {
        'total_logins': total_logins,
        'total_api_calls': total_api_calls,
        'avg_daily_logins': round(total_logins / len(analytics), 2),
        'avg_daily_api_calls': round(total_api_calls / len(analytics), 2),
        'unique_tokens_used': sum(a.unique_tokens_used for a in analytics),
        'daily_data': [a.to_dict() for a in analytics]
    }

def get_system_analytics_summary(days=30):
    """
    Get system-wide analytics summary
    """
    start_date = date.today() - timedelta(days=days)
    
    # Aggregate across all clients
    daily_stats = db.session.query(
        Analytics.date,
        func.sum(Analytics.total_logins).label('total_logins'),
        func.sum(Analytics.unique_tokens_used).label('unique_tokens'),
        func.sum(Analytics.total_api_calls).label('total_api_calls'),
        func.sum(Analytics.active_tokens).label('active_tokens')
    ).filter(Analytics.date >= start_date)\
     .group_by(Analytics.date)\
     .order_by(Analytics.date)\
     .all()
    
    if not daily_stats:
        return {
            'total_logins': 0,
            'total_api_calls': 0,
            'total_unique_tokens': 0,
            'avg_daily_logins': 0,
            'daily_data': []
        }
    
    total_logins = sum(stat.total_logins or 0 for stat in daily_stats)
    total_api_calls = sum(stat.total_api_calls or 0 for stat in daily_stats)
    
    return {
        'total_logins': total_logins,
        'total_api_calls': total_api_calls,
        'total_unique_tokens': sum(stat.unique_tokens or 0 for stat in daily_stats),
        'avg_daily_logins': round(total_logins / len(daily_stats), 2),
        'daily_data': [{
            'date': stat.date.isoformat(),
            'total_logins': stat.total_logins or 0,
            'unique_tokens': stat.unique_tokens or 0,
            'total_api_calls': stat.total_api_calls or 0,
            'active_tokens': stat.active_tokens or 0
        } for stat in daily_stats]
    }

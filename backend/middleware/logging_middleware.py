from flask import request, g
from models import db, ActivityLog
from datetime import datetime
import time

def log_request_middleware(app):
    """
    Middleware to automatically log API requests
    """
    
    @app.before_request
    def before_request():
        g.start_time = time.time()
        g.client_id = None
        g.token_id = None
        
        # Try to get client_id and token_id from JWT if present
        try:
            from flask_jwt_extended import get_jwt, verify_jwt_in_request
            verify_jwt_in_request(optional=True)
            claims = get_jwt()
            g.client_id = claims.get('client_id')
            g.token_id = claims.get('token_id')
        except:
            pass
    
    @app.after_request
    def after_request(response):
        # Only log certain endpoints (not health checks, static files, etc.)
        if should_log_request(request.path):
            try:
                duration = time.time() - g.start_time
                
                # Determine action type based on endpoint
                action_type = determine_action_type(request.path, request.method)
                
                if action_type and g.client_id:
                    log = ActivityLog(
                        client_id=g.client_id,
                        token_id=g.token_id,
                        action_type=action_type,
                        action_details=f"{request.method} {request.path} - {response.status_code} ({duration:.2f}s)",
                        ip_address=request.remote_addr,
                        user_agent=request.headers.get('User-Agent')
                    )
                    db.session.add(log)
                    db.session.commit()
            except Exception as e:
                # Don't let logging errors break the response
                print(f"[v0] Logging error: {str(e)}")
        
        return response

def should_log_request(path):
    """Determine if a request should be logged"""
    # Don't log health checks, static files, etc.
    skip_paths = ['/health', '/static/', '/favicon.ico']
    
    for skip_path in skip_paths:
        if path.startswith(skip_path):
            return False
    
    return True

def determine_action_type(path, method):
    """Determine the action type based on the request path and method"""
    
    # Authentication endpoints
    if '/auth/login' in path:
        return 'login'
    if '/auth/logout' in path:
        return 'logout'
    
    # Settings changes
    if '/client/theme' in path or '/client/customization' in path or '/client/profile' in path:
        if method in ['PUT', 'POST', 'PATCH']:
            return 'settings_change'
    
    # Token management
    if '/client/tokens' in path:
        if method == 'POST':
            return 'token_created'
        elif method == 'DELETE':
            return 'token_deleted'
    
    # General API calls
    if path.startswith('/api/'):
        return 'api_call'
    
    return None

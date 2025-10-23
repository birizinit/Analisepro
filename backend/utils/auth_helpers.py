from functools import wraps
from flask import request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
from db_client import get_supabase
from datetime import datetime

def log_activity(client_id, token_id, action_type, action_details=None):
    """Helper function to log activities"""
    try:
        supabase = get_supabase()
        supabase.table('activity_logs').insert({
            'client_id': client_id,
            'token_id': token_id,
            'action_type': action_type,
            'action_details': action_details,
            'ip_address': request.remote_addr,
            'user_agent': request.headers.get('User-Agent'),
            'timestamp': datetime.utcnow().isoformat()
        }).execute()
    except Exception as e:
        print(f"Error logging activity: {str(e)}")

def super_admin_required():
    """Decorator to require super admin authentication"""
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get('role') != 'super_admin':
                return jsonify({'error': 'Super admin access required'}), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper

def client_admin_required():
    """Decorator to require white label client admin authentication"""
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get('role') != 'client_admin':
                return jsonify({'error': 'Client admin access required'}), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper

def token_required():
    """Decorator to require valid user token authentication"""
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get('role') != 'token_user':
                return jsonify({'error': 'Valid token required'}), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper

def get_current_user():
    """Get current authenticated user based on JWT claims"""
    try:
        verify_jwt_in_request()
        identity = get_jwt_identity()
        claims = get_jwt()
        role = claims.get('role')
        
        supabase = get_supabase()
        
        if role == 'super_admin':
            response = supabase.table('super_admin').select('*').eq('id', identity).execute()
            return response.data[0] if response.data else None
        elif role == 'client_admin':
            response = supabase.table('white_label_clients').select('*').eq('id', identity).execute()
            return response.data[0] if response.data else None
        elif role == 'token_user':
            response = supabase.table('user_tokens').select('*').eq('id', identity).execute()
            return response.data[0] if response.data else None
        
        return None
    except:
        return None

def validate_token_access(token_string):
    """Validate if a token is active and update usage"""
    supabase = get_supabase()
    
    # Get token with client info
    response = supabase.table('user_tokens').select('*, white_label_clients(*)').eq('token', token_string).execute()
    
    if not response.data:
        return None, "Invalid token"
    
    token = response.data[0]
    
    if not token['is_active']:
        return None, "Token is inactive"
    
    if token['expiry_date'] and datetime.fromisoformat(token['expiry_date']) < datetime.utcnow():
        return None, "Token has expired"
    
    # Check if client is active
    client = token.get('white_label_clients')
    if not client or not client.get('is_active'):
        return None, "Client account is inactive"
    
    # Update token usage
    supabase.table('user_tokens').update({
        'last_used': datetime.utcnow().isoformat(),
        'usage_count': token['usage_count'] + 1
    }).eq('id', token['id']).execute()
    
    return token, None

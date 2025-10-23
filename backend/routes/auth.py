from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt
from db_client import get_supabase
from utils.auth_helpers import log_activity, validate_token_access
from models import check_password
from datetime import datetime

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/super-admin/login', methods=['POST'])
def super_admin_login():
    """Super Admin login endpoint"""
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password required'}), 400
    
    supabase = get_supabase()
    
    # Get admin by username
    response = supabase.table('super_admin').select('*').eq('username', data['username']).execute()
    
    if not response.data:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    admin = response.data[0]
    
    if not check_password(data['password'], admin['password_hash']):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    if not admin['is_active']:
        return jsonify({'error': 'Account is inactive'}), 403
    
    # Update last login
    supabase.table('super_admin').update({
        'last_login': datetime.utcnow().isoformat()
    }).eq('id', admin['id']).execute()
    
    # Create JWT tokens
    additional_claims = {'role': 'super_admin'}
    access_token = create_access_token(identity=admin['id'], additional_claims=additional_claims)
    refresh_token = create_refresh_token(identity=admin['id'], additional_claims=additional_claims)
    
    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': {
            'id': admin['id'],
            'username': admin['username'],
            'email': admin['email'],
            'created_at': admin['created_at'],
            'last_login': admin['last_login'],
            'is_active': admin['is_active']
        },
        'role': 'super_admin'
    }), 200

@auth_bp.route('/client/login', methods=['POST'])
def client_login():
    """White Label Client Admin login endpoint"""
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password required'}), 400
    
    supabase = get_supabase()
    
    # Get client by username
    response = supabase.table('white_label_clients').select('*').eq('admin_username', data['username']).execute()
    
    if not response.data:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    client = response.data[0]
    
    if not check_password(data['password'], client['admin_password_hash']):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    if not client['is_active']:
        return jsonify({'error': 'Account is inactive'}), 403
    
    # Update last login
    supabase.table('white_label_clients').update({
        'last_login': datetime.utcnow().isoformat()
    }).eq('id', client['id']).execute()
    
    # Log activity
    log_activity(client['id'], None, 'login', f'Client admin {client["admin_username"]} logged in')
    
    # Create JWT tokens
    additional_claims = {'role': 'client_admin', 'client_id': client['id']}
    access_token = create_access_token(identity=client['id'], additional_claims=additional_claims)
    refresh_token = create_refresh_token(identity=client['id'], additional_claims=additional_claims)
    
    # Get active tokens count
    tokens_response = supabase.table('user_tokens').select('id', count='exact').eq('client_id', client['id']).eq('is_active', True).execute()
    active_tokens_count = tokens_response.count if tokens_response.count else 0
    
    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': {
            'id': client['id'],
            'client_name': client['client_name'],
            'subdomain': client['subdomain'],
            'admin_username': client['admin_username'],
            'admin_email': client['admin_email'],
            'logo_url': client['logo_url'],
            'primary_color': client['primary_color'],
            'secondary_color': client['secondary_color'],
            'accent_color': client['accent_color'],
            'text_color': client['text_color'],
            'is_active': client['is_active'],
            'created_at': client['created_at'],
            'last_login': client['last_login'],
            'subscription_tier': client['subscription_tier'],
            'max_tokens': client['max_tokens'],
            'active_tokens_count': active_tokens_count
        },
        'role': 'client_admin'
    }), 200

@auth_bp.route('/token/login', methods=['POST'])
def token_login():
    """End User Token-based login endpoint"""
    data = request.get_json()
    
    if not data or not data.get('token'):
        return jsonify({'error': 'Token required'}), 400
    
    # Validate token
    token, error = validate_token_access(data['token'])
    
    if error:
        return jsonify({'error': error}), 401
    
    # Log activity
    log_activity(token['client_id'], token['id'], 'token_access', f'Token {token["token"]} accessed system')
    
    # Create JWT tokens
    additional_claims = {
        'role': 'token_user',
        'client_id': token['client_id'],
        'token_id': token['id']
    }
    access_token = create_access_token(identity=token['id'], additional_claims=additional_claims)
    refresh_token = create_refresh_token(identity=token['id'], additional_claims=additional_claims)
    
    # Get client customization and theme
    supabase = get_supabase()
    client = token.get('white_label_clients')
    
    customization_response = supabase.table('client_customization').select('*').eq('client_id', token['client_id']).execute()
    customization = customization_response.data[0] if customization_response.data else None
    
    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'token': {
            'id': token['id'],
            'client_id': token['client_id'],
            'token': token['token'],
            'token_name': token['token_name'],
            'is_active': token['is_active'],
            'created_at': token['created_at'],
            'last_used': token['last_used'],
            'expiry_date': token['expiry_date'],
            'usage_count': token['usage_count']
        },
        'client': {
            'id': client['id'],
            'client_name': client['client_name'],
            'logo_url': client['logo_url'],
            'primary_color': client['primary_color'],
            'secondary_color': client['secondary_color'],
            'accent_color': client['accent_color'],
            'text_color': client['text_color']
        },
        'customization': customization,
        'role': 'token_user'
    }), 200

@auth_bp.route('/verify', methods=['GET'])
@jwt_required()
def verify_token():
    """Verify JWT token and return user info"""
    identity = get_jwt_identity()
    claims = get_jwt()
    role = claims.get('role')
    
    supabase = get_supabase()
    
    if role == 'super_admin':
        response = supabase.table('super_admin').select('*').eq('id', identity).execute()
        if response.data:
            user = response.data[0]
            return jsonify({
                'valid': True,
                'role': role,
                'user': {
                    'id': user['id'],
                    'username': user['username'],
                    'email': user['email'],
                    'created_at': user['created_at'],
                    'last_login': user['last_login'],
                    'is_active': user['is_active']
                }
            }), 200
    
    elif role == 'client_admin':
        response = supabase.table('white_label_clients').select('*').eq('id', identity).execute()
        if response.data:
            user = response.data[0]
            tokens_response = supabase.table('user_tokens').select('id', count='exact').eq('client_id', user['id']).eq('is_active', True).execute()
            active_tokens_count = tokens_response.count if tokens_response.count else 0
            
            return jsonify({
                'valid': True,
                'role': role,
                'user': {
                    'id': user['id'],
                    'client_name': user['client_name'],
                    'subdomain': user['subdomain'],
                    'admin_username': user['admin_username'],
                    'admin_email': user['admin_email'],
                    'logo_url': user['logo_url'],
                    'primary_color': user['primary_color'],
                    'secondary_color': user['secondary_color'],
                    'accent_color': user['accent_color'],
                    'text_color': user['text_color'],
                    'is_active': user['is_active'],
                    'created_at': user['created_at'],
                    'last_login': user['last_login'],
                    'subscription_tier': user['subscription_tier'],
                    'max_tokens': user['max_tokens'],
                    'active_tokens_count': active_tokens_count
                }
            }), 200
    
    elif role == 'token_user':
        response = supabase.table('user_tokens').select('*').eq('id', identity).execute()
        if response.data:
            token = response.data[0]
            return jsonify({
                'valid': True,
                'role': role,
                'token': token,
                'client_id': token['client_id']
            }), 200
    
    return jsonify({'valid': False, 'error': 'Invalid token'}), 401

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout endpoint (client-side should discard tokens)"""
    claims = get_jwt()
    role = claims.get('role')
    client_id = claims.get('client_id')
    
    # Log logout activity
    if client_id:
        log_activity(client_id, None, 'logout', f'{role} logged out')
    
    return jsonify({'message': 'Logged out successfully'}), 200

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token using refresh token"""
    identity = get_jwt_identity()
    claims = get_jwt()
    
    # Create new access token with same claims
    additional_claims = {
        'role': claims.get('role'),
        'client_id': claims.get('client_id'),
        'token_id': claims.get('token_id')
    }
    
    access_token = create_access_token(identity=identity, additional_claims=additional_claims)
    
    return jsonify({'access_token': access_token}), 200

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from db_client import get_supabase
from utils.auth_helpers import client_admin_required, log_activity
from models import set_password_hash
from datetime import datetime
import secrets

client_bp = Blueprint('client', __name__)

@client_bp.route('/profile', methods=['GET'])
@jwt_required()
@client_admin_required()
def get_profile():
    """Get client profile"""
    claims = get_jwt()
    client_id = claims.get('client_id')
    
    supabase = get_supabase()
    response = supabase.table('white_label_clients').select('*').eq('id', client_id).execute()
    
    if not response.data:
        return jsonify({'error': 'Client not found'}), 404
    
    client = response.data[0]
    
    # Get active tokens count
    tokens_response = supabase.table('user_tokens').select('id', count='exact').eq('client_id', client_id).eq('is_active', True).execute()
    active_tokens_count = tokens_response.count if tokens_response.count else 0
    
    client['active_tokens_count'] = active_tokens_count
    
    return jsonify(client), 200

@client_bp.route('/profile', methods=['PUT'])
@jwt_required()
@client_admin_required()
def update_profile():
    """Update client profile"""
    claims = get_jwt()
    client_id = claims.get('client_id')
    
    supabase = get_supabase()
    response = supabase.table('white_label_clients').select('*').eq('id', client_id).execute()
    
    if not response.data:
        return jsonify({'error': 'Client not found'}), 404
    
    data = request.get_json()
    updates = {}
    
    # Update allowed fields
    if 'client_name' in data:
        updates['client_name'] = data['client_name']
    if 'admin_email' in data:
        updates['admin_email'] = data['admin_email']
    if 'logo_url' in data:
        updates['logo_url'] = data['logo_url']
    
    if updates:
        supabase.table('white_label_clients').update(updates).eq('id', client_id).execute()
        log_activity(client_id, None, 'settings_change', 'Profile updated')
    
    # Get updated client
    response = supabase.table('white_label_clients').select('*').eq('id', client_id).execute()
    return jsonify(response.data[0]), 200

@client_bp.route('/theme', methods=['PUT'])
@jwt_required()
@client_admin_required()
def update_theme():
    """Update client theme colors"""
    claims = get_jwt()
    client_id = claims.get('client_id')
    
    supabase = get_supabase()
    response = supabase.table('white_label_clients').select('*').eq('id', client_id).execute()
    
    if not response.data:
        return jsonify({'error': 'Client not found'}), 404
    
    data = request.get_json()
    updates = {}
    
    # Update theme colors
    if 'primary_color' in data:
        updates['primary_color'] = data['primary_color']
    if 'secondary_color' in data:
        updates['secondary_color'] = data['secondary_color']
    if 'accent_color' in data:
        updates['accent_color'] = data['accent_color']
    if 'text_color' in data:
        updates['text_color'] = data['text_color']
    
    if updates:
        supabase.table('white_label_clients').update(updates).eq('id', client_id).execute()
        log_activity(client_id, None, 'theme_update', 'Theme colors updated')
    
    # Get updated colors
    response = supabase.table('white_label_clients').select('primary_color, secondary_color, accent_color, text_color').eq('id', client_id).execute()
    return jsonify(response.data[0]), 200

@client_bp.route('/customization', methods=['GET'])
@jwt_required()
@client_admin_required()
def get_customization():
    """Get client customization settings"""
    claims = get_jwt()
    client_id = claims.get('client_id')
    
    supabase = get_supabase()
    response = supabase.table('client_customization').select('*').eq('client_id', client_id).execute()
    
    if not response.data:
        # Create default customization
        default_customization = {
            'client_id': client_id,
            'enabled_assets': ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
            'enabled_timeframes': ['1m', '5m', '15m', '1h', '4h', '1d'],
            'confluence_threshold': 3,
            'rsi_enabled': True,
            'macd_enabled': True,
            'bb_enabled': True,
            'ema_enabled': True,
            'volume_enabled': True
        }
        response = supabase.table('client_customization').insert(default_customization).execute()
        return jsonify(response.data[0]), 200
    
    return jsonify(response.data[0]), 200

@client_bp.route('/customization', methods=['PUT'])
@jwt_required()
@client_admin_required()
def update_customization():
    """Update client customization settings"""
    claims = get_jwt()
    client_id = claims.get('client_id')
    
    supabase = get_supabase()
    data = request.get_json()
    
    updates = {'updated_at': datetime.utcnow().isoformat()}
    
    # Update customization fields
    if 'enabled_assets' in data:
        updates['enabled_assets'] = data['enabled_assets']
    if 'enabled_timeframes' in data:
        updates['enabled_timeframes'] = data['enabled_timeframes']
    if 'confluence_threshold' in data:
        updates['confluence_threshold'] = data['confluence_threshold']
    if 'rsi_enabled' in data:
        updates['rsi_enabled'] = data['rsi_enabled']
    if 'macd_enabled' in data:
        updates['macd_enabled'] = data['macd_enabled']
    if 'bb_enabled' in data:
        updates['bb_enabled'] = data['bb_enabled']
    if 'ema_enabled' in data:
        updates['ema_enabled'] = data['ema_enabled']
    if 'volume_enabled' in data:
        updates['volume_enabled'] = data['volume_enabled']
    
    response = supabase.table('client_customization').update(updates).eq('client_id', client_id).execute()
    
    log_activity(client_id, None, 'settings_change', 'Customization settings updated')
    
    return jsonify(response.data[0] if response.data else {}), 200

@client_bp.route('/tokens', methods=['GET'])
@jwt_required()
@client_admin_required()
def get_tokens():
    """Get all tokens for client"""
    claims = get_jwt()
    client_id = claims.get('client_id')
    
    supabase = get_supabase()
    response = supabase.table('user_tokens').select('*').eq('client_id', client_id).order('created_at', desc=True).execute()
    
    tokens = response.data if response.data else []
    active_count = len([t for t in tokens if t['is_active']])
    
    return jsonify({
        'tokens': tokens,
        'total': len(tokens),
        'active': active_count
    }), 200

@client_bp.route('/tokens', methods=['POST'])
@jwt_required()
@client_admin_required()
def create_token():
    """Create new user token"""
    claims = get_jwt()
    client_id = claims.get('client_id')
    
    supabase = get_supabase()
    
    # Get client to check token limit
    client_response = supabase.table('white_label_clients').select('max_tokens').eq('id', client_id).execute()
    client = client_response.data[0] if client_response.data else None
    
    if not client:
        return jsonify({'error': 'Client not found'}), 404
    
    # Check token limit
    tokens_response = supabase.table('user_tokens').select('id', count='exact').eq('client_id', client_id).eq('is_active', True).execute()
    active_tokens = tokens_response.count if tokens_response.count else 0
    
    if active_tokens >= client['max_tokens']:
        return jsonify({'error': f'Token limit reached ({client["max_tokens"]})'}), 400
    
    data = request.get_json()
    
    # Generate unique token
    token_string = secrets.token_urlsafe(32)
    
    new_token = {
        'client_id': client_id,
        'token': token_string,
        'token_name': data.get('token_name', f'Token-{active_tokens + 1}'),
        'expiry_date': data.get('expiry_date')
    }
    
    response = supabase.table('user_tokens').insert(new_token).execute()
    
    if response.data:
        log_activity(client_id, response.data[0]['id'], 'token_created', f'Token {response.data[0]["token_name"]} created')
        return jsonify(response.data[0]), 201
    
    return jsonify({'error': 'Failed to create token'}), 500

@client_bp.route('/tokens/<int:token_id>', methods=['DELETE'])
@jwt_required()
@client_admin_required()
def delete_token(token_id):
    """Delete/deactivate a token"""
    claims = get_jwt()
    client_id = claims.get('client_id')
    
    supabase = get_supabase()
    
    # Get token to verify ownership
    response = supabase.table('user_tokens').select('*').eq('id', token_id).eq('client_id', client_id).execute()
    
    if not response.data:
        return jsonify({'error': 'Token not found'}), 404
    
    token = response.data[0]
    
    # Deactivate token
    supabase.table('user_tokens').update({'is_active': False}).eq('id', token_id).execute()
    
    log_activity(client_id, token_id, 'token_deleted', f'Token {token["token_name"]} deactivated')
    
    return jsonify({'message': 'Token deactivated'}), 200

@client_bp.route('/tokens/<int:token_id>/toggle', methods=['PUT'])
@jwt_required()
@client_admin_required()
def toggle_token(token_id):
    """Toggle token active status"""
    claims = get_jwt()
    client_id = claims.get('client_id')
    
    supabase = get_supabase()
    
    # Get token to verify ownership
    response = supabase.table('user_tokens').select('*').eq('id', token_id).eq('client_id', client_id).execute()
    
    if not response.data:
        return jsonify({'error': 'Token not found'}), 404
    
    token = response.data[0]
    new_status = not token['is_active']
    
    # Toggle status
    update_response = supabase.table('user_tokens').update({'is_active': new_status}).eq('id', token_id).execute()
    
    status = 'activated' if new_status else 'deactivated'
    log_activity(client_id, token_id, 'settings_change', f'Token {token["token_name"]} {status}')
    
    return jsonify(update_response.data[0] if update_response.data else {}), 200
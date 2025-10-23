from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import (db, SuperAdmin, WhiteLabelClient, UserToken, ClientCustomization, 
                    ActivityLog, Analytics, SystemSettings, APIKey)
from utils.auth_helpers import super_admin_required, log_activity
from datetime import datetime, timedelta
from sqlalchemy import func

super_admin_bp = Blueprint('super_admin', __name__)

# ============= CLIENT MANAGEMENT =============

@super_admin_bp.route('/clients', methods=['GET'])
@jwt_required()
@super_admin_required()
def get_all_clients():
    """Get all white label clients with statistics"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '')
    status = request.args.get('status', 'all')  # all, active, inactive
    
    query = WhiteLabelClient.query
    
    # Apply filters
    if search:
        query = query.filter(
            (WhiteLabelClient.client_name.ilike(f'%{search}%')) |
            (WhiteLabelClient.subdomain.ilike(f'%{search}%')) |
            (WhiteLabelClient.admin_email.ilike(f'%{search}%'))
        )
    
    if status == 'active':
        query = query.filter_by(is_active=True)
    elif status == 'inactive':
        query = query.filter_by(is_active=False)
    
    # Paginate
    pagination = query.order_by(WhiteLabelClient.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    clients_data = []
    for client in pagination.items:
        client_dict = client.to_dict()
        # Add statistics
        client_dict['total_tokens'] = UserToken.query.filter_by(client_id=client.id).count()
        client_dict['active_tokens'] = UserToken.query.filter_by(client_id=client.id, is_active=True).count()
        clients_data.append(client_dict)
    
    return jsonify({
        'clients': clients_data,
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page,
        'per_page': per_page
    }), 200

@super_admin_bp.route('/clients/<int:client_id>', methods=['GET'])
@jwt_required()
@super_admin_required()
def get_client_details(client_id):
    """Get detailed information about a specific client"""
    client = WhiteLabelClient.query.get(client_id)
    
    if not client:
        return jsonify({'error': 'Client not found'}), 404
    
    # Get client data with relationships
    client_data = client.to_dict()
    
    # Get customization
    if client.customization:
        client_data['customization'] = client.customization.to_dict()
    
    # Get tokens
    tokens = UserToken.query.filter_by(client_id=client_id).all()
    client_data['tokens'] = [token.to_dict() for token in tokens]
    
    # Get recent activity
    recent_activity = ActivityLog.query.filter_by(client_id=client_id)\
        .order_by(ActivityLog.timestamp.desc()).limit(10).all()
    client_data['recent_activity'] = [log.to_dict() for log in recent_activity]
    
    # Get analytics summary (last 30 days)
    thirty_days_ago = datetime.utcnow().date() - timedelta(days=30)
    analytics = Analytics.query.filter(
        Analytics.client_id == client_id,
        Analytics.date >= thirty_days_ago
    ).all()
    
    client_data['analytics_summary'] = {
        'total_logins': sum(a.total_logins for a in analytics),
        'total_api_calls': sum(a.total_api_calls for a in analytics),
        'unique_tokens_used': sum(a.unique_tokens_used for a in analytics)
    }
    
    return jsonify(client_data), 200

@super_admin_bp.route('/clients', methods=['POST'])
@jwt_required()
@super_admin_required()
def create_client():
    """Create a new white label client"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['client_name', 'subdomain', 'admin_username', 'admin_email', 'admin_password']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # Check if subdomain or username already exists
    if WhiteLabelClient.query.filter_by(subdomain=data['subdomain']).first():
        return jsonify({'error': 'Subdomain already exists'}), 400
    
    if WhiteLabelClient.query.filter_by(admin_username=data['admin_username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    if WhiteLabelClient.query.filter_by(admin_email=data['admin_email']).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    # Create new client
    new_client = WhiteLabelClient(
        client_name=data['client_name'],
        subdomain=data['subdomain'],
        admin_username=data['admin_username'],
        admin_email=data['admin_email'],
        logo_url=data.get('logo_url'),
        subscription_tier=data.get('subscription_tier', 'basic'),
        max_tokens=data.get('max_tokens', 100)
    )
    new_client.set_password(data['admin_password'])
    
    # Set theme colors if provided
    if 'primary_color' in data:
        new_client.primary_color = data['primary_color']
    if 'secondary_color' in data:
        new_client.secondary_color = data['secondary_color']
    if 'accent_color' in data:
        new_client.accent_color = data['accent_color']
    if 'text_color' in data:
        new_client.text_color = data['text_color']
    
    db.session.add(new_client)
    db.session.flush()  # Get the client ID
    
    # Create default customization
    customization = ClientCustomization(client_id=new_client.id)
    db.session.add(customization)
    
    db.session.commit()
    
    return jsonify(new_client.to_dict()), 201

@super_admin_bp.route('/clients/<int:client_id>', methods=['PUT'])
@jwt_required()
@super_admin_required()
def update_client(client_id):
    """Update client information"""
    client = WhiteLabelClient.query.get(client_id)
    
    if not client:
        return jsonify({'error': 'Client not found'}), 404
    
    data = request.get_json()
    
    # Update allowed fields
    if 'client_name' in data:
        client.client_name = data['client_name']
    if 'admin_email' in data:
        client.admin_email = data['admin_email']
    if 'logo_url' in data:
        client.logo_url = data['logo_url']
    if 'subscription_tier' in data:
        client.subscription_tier = data['subscription_tier']
    if 'max_tokens' in data:
        client.max_tokens = data['max_tokens']
    if 'is_active' in data:
        client.is_active = data['is_active']
    
    # Update theme colors
    if 'primary_color' in data:
        client.primary_color = data['primary_color']
    if 'secondary_color' in data:
        client.secondary_color = data['secondary_color']
    if 'accent_color' in data:
        client.accent_color = data['accent_color']
    if 'text_color' in data:
        client.text_color = data['text_color']
    
    # Update password if provided
    if 'admin_password' in data:
        client.set_password(data['admin_password'])
    
    db.session.commit()
    
    return jsonify(client.to_dict()), 200

@super_admin_bp.route('/clients/<int:client_id>', methods=['DELETE'])
@jwt_required()
@super_admin_required()
def delete_client(client_id):
    """Delete a client (soft delete by deactivating)"""
    client = WhiteLabelClient.query.get(client_id)
    
    if not client:
        return jsonify({'error': 'Client not found'}), 404
    
    # Soft delete - just deactivate
    client.is_active = False
    db.session.commit()
    
    return jsonify({'message': 'Client deactivated successfully'}), 200

@super_admin_bp.route('/clients/<int:client_id>/toggle', methods=['PUT'])
@jwt_required()
@super_admin_required()
def toggle_client_status(client_id):
    """Toggle client active status"""
    client = WhiteLabelClient.query.get(client_id)
    
    if not client:
        return jsonify({'error': 'Client not found'}), 404
    
    client.is_active = not client.is_active
    db.session.commit()
    
    return jsonify(client.to_dict()), 200

# ============= DASHBOARD STATISTICS =============

@super_admin_bp.route('/dashboard/stats', methods=['GET'])
@jwt_required()
@super_admin_required()
def get_dashboard_stats():
    """Get overall system statistics for dashboard"""
    
    # Total clients
    total_clients = WhiteLabelClient.query.count()
    active_clients = WhiteLabelClient.query.filter_by(is_active=True).count()
    
    # Total tokens
    total_tokens = UserToken.query.count()
    active_tokens = UserToken.query.filter_by(is_active=True).count()
    
    # Recent activity (last 24 hours)
    yesterday = datetime.utcnow() - timedelta(days=1)
    recent_logins = ActivityLog.query.filter(
        ActivityLog.action_type == 'login',
        ActivityLog.timestamp >= yesterday
    ).count()
    
    # Analytics summary (last 30 days)
    thirty_days_ago = datetime.utcnow().date() - timedelta(days=30)
    analytics = Analytics.query.filter(Analytics.date >= thirty_days_ago).all()
    
    total_api_calls = sum(a.total_api_calls for a in analytics)
    
    # Client growth (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    new_clients_week = WhiteLabelClient.query.filter(
        WhiteLabelClient.created_at >= seven_days_ago
    ).count()
    
    # Subscription tier breakdown
    tier_breakdown = db.session.query(
        WhiteLabelClient.subscription_tier,
        func.count(WhiteLabelClient.id)
    ).group_by(WhiteLabelClient.subscription_tier).all()
    
    return jsonify({
        'clients': {
            'total': total_clients,
            'active': active_clients,
            'inactive': total_clients - active_clients,
            'new_this_week': new_clients_week
        },
        'tokens': {
            'total': total_tokens,
            'active': active_tokens,
            'inactive': total_tokens - active_tokens
        },
        'activity': {
            'recent_logins_24h': recent_logins,
            'total_api_calls_30d': total_api_calls
        },
        'subscription_tiers': {tier: count for tier, count in tier_breakdown}
    }), 200

@super_admin_bp.route('/dashboard/recent-activity', methods=['GET'])
@jwt_required()
@super_admin_required()
def get_recent_activity():
    """Get recent system-wide activity"""
    limit = request.args.get('limit', 50, type=int)
    
    activities = ActivityLog.query\
        .order_by(ActivityLog.timestamp.desc())\
        .limit(limit)\
        .all()
    
    activity_data = []
    for activity in activities:
        activity_dict = activity.to_dict()
        
        # Add client name
        if activity.client_id:
            client = WhiteLabelClient.query.get(activity.client_id)
            if client:
                activity_dict['client_name'] = client.client_name
        
        activity_data.append(activity_dict)
    
    return jsonify({'activities': activity_data}), 200

@super_admin_bp.route('/dashboard/analytics', methods=['GET'])
@jwt_required()
@super_admin_required()
def get_system_analytics():
    """Get system-wide analytics over time"""
    days = request.args.get('days', 30, type=int)
    
    start_date = datetime.utcnow().date() - timedelta(days=days)
    
    # Get daily analytics aggregated across all clients
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
    
    analytics_data = [{
        'date': stat.date.isoformat(),
        'total_logins': stat.total_logins or 0,
        'unique_tokens': stat.unique_tokens or 0,
        'total_api_calls': stat.total_api_calls or 0,
        'active_tokens': stat.active_tokens or 0
    } for stat in daily_stats]
    
    return jsonify({'analytics': analytics_data}), 200

# ============= SYSTEM SETTINGS =============

@super_admin_bp.route('/settings', methods=['GET'])
@jwt_required()
@super_admin_required()
def get_system_settings():
    """Get all system settings"""
    settings = SystemSettings.query.all()
    return jsonify({'settings': [s.to_dict() for s in settings]}), 200

@super_admin_bp.route('/settings/<setting_key>', methods=['PUT'])
@jwt_required()
@super_admin_required()
def update_system_setting(setting_key):
    """Update a system setting"""
    data = request.get_json()
    
    if 'setting_value' not in data:
        return jsonify({'error': 'setting_value required'}), 400
    
    setting = SystemSettings.query.filter_by(setting_key=setting_key).first()
    
    if not setting:
        # Create new setting
        setting = SystemSettings(
            setting_key=setting_key,
            setting_value=data['setting_value'],
            description=data.get('description', '')
        )
        db.session.add(setting)
    else:
        setting.setting_value = data['setting_value']
        if 'description' in data:
            setting.description = data['description']
        setting.updated_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify(setting.to_dict()), 200

# ============= BULK OPERATIONS =============

@super_admin_bp.route('/clients/bulk-update', methods=['POST'])
@jwt_required()
@super_admin_required()
def bulk_update_clients():
    """Bulk update multiple clients"""
    data = request.get_json()
    
    client_ids = data.get('client_ids', [])
    updates = data.get('updates', {})
    
    if not client_ids or not updates:
        return jsonify({'error': 'client_ids and updates required'}), 400
    
    clients = WhiteLabelClient.query.filter(WhiteLabelClient.id.in_(client_ids)).all()
    
    for client in clients:
        if 'is_active' in updates:
            client.is_active = updates['is_active']
        if 'subscription_tier' in updates:
            client.subscription_tier = updates['subscription_tier']
        if 'max_tokens' in updates:
            client.max_tokens = updates['max_tokens']
    
    db.session.commit()
    
    return jsonify({
        'message': f'Updated {len(clients)} clients',
        'updated_count': len(clients)
    }), 200

@super_admin_bp.route('/profile', methods=['GET'])
@jwt_required()
@super_admin_required()
def get_super_admin_profile():
    """Get super admin profile"""
    admin_id = get_jwt_identity()
    admin = SuperAdmin.query.get(admin_id)
    
    if not admin:
        return jsonify({'error': 'Admin not found'}), 404
    
    return jsonify(admin.to_dict()), 200

@super_admin_bp.route('/profile', methods=['PUT'])
@jwt_required()
@super_admin_required()
def update_super_admin_profile():
    """Update super admin profile"""
    admin_id = get_jwt_identity()
    admin = SuperAdmin.query.get(admin_id)
    
    if not admin:
        return jsonify({'error': 'Admin not found'}), 404
    
    data = request.get_json()
    
    if 'email' in data:
        admin.email = data['email']
    if 'password' in data:
        admin.set_password(data['password'])
    
    db.session.commit()
    
    return jsonify(admin.to_dict()), 200

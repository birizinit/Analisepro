from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from models import db, Analytics, ActivityLog
from utils.auth_helpers import client_admin_required, super_admin_required
from utils.analytics import (
    update_daily_analytics, 
    get_client_analytics_summary,
    get_system_analytics_summary,
    update_all_clients_analytics
)
from datetime import datetime, date, timedelta

analytics_bp = Blueprint('analytics', __name__)

# ============= CLIENT ANALYTICS =============

@analytics_bp.route('/client/summary', methods=['GET'])
@jwt_required()
@client_admin_required()
def get_client_summary():
    """Get analytics summary for the authenticated client"""
    claims = get_jwt()
    client_id = claims.get('client_id')
    days = request.args.get('days', 30, type=int)
    
    summary = get_client_analytics_summary(client_id, days)
    
    return jsonify(summary), 200

@analytics_bp.route('/client/daily', methods=['GET'])
@jwt_required()
@client_admin_required()
def get_client_daily_analytics():
    """Get daily analytics for the authenticated client"""
    claims = get_jwt()
    client_id = claims.get('client_id')
    days = request.args.get('days', 30, type=int)
    
    start_date = date.today() - timedelta(days=days)
    
    analytics = Analytics.query.filter(
        Analytics.client_id == client_id,
        Analytics.date >= start_date
    ).order_by(Analytics.date).all()
    
    return jsonify({
        'analytics': [a.to_dict() for a in analytics]
    }), 200

@analytics_bp.route('/client/activity', methods=['GET'])
@jwt_required()
@client_admin_required()
def get_client_activity():
    """Get recent activity logs for the authenticated client"""
    claims = get_jwt()
    client_id = claims.get('client_id')
    limit = request.args.get('limit', 50, type=int)
    action_type = request.args.get('action_type')
    
    query = ActivityLog.query.filter_by(client_id=client_id)
    
    if action_type:
        query = query.filter_by(action_type=action_type)
    
    activities = query.order_by(ActivityLog.timestamp.desc()).limit(limit).all()
    
    return jsonify({
        'activities': [a.to_dict() for a in activities]
    }), 200

@analytics_bp.route('/client/update', methods=['POST'])
@jwt_required()
@client_admin_required()
def update_client_analytics():
    """Manually trigger analytics update for the authenticated client"""
    claims = get_jwt()
    client_id = claims.get('client_id')
    
    analytics = update_daily_analytics(client_id)
    
    return jsonify({
        'message': 'Analytics updated successfully',
        'analytics': analytics.to_dict()
    }), 200

# ============= SUPER ADMIN ANALYTICS =============

@analytics_bp.route('/system/summary', methods=['GET'])
@jwt_required()
@super_admin_required()
def get_system_summary():
    """Get system-wide analytics summary"""
    days = request.args.get('days', 30, type=int)
    
    summary = get_system_analytics_summary(days)
    
    return jsonify(summary), 200

@analytics_bp.route('/system/update-all', methods=['POST'])
@jwt_required()
@super_admin_required()
def update_all_analytics():
    """Manually trigger analytics update for all clients"""
    results = update_all_clients_analytics()
    
    success_count = len([r for r in results if r['status'] == 'success'])
    error_count = len([r for r in results if r['status'] == 'error'])
    
    return jsonify({
        'message': f'Analytics updated for {success_count} clients, {error_count} errors',
        'results': results
    }), 200

@analytics_bp.route('/client/<int:client_id>/summary', methods=['GET'])
@jwt_required()
@super_admin_required()
def get_specific_client_summary(client_id):
    """Get analytics summary for a specific client (super admin only)"""
    days = request.args.get('days', 30, type=int)
    
    summary = get_client_analytics_summary(client_id, days)
    
    return jsonify(summary), 200

@analytics_bp.route('/client/<int:client_id>/activity', methods=['GET'])
@jwt_required()
@super_admin_required()
def get_specific_client_activity(client_id):
    """Get activity logs for a specific client (super admin only)"""
    limit = request.args.get('limit', 100, type=int)
    action_type = request.args.get('action_type')
    
    query = ActivityLog.query.filter_by(client_id=client_id)
    
    if action_type:
        query = query.filter_by(action_type=action_type)
    
    activities = query.order_by(ActivityLog.timestamp.desc()).limit(limit).all()
    
    return jsonify({
        'activities': [a.to_dict() for a in activities]
    }), 200

# ============= ACTIVITY LOGGING =============

@analytics_bp.route('/log', methods=['POST'])
@jwt_required()
def log_activity():
    """
    Manually log an activity
    Used by frontend to log specific actions like API calls
    """
    claims = get_jwt()
    client_id = claims.get('client_id')
    token_id = claims.get('token_id')
    
    data = request.get_json()
    
    if not data or not data.get('action_type'):
        return jsonify({'error': 'action_type required'}), 400
    
    log = ActivityLog(
        client_id=client_id,
        token_id=token_id,
        action_type=data['action_type'],
        action_details=data.get('action_details'),
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent')
    )
    
    db.session.add(log)
    db.session.commit()
    
    return jsonify({'message': 'Activity logged', 'log': log.to_dict()}), 201

from flask import Flask, send_from_directory, redirect
from flask_cors import CORS
from flask_jwt_extended import JWTManager
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente do arquivo .env
load_dotenv()

from config import config

def create_app(config_name='development'):
    """Application factory pattern"""
    app = Flask(__name__, 
                static_folder='../',
                static_url_path='')
    
    # Load configuration
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    CORS(app, origins=app.config['CORS_ORIGINS'])
    jwt = JWTManager(app)
    
    # Create logs directory
    os.makedirs('logs', exist_ok=True)
    
    from routes.auth import auth_bp
    from routes.client import client_bp
    from routes.super_admin import super_admin_bp
    from routes.analytics import analytics_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(client_bp, url_prefix='/api/client')
    app.register_blueprint(super_admin_bp, url_prefix='/api/super-admin')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    
    from middleware.logging_middleware import log_request_middleware
    log_request_middleware(app)
    
    @app.route('/')
    def index():
        """Redireciona para a página de login"""
        return redirect('/login.html')
    
    @app.route('/login.html')
    def login_page():
        """Serve a página de login"""
        return send_from_directory('..', 'login.html')
    
    @app.route('/index.html')
    def main_page():
        """Serve a página principal do app"""
        return send_from_directory('..', 'index.html')
    
    @app.route('/admin.html')
    def admin_page():
        """Serve a página de administração"""
        return send_from_directory('..', 'admin.html')
    
    @app.route('/health')
    def health_check():
        return {'status': 'healthy', 'message': 'White Label Trading System API'}, 200
    
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return {'error': 'Token has expired'}, 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return {'error': 'Invalid token'}, 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return {'error': 'Authorization token required'}, 401
    
    return app

if __name__ == '__main__':
    app = create_app(os.getenv('FLASK_ENV', 'development'))
    app.run(host='0.0.0.0', port=5000, debug=True)

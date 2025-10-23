# White Label Trading System - API Documentation

## Base URL
\`\`\`
http://localhost:5000/api
\`\`\`

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

---

## Auth Endpoints

### Super Admin Login
**POST** `/auth/super-admin/login`

Request:
\`\`\`json
{
  "username": "superadmin",
  "password": "SuperAdmin123!"
}
\`\`\`

Response:
\`\`\`json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": { "id": 1, "username": "superadmin", ... },
  "role": "super_admin"
}
\`\`\`

### Client Admin Login
**POST** `/auth/client/login`

Request:
\`\`\`json
{
  "username": "client_admin",
  "password": "password123"
}
\`\`\`

### Token User Login
**POST** `/auth/token/login`

Request:
\`\`\`json
{
  "token": "abc123xyz789"
}
\`\`\`

Response includes client theme and customization settings.

### Verify Token
**GET** `/auth/verify`

Requires: JWT token

### Logout
**POST** `/auth/logout`

Requires: JWT token

### Refresh Token
**POST** `/auth/refresh`

Requires: Refresh token

---

## Super Admin Endpoints

All endpoints require Super Admin authentication.

### Get All Clients
**GET** `/super-admin/clients`

Query Parameters:
- `page` (default: 1)
- `per_page` (default: 20)
- `search` (optional)
- `status` (all|active|inactive)

### Get Client Details
**GET** `/super-admin/clients/<client_id>`

Returns detailed client info including tokens, activity, and analytics.

### Create Client
**POST** `/super-admin/clients`

Request:
\`\`\`json
{
  "client_name": "Trading Pro",
  "subdomain": "tradingpro",
  "admin_username": "tradingpro_admin",
  "admin_email": "admin@tradingpro.com",
  "admin_password": "SecurePass123!",
  "subscription_tier": "pro",
  "max_tokens": 500,
  "logo_url": "https://example.com/logo.png",
  "primary_color": "#1a1a2e",
  "secondary_color": "#16213e"
}
\`\`\`

### Update Client
**PUT** `/super-admin/clients/<client_id>`

### Delete Client (Deactivate)
**DELETE** `/super-admin/clients/<client_id>`

### Toggle Client Status
**PUT** `/super-admin/clients/<client_id>/toggle`

### Dashboard Statistics
**GET** `/super-admin/dashboard/stats`

Returns system-wide statistics.

### Recent Activity
**GET** `/super-admin/dashboard/recent-activity?limit=50`

### System Analytics
**GET** `/super-admin/dashboard/analytics?days=30`

### Get System Settings
**GET** `/super-admin/settings`

### Update System Setting
**PUT** `/super-admin/settings/<setting_key>`

Request:
\`\`\`json
{
  "setting_value": "100",
  "description": "Maximum clients allowed"
}
\`\`\`

### Bulk Update Clients
**POST** `/super-admin/clients/bulk-update`

Request:
\`\`\`json
{
  "client_ids": [1, 2, 3],
  "updates": {
    "is_active": true,
    "subscription_tier": "pro"
  }
}
\`\`\`

---

## Client Admin Endpoints

All endpoints require Client Admin authentication.

### Get Profile
**GET** `/client/profile`

### Update Profile
**PUT** `/client/profile`

Request:
\`\`\`json
{
  "client_name": "New Name",
  "admin_email": "newemail@example.com",
  "logo_url": "https://example.com/newlogo.png"
}
\`\`\`

### Update Theme
**PUT** `/client/theme`

Request:
\`\`\`json
{
  "primary_color": "#1a1a2e",
  "secondary_color": "#16213e",
  "accent_color": "#0f3460",
  "text_color": "#e94560"
}
\`\`\`

### Get Customization
**GET** `/client/customization`

### Update Customization
**PUT** `/client/customization`

Request:
\`\`\`json
{
  "enabled_assets": ["BTCUSDT", "ETHUSDT", "BNBUSDT"],
  "enabled_timeframes": ["1m", "5m", "15m", "1h"],
  "confluence_threshold": 3,
  "rsi_enabled": true,
  "macd_enabled": true,
  "bb_enabled": true
}
\`\`\`

### Get All Tokens
**GET** `/client/tokens`

### Create Token
**POST** `/client/tokens`

Request:
\`\`\`json
{
  "token_name": "User Token 1",
  "expiry_date": "2025-12-31T23:59:59Z"
}
\`\`\`

### Delete Token
**DELETE** `/client/tokens/<token_id>`

### Toggle Token Status
**PUT** `/client/tokens/<token_id>/toggle`

---

## Error Responses

All endpoints return standard error responses:

\`\`\`json
{
  "error": "Error message description"
}
\`\`\`

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

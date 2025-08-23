# Production Security Configuration Guide

## Environment Variables Required for Production

Create a `.env` file in the `atlasbackend` directory with the following variables:

```bash
# ========================================
# PRODUCTION ENVIRONMENT CONFIGURATION
# ========================================

# Node Environment
NODE_ENV=production
PORT=8080

# ========================================
# DATABASE CONFIGURATION
# ========================================
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# ========================================
# STREAM CHAT CONFIGURATION
# ========================================
STREAM_API_KEY=your_stream_api_key_here
STREAM_API_SECRET=your_stream_api_secret_here
ADMIN_USER_ID=admin

# ========================================
# GOOGLE SERVICES CONFIGURATION
# ========================================
GOOGLE_SHEETS_API_KEY=your_google_sheets_api_key_here
GOOGLE_CALENDAR_ID=your_google_calendar_id_here

# ========================================
# SECURITY CONFIGURATION
# ========================================
# Comma-separated list of blocked IP addresses
BLOCKED_IPS=192.168.1.100,10.0.0.50

# Rate limiting configuration (optional overrides)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=5
PROPOSAL_RATE_LIMIT_MAX_REQUESTS=10
ADMIN_RATE_LIMIT_MAX_REQUESTS=20

# Request timeout in milliseconds
REQUEST_TIMEOUT_MS=30000

# ========================================
# LOGGING CONFIGURATION
# ========================================
LOG_LEVEL=info
ENABLE_SECURITY_LOGGING=true
ENABLE_REQUEST_LOGGING=true

# ========================================
# CORS CONFIGURATION
# ========================================
# Comma-separated list of allowed origins
ALLOWED_ORIGINS=https://frusapl.com,https://www.frontrangepool.com,https://frbcapl.github.io
```

## Security Features Implemented

### 1. Rate Limiting
- **General Rate Limit**: 100 requests per 15 minutes per IP
- **Authentication Rate Limit**: 5 requests per 15 minutes per IP
- **Proposal Rate Limit**: 10 requests per 5 minutes per IP
- **Admin Rate Limit**: 20 requests per 15 minutes per IP

### 2. Input Validation & Sanitization
- Comprehensive validation for all endpoints
- Input sanitization (trimming, cleaning)
- Content-Type validation
- Request size limits (1MB)

### 3. Security Headers
- Helmet.js for basic security headers
- Additional custom security headers
- XSS protection
- Content type options
- Frame options
- Referrer policy

### 4. Request Monitoring
- Suspicious request detection
- Security logging in production
- IP blocking capability
- Request timeout handling

### 5. CORS Protection
- Whitelisted origins only
- Credentials support
- Strict origin validation

## Production Deployment Checklist

### Before Deployment
- [ ] Set all environment variables
- [ ] Configure MongoDB connection string
- [ ] Set up Stream Chat API keys
- [ ] Configure Google services API keys
- [ ] Set up IP blocking list if needed
- [ ] Configure allowed origins for CORS

### Security Monitoring
- [ ] Enable security logging
- [ ] Monitor suspicious request logs
- [ ] Set up rate limit monitoring
- [ ] Configure backup and recovery
- [ ] Set up health checks

### Performance & Reliability
- [ ] Configure request timeouts
- [ ] Set up proper logging levels
- [ ] Configure backup schedules
- [ ] Set up monitoring and metrics

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong, unique passwords** for all services
3. **Regularly rotate API keys** and secrets
4. **Monitor logs** for suspicious activity
5. **Keep dependencies updated** regularly
6. **Use HTTPS** in production
7. **Implement proper error handling** without exposing sensitive information

## Troubleshooting

### Common Issues
1. **CORS errors**: Check `ALLOWED_ORIGINS` configuration
2. **Rate limiting**: Adjust limits based on usage patterns
3. **Timeout errors**: Increase `REQUEST_TIMEOUT_MS` if needed
4. **Database connection**: Verify MongoDB URI and credentials

### Security Incidents
1. **Suspicious requests detected**: Check logs and consider IP blocking
2. **Rate limit exceeded**: Monitor for potential attacks
3. **Validation errors**: Review input data and validation rules

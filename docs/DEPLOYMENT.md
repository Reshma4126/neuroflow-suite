# NeuroFlow Suite - Deployment Guide

## Team Member 4 - DevOps Deployment Instructions

### Prerequisites
- Docker Desktop installed
- GitHub account with repository access
- Render.com account (or Railway/Heroku)
- MongoDB Atlas account (for production database)

---

## Local Development Deployment

### 1. Start Docker Services
docker-compose up -d

### 2. Verify Services
- Backend API: http://localhost:5000/health
- Mongo Express: http://localhost:8081
- MongoDB: localhost:27017

### 3. Stop Services
docker-compose down

---

## Production Deployment (Render.com)

### Step 1: Setup MongoDB Atlas
1. Create free cluster at https://cloud.mongodb.com
2. Create database user
3. Whitelist all IPs (0.0.0.0/0)
4. Get connection string

### Step 2: Deploy to Render
1. Push code to GitHub
2. Go to https://render.com
3. Create new Web Service
4. Connect GitHub repository
5. Configure:
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && node server.js`
   - Add Environment Variables:
     - `NODE_ENV`: production
     - `MONGODB_URI`: (from MongoDB Atlas)
     - `JWT_SECRET`: (generate secure key)
     - `CORS_ORIGIN`: (frontend URL)

### Step 3: Verify Deployment
- Check health endpoint: https://your-app.onrender.com/health
- Test API endpoints

---

## CI/CD Pipeline

### GitHub Actions Workflow
Automatically runs on push to main/develop branches:
- Runs backend tests
- Builds Docker images
- Tests containers

### Manual Deployment Trigger
git push origin main

---

## Environment Variables

### Development (.env.development)
- Local MongoDB
- Mock authentication
- CORS: localhost:3000

### Production (.env.production)
- MongoDB Atlas
- Real JWT authentication
- CORS: production frontend domain

---

## Monitoring & Health Checks

### Health Endpoint
GET /health

Returns:
{
"status": "OK",
"message": "NeuroFlow Suite Backend",
"database": "Connected",
"timestamp": "2025-10-02T..."
}

### Docker Health Checks
- MongoDB: Ping test every 10s
- Backend: HTTP health check every 30s

---

## Troubleshooting

### Docker Issues
Rebuild containers
docker-compose build --no-cache

View logs
docker-compose logs backend
docker-compose logs mongodb

Restart services
docker-compose restart

### Database Connection Issues
- Verify MongoDB URI format
- Check network connectivity
- Ensure credentials are correct

---

## Team Coordination

### Integration Points
- **Team Member 1**: JWT authentication middleware
- **Team Member 2**: Frontend API calls
- **Team Member 3**: ML model API endpoints
- **Team Member 4**: Infrastructure & deployment

### API Base URLs
- Development: http://localhost:5000
- Production: https://neuroflow-backend.onrender.com

---

## Security Checklist
- [ ] Change default MongoDB passwords
- [ ] Generate strong JWT secret
- [ ] Enable HTTPS in production
- [ ] Restrict CORS origins
- [ ] Set up environment variable encryption
- [ ] Enable Docker security scanning

---

**Deployed by Team Member 4 - DevOps Lead**

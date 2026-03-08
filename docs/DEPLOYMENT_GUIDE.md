# Deployment Guide

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Git

---

## Local Development Setup

### 1. Clone and Install

```bash
# Navigate to project directory
cd project_2

# Install dependencies
npm install
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb maturity_assessment

# Or using psql
psql -U postgres
CREATE DATABASE maturity_assessment;
\q
```

### 3. Environment Configuration

Create a `.env` file in the project root:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=maturity_assessment
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_make_it_long_and_random
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Frontend URL (optional, for React)
VITE_API_URL=http://localhost:3000/api
```

### 4. Run Database Migrations

```bash
# Run the migration script
node server/database/migrate.js
```

This will:
- Create all database tables
- Set up indexes and views
- Insert sample data
- Create default users with hashed passwords

### 5. Start Development Servers

```bash
# Option 1: Start both backend and frontend together
npm run dev

# Option 2: Start them separately in different terminals
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000

---

## Default User Credentials

After running migrations, you can login with:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@system.gov | password123 |
| Ministry Admin | admin@modt.gov | password123 |
| Entity User | user@ncc.gov | password123 |

**⚠️ IMPORTANT**: Change these passwords in production!

---

## Production Deployment

### 1. Build Frontend

```bash
npm run build
```

This creates optimized production files in the `dist/` directory.

### 2. Environment Variables for Production

Update `.env` for production:

```env
NODE_ENV=production
PORT=3000
DB_HOST=your_production_db_host
DB_NAME=your_production_db_name
DB_USER=your_production_db_user
DB_PASSWORD=your_secure_production_password
JWT_SECRET=very_long_random_secret_key_for_production
CORS_ORIGIN=https://yourdomain.com
```

### 3. Serve Static Files

Add this to `server/index.js` before the routes:

```javascript
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from React build
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '../dist/index.html'));
    }
  });
}
```

### 4. Start Production Server

```bash
# Using Node
node server/index.js

# Using PM2 (recommended)
npm install -g pm2
pm2 start server/index.js --name "maturity-assessment"
pm2 save
pm2 startup
```

---

## Docker Deployment (Optional)

### Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "server/index.js"]
```

### Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: maturity_assessment
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: maturity_assessment
      DB_USER: postgres
      DB_PASSWORD: secure_password
      JWT_SECRET: your_jwt_secret_here
      NODE_ENV: production
    depends_on:
      - postgres
    command: sh -c "sleep 5 && node server/database/migrate.js && node server/index.js"

volumes:
  postgres_data:
```

### Run with Docker:

```bash
docker-compose up -d
```

---

## Nginx Reverse Proxy (Production)

### `/etc/nginx/sites-available/maturity-assessment`

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/maturity-assessment /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Database Backup

### Manual Backup

```bash
# Backup
pg_dump -U postgres maturity_assessment > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
psql -U postgres maturity_assessment < backup_20260111_120000.sql
```

### Automated Daily Backup (Cron)

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * pg_dump -U postgres maturity_assessment > /backups/maturity_$(date +\%Y\%m\%d).sql
```

---

## Monitoring

### Using PM2

```bash
# View logs
pm2 logs maturity-assessment

# Monitor resources
pm2 monit

# Restart app
pm2 restart maturity-assessment

# View status
pm2 status
```

### Health Check Endpoint

The API includes a health check endpoint:

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-11T12:00:00.000Z",
  "uptime": 3600
}
```

---

## Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secret (minimum 32 characters)
- [ ] Enable HTTPS/SSL in production
- [ ] Set up firewall rules (allow only 80, 443)
- [ ] Regular database backups
- [ ] Keep dependencies updated (`npm audit`)
- [ ] Use environment variables for secrets
- [ ] Enable CORS only for trusted domains
- [ ] Implement rate limiting (optional)
- [ ] Regular security audits

---

## Troubleshooting

### Database Connection Error

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -U postgres -d maturity_assessment
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Migration Errors

```bash
# Drop and recreate database
dropdb maturity_assessment
createdb maturity_assessment
node server/database/migrate.js
```

### Frontend Build Issues

```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

---

## Performance Optimization

### PostgreSQL Tuning

Add to `/etc/postgresql/14/main/postgresql.conf`:

```
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
work_mem = 16MB
max_connections = 100
```

### Node.js Clustering

For production, use PM2 cluster mode:

```bash
pm2 start server/index.js -i max --name "maturity-assessment"
```

---

## Support & Maintenance

### Log Files

```bash
# PM2 logs
~/.pm2/logs/

# Nginx logs
/var/log/nginx/access.log
/var/log/nginx/error.log

# PostgreSQL logs
/var/log/postgresql/
```

### Update Application

```bash
git pull origin main
npm install
npm run build
pm2 restart maturity-assessment
```

---

## License

Proprietary - Government Use Only

For support, contact: support@modt.gov.iq

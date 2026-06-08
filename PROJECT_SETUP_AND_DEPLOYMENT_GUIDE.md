# Security Firm Management Software - Setup & Deployment Guide

**Version:** 1.0.0  
**Date:** June 2026  
**Status:** Ready for Development Phase 1

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Prerequisites](#prerequisites)
4. [Local Development Setup](#local-development-setup)
5. [Database Setup](#database-setup)
6. [Backend Configuration](#backend-configuration)
7. [Frontend Setup](#frontend-setup)
8. [Testing & Quality Assurance](#testing--quality-assurance)
9. [Production Deployment](#production-deployment)
10. [Monitoring & Maintenance](#monitoring--maintenance)
11. [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

**Project Name:** Security Firm Management Software  
**Client:** Security Service Provider  
**Target Users:** Admin, Managers, Accountants, Employees  
**Key Features:**
- Invoice & billing generation
- Employee salary management
- Attendance tracking
- Expense management
- Financial reporting & analytics

**Development Timeline:** 26 weeks (6 months)

---

## 🏗️ Technology Stack

### Backend
- **Node.js** v16+ with Express.js
- **PostgreSQL** 14+ for database
- **Redis** for caching
- **JWT** for authentication
- **Bcryptjs** for password hashing

### Frontend
- **React.js** 18+
- **Tailwind CSS** for styling
- **Recharts** for analytics
- **Axios** for HTTP requests
- **React Router** for navigation

### DevOps & Infrastructure
- **Docker** for containerization
- **Docker Compose** for local development
- **GitHub Actions** for CI/CD
- **AWS/DigitalOcean** for hosting
- **Nginx** for reverse proxy

### Tools & Services
- **Git** for version control
- **PostgreSQL pgAdmin** for database management
- **Postman** for API testing
- **Sentry** for error monitoring
- **SendGrid/Gmail** for email notifications

---

## ✅ Prerequisites

### System Requirements
- **OS:** Linux (Ubuntu 20.04+), macOS, or Windows with WSL2
- **RAM:** Minimum 8GB (16GB recommended)
- **Disk Space:** 20GB free
- **Node.js:** v16.0.0 or higher
- **npm:** v8.0.0 or higher
- **PostgreSQL:** v14.0 or higher
- **Redis:** v6.0 or higher
- **Git:** Latest version

### Installation Check
```bash
# Verify installations
node --version    # Should show v16+
npm --version     # Should show v8+
psql --version    # Should show PostgreSQL 14+
redis-cli --version
git --version
```

### Required Accounts
- GitHub account (for version control)
- SMTP email service (Gmail, SendGrid)
- AWS/Cloud provider account (for deployment)

---

## 🚀 Local Development Setup

### Step 1: Clone Repository
```bash
git clone https://github.com/yourusername/security-firm-management.git
cd security-firm-management
```

### Step 2: Setup Backend

#### 2.1 Install Dependencies
```bash
npm install
```

#### 2.2 Create Environment File
```bash
# Copy example file
cp .env.example .env

# Edit with your configuration
nano .env
```

**Key Environment Variables to Set:**
```
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=security_firm_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_super_secret_key_min_32_chars
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

#### 2.3 Start PostgreSQL
```bash
# macOS (using Homebrew)
brew services start postgresql

# Ubuntu/Linux
sudo systemctl start postgresql

# Or use Docker
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:14

# Or Docker Compose (recommended)
docker-compose up -d
```

#### 2.4 Create Database
```bash
# Connect to PostgreSQL
psql -U postgres -h localhost

# Create database
CREATE DATABASE security_firm_db;

# Verify
\l

# Exit
\q
```

#### 2.5 Run Database Migrations
```bash
npm run migrate
```

#### 2.6 Seed Sample Data (Optional)
```bash
npm run seed
```

#### 2.7 Start Backend Server
```bash
npm run dev
```

**Expected Output:**
```
✅ Database connected successfully
✅ Database schema created/verified
✅ Server running on http://localhost:5000
```

---

## 🗄️ Database Setup

### Database Creation
```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE security_firm_db;

-- Create user with privileges
CREATE USER security_app WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE security_firm_db TO security_app;

-- Connect to database
\c security_firm_db

-- Grant schema privileges
GRANT USAGE ON SCHEMA public TO security_app;
GRANT CREATE ON SCHEMA public TO security_app;

-- Verify
\du
```

### Initial Data Loading
```bash
# Run migrations to create all tables
npm run migrate

# Seed with sample data
npm run seed

# Verify tables created
psql -U postgres -d security_firm_db -c "\dt"
```

### Backup Strategy
```bash
# Backup database
pg_dump -U postgres security_firm_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql -U postgres security_firm_db < backup_20260601_120000.sql

# Setup automated backups (cron)
# 0 2 * * * /home/user/scripts/backup_db.sh
```

---

## ⚙️ Backend Configuration

### Environment Variables Explained

```env
# Server Configuration
NODE_ENV=development          # development, staging, production
PORT=5000                     # Server port
APP_NAME=Security Firm Mgmt   # Application name
APP_URL=http://localhost:5000 # Public URL
FRONTEND_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=security_firm_db
DB_USER=postgres
DB_PASSWORD=***
DB_POOL_MIN=2
DB_POOL_MAX=10

# Authentication
JWT_SECRET=min_32_character_secret_key_required
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=app_specific_password

# Business Logic
DEFAULT_GST_RATE=18
PF_PERCENTAGE=12
INVOICE_DUE_DAYS=30

# Security
CORS_ORIGIN=http://localhost:3000
ENABLE_HELMET=true
ENABLE_CORS=true

# Monitoring
LOG_LEVEL=info
LOG_DIR=./logs
SENTRY_DSN=your_sentry_dsn
```

### API Server Structure
```
src/
├── index.js              # Main entry point
├── controllers/          # Request handlers
│   ├── authController.js
│   ├── clientController.js
│   ├── employeeController.js
│   ├── attendanceController.js
│   ├── invoiceController.js
│   ├── payrollController.js
│   ├── expenseController.js
│   └── reportController.js
├── routes/               # API routes
│   ├── auth.js
│   ├── clients.js
│   ├── employees.js
│   ├── attendance.js
│   ├── invoices.js
│   ├── payroll.js
│   ├── expenses.js
│   └── reports.js
├── middleware/           # Express middleware
│   └── index.js
├── models/               # Database models
│   ├── User.js
│   ├── Client.js
│   ├── Employee.js
│   ├── Attendance.js
│   ├── Invoice.js
│   ├── Payroll.js
│   ├── Expense.js
│   └── AuditLog.js
├── services/             # Business logic
│   ├── invoiceService.js
│   ├── payrollService.js
│   ├── reportService.js
│   └── emailService.js
├── utils/                # Utility functions
│   ├── authUtils.js
│   ├── validation.js
│   ├── dateUtils.js
│   └── pdfGenerator.js
└── database/             # Database related
    ├── connection.js
    ├── schema.js
    └── logger.js
```

---

## 🎨 Frontend Setup

### Frontend Installation
```bash
# Create React app
npx create-react-app security-firm-frontend

cd security-firm-frontend

# Install dependencies
npm install axios react-router-dom recharts tailwindcss @headlessui/react

# Install Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Frontend Structure
```
src/
├── components/
│   ├── Dashboard/
│   ├── Clients/
│   ├── Employees/
│   ├── Invoices/
│   ├── Payroll/
│   ├── Expenses/
│   ├── Reports/
│   ├── Auth/
│   ├── Common/
│   │   ├── Navbar.js
│   │   ├── Sidebar.js
│   │   ├── Modal.js
│   │   └── Table.js
│   └── Forms/
├── pages/
│   ├── LoginPage.js
│   ├── DashboardPage.js
│   ├── ClientsPage.js
│   ├── EmployeesPage.js
│   ├── PayrollPage.js
│   ├── ReportsPage.js
│   └── NotFoundPage.js
├── services/
│   ├── api.js
│   ├── authService.js
│   ├── clientService.js
│   ├── employeeService.js
│   ├── invoiceService.js
│   └── reportService.js
├── hooks/
│   ├── useAuth.js
│   ├── useFetch.js
│   └── useForm.js
├── context/
│   ├── AuthContext.js
│   └── NotificationContext.js
├── styles/
│   └── tailwind.css
├── utils/
│   ├── formatters.js
│   ├── validators.js
│   └── constants.js
├── App.js
├── index.css
└── index.js
```

### Start Frontend Development Server
```bash
npm start
```

**Expected Output:**
```
Compiled successfully!

You can now view security-firm-frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

---

## 🧪 Testing & Quality Assurance

### Backend Testing
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode (rerun on file changes)
npm run test:watch

# Run specific test file
npm test authController.test.js
```

### Frontend Testing
```bash
# Run tests
npm test

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### API Testing with Postman
1. Import API collection from `/postman/collection.json`
2. Set up environment variables
3. Test each endpoint

### Code Quality
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

---

## 🚢 Production Deployment

### Pre-Deployment Checklist
- [ ] All tests passing (coverage > 70%)
- [ ] No console errors or warnings
- [ ] Environment variables configured
- [ ] Database backups verified
- [ ] Security audit completed
- [ ] Performance optimization done
- [ ] API documentation updated
- [ ] User training completed

### Docker Deployment

#### Build Docker Image
```bash
# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
EOF
```

#### Build and Run
```bash
# Build image
docker build -t security-firm-api:1.0.0 .

# Run container
docker run -d \
  --name security-firm-api \
  -p 5000:5000 \
  --env-file .env \
  security-firm-api:1.0.0

# Check logs
docker logs -f security-firm-api
```

### AWS Deployment (EC2)

#### 1. Launch EC2 Instance
```bash
# AMI: Ubuntu 20.04 LTS
# Instance Type: t3.medium
# Storage: 20GB
# Security Groups: Allow HTTP(80), HTTPS(443), SSH(22)
```

#### 2. Setup Server
```bash
ssh -i key.pem ubuntu@your_instance_ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install Nginx
sudo apt install -y nginx
```

#### 3. Deploy Application
```bash
# Clone repository
git clone https://github.com/yourusername/repo.git
cd repo

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit with production values

# Run migrations
npm run migrate

# Start with PM2 (process manager)
sudo npm install -g pm2
pm2 start src/index.js --name "security-firm-api"
pm2 startup
pm2 save
```

#### 4. Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/default
```

**Nginx Configuration:**
```nginx
server {
    listen 80 default_server;
    server_name your_domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo systemctl restart nginx

# Install SSL certificate (Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your_domain.com
```

#### 5. Setup Database
```bash
sudo -u postgres psql
CREATE DATABASE security_firm_db;
CREATE USER app_user WITH PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE security_firm_db TO app_user;
\q

# Restore from backup if needed
sudo -u postgres psql security_firm_db < backup.sql
```

### GitHub Actions CI/CD Pipeline

**.github/workflows/deploy.yml**
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --coverage
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to AWS
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          # Deployment script here
          ./scripts/deploy.sh
```

---

## 📊 Monitoring & Maintenance

### Application Monitoring
```bash
# Check application status
pm2 status

# View logs
pm2 logs security-firm-api

# Monitor performance
pm2 monit
```

### Database Maintenance
```bash
# Backup database
pg_dump -U postgres security_firm_db > backup_$(date +%Y%m%d).sql

# Check database size
psql -U postgres -d security_firm_db -c "SELECT pg_size_pretty(pg_database_size('security_firm_db'));"

# Vacuum and analyze (optimize)
psql -U postgres -d security_firm_db -c "VACUUM ANALYZE;"
```

### Log Monitoring
```bash
# View combined logs
tail -f logs/combined.log

# View errors only
tail -f logs/error.log

# Search logs
grep "error\|ERROR" logs/combined.log

# Archive old logs
gzip logs/combined.log.1
```

### Performance Optimization
```bash
# Enable slow query logging
# In PostgreSQL:
ALTER SYSTEM SET log_min_duration_statement = 1000; # Log queries > 1 second
SELECT pg_reload_conf();

# Monitor index usage
SELECT schemaname, tablename, indexname FROM pg_indexes;
```

---

## 🔧 Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -U postgres -h localhost -d security_firm_db

# Check logs
tail -f /var/log/postgresql/postgresql.log
```

### Application Not Starting
```bash
# Check for port conflicts
lsof -i :5000

# Check Node.js process
ps aux | grep node

# Check logs
npm run dev 2>&1 | tee debug.log
```

### Memory Issues
```bash
# Check memory usage
free -h

# Check Node.js heap size
node --max-old-space-size=4096 src/index.js

# Monitor with PM2
pm2 monitor
```

### Email Not Sending
```bash
# Test SMTP connection
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});
transporter.verify((err) => {
  if (err) console.log(err);
  else console.log('SMTP connection OK');
});
"
```

---

## 📚 Additional Resources

### Documentation
- [Express.js Guide](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [React.js Documentation](https://react.dev/)
- [Docker Documentation](https://docs.docker.com/)

### Team Guidelines
- Code Style: Follow ESLint configuration
- Commit Messages: Use conventional commits
- Branch Naming: feature/, bugfix/, hotfix/
- Pull Requests: Require 2 approvals before merge

### Support & Communication
- **Slack:** #dev-general, #prod-incidents
- **Weekly Standup:** Monday 10 AM
- **Code Review:** Every 2 hours
- **On-call Rotation:** PagerDuty

---

## ✅ Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| DevOps Lead | _________________ | _______ | _________________ |
| Development Lead | _________________ | _______ | _________________ |
| Project Manager | _________________ | _______ | _________________ |

---

**Last Updated:** June 2026  
**Next Review:** After Phase 2 Completion


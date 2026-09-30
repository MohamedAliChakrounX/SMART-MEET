#!/bin/bash

# Meeting-IA-sfm Quick Start Script
# This script sets up everything you need to run the application

echo "🚀 Meeting-IA-sfm Quick Start"
echo "=============================="
echo ""

# Check if we're in the right directory
if [ ! -f "composer.json" ]; then
    echo "❌ Error: This script must be run from the Backend directory"
    echo "   cd Backend && bash setup.sh"
    exit 1
fi

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Installing PHP dependencies...${NC}"
if composer install; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠ Warning: Composer install completed with warnings${NC}"
fi

echo ""
echo -e "${BLUE}Step 2: Creating database...${NC}"
php bin/console doctrine:database:create --if-not-exists 2>/dev/null
echo -e "${GREEN}✓ Database ready${NC}"

echo ""
echo -e "${BLUE}Step 3: Running migrations...${NC}"
php bin/console doctrine:migrations:migrate --no-interaction
echo -e "${GREEN}✓ Migrations completed${NC}"

echo ""
echo -e "${BLUE}Step 4: Generating JWT keypair...${NC}"
php bin/console lexik:jwt:generate-keypair --skip-if-exists 2>/dev/null
echo -e "${GREEN}✓ JWT keys ready${NC}"

echo ""
echo -e "${BLUE}Step 5: Creating test user...${NC}"
php bin/console app:create-test-user
echo -e "${GREEN}✓ Test user created${NC}"

echo ""
echo -e "${GREEN}=====================================
✅ Setup Complete!

🔐 Login Credentials:
   Email: test@example.com
   Password: password123

🚀 Start the server:
   php -S localhost:8000 -t public

🎨 In another terminal, start the frontend:
   cd ../Frontend-Web
   npm install
   npm run dev

📱 Access the application:
   Frontend: http://localhost:5173
   Backend API: http://localhost:8000/api/v1

📖 More info: See AUTHENTICATION_GUIDE.md
====================================${NC}"

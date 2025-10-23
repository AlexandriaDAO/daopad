#!/bin/bash
set -e

echo "=================================================="
echo "Playwright Authentication Setup"
echo "=================================================="
echo ""

# Check if .auth/user.json already exists
if [ -f ".auth/user.json" ]; then
    echo "⚠️  Authentication already configured (.auth/user.json exists)"
    echo ""
    read -p "Do you want to re-authenticate? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing authentication. Exiting."
        exit 0
    fi
    echo "Removing old authentication..."
    rm -rf .auth/
fi

echo "Starting manual authentication setup..."
echo ""
echo "🔐 A browser will open. Please:"
echo "   1. Click 'Connect Wallet'"
echo "   2. Log in with your Internet Identity"
echo "   3. Wait for authentication to complete"
echo ""
echo "The session will be saved automatically."
echo ""
read -p "Press Enter to continue..."

# Run the manual auth setup
npx playwright test e2e/manual-auth-setup.spec.ts --headed

# Verify it worked
if [ -f ".auth/user.json" ]; then
    echo ""
    echo "=================================================="
    echo "✅ SUCCESS! Authentication configured."
    echo "=================================================="
    echo ""
    echo "You can now run Playwright tests:"
    echo "  npx playwright test"
    echo "  npx playwright test --headed"
    echo "  npx playwright test --debug"
    echo ""
else
    echo ""
    echo "=================================================="
    echo "❌ ERROR: Authentication setup failed"
    echo "=================================================="
    echo ""
    echo ".auth/user.json was not created."
    echo "Please try again or check the error messages above."
    exit 1
fi

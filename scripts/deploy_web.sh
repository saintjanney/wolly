#!/bin/bash

# Flutter Web Deployment Script
echo "🚀 Starting Flutter Web Deployment..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
flutter clean

# Get dependencies
echo "📦 Getting dependencies..."
flutter pub get

# Build for web with proper configuration
echo "🔨 Building for web..."
flutter build web --release

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Deploy to Firebase
    echo "🌐 Deploying to Firebase..."
    firebase deploy --only hosting
    
    if [ $? -eq 0 ]; then
        echo "🎉 Deployment successful!"
        echo "Your app is now live at: https://wolly-1133d.web.app"
    else
        echo "❌ Firebase deployment failed!"
        exit 1
    fi
else
    echo "❌ Build failed!"
    exit 1
fi

# Deploying to Render

## Overview

This document provides instructions for deploying the Real-Time Whiteboard application to Render. We've included multiple configuration options to address the specific error related to missing package.json in the Render build environment.

## Prerequisites

1. A Render account (https://render.com)
2. Your project pushed to a Git repository (GitHub, GitLab, etc.)

## Deployment Steps

### Option 1: Using the Render Dashboard with Custom Build Script

1. Log in to your Render account
2. Click on "New" and select "Web Service"
3. Connect your Git repository
4. Configure the service with the following settings:
   - **Name**: whiteboard-app (or your preferred name)
   - **Environment**: Node
   - **Build Command**: `chmod +x render-build.sh && ./render-build.sh`
   - **Start Command**: `npm start`
5. Add the following environment variables:
   - `NODE_ENV`: production
   - `PORT`: 10000 (or your preferred port)
   - `MONGO_URI`: Your MongoDB connection string
   - `SESSION_SECRET`: A secure random string
   - `CLIENT_URL`: The URL of your deployed application (can be set after deployment)
6. Click "Create Web Service"

### Option 2: Using render.yaml (Recommended)

1. The project includes a `render.yaml` file for Blueprint deployment
2. In your Render dashboard, click on "New" and select "Blueprint"
3. Connect your Git repository
4. Render will automatically detect the `render.yaml` file and configure the services
5. You'll need to manually set the `MONGO_URI` environment variable
6. Click "Apply" to deploy

### Option 3: Using render.json

1. The project includes a `render.json` file with build configuration
2. This file will be automatically detected by Render when deploying

## Troubleshooting

### Common Issues

1. **ENOENT: Package.json not found error**: 
   - This specific error (`npm error enoent Could not read package.json: Error: ENOENT: no such file or directory, open '/opt/render/project/src/package.json'`) occurs because Render is looking for package.json in a specific location.
   - We've addressed this by:
     - Creating custom build scripts (`render-build.sh`) that create the required directory and copy package.json there
     - Adding a `render-postbuild` script in package.json
     - Providing multiple configuration options (render.yaml, render.json)

2. **MongoDB connection issues**: Ensure your MongoDB URI is correctly set in the environment variables.

3. **Port conflicts**: The application uses the PORT environment variable. Make sure it's set correctly.

4. **Build failures**: Check the build logs for specific errors. Common issues include:
   - Node version incompatibility (fixed with the "engines" field in package.json)
   - Missing dependencies
   - Build script errors

## Post-Deployment

After successful deployment:

1. Set the `CLIENT_URL` environment variable to your deployed application URL
2. Test the application thoroughly
3. Monitor the logs for any issues

## If Problems Persist

If you continue to experience the ENOENT error after implementing these solutions:

1. Check the Render logs for specific error messages
2. Try deploying the server and client as separate services
3. Contact Render support with the specific error details
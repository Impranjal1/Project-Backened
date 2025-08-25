# Deploying to Render

## Overview

This document provides instructions for deploying the Real-Time Whiteboard application to Render.

## Prerequisites

1. A Render account (https://render.com)
2. Your project pushed to a Git repository (GitHub, GitLab, etc.)

## Deployment Steps

### Option 1: Using the Render Dashboard

1. Log in to your Render account
2. Click on "New" and select "Web Service"
3. Connect your Git repository
4. Configure the service with the following settings:
   - **Name**: whiteboard-app (or your preferred name)
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Add the following environment variables:
   - `NODE_ENV`: production
   - `PORT`: 10000 (or your preferred port)
   - `MONGO_URI`: Your MongoDB connection string
   - `SESSION_SECRET`: A secure random string
   - `CLIENT_URL`: The URL of your deployed application (can be set after deployment)
6. Click "Create Web Service"

### Option 2: Using render.yaml (Recommended)

1. The project already includes a `render.yaml` file for Blueprint deployment
2. In your Render dashboard, click on "New" and select "Blueprint"
3. Connect your Git repository
4. Render will automatically detect the `render.yaml` file and configure the services
5. You'll need to manually set the `MONGO_URI` environment variable
6. Click "Apply" to deploy

## Troubleshooting

### Common Issues

1. **Package.json not found**: This has been fixed by updating the root package.json file with proper scripts and configuration.

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
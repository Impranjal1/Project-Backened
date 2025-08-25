#!/bin/bash

# This script is specifically designed to address the ENOENT error on Render
# by ensuring package.json exists in the expected location

# Debug information
echo "Current directory: $(pwd)"
echo "Listing files in current directory:"
ls -la

# Create the specific directory Render is looking for
echo "Creating /opt/render/project/src directory"
mkdir -p /opt/render/project/src

# Copy the simplified package.json to the expected location
echo "Copying render-package.json to /opt/render/project/src/package.json"
cp render-package.json /opt/render/project/src/package.json

# Verify the file was copied
echo "Verifying package.json in target location:"
ls -la /opt/render/project/src/

# Continue with normal build process
echo "Installing dependencies"
npm install

# Install server dependencies
echo "Installing server dependencies"
cd server
npm install
cd ..

# Build client
echo "Building client"
cd client
npm install
npm run build
cd ..
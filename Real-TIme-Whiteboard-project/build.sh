#!/bin/bash

# Create the src directory if it doesn't exist
mkdir -p /opt/render/project/src

# Copy package.json to the expected location
cp package.json /opt/render/project/src/

# Install dependencies
npm install

# Build the client
npm run build
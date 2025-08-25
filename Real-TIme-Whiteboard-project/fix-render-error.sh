#!/bin/bash

# This script is designed to fix the ENOENT error on Render
# by creating the package.json file in the expected location

# Create the directory structure
mkdir -p /opt/render/project/src

# Create a minimal package.json in the expected location
cat > /opt/render/project/src/package.json << 'EOL'
{
  "name": "real-time-whiteboard",
  "version": "1.0.0",
  "main": "server/index.js",
  "scripts": {
    "start": "node server/index.js"
  },
  "dependencies": {}
}
EOL

# Verify the file was created
echo "Created package.json in /opt/render/project/src/:"
cat /opt/render/project/src/package.json

# Continue with the actual build process
echo "Continuing with the actual build process..."
#!/bin/bash

# This script builds the React frontend locally and uploads it to your EC2 server
# Adjust the EC2_SERVER variable to your server's IP or hostname

EC2_SERVER="ubuntu@51.20.183.126"
SSH_KEY_PATH="path/to/your/key.pem"  # Path to your AWS SSH key

echo "===== Building and Uploading Frontend ====="

# Navigate to frontend directory
cd frontend

# Build the frontend
echo "Building frontend..."
npm run build

# Create a ZIP of the build
echo "Creating ZIP file of the build..."
cd dist
zip -r ../frontend-build.zip .
cd ..

# Upload to EC2 server
echo "Uploading to EC2 server..."
scp -i "$SSH_KEY_PATH" frontend-build.zip $EC2_SERVER:~/

# SSH into the server and unzip to the correct location
echo "Deploying on the server..."
ssh -i "$SSH_KEY_PATH" $EC2_SERVER << 'EOF'
  rm -rf ~/Q-up/frontend/dist/*
  mkdir -p ~/Q-up/frontend/dist
  unzip ~/frontend-build.zip -d ~/Q-up/frontend/dist
  rm ~/frontend-build.zip
  sudo systemctl reload nginx
  echo "Frontend deployed successfully!"
EOF

# Clean up local ZIP file
rm frontend-build.zip

echo "===== Frontend Build and Upload Complete =====" 
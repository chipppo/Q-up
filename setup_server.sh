#!/bin/bash

# Exit on error
set -e

echo "===== Q-up AWS EC2 Setup Script ====="
echo "This script will set up the Q-up application on this EC2 instance."

# Update system packages
echo "Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install required packages
echo "Installing required packages..."
sudo apt-get install -y python3-pip python3-dev libpq-dev postgresql postgresql-contrib nginx git certbot python3-certbot-nginx build-essential

# Create directories
echo "Setting up directories..."
mkdir -p ~/logs

# Clone the repository (if not already cloned)
if [ ! -d "~/Q-up" ]; then
    echo "Cloning repository..."
    cd ~
    git clone https://github.com/yourusername/Q-up.git
    cd Q-up
else
    echo "Repository already exists, updating..."
    cd ~/Q-up
    git pull
fi

# Create a virtual environment
echo "Setting up Python virtual environment..."
sudo apt-get install -y python3-venv
python3 -m venv ~/Q-up/venv
source ~/Q-up/venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
cd ~/Q-up/backend
pip install -r requirements.txt
pip install gunicorn django-storages boto3 psycopg2-binary

# Prompt for AWS credentials
echo ""
echo "Configuring AWS credentials for S3 storage..."
echo "Please enter your AWS credentials (these will only be stored on this server):"
read -p "AWS Access Key ID: " aws_access_key
read -p "AWS Secret Access Key: " aws_secret_key
read -p "AWS S3 Bucket Name [qup-media-files]: " aws_bucket_name
aws_bucket_name=${aws_bucket_name:-qup-media-files}
read -p "AWS Region [eu-north-1]: " aws_region
aws_region=${aws_region:-eu-north-1}

# Update the systemd service file with the provided credentials
echo "Updating service file with AWS credentials..."
sed -i "s|YOUR_AWS_ACCESS_KEY_ID_HERE|$aws_access_key|g" ~/Q-up/qup.service
sed -i "s|YOUR_AWS_SECRET_ACCESS_KEY_HERE|$aws_secret_key|g" ~/Q-up/qup.service
sed -i "s|qup-media-files|$aws_bucket_name|g" ~/Q-up/qup.service
sed -i "s|eu-north-1|$aws_region|g" ~/Q-up/qup.service

# Create .env file for local development/testing
echo "Creating .env file for local development..."
cp ~/Q-up/backend/.env.example ~/Q-up/backend/.env
sed -i "s|YOUR_AWS_ACCESS_KEY_ID_HERE|$aws_access_key|g" ~/Q-up/backend/.env
sed -i "s|YOUR_AWS_SECRET_ACCESS_KEY_HERE|$aws_secret_key|g" ~/Q-up/backend/.env
sed -i "s|qup-media-files|$aws_bucket_name|g" ~/Q-up/backend/.env
sed -i "s|eu-north-1|$aws_region|g" ~/Q-up/backend/.env

# Configure Gunicorn
echo "Setting up Gunicorn service..."
sudo cp ~/Q-up/qup.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable qup
sudo systemctl start qup

# Configure Nginx
echo "Setting up Nginx..."
sudo cp ~/Q-up/qup_nginx.conf /etc/nginx/sites-available/qup
sudo ln -sf /etc/nginx/sites-available/qup /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl reload nginx

# Create frontend directory if not building locally
mkdir -p ~/Q-up/frontend/dist

echo "===== Setup Complete ====="
echo "To complete setup:"
echo "1. Upload your React frontend build to ~/Q-up/frontend/dist/"
echo "2. Check logs at /var/log/nginx/ and /var/log/gunicorn/ if issues occur"
echo "3. To set up HTTPS with your domain:"
echo "   - Update server_name in /etc/nginx/sites-available/qup"
echo "   - Run: sudo certbot --nginx -d yourdomain.com" 
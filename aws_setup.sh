#!/bin/bash
# AWS Setup Script for Q-up Application
# This script helps set up the Q-up application on an EC2 instance
# Run this script on your EC2 instance after setting up your S3 bucket

# Exit on error
set -e

echo "===== Q-up AWS Setup Script ====="
echo "This script will set up the Q-up application on this server."
echo "Make sure you have already set up your S3 bucket."

# Update system packages
echo "Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install required packages
echo "Installing required packages..."
sudo apt-get install -y python3-pip python3-dev libpq-dev postgresql postgresql-contrib nginx git

# Create a virtual environment
echo "Setting up Python virtual environment..."
pip3 install virtualenv
virtualenv venv
source venv/bin/activate

# Clone the repository (if not already cloned)
if [ ! -d "Q-up" ]; then
    echo "Cloning repository..."
    git clone https://github.com/yourusername/Q-up.git
    cd Q-up
else
    echo "Repository already exists, updating..."
    cd Q-up
    git pull
fi

# Install Python dependencies
echo "Installing Python dependencies..."
cd backend
pip install -r requirements.txt
pip install gunicorn django-storages boto3 psycopg2-binary

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Setup Gunicorn
echo "Setting up Gunicorn..."
cat > /etc/systemd/system/gunicorn.service << EOF
[Unit]
Description=gunicorn daemon
After=network.target

[Service]
User=${USER}
Group=www-data
WorkingDirectory=$(pwd)
ExecStart=$(which gunicorn) --access-logfile - --workers 3 --bind unix:/run/gunicorn.sock backend.wsgi:application
Environment="AWS_ACCESS_KEY_ID=your-access-key-id"
Environment="AWS_SECRET_ACCESS_KEY=your-secret-access-key"
Environment="AWS_STORAGE_BUCKET_NAME=your-bucket-name"
Environment="AWS_S3_REGION_NAME=your-region"

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl start gunicorn
sudo systemctl enable gunicorn

# Setup Nginx
echo "Setting up Nginx..."
cat > /etc/nginx/sites-available/qup << EOF
server {
    listen 80;
    server_name your-domain-or-ip;

    location = /favicon.ico { access_log off; log_not_found off; }
    
    location /static/ {
        proxy_set_header Host \$host;
        proxy_pass https://your-bucket-name.s3.amazonaws.com/static/;
    }
    
    location /media/ {
        proxy_set_header Host \$host;
        proxy_pass https://your-bucket-name.s3.amazonaws.com/media/;
    }

    location / {
        include proxy_params;
        proxy_pass http://unix:/run/gunicorn.sock;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/qup /etc/nginx/sites-enabled
sudo systemctl restart nginx

echo "===== Setup Complete ====="
echo "Don't forget to:"
echo "1. Update AWS credentials in the gunicorn.service file"
echo "2. Update your domain or IP in the nginx configuration"
echo "3. Setup HTTPS using Let's Encrypt (recommended)"
echo "4. Update your frontend API endpoint URLs" 
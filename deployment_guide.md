# Q-up AWS Deployment Guide

This guide covers deploying the Q-up application to AWS with a focus on properly handling media files and setting up a production environment.

## Prerequisites

- AWS account with administrator access
- AWS CLI installed and configured
- Python 3.8+ and pip
- Node.js 16+ and npm
- Git
- A domain name (from GoDaddy or another registrar)

## Step 1: Set Up AWS S3 Bucket

1. **Create an S3 bucket**:
   - Go to [AWS S3 Console](https://console.aws.amazon.com/s3/)
   - Click "Create bucket"
   - Name your bucket (e.g., `qup-media-files`) - must be globally unique
   - Select your preferred region (note this for later)
   - Uncheck "Block all public access" (since we want public access to media files)
   - Enable versioning (recommended)
   - Click "Create bucket"

2. **Configure CORS for the bucket**:
   - Select your new bucket
   - Go to "Permissions" tab
   - Scroll down to "Cross-origin resource sharing (CORS)"
   - Click "Edit" and paste the following JSON:

   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": ["ETag"]
     }
   ]
   ```
   - Click "Save changes"
   - Note: In production, replace `"*"` in AllowedOrigins with your specific domain like `"https://q-up.fun"` and `"https://www.q-up.fun"`

3. **Create a bucket policy to allow public read access**:
   - Go to "Permissions" tab
   - Click "Bucket policy"
   - Paste the following JSON (replace `your-bucket-name` with your bucket name):

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::your-bucket-name/*"
       }
     ]
   }
   ```
   - Click "Save changes"

## Step 2: Create IAM User for S3 Access

1. **Create an IAM user**:
   - Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
   - Click "Users" > "Add users"
   - Enter a name (e.g., `qup-s3-user`)
   - Select "Access key - Programmatic access"
   - Click "Next: Permissions"
   - Click "Attach existing policies directly"
   - Search for and select "AmazonS3FullAccess" (for simplicity; in production, create a more restrictive policy)
   - Click "Next" and then "Create user"
   - **IMPORTANT**: Download the CSV file or copy the Access Key ID and Secret Access Key - you will need these for Django settings

## Step 3: Configure Django for S3

1. **Install required packages**:
   ```bash
   pip install django-storages boto3
   ```

2. **Update Django settings**:
   - Open `Q-up/backend/backend/settings.py`
   - Add 'storages' to INSTALLED_APPS
   - Add the following settings (replace placeholder values):

   ```python
   # AWS S3 Settings
   AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
   AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
   AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME', 'your-bucket-name')
   AWS_S3_REGION_NAME = os.environ.get('AWS_S3_REGION_NAME', 'your-region')
   AWS_S3_FILE_OVERWRITE = False
   AWS_DEFAULT_ACL = None  # Don't set ACL, rely on bucket policy instead of 'public-read'
   AWS_S3_SIGNATURE_VERSION = 's3v4'
   
   AWS_S3_OBJECT_PARAMETERS = {
       'CacheControl': 'max-age=86400',
   }
   
   # Use custom storage backends
   DEFAULT_FILE_STORAGE = 'backend.storage_backends.MediaStorage'
   
   # S3 URL settings
   AWS_S3_CUSTOM_DOMAIN = f"{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_S3_REGION_NAME}.amazonaws.com"
   MEDIA_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/media/"
   ```

## Step 4: Migrate Existing Media Files to S3

1. **Run the migration script**:
   ```bash
   cd Q-up/backend
   python s3_uploader.py
   ```

2. **Verify migration**:
   - Go to your S3 bucket in AWS Console
   - Check if all media files are properly uploaded to the 'media' folder
   - Test your application to ensure images load correctly

## Step 5: Set Up EC2 Instance

1. **Launch an EC2 instance**:
   - Go to [AWS EC2 Console](https://console.aws.amazon.com/ec2/)
   - Click "Launch instance"
   - Choose Ubuntu Server 22.04 LTS
   - Select t2.micro for the free tier or t2.small/t3.small for better performance
   - Configure instance details as needed
   - Add at least 20GB of storage
   - Configure security group to allow:
     - SSH (port 22)
     - HTTP (port 80)
     - HTTPS (port 443)
   - Review and launch with your key pair
   - Note your instance's public IP address

2. **Connect to your instance**:
   ```bash
   ssh -i /path/to/your-key.pem ubuntu@your-instance-public-ip
   ```

3. **Update system and install dependencies**:
   ```bash
   sudo apt update
   sudo apt upgrade -y
   sudo apt install -y python3-pip python3-dev python3-venv build-essential libssl-dev libffi-dev nginx git
   ```

4. **Install Node.js and npm (for frontend builds)**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

5. **Clone your repository**:
   ```bash
   cd /var/www
   sudo mkdir q-up
   sudo chown ubuntu:ubuntu q-up
   git clone https://github.com/chipppo/Q-up.git q-up
   cd q-up
   ```

## Step 6: Set Up Backend Django Application

1. **Create a virtual environment and install dependencies**:
   ```bash
   cd /var/www/q-up/backend
   python3 -m venv venv
   source venv/bin/activate
   pip install --upgrade pip
   pip install -r requirements.txt
   pip install gunicorn
   ```

2. **Create .env file for environment variables**:
   ```bash
   nano .env
   ```
   Add the following content:
   ```
   SECRET_KEY=your_django_secret_key
   DEBUG=False
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_STORAGE_BUCKET_NAME=your_s3_bucket_name
   AWS_S3_REGION_NAME=your_s3_region
   ALLOWED_HOSTS=q-up.fun,www.q-up.fun,your_instance_ip
   CSRF_TRUSTED_ORIGINS=https://q-up.fun,https://www.q-up.fun
   CORS_ALLOWED_ORIGINS=https://q-up.fun,https://www.q-up.fun
   ```

3. **Run Django migrations**:
   ```bash
   python manage.py migrate
   ```

4. **Collect static files**:
   ```bash
   python manage.py collectstatic --noinput
   ```

5. **Test Gunicorn**:
   ```bash
   gunicorn --bind 0.0.0.0:8000 backend.wsgi
   ```
   Press Ctrl+C to stop after testing.

6. **Create a systemd service for Gunicorn**:
   ```bash
   sudo nano /etc/systemd/system/gunicorn.service
   ```
   Add the following content:
   ```
   [Unit]
   Description=gunicorn daemon for Q-up
   After=network.target

   [Service]
   User=ubuntu
   Group=www-data
   WorkingDirectory=/var/www/q-up/backend
   EnvironmentFile=/var/www/q-up/backend/.env
   ExecStart=/var/www/q-up/backend/venv/bin/gunicorn --access-logfile - --workers 3 --bind unix:/var/www/q-up/backend/gunicorn.sock backend.wsgi:application
   Restart=on-failure

   [Install]
   WantedBy=multi-user.target
   ```

7. **Start and enable the Gunicorn service**:
   ```bash
   sudo systemctl start gunicorn
   sudo systemctl enable gunicorn
   sudo systemctl status gunicorn  # Check that it's running
   ```

## Step 7: Build and Deploy Frontend

1. **Install frontend dependencies and build**:
   ```bash
   cd /var/www/q-up/frontend
   npm install
   npm run build
   ```

2. **Configure Nginx**:
   ```bash
   sudo nano /etc/nginx/sites-available/q-up
   ```
   Add the following content:
   ```
   server {
       listen 80;
       server_name q-up.fun www.q-up.fun;

       # Frontend static files
       location / {
           root /var/www/q-up/frontend/dist;
           try_files $uri $uri/ /index.html;
       }

       # Backend API
       location /api {
           include proxy_params;
           proxy_pass http://unix:/var/www/q-up/backend/gunicorn.sock;
       }

       # Admin panel
       location /admin {
           include proxy_params;
           proxy_pass http://unix:/var/www/q-up/backend/gunicorn.sock;
       }

       # Static files (if not using S3 for static files)
       location /static/ {
           alias /var/www/q-up/backend/static/;
       }

       # Media files (fallback if S3 is not used)
       location /media/ {
           alias /var/www/q-up/backend/media/;
       }
   }
   ```

3. **Enable the Nginx site**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/q-up /etc/nginx/sites-enabled
   sudo nginx -t  # Test the configuration
   sudo systemctl restart nginx
   ```

## Step 8: Set Up SSL with Let's Encrypt

1. **Install Certbot**:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   ```

2. **Obtain and install certificates**:
   ```bash
   sudo certbot --nginx -d q-up.fun -d www.q-up.fun
   ```
   Follow the prompts to complete the setup.

3. **Verify automatic renewal**:
   ```bash
   sudo certbot renew --dry-run
   ```

## Step 9: Configure Domain DNS

1. **Log in to your GoDaddy account** (or other domain registrar)
2. **Navigate to your domain's DNS settings**
3. **Create/Update A records**:
   - Type: A
   - Name: @ (for root domain)
   - Value: Your EC2 instance's public IP
   - TTL: 600 seconds (or recommended value)
4. **Add another A record for www subdomain**:
   - Type: A
   - Name: www
   - Value: Your EC2 instance's public IP
   - TTL: 600 seconds (or recommended value)
5. **Wait for DNS propagation** (can take up to 24-48 hours, but often happens within an hour)

## Important Notes for Production

1. **Environment Variables**: Never hardcode AWS credentials in your settings file
2. **Database**: Consider using AWS RDS instead of SQLite for production
3. **HTTPS**: Ensure your application uses HTTPS in production (setup in Step 8)
4. **Backups**: Set up regular database backups
   ```bash
   # Example cron job for daily backups
   sudo nano /etc/cron.daily/db-backup
   ```
   Add:
   ```bash
   #!/bin/bash
   DATE=$(date +%Y-%m-%d)
   BACKUP_DIR=/var/backups/q-up
   mkdir -p $BACKUP_DIR
   cd /var/www/q-up/backend
   sqlite3 db.sqlite3 .dump > $BACKUP_DIR/q-up-$DATE.sql
   ```
   Make it executable:
   ```bash
   sudo chmod +x /etc/cron.daily/db-backup
   ```

5. **Monitoring**: Configure CloudWatch monitoring for your services
6. **Costs**: Monitor your AWS costs, especially S3 and data transfer
7. **Security Updates**: Regularly update your system and dependencies
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

## Troubleshooting

- **Images not showing**: Check S3 bucket permissions and CORS configuration
- **403 Forbidden errors**: Verify bucket policy allows public access
- **500 errors**: Check application logs with:
  ```bash
  sudo tail -f /var/log/nginx/error.log
  sudo journalctl -u gunicorn
  ```
- **Slow image loading**: Consider using CloudFront as a CDN
- **SSL certificate issues**: Re-run Certbot or check certificate status:
  ```bash
  sudo certbot certificates
  ```

## Additional Resources

- [Django Deployment Checklist](https://docs.djangoproject.com/en/stable/howto/deployment/checklist/)
- [Django-Storages Documentation](https://django-storages.readthedocs.io/en/latest/backends/amazon-S3.html)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/) 
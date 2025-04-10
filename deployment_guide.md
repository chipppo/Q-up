# Q-up AWS Deployment Guide

This guide covers deploying the Q-up application to AWS with a focus on properly handling media files.

## Prerequisites

- AWS account with administrator access
- AWS CLI installed and configured
- Python 3.8+ and pip
- Git

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
   - Note: In production, replace `"*"` in AllowedOrigins with your specific domain

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
   AWS_ACCESS_KEY_ID = 'your-access-key-id'  # Better to use environment variables
   AWS_SECRET_ACCESS_KEY = 'your-secret-access-key'  # Better to use environment variables
   AWS_STORAGE_BUCKET_NAME = 'your-bucket-name'
   AWS_S3_REGION_NAME = 'your-region'  # e.g., 'us-east-1'
   AWS_S3_FILE_OVERWRITE = False
   AWS_DEFAULT_ACL = None  # Don't set ACL, rely on bucket policy instead of 'public-read'
   AWS_S3_SIGNATURE_VERSION = 's3v4'
   
   AWS_S3_OBJECT_PARAMETERS = {
       'CacheControl': 'max-age=86400',
   }
   
   # Use custom storage backends
   DEFAULT_FILE_STORAGE = 'backend.storage_backends.MediaStorage'
   STATICFILES_STORAGE = 'backend.storage_backends.StaticStorage'
   ```

## Step 4: Migrate Existing Media Files to S3

1. **Run the migration script**:
   ```bash
   cd Q-up/backend
   python migrate_to_s3.py
   ```

2. **Verify migration**:
   - Go to your S3 bucket in AWS Console
   - Check if all media files are properly uploaded to the 'media' folder
   - Test your application to ensure images load correctly

## Step 5: Deploy Django App to AWS

### Option 1: AWS Elastic Beanstalk (Simplest)

1. **Install EB CLI**:
   ```bash
   pip install awsebcli
   ```

2. **Initialize EB application**:
   ```bash
   cd Q-up/backend
   eb init -p python-3.8 qup-application
   ```

3. **Create requirements.txt** (if not already present):
   ```bash
   pip freeze > requirements.txt
   ```

4. **Create an .ebextensions configuration file**:
   - Create file `Q-up/backend/.ebextensions/django.config`:
   ```yaml
   option_settings:
     aws:elasticbeanstalk:container:python:
       WSGIPath: backend.wsgi:application
     aws:elasticbeanstalk:application:environment:
       DJANGO_SETTINGS_MODULE: backend.settings
       AWS_ACCESS_KEY_ID: your-access-key-id
       AWS_SECRET_ACCESS_KEY: your-secret-access-key
       AWS_STORAGE_BUCKET_NAME: your-bucket-name
       AWS_S3_REGION_NAME: your-region
   ```

5. **Create and deploy to EB environment**:
   ```bash
   eb create qup-environment
   ```

### Option 2: EC2 Instance with Gunicorn/Nginx

1. **Set up EC2 instance** (Ubuntu recommended)
2. **Clone repository and install dependencies**
3. **Set up Gunicorn and Nginx**
4. **Configure environment variables for AWS credentials**
5. **Set up systemd service for Gunicorn**

Detailed instructions for EC2 deployment omitted for brevity but can be provided if needed.

## Step 6: Configure Frontend (React)

1. **Update API endpoints** in React app to point to your production backend
2. **Build the frontend**:
   ```bash
   cd Q-up/frontend
   npm run build
   ```

3. **Deploy the frontend**:
   - Option 1: S3 + CloudFront (recommended for production)
   - Option 2: Vercel, Netlify, or similar services
   - Option 3: Serve from the same EC2 instance via Nginx

## Important Notes for Production

1. **Environment Variables**: Never hardcode AWS credentials in your settings file
2. **Database**: Consider using AWS RDS instead of SQLite for production
3. **HTTPS**: Ensure your application uses HTTPS in production
4. **Backups**: Set up regular database backups
5. **Monitoring**: Configure CloudWatch monitoring for your services
6. **Costs**: Monitor your AWS costs, especially S3 and data transfer

## Troubleshooting

- **Images not showing**: Check S3 bucket permissions and CORS configuration
- **403 Forbidden errors**: Verify bucket policy allows public access
- **500 errors**: Check application logs for Python exceptions
- **Slow image loading**: Consider using CloudFront as a CDN

## Additional Resources

- [Django-Storages Documentation](https://django-storages.readthedocs.io/en/latest/backends/amazon-S3.html)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS Elastic Beanstalk Documentation](https://docs.aws.amazon.com/elasticbeanstalk/) 
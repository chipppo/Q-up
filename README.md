# Q-up - Connect with Gamers

![Q-up Logo](https://www.q-up.fun/logo.png)

Q-up is a social platform designed to help gamers connect with each other based on their game preferences, ranks, and playing habits. Find teammates who match your skill level and schedule, chat with them, and build your gaming community.

Website: [https://www.q-up.fun](https://www.q-up.fun)

## Features

- User profiles with game preferences, ranks, and active hours
- Game-specific ranking systems (both tier-based and numeric)
- Social feed with posts, comments, and likes
- Real-time chat with image sharing
- Friend/follower system
- Advanced search to find players by game, rank, and availability
- Responsive design for mobile and desktop

## Tech Stack

### Backend
- Django 4.2 (Python web framework)
- Django REST Framework (API)
- JWT Authentication
- SQLite (development) / PostgreSQL (production option)
- AWS S3 for media storage

### Frontend
- React 18
- Material UI
- Vite (build tool)
- Axios (API client)
- React Router
- Formik & Yup (form handling and validation)

## Getting Started

### Prerequisites
- Python 3.8 or higher
- Node.js 16 or higher
- Git
- AWS account (for production deployment)
- Visual Studio Code (recommended IDE)

### Setup Files and Downloads

To set up your development environment, download and install these tools:

#### Essential Development Tools

1. **Visual Studio Code**
   - Windows: [Download VSCode for Windows](https://code.visualstudio.com/docs/?dv=win64user)
   - macOS: [Download VSCode for macOS](https://code.visualstudio.com/docs/?dv=osx)
   - Linux: [Download VSCode for Linux](https://code.visualstudio.com/docs/?dv=linux64_deb)

2. **Python 3.8+**
   - Windows: [Python 3.11.8 for Windows](https://www.python.org/ftp/python/3.11.8/python-3.11.8-amd64.exe)
   - macOS: [Python 3.11.8 for macOS](https://www.python.org/ftp/python/3.11.8/python-3.11.8-macos11.pkg)
   - Linux: Use your distribution's package manager (`apt install python3`)

3. **Node.js 16+**
   - Windows: [Node.js 18.19.1 for Windows](https://nodejs.org/dist/v18.19.1/node-v18.19.1-x64.msi)
   - macOS: [Node.js 18.19.1 for macOS](https://nodejs.org/dist/v18.19.1/node-v18.19.1.pkg)
   - Linux: [Node.js 18.19.1 for Linux](https://nodejs.org/dist/v18.19.1/node-v18.19.1-linux-x64.tar.xz)

4. **Git**
   - Windows: [Git 2.44.0 for Windows](https://github.com/git-for-windows/git/releases/download/v2.44.0.windows.1/Git-2.44.0-64-bit.exe)
   - macOS: [Git for macOS](https://sourceforge.net/projects/git-osx-installer/files/git-2.33.0-intel-universal-mavericks.dmg/download)
   - Linux: Use your distribution's package manager (`apt install git`)

#### Additional Tools for Deployment

5. **AWS CLI**
   - Windows: [AWS CLI for Windows](https://awscli.amazonaws.com/AWSCLIV2.msi)
   - macOS: [AWS CLI for macOS](https://awscli.amazonaws.com/AWSCLIV2.pkg)
   - Linux: [AWS CLI for Linux](https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip)

6. **SQLite Browser** (helpful for development)
   - Windows: [SQLite Browser for Windows](https://github.com/sqlitebrowser/sqlitebrowser/releases/download/v3.12.2/DB.Browser.for.SQLite-3.12.2-win64.msi)
   - macOS: [SQLite Browser for macOS](https://github.com/sqlitebrowser/sqlitebrowser/releases/download/v3.12.2/DB.Browser.for.SQLite-3.12.2.dmg)
   - Linux: Use your distribution's package manager (`apt install sqlitebrowser`)

### Recommended VS Code Extensions
For the best development experience, install these VS Code extensions:

1. **Python** - Python language support
2. **Django** - Django template language support
3. **ES7+ React/Redux/React-Native snippets** - Useful React snippets
4. **ESLint** - JavaScript linting
5. **Prettier** - Code formatting
6. **SQLite** - SQLite database explorer

### Local Development Setup

#### Clone the repository
```bash
git clone https://github.com/chipppo/Q-up.git
cd Q-up
```

#### Backend Setup
```bash
# Create and activate virtual environment
cd backend
python -m venv venv

# On Windows:
venv\Scripts\activate
# If you encounter execution policy error:
# Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

# On Unix/MacOS:
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Run database migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Your backend server will be running at `http://localhost:8000` and frontend at `http://localhost:5173`.

## Environment Variables

For local development, create a `.env` file in the backend directory with the following variables:

```
# Django Settings
SECRET_KEY=your_django_secret_key
DEBUG=True

# For S3 Media Storage (optional for local development)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_STORAGE_BUCKET_NAME=your_s3_bucket_name
AWS_S3_REGION_NAME=your_s3_region
```

## Deployment

### AWS Deployment

The application is currently deployed on AWS with the following architecture:
- EC2 instance for hosting the Django application
- S3 bucket for media file storage
- GoDaddy domain with DNS pointing to EC2

For detailed deployment instructions, see the [deployment guide](deployment_guide.md).

### Key Deployment Steps

1. Set up an EC2 instance (Ubuntu recommended)
2. Configure an S3 bucket for media storage
3. Install dependencies on the server
4. Set up Gunicorn and Nginx
5. Configure environment variables
6. Build and deploy the frontend
7. Set up SSL certificates for HTTPS

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

- Developer: Kristiyan Pashov
- Website: [https://www.q-up.fun](https://www.q-up.fun)

## Acknowledgements

- [Django](https://www.djangoproject.com/)
- [React](https://reactjs.org/)
- [Material UI](https://mui.com/)
- [AWS](https://aws.amazon.com/)

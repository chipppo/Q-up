# Q-up
Diplomna rabota Q-up

Setup the project

git init
git clone https://github.com/chipppo/Q-up
//backend setup
cd backend
python -m venv venv
//if execution policy error occurs Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
venv/Scripts/activate

pip install --upgrade pip

pip install -r requirements.txt
//database migrations
python manage.py makemigrations
python manage.py migrate
//run server
python manage.py runserver


//frontend setup
cd frontend
npm install
npm run dev//run server

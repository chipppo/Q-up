# Gunicorn configuration file
import multiprocessing

# Bind to specific address and port
bind = "0.0.0.0:8000"

# Number of worker processes
# A common formula is to use (2 x $num_cores) + 1
workers = multiprocessing.cpu_count() * 2 + 1

# Maximum requests before a worker restart (to prevent memory leaks)
max_requests = 1000
max_requests_jitter = 50

# Logging
accesslog = "/var/log/gunicorn/access.log"
errorlog = "/var/log/gunicorn/error.log"
loglevel = "info"

# Process name
proc_name = "qup_django"

# Timeout (seconds)
timeout = 120

# Keep the worker alive for this many seconds after a restart
graceful_timeout = 30

# Debugging: set to True in development, False in production
reload = False

# SSL configuration (uncomment and set correct paths if using HTTPS)
# keyfile = "/etc/ssl/private/key.pem"
# certfile = "/etc/ssl/certs/cert.pem" 
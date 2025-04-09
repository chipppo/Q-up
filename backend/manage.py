#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    # Настройки по подразбиране
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    try:
        # Импорт на функцията
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        # Грешка при липса на Django
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    # Изпълнение
    execute_from_command_line(sys.argv)


# Стартиране
if __name__ == '__main__':
    main()

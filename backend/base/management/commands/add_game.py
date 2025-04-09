from django.core.management.base import BaseCommand
from base.models import Game

class Command(BaseCommand):
    help = 'Add a new game to the database'

    def add_arguments(self, parser):
        parser.add_argument('name', type=str, help='Name of the game')
        parser.add_argument('description', type=str, help='Description of the game')

    def handle(self, *args, **options):
        game = Game.objects.create(
            name=options['name'],
            description=options['description']
        )
        self.stdout.write(
            self.style.SUCCESS(f'Successfully created game "{game.name}"')
        ) 
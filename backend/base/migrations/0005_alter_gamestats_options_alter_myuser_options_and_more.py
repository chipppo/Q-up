# Generated by Django 5.1.6 on 2025-03-03 10:54

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0004_game_logo_alter_game_name'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='gamestats',
            options={'verbose_name': 'Game Stats', 'verbose_name_plural': 'Game Stats'},
        ),
        migrations.AlterModelOptions(
            name='myuser',
            options={'verbose_name': 'User', 'verbose_name_plural': 'Users'},
        ),
        migrations.AlterUniqueTogether(
            name='gamestats',
            unique_together={('user', 'game')},
        ),
    ]

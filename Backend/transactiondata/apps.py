from django.apps import AppConfig


class TransactiondataConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'transactiondata'

    def ready(self):
        import transactiondata.signals

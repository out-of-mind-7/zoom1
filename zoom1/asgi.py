import os
import django

# Set the Django settings module first
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zoom1.settings')

# Initialize Django BEFORE importing any Django components
django.setup()

# Now import Django components after setup
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

# Create a placeholder for your websocket patterns
websocket_urlpatterns = []

# Try to import your app's routing, or use empty patterns if it fails
try:
    # Replace 'your_app' with your actual app name
    from clone import routing
    websocket_urlpatterns = routing.websocket_urlpatterns
except ImportError:
    pass

# Define the ASGI application
application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
# clone/routing.py

from channels.routing import ProtocolTypeRouter, URLRouter
from django.urls import path
from .consumers import SignalingConsumer  # Import your consumer

websocket_urlpatterns = [
    path('ws/signaling/', SignalingConsumer.as_asgi()),  # Define your WebSocket path
]

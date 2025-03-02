from django.urls import path
from . import consumers  # Make sure this file exists

# If you don't have any consumers yet, use empty list
websocket_urlpatterns = [
    # Comment out or fix the line below
    # path("ws/some_path/", consumers.MyConsumer.as_asgi()),
]
# from django.urls import re_path
# from . import consumers

# websocket_urlpatterns = [
#     re_path(r'ws/chat/(?P<room_name>\w+)/$', consumers.ChatConsumer.as_asgi()),
# ]

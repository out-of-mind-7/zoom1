from django.urls import path
from . import views

urlpatterns = [
    # Existing URLs
    path('', views.lobby, name='lobby'),
    path('room/', views.room, name='room'),
    path('get_token/', views.getToken, name='get_token'),
    path('create_member/', views.createMember, name='create_member'),
    path('get_member/', views.getMember, name='get_member'),
    path('delete_member/', views.deleteMember, name='delete_member'),
    
    # New URLs for password protection
    path('create_room/', views.create_room, name='create_room'),
    path('verify_room_password/', views.verify_room_password, name='verify_room_password'),
]
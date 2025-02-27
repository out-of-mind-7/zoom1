from django.urls import path
from . import views

urlpatterns = [
    path('',views.lobby_view,name='lobby'),
    path('room/',views.room_view,name='room'),
    path('get_token/',views.getToken,name='get_token'),
    path('create_member/', views.createMember,name='create_member'),
    path('get_member/', views.getMember),
    path('delete_member/', views.deleteMember),
]

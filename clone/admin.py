from django.contrib import admin
from .models import RoomMember

@admin.register(RoomMember)
class RoomMemberAdmin(admin.ModelAdmin):
    list_display = ('name', 'uid', 'room_name', 'insession')

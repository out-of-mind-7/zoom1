import datetime
from django.shortcuts import render
from django.http import JsonResponse
import random
import time
from agora_token_builder import RtcTokenBuilder
from .models import Room, RoomMember
import json
from django.views.decorators.csrf import csrf_exempt



# Create your views here.

# Using Django as an example, but you can adapt to your backend

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

# Dictionary to store rooms (in a real app, use a database)
rooms = {}

@require_http_methods(["GET"])
def check_room(request):
    room_name = request.GET.get('room', '')
    exists = room_name in rooms
    return JsonResponse({'exists': exists})
@csrf_exempt
@require_http_methods(["POST"])
def create_room(request):
    try:
        data = json.loads(request.body)
        room_name = data.get('room_name', '')
        password = data.get('password', '')

        if not room_name:
            return JsonResponse({'error': 'Room name is required'}, status=400)

        # Check if room already exists
        if Room.objects.filter(name=room_name).exists():
            return JsonResponse({'error': 'Room already exists'}, status=409)

        # Create new room in the database
        room = Room.objects.create(
            name=room_name,
            password=password
        )

        return JsonResponse({
            'room_name': room_name,
            'created_at': room.created_at.isoformat()
        })
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def verify_room_password(request):
    try:
        data = json.loads(request.body)
        room_name = data.get('room_name', '')
        password = data.get('password', '')

        if not room_name:
            return JsonResponse({'error': 'Room name is required'}, status=400)

        try:
            room = Room.objects.get(name=room_name)

            # Verify password
            if room.password != password:
                return JsonResponse({'error': 'Incorrect password'}, status=403)

            return JsonResponse({'success': True, 'room_name': room_name})
        except Room.DoesNotExist:
            return JsonResponse({'error': 'Room does not exist'}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

# Update your existing create_member endpoint to associate with rooms
@csrf_exempt
@require_http_methods(["POST"])
def create_member(request):
    data = json.loads(request.body)
    name = data.get('name')
    room_name = data.get('room_name')
    uid = data.get('UID')
    
    if not room_name or room_name not in rooms:
        return JsonResponse({'error': 'Room does not exist'}, status=404)
    
    member = {
        'name': name,
        'uid': uid,
        'room': room_name
    }
    
    # Add member to the room
    rooms[room_name]['members'].append(member)
    
    return JsonResponse(member)

# Update get_member endpoint
@require_http_methods(["GET"])
def get_member(request):
    uid = request.GET.get('UID')
    room_name = request.GET.get('room_name')
    
    if not room_name or room_name not in rooms:
        return JsonResponse({'error': 'Room does not exist'}, status=404)
    
    # Find the member in the room
    for member in rooms[room_name]['members']:
        if member['uid'] == uid:
            return JsonResponse(member)
    
    return JsonResponse({'error': 'Member not found'}, status=404)


def lobby(request):
    return render(request, 'lobby.html')

def room(request):
    return render(request, 'room.html')


def getToken(request):
    appId = "a18e8c40bf09475cbcfc53f2ada188c8"
    appCertificate = "01b6ada9d762415cbe351a178b5af866"
    channelName = request.GET.get('channel')
    
    if not channelName:
        return JsonResponse({'error': 'Channel name is required'}, status=400)

    try:
        uid = random.randint(1, 230)
        expirationTimeInSeconds = 3600
        currentTimeStamp = int(time.time())
        privilegeExpiredTs = currentTimeStamp + expirationTimeInSeconds
        role = 1

        token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role, privilegeExpiredTs)
        return JsonResponse({'token': token, 'uid': uid}, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def createMember(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        member, created = RoomMember.objects.get_or_create(
            name=data['name'],
            uid=data['UID'],
            room_name=data['room_name']
        )
        return JsonResponse({'name': data['name']}, safe=False)
    return JsonResponse({'error': 'Invalid request method'}, status=400)

def getMember(request):
    uid = request.GET.get('UID')
    room_name = request.GET.get('room_name')

    member = RoomMember.objects.get(
        uid=uid,
        room_name=room_name,
    )
    name = member.name
    return JsonResponse({'name':member.name}, safe=False)

@csrf_exempt
def deleteMember(request):
    data = json.loads(request.body)
    member = RoomMember.objects.get(
        name=data['name'],
        uid=data['UID'],
        room_name=data['room_name']
    )
    member.delete()
    return JsonResponse('Member deleted', safe=False)

# clone/views.py
from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate
from .forms import SignUpForm

def signup_view(request):
    if request.method == "POST":
        form = SignUpForm(request.POST)
        if form.is_valid():
            form.save()
            username = form.cleaned_data.get("username")
            password = form.cleaned_data.get("password1")
            user = authenticate(username=username, password=password)
            login(request, user)
            return redirect("home")  
    else:
        form = SignUpForm()
    return render(request, "signup.html", {"form": form})


from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate
from .forms import LoginForm

def login_view(request):
    if request.method == "POST":
        form = LoginForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect("home") 
    else:
        form = LoginForm()
    return render(request, "login.html", {"form": form})



from django.shortcuts import redirect
from django.contrib.auth import logout

def logout_view(request):
    logout(request)
    return redirect('login')  



from django.shortcuts import render

def lobby_view(request):
    return render(request, 'lobby.html')


from django.shortcuts import render

def room_view(request):
    return render(request, 'room.html')

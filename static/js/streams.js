const APP_ID = 'a18e8c40bf09475cbcfc53f2ada188c8'; //App ID
const CHANNEL = sessionStorage.getItem('room') || 'default_channel'; 
let TOKEN = sessionStorage.getItem('token');
const NAME = sessionStorage.getItem('name');
let UID = Number(sessionStorage.getItem('UID')); // Initialize UID

console.log('Session Storage Values:');
console.log('Room:', CHANNEL);
console.log('Token:', TOKEN);
console.log('Name:', NAME);
console.log('UID:', UID); 

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

let localTracks = [];
let remoteUsers = {};

// Replace with your deployed server URL
const SERVER_URL = 'https://your-deployed-server.com'; // CHANGE THIS to your deployed server

//check camera access
const checkCameraAccess = async () => {
  try {
    const devices = await AgoraRTC.getDevices();
    const videoDevices = devices.filter((device) => device.kind === 'videoinput');
    if (videoDevices.length === 0) {
      alert('No camera detected. Please connect a camera or check permissions.');
      return false;
    }
    return true;
  } catch (error) {
    alert('Failed to access camera. Please check browser yy permissions.');
    return false;
  }
};

//fetch token
const fetchToken = async (channel) => {
  try {
    // Use the full URL including the deployed server domain
    const response = await fetch(`${SERVER_URL}/get_token/?channel=${channel}`);
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Error fetching token:', error);
    // Fallback to null token for development/testing
    // For production, you should handle this error more gracefully
    return null;
  }
};


// Function to join and display local stream
const joinAndDisplayLocalStream = async () => {
  document.getElementById('room-name').innerText = CHANNEL;

  try {
    if (!TOKEN) {
      TOKEN = await fetchToken(CHANNEL);
      if (TOKEN) {
        sessionStorage.setItem('token', TOKEN);
        console.log('Fetched and set token:', TOKEN);
      } else {
        console.warn('No token available - proceeding with null token (only works for testing)');
      }
    }

    console.log('Joining channel with UID:', UID);
    const newUID = await client.join(APP_ID, CHANNEL, TOKEN || null, UID); // Allow null token for testing
    console.log('Joined UID:', newUID);
    UID = newUID; // Reassign UID to the newUID value

    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();
    console.log('Local tracks:', localTracks);

    // Create user entry if server is available
    let memberName = NAME;
    try {
      let member = await createMember();
      console.log('member:', member);
      if (member && member.name) {
        memberName = member.name;
      }
    } catch (e) {
      console.warn('Could not create member entry, using default name:', e);
    }

    const player = `
      <div class="video-container" id="user-container-${UID}">
        <div class="username-wrapper"><span class="user-name">${memberName}</span></div>
        <div class="video-player" id="user-${UID}"></div>
      </div>
    `;
    document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);
    localTracks[1].play(`user-${UID}`);
    await client.publish(localTracks);

    console.log("Local stream joined and displayed");
  } catch (error) {
    console.error('Error joining and displaying local stream:', error);
    alert('Failed to join the video call. Please try again.');
  }
};

// Function to handle user left event
const handleUserLeft = (user) => {
  delete remoteUsers[user.uid];
  const userContainer = document.getElementById(`user-container-${user.uid}`);
  if (userContainer) userContainer.remove();
};

// Function to leave and remove local stream
const leaveAndRemoveLocalStream = async () => {
  localTracks.forEach((track) => {
    track.stop();
    track.close();
  });
  await client.leave();
  window.open('/', '_self');
};

const toggleCamera = async (e) => {
  try {
    // Check if video track exists
    if (!localTracks[1]) {
      console.log("Creating new camera track...");
      try {
        localTracks[1] = await AgoraRTC.createCameraVideoTrack();
        await client.publish(localTracks[1]);
        console.log("Camera track created and published successfully");
      } catch (err) {
        console.error("Failed to create camera track:", err);
        alert("Could not access camera. Please check permissions.");
        return;
      }
    }
    
    // Check current enabled state and toggle it
    const currentState = localTracks[1].enabled !== false; // Get current state
    console.log("Current camera state:", currentState ? "ON" : "OFF");
    
    await localTracks[1].setEnabled(!currentState);
    
    // Update UI
    e.target.style.backgroundColor = !currentState ? '#fff' : 'rgb(255, 80, 80)';
    console.log("Camera turned", !currentState ? "ON" : "OFF");
    
  } catch (error) {
    console.error("Error toggling camera:", error);
    alert("Failed to toggle the camera: " + error.message);
  }
};

// Function to toggle microphone
const toggleMic = async (e) => {
  if (localTracks[0].muted) {
    await localTracks[0].setMuted(false);
    e.target.style.backgroundColor = '#fff';
  } else {
    await localTracks[0].setMuted(true);
    e.target.style.backgroundColor = 'rgb(255, 80, 80)';
  }
};

let createMember = async () => {
  try {
    let response = await fetch(`${SERVER_URL}/create_member/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        'name': NAME,
        'room_name': CHANNEL,
        'UID': UID
      })
    });
    let member = await response.json();
    return member;
  } catch (error) {
    console.error('Error creating member:', error);
    return { name: NAME }; // Fallback to session name
  }
}

let getMember = async (user) => {
  try {
    let response = await fetch(`${SERVER_URL}/get_member/?UID=${user.uid}&room_name=${CHANNEL}`);
    let member = await response.json();
    return member;
  } catch (error) {
    console.error('Error getting member:', error);
    return { name: `User ${user.uid}` }; // Default name if server unavailable
  }
}

// Initialize Agora
const initializeAgora = async () => {
  if (!(await checkCameraAccess())) return;

  client.on('user-left', handleUserLeft);

  client.on('user-published', async (user, mediaType) => {
    remoteUsers[user.uid] = user;
    
    try {
      await client.subscribe(user, mediaType);
      
      if (mediaType === 'video') {
        const remoteVideoTrack = user.videoTrack;

        // Try to get member info, fallback to default name
        let memberName = `User ${user.uid}`;
        try {
          let member = await getMember(user);
          console.log('Fetched member details:', member);
          if (member && member.name) {
            memberName = member.name;
          }
        } catch (e) {
          console.warn('Could not get member details:', e);
        }

        const player = `
          <div class="video-container" id="user-container-${user.uid}">
            <div class="username-wrapper"><span class="user-name">${memberName}</span></div>
            <div class="video-player" id="user-${user.uid}"></div>
          </div>
        `;
        document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);
        remoteVideoTrack.play(`user-${user.uid}`);
      }

      if (mediaType === 'audio') {
        const remoteAudioTrack = user.audioTrack;
        remoteAudioTrack.play();
      }
    } catch (error) {
      console.error('Error subscribing to remote user:', error);
    }
  });

  await joinAndDisplayLocalStream();
};

// Event listeners for buttons
document.getElementById('leave-btn').addEventListener('click', leaveAndRemoveLocalStream);
document.getElementById('camera-btn').addEventListener('click', toggleCamera);
document.getElementById('mic-btn').addEventListener('click', toggleMic);

// Start initialization
initializeAgora();
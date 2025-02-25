const APP_ID = 'a18e8c40bf09475cbcfc53f2ada188c8'; // Your actual App ID
const CHANNEL = sessionStorage.getItem('room') || 'default_channel'; // Default channel if not found
let TOKEN = sessionStorage.getItem('token');
const NAME = sessionStorage.getItem('name');
let UID = Number(sessionStorage.getItem('UID')); // Initialize UID

console.log('Session Storage Values:');
console.log('Room:', CHANNEL);
console.log('Token:', TOKEN);
console.log('Name:', NAME);
console.log('UID:', UID); // Log UID for debugging

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

let localTracks = [];
let remoteUsers = {};

// Function to check camera access
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
    alert('Failed to access camera. Please check browser permissions.');
    return false;
  }
};

// Function to fetch token
const fetchToken = async (channel) => {
  try {
    const response = await fetch(`/get_token/?channel=${channel}`);
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Error fetching token:', error);
  }
};

// Function to join and display local stream
const joinAndDisplayLocalStream = async () => {
  document.getElementById('room-name').innerText = CHANNEL;

  if (!TOKEN) {
    TOKEN = await fetchToken(CHANNEL);
    sessionStorage.setItem('token', TOKEN);
    console.log('Fetched and set token:', TOKEN);
  }

  try {
    console.log('Joining channel with UID:', UID);
    const newUID = await client.join(APP_ID, CHANNEL, TOKEN, UID); // Store the result in a new variable
    console.log('Joined UID:', newUID);
    UID = newUID; // Reassign UID to the newUID value

    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();
    console.log('Local tracks:', localTracks);

    const player = `
      <div class="video-container" id="user-container-${UID}">
        <div class="username-wrapper"><span class="user-name">My Name</span></div>
        <div class="video-player" id="user-${UID}"></div>
      </div>
    `;
    document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);
    localTracks[1].play(`user-${UID}`);
    await client.publish(localTracks);

    console.log("Local stream joined and displayed");
  } catch (error) {
    console.error('Error joining and displaying local stream:', error);
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

// Function to toggle camera
const toggleCamera = async (e) => {
  if (localTracks[1].muted) {
    await localTracks[1].setEnabled(false);
    e.target.style.backgroundColor = '#fff';
  } else {
    await localTracks[1].setEnabled(true);
    e.target.style.backgroundColor = 'rgb(255, 80, 80)';
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

// Initialize Agora
const initializeAgora = async () => {
  if (!(await checkCameraAccess())) return;

  client.on('user-left', handleUserLeft);

  client.on('user-published', async (user, mediaType) => {
    await client.subscribe(user, mediaType);
    
    if (mediaType === 'video') {
      const remoteVideoTrack = user.videoTrack;
      const player = `
        <div class="video-container" id="user-container-${user.uid}">
          <div class="username-wrapper"><span class="user-name">User ${user.uid}</span></div>
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
  });

  await joinAndDisplayLocalStream();
};


// Event listeners for buttons
document.getElementById('leave-btn').addEventListener('click', leaveAndRemoveLocalStream);
document.getElementById('camera-btn').addEventListener('click', toggleCamera);
document.getElementById('mic-btn').addEventListener('click', toggleMic);

// Start initialization
initializeAgora();

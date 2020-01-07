const spotify = new Spotify('5484af1e57fb40039d162a4681c71575', window.location.href);
var playlistID = null;
var playlistName = null;
var playlistTracks = null;
var playedPairs = {};

var oddNumbers = true;
var leftIndex = -2;
var rightIndex = -1;
var left = null;
var right = null;

// Used to detect if you've sorted the whole list
var lastDecision = null;

const stateKey = 'spotify_auth_state';

// Shortcut for document.getElementById
const $ = (...args) => document.getElementById(...args);

async function init() {

  if (!spotify.accessToken) {
    // Try to complete the login flow
    const loggedIn = spotify.completeLoginFlow();
    if (!loggedIn) {
      $('login-container').classList.remove('d-none');
      return;
    }
  }


  if (!spotify.accessToken) {
    // Show the login to Spotify button

  }

  playlistID = localStorage.getItem('playlistID');
  playlistName = localStorage.getItem('playlistName');
  if (!playlistID) {
    await showPlaylistSelector();
    return;
  }

  showStartButton();

  restoreState();

  if (playlistTracks) {
    renderOrderedTracks();
  }
}

async function showPlaylistSelector() {
  $('playlist-selector-list').innerHTML = 'Loading...';

  let playlists = await spotify.getMyPlaylists();

  $('playlist-selector-list').innerHTML = '';

  for (let playlist of playlists.items) {
    let li = document.createElement('a');
    li.href = '#';
    li.innerText = playlist.name;
    li.dataset.playlistID = playlist.id;
    li.classList.add('list-group-item');
    li.classList.add('list-group-item-action');
    $('playlist-selector-list').appendChild(li);

    li.addEventListener('click', selectPlaylist);
  }

  $('playlist-selector').classList.remove('d-none');
}

function selectPlaylist(evt) {
  playlistID = evt.currentTarget.dataset.playlistID;
  playlistName = evt.currentTarget.innerText
  localStorage.setItem('playlistID', playlistID);
  localStorage.setItem('playlistName', playlistName);
  leftIndex = -2;
  rightIndex = -1;
  playlistTracks = null;
  playedPairs = {};

  // Hide the playlist selector, show the start button
  $('playlist-selector').classList.add('d-none');
  showStartButton();
}

function showStartButton() {
  $('start-button-playlist-name').innerText = playlistName;
  $('start-button').classList.remove('d-none');
}

init();
// Post-init hide loading div
$('loading').classList.add('d-none');

function loginWithSpotify() {
  spotify.loginWithSpotify();
}

function startPressed() {
  // Hide start button
  $('start-button').classList.add('d-none');

  $('main-player').classList.remove('d-none');
  $('list-container').classList.remove('d-none');
  getNextTrackPair();
}

function changePlaylist() {
  playlistID = null;
  playlistName = null;
  localStorage.removeItem('playlistID');
  localStorage.removeItem('playlistName');

  showPlaylistSelector();
}

// Gratuitously stolen from SO
function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

async function getPlaylistTracks() {
  if (playlistTracks === null) {
    let rslt = await spotify.getPlaylistTracks(playlistID);

    playlistTracks = rslt.items;

    // Shuffle the playlist tracks
    shuffle(playlistTracks);

    localStorage.setItem('playlistTracks-'+playlistID, playlistTracks);
    return playlistTracks;
  } else {
    return playlistTracks;
  }
}

function renderOrderedTracks() {
  const el = $('sorted-list');
  el.innerHTML = '';
  for(let track of playlistTracks) {
    let li = document.createElement('li');
    li.innerHTML = track.track.artists.map( o => o.name ).join(', ') + ' - ' + track.track.name;
    el.appendChild(li);
  }
}

function saveState() {
  function store(name, val) {
    localStorage.setItem(name, JSON.stringify(val));
  }
  store('leftIndex', leftIndex);
  store('rightIndex', rightIndex);
  store('oddNumbers', oddNumbers);
  store('playlistTracks-'+playlistID, playlistTracks);
}

function restoreState() {
  function restore(name, def) {
    try {
      let val = localStorage.getItem(name);
      if (val === null) {
        return def;
      }
      return JSON.parse(val);
    } catch {
      return def;
    }
  }
  leftIndex = restore('leftIndex', leftIndex);
  rightIndex = restore('rightIndex', rightIndex);
  oddNumbers = restore('oddNumbers', oddNumbers);
  playlistTracks = restore('playlistTracks-'+playlistID, playlistTracks);
}

async function getNextTrackPair() {
  let playlistTracks = await getPlaylistTracks();

  leftIndex += 2;
  rightIndex += 2;

  if (rightIndex >= playlistTracks.length) {
    if (oddNumbers) {
      leftIndex = 1;
      rightIndex = 2;
    } else {
      leftIndex = 0;
      rightIndex = 1;
    }
    oddNumbers = !oddNumbers;
  }

  left = playlistTracks[leftIndex];
  right = playlistTracks[rightIndex];

  $('title-left').innerText = left.track.name;
  $('title-right').innerText = right.track.name;

  $('artist-left').innerText = left.track.artists.map(o => o.name).join(', ');
  $('artist-right').innerText = right.track.artists.map(o => o.name).join(', ');

  $('left-side').style.backgroundColor = '';
  $('right-side').style.backgroundColor = '';

  let pairID = getPairID(left, right);
  let betterID = playedPairs[pairID];
  if (betterID !== undefined) {
    if (pairID === lastDecision) {
      // You've made it all the way around and the list is sorted
      alert('List is sorted!');
      return;
    }
    let side = betterID == left.track.id ? 'left' : 'right';
    $(side+'-side').style.backgroundColor = '#CFC';
    setTimeout(function() {
      selectBetterSide(side);
    }, 300);
    return;
  }

  $('preview-left').src = left.track.preview_url;
  $('preview-right').src = right.track.preview_url;

  renderOrderedTracks();
  saveState();
}

function getPairID(a, b) {
  let pairID = [a.track.id, b.track.id];
  pairID.sort();
  return pairID.join(' ');
}

function selectBetterSide(side) {
  if (side == 'right') {
    // Swap the best tracks towards the start of the array
    playlistTracks[leftIndex] = right;
    playlistTracks[rightIndex] = left;
    localStorage.setItem('playlistTracks-'+playlistID, playlistTracks);
  }

  $(side+'-side').style.backgroundColor = '#CFC';

  let pairID = getPairID(left, right);
  playedPairs[pairID] = side == 'left' ? left.track.id : right.track.id;

  lastDecision = pairID;

  getNextTrackPair();
}

const leftSide = $('left-side');
leftSide.addEventListener('mouseover', function() {
  $('preview-left').play();
});

leftSide.addEventListener('mouseout', function() {
  $('preview-left').pause();
});

leftSide.addEventListener('click', function() {
  selectBetterSide('left');
});

const rightSide = $('right-side');
rightSide.addEventListener('mouseover', function() {
  $('preview-right').play();
});

rightSide.addEventListener('mouseout', function() {
  $('preview-right').pause();
});

rightSide.addEventListener('click', function() {
  selectBetterSide('right');
});
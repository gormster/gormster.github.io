function generateRandomString(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function getHashParams() {
  var hashParams = {};
  var e, r = /([^&;=]+)=?([^&;]*)/g,
      q = window.location.hash.substring(1);
  while ( e = r.exec(q)) {
     hashParams[e[1]] = decodeURIComponent(e[2]);
  }
  return hashParams;
}

class Spotify {

  constructor(clientId, redirectUri) {
    this.clientId = clientId;
    this.redirectUri = redirectUri;

    this.accessToken = localStorage.getItem('accessToken');
  }

  loginWithSpotify() {
    var state = generateRandomString(16);
    localStorage.setItem(stateKey, state);
    var scope = 'user-read-private user-read-email';
    var url = 'https://accounts.spotify.com/authorize';
    url += '?response_type=token';
    url += '&client_id=' + encodeURIComponent(this.clientId);
    url += '&scope=' + encodeURIComponent(scope);
    url += '&redirect_uri=' + encodeURIComponent(this.redirectUri);
    url += '&state=' + encodeURIComponent(state);
    window.location = url;
  }

  completeLoginFlow() {
    var params = getHashParams();

    var access_token = params.access_token,
      state = params.state,
      storedState = localStorage.getItem(stateKey);

    if (access_token) {
      if ((state == null) || (state !== storedState)) {
        alert('There was an error during the authentication');
        return false;
      } else {
        localStorage.removeItem(stateKey);
        localStorage.setItem('accessToken', access_token);

        this.accessToken = access_token;
        return true;
      }
    }

    return false;

  }

  async getMyPlaylists(opts) {
    let response = await fetch('https://api.spotify.com/v1/me/playlists', {
      headers: {
        'Authorization': 'Bearer ' + this.accessToken
      }
    });

    let rslt = await response.json();

    return rslt;
  }

  async getPlaylistTracks(playlistID, opts) {
    let response = await fetch('https://api.spotify.com/v1/playlists/'+playlistID+'/tracks', {
      headers: {
        'Authorization': 'Bearer ' + this.accessToken
      }
    });

    let rslt = await response.json();

    return rslt;
  }

}
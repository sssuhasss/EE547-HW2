const https = require('https');
const querystring = require('querystring');

class SpotifyApi {
  constructor(accessToken) {
    this.accessToken = accessToken;
  }

  static getAccessToken(clientId, clientSecret, callback) {
    const bearer = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const postData = querystring.stringify({ grant_type: 'client_credentials' });
    const options = {
      hostname: 'accounts.spotify.com',
      path: '/api/token',
      method: 'POST',
      headers: {
        Authorization: `Basic ${bearer}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 200) {
            callback(null, parsed.access_token);
          } else {
            callback(new ApiError('Failed to get access token'), null);
          }
        } catch (e) {
          callback(e, null);
        }
      });
    });

    req.on('error', (e) => {
      callback(e, null);
    });

    req.write(postData);
    req.end();
  }

  getTrack(trackId, callback) {
    this._makeRequest(`/v1/tracks/${trackId}`, (err, data) => {
      if (err) {
        callback(err, null);
      } else {
        const track = this._transformTrack(data);
        callback(null, track);
      }
    });
  }

  searchTracks(query, callback) {
    this._makeRequest(`/v1/search?q=${encodeURIComponent(query)}&type=track`, (err, data) => {
      if (err) {
        callback(err, null);
      } else {
        if (data.tracks && data.tracks.items.length > 0) {
          const tracks = data.tracks.items.map(this._transformTrack.bind(this));
          callback(null, tracks);
        } else {
          callback(null, []);
        }
      }
    });
  }

  getArtist(artistId, callback) {
    this._makeRequest(`/v1/artists/${artistId}`, (err, data) => {
      if (err) {
        callback(err, null);
      } else {
        const artist = this._transformArtist(data);
        callback(null, artist);
      }
    });
  }

  getArtistTopTracks(artistId, marketCode, callback) {
    this._makeRequest(`/v1/artists/${artistId}/top-tracks?market=${marketCode}`, (err, data) => {
      if (err) {
        callback(err, null);
      } else {
        if (data.tracks && data.tracks.length > 0) {
          const tracks = data.tracks.map(track => this._transformTrackForArtistTopTracks(track, data.tracks[0].artists));
          callback(null, tracks);
        } else {
          callback(new ApiError('No top tracks found'), null);
        }
      }
    });
  }

  _makeRequest(path, callback) {
    const options = {
      hostname: 'api.spotify.com',
      path: path,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 404) {
            callback(new EntityNotFoundError('Entity not found'), null);
          } else if (res.statusCode >= 400) {
            callback(new ApiError('API Error'), null);
          } else {
            callback(null, parsed);
          }
        } catch (e) {
          callback(e, null);
        }
      });
    });

    req.on('error', (e) => {
      callback(e, null);
    });

    req.end();
  }

  _transformTrack(data) {
    return {
      albumId: data.album.id,
      artists: data.artists.map(artist => ({
        artistId: artist.id,
        name: artist.name,
        followers: 0, 
        genres: [], 
        imageUrl: "", 
        popularity: 0 
      })),
      durationMs: data.duration_ms,
      trackId: data.id,
      name: data.name,
      popularity: data.popularity,
      previewUrl: data.preview_url,
    };
  }

  _transformTrackForArtistTopTracks(data, artistsData) {
    return {
      albumId: data.album.id,
      artists: artistsData.map(artist => ({
        artistId: artist.id,
        name: artist.name,
        followers: 0, 
        genres: [], 
        imageUrl: "", 
        popularity: 0 
      })),
      durationMs: data.duration_ms,
      trackId: data.id,
      name: data.name,
      popularity: data.popularity,
      previewUrl: data.preview_url,
    };
  }

  _transformArtist(data) {
    return {
      artistId: data.id,
      followers: data.followers.total,
      genres: data.genres,
      imageUrl: data.images[0]?.url || '',
      name: data.name,
      popularity: data.popularity,
    };
  }
}

class EntityNotFoundError extends Error {}
class ApiError extends Error {}

module.exports = {
  SpotifyApi,
  ApiError,
  EntityNotFoundError,
};

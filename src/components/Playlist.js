import React, { Component } from "react";
import { Segment, Button, List, Image, Icon, Grid, Input, Confirm } from 'semantic-ui-react';
import "../css/index.css";

export default class Playlist extends Component {
  constructor() {
    super();

    this.state = {
      playlists: null,
      playlist_tracks: null,
      current_playlist_id: "",
      new_playlist_name: "",
      trackView: false,
      error: null,
      deleteConfirmOpen: false,
    };
  }

  componentDidMount() {
    if (!!this.props.media.token) {
      if (this.props.media.playlist_id !== "") {
        var str = this.props.media.playlist_id
        var playlist_id = str.split(":").pop()
        this.handleRetrievePlaylists()
        this.openPlaylist(playlist_id)
      }
      else {
        this.handleRetrievePlaylists()
      }
    }
  }

  componentDidUpdate(prevProps) {
    const { media } = this.props
    if (media.token !== prevProps.media.token) {
      console.log("This surprisingly fired")
      this.handleRetrievePlaylists()
    }
    if (!!media.playlist_id && media.playlist_id !== prevProps.media.playlist_id) {
      try {
        var str = media.playlist_id
        var playlist_id = str.split(":").pop()
        // this.handleRetrievePlaylists()
        this.openPlaylist(playlist_id)
      } catch (error) {
        console.error("Unable to parse playlist ID" + error)
      }
    }
  }

  handleRetrievePlaylists = () => {
    const { token } = this.props.media
    // https://developer.spotify.com/documentation/web-api/reference/playlists/get-a-list-of-current-users-playlists/
    fetch("https://api.spotify.com/v1/me/playlists", {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then(response => {
        if (response.ok) {
          return response.json()
        }
        else {
          throw new Error("Something went wrong...")
        }
      })
      .then(data => {
        this.setState({ playlists: data })
      })
      .catch(error => {
        this.setState({ error })
        console.log(error)
      });
  }

  openPlaylist = (id) => {
    const { mediaActions } = this.props
    const { token } = this.props.media
    // https://developer.spotify.com/documentation/web-api/reference/playlists/get-playlists-tracks/
    fetch("https://api.spotify.com/v1/playlists/" + id, {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then(response => {
        if (response.ok) {
          return response.json()
        }
        else {
          throw new Error("Something went wrong...")
        }
      })
      .then(data => {
        mediaActions.loadPlaylist(data)
        mediaActions.loadPlaylistId(id)
        this.setState({
          current_playlist_id: id,
          playlist: data,
          playlist_tracks: data.tracks,
          trackView: true,
        })
      })
      .catch(error => {
        this.setState({ error })
        console.log(error)
      });
  }

  addSongToPlaylist = () => {
    const { token, selectedTrackId } = this.props.media
    let track_uri = "spotify:track:" + selectedTrackId

    // https://developer.spotify.com/documentation/web-api/reference/playlists/add-tracks-to-playlist/
    fetch("https://api.spotify.com/v1/playlists/" + this.state.current_playlist_id + "/tracks", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        "uris": [track_uri],
      }),
    })
      .then(response => {
        if (response.ok) {
          return response.json()
        }
        else {
          throw new Error("Something went wrong...")
        }
      })
      .then(data => {
        console.log("added track to playlist")
      })
      .catch(error => {
        this.setState({ error })
        console.log(error)
      });
  }

  handleInputChange = (e) => {
    this.setState({ new_playlist_name: e.target.value })
  }

  createPlaylist = () => {
    const { token, userId } = this.props.media

    // only create playlist with valid name
    if (this.state.new_playlist_name !== "") {
      // https://developer.spotify.com/documentation/web-api/reference-beta/#endpoint-change-playlist-details
      fetch("https://api.spotify.com/v1/users/" + userId + "/playlists", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "name": this.state.new_playlist_name,
          "public": false,
          "collaborative": true,
        }),
      })
        .then(response => {
          if (response.ok) {
            return response.json()
          }
          else {
            throw new Error("Something went wrong...")
          }
        })
        .then(data => {
          this.setState({
            trackView: false,
          })
          // Rerender playlist view to display the new playlist
          this.handleRetrievePlaylists()
        })
        .catch(error => {
          this.setState({ error })
          console.log(error)
        });
    }
    else {
      console.log("Invalid playlist name")
    }
  }

  // Make playlist collaborative
  // Note: You can only set collaborative to true on non-public playlists.
  toggleCollaborative = (id) => {
    const { token } = this.props.media
    let isPublic, isCollaborative

    if (!!this.state.playlist.collaborative) {
      isPublic = false
      isCollaborative = true
    }
    else {
      isPublic = true
      isCollaborative = false
    }

    // https://developer.spotify.com/documentation/web-api/reference-beta/#endpoint-change-playlist-details
    fetch("https://api.spotify.com/v1/playlists/" + id, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        "public": isPublic,
        "collaborative": isCollaborative,
      }),
    }).then(() => {
      this.setState({
        playlist: {
          ...this.state.playlist,
          collaborative: !this.state.playlist.collaborative
        },
      })
    })

  }

  // Note: This does not actually delete the playlist as there is no such endpoint in the API
  // This will make the current user unfollow the specified playlist
  //  which is actually the same as deleting a playlist in Spotify
  deletePlaylist = (id) => {
    const { token } = this.props.media

    // https://developer.spotify.com/documentation/web-api/reference/follow/unfollow-playlist/
    fetch("https://api.spotify.com/v1/playlists/" + id + "/followers", {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }
    })
      .then(() => {
        // take the user back to the playlist view and update the playlists
        this.setState({
          trackView: false,
          playlist: null,
          playlists: null,
          deleteConfirmOpen: false,
        })
        this.handleRetrievePlaylists()
      })
  }

  listPlaylistItem = (playlist) => (
    <List.Item key={playlist.id} onClick={() => this.openPlaylist(playlist.id)}>
      {playlist.images[0] ?
        <Image size="mini" avatar src={playlist.images[0].url} />
        :
        <Icon size="large" name='question' />
      }
      <List.Content>
        {playlist.name}
      </List.Content>
    </List.Item>
  )

  listTrackItem = (tracks) => (
    <List.Item key={tracks.track.id} onClick={() => this.playSong(tracks.track.id)}>
      <Image size="mini" avatar src={tracks.track.album.images[0].url} />
      {tracks.track.id === this.props.media.nowPlaying_id ?
        <>
          <List.Content className="now-playing">
            {tracks.track.artists[0].name} <br />
            {tracks.track.name} <br />
          </List.Content>
        </>
        :
        <>
          <List.Content>
            {tracks.track.artists[0].name} <br />
            {tracks.track.name} <br />
          </List.Content>
        </>
      }
    </List.Item>
  )

  playSong = (trackId) => {
    const { token } = this.props.media

    // https://developer.spotify.com/documentation/web-api/reference/player/start-a-users-playback/
    fetch("https://api.spotify.com/v1/me/player/play", {
      method: "PUT",
      headers: {
        authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        "context_uri": `spotify:playlist:${this.state.current_playlist_id}`,
        "offset": { "uri": `spotify:track:${trackId}` }
      }),
    })
      .catch(error => {
        this.setState({ error })
        console.log(error)
      });
  }

  openDeleteConfirm = () => this.setState({ deleteConfirmOpen: true })
  closeDeleteConfirm = () => this.setState({ deleteConfirmOpen: false })

  render() {

    return (
      <Segment id="playlists" inverted>
        {this.state.playlists && !this.state.trackView && [
          <List id="playlist-names" divided inverted ordered>
            {
              this.state.playlists.items
                .map((playlist) => {
                  return this.listPlaylistItem(playlist)
                })
            }
          </List>,
          <Grid>
            <Grid.Row>
              <Grid.Column width={8}>
                <Input fluid onChange={this.handleInputChange} placeholder="New Playlist Name..." />
              </Grid.Column>
              <Grid.Column width={8}>
                <Button.Group fluid>
                  <Button
                    fluid
                    color="green"
                    inverted
                    onClick={() => this.createPlaylist()} >
                    Create New Playlist
                  </Button>
                </Button.Group>
              </Grid.Column>
            </Grid.Row>
          </Grid>
        ]}
        {this.state.playlists && this.state.trackView &&
          <List id="track-names" divided inverted ordered>
            {
              this.state.playlist_tracks.items
                .map((tracks) => {
                  return this.listTrackItem(tracks)
                })
            }
          </List>
          /*<Button.Group fluid widths="8">
            <Button
              color="green"
              inverted
              onClick={() => this.setState({ trackView: false, playlist: null })} >
              Go Back
            </Button>
            <Button
              color="green"
              inverted
              style={{padding: 0}}
              onClick={() => this.toggleCollaborative(this.state.current_playlist_id)} >
              {
                this.state.playlist.collaborative
                  ? "Undo Collaborative"  
                  : "Make Collaborative"
              }
            </Button> 
            <Button
              color="red"
              inverted
              onClick={ this.openDeleteConfirm }>
              Delete Playlist
            </Button>
            <Confirm 
              open={this.state.deleteConfirmOpen} 
              onCancel={this.closeDeleteConfirm} 
              onConfirm={() => this.deletePlaylist(this.state.current_playlist_id)} />
        </Button.Group> */
        }
      </Segment>
    );
  }
}

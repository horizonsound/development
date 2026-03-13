<script>
    let YT_PLAYER = null;
  let YT_READY = false;

  function onYouTubeIframeAPIReady() {
    YT_READY = true;
  }

  function safeLoadSong(songId) {
    if (!YT_READY) {
      setTimeout(() => safeLoadSong(songId), 50);
      return;
    }
    loadSong(songId);
  }

  function buildPlayer(youtubeId) {
    if (!YT_READY || !ensurePlayerContainer()) {
      setTimeout(() => buildPlayer(youtubeId), 50);
      return;
    }

    if (!YT_PLAYER) {
      YT_PLAYER = new YT.Player('player-container', {
        videoId: youtubeId,
        playerVars: {
          autoplay: 1,
          mute: 0,
          controls: 1,
          rel: 0
        },
        events: {
          'onStateChange': onPlayerStateChange
        }
      });
    } else {
      YT_PLAYER.loadVideoById(youtubeId);
    }
  }

  function ensurePlayerContainer() {
    return document.getElementById("player-container") !== null;
  }

  function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
      advanceToNextSong(window.SELECTED_SONG_ID);
    }
  }

</script>

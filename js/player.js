class AudioPlayer {
    constructor() {
        this.audio = document.getElementById('audio-player');
        this.currentEpisode = null;
        this.isPlaying = false;
        this.currentTime = 0;
        this.duration = 0;

        this.elements = {
            playPauseBtn: document.getElementById('play-pause'),
            playIcon: document.getElementById('play-icon'),
            pauseIcon: document.getElementById('pause-icon'),
            skipBackBtn: document.getElementById('skip-back'),
            skipForwardBtn: document.getElementById('skip-forward'),
            progressBar: document.getElementById('progress-bar'),
            currentTimeEl: document.getElementById('current-time'),
            totalTimeEl: document.getElementById('total-time'),
            episodeTitle: document.getElementById('episode-title'),
            episodePodcast: document.getElementById('episode-podcast'),
            episodeArtwork: document.getElementById('episode-artwork'),
            currentEpisodeContainer: document.getElementById('current-episode'),
            noEpisodeContainer: document.querySelector('.no-episode')
        };

        this.setupEventListeners();
        this.loadSavedState();
    }

    setupEventListeners() {
        this.elements.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.elements.skipBackBtn.addEventListener('click', () => this.skipBack());
        this.elements.skipForwardBtn.addEventListener('click', () => this.skipForward());
        this.elements.progressBar.addEventListener('input', (e) => this.seek(e.target.value));
        this.elements.progressBar.addEventListener('change', (e) => this.seek(e.target.value));

        this.audio.addEventListener('loadstart', () => this.onLoadStart());
        this.audio.addEventListener('loadedmetadata', () => this.onLoadedMetadata());
        this.audio.addEventListener('timeupdate', () => this.onTimeUpdate());
        this.audio.addEventListener('ended', () => this.onEnded());
        this.audio.addEventListener('error', (e) => this.onError(e));
        this.audio.addEventListener('play', () => this.onPlay());
        this.audio.addEventListener('pause', () => this.onPause());
        this.audio.addEventListener('waiting', () => this.onWaiting());
        this.audio.addEventListener('canplaythrough', () => this.onCanPlayThrough());

        document.addEventListener('keydown', (e) => this.handleKeyPress(e));

        if ('mediaSession' in navigator) {
            this.setupMediaSession();
        }
    }

    async loadEpisode(episode, podcastName = '', autoPlay = false) {
        if (!episode || !episode.audioUrl) {
            throw new Error('Invalid episode data');
        }

        console.log('Loading episode:', episode.title);
        console.log('Audio URL:', episode.audioUrl);
        console.log('Auto-play:', autoPlay);

        try {
            this.currentEpisode = episode;

            // Reset audio element state
            this.audio.pause();
            this.audio.currentTime = 0;

            // Show loading state immediately
            this.setLoadingState(true);

            this.audio.src = episode.audioUrl;
            this.audio.load();

            this.updatePlayerUI(episode, podcastName);
            this.showPlayer();

            this.saveCurrentEpisode();

            if (autoPlay) {
                announceToScreenReader(`Loading episode: ${episode.title}`);
                // Wait for the audio to be ready before auto-playing
                this.waitForReadyAndPlay();
            } else {
                announceToScreenReader(`Loaded episode: ${episode.title}. Press play to start.`);
            }

        } catch (error) {
            console.error('Error loading episode:', error);
            this.setLoadingState(false);
            this.onError(error);
            throw error;
        }
    }

    updatePlayerUI(episode, podcastName) {
        this.elements.episodeTitle.textContent = episode.title;
        this.elements.episodePodcast.textContent = podcastName;

        if (episode.artwork) {
            getImageWithFallback(episode.artwork, 'icon.svg').then(imageUrl => {
                this.elements.episodeArtwork.src = imageUrl;
                this.elements.episodeArtwork.alt = `${episode.title} artwork`;
            });
        } else {
            this.elements.episodeArtwork.src = 'icon.svg';
            this.elements.episodeArtwork.alt = 'Default podcast artwork';
        }

        this.elements.currentTimeEl.textContent = '0:00';
        this.elements.totalTimeEl.textContent = episode.duration ? formatDuration(episode.duration) : '0:00';
        this.elements.progressBar.value = 0;

        this.updateMediaSession(episode, podcastName);
    }

    showPlayer() {
        this.elements.noEpisodeContainer.classList.add('hidden');
        this.elements.currentEpisodeContainer.classList.remove('hidden');
    }

    hidePlayer() {
        this.elements.noEpisodeContainer.classList.remove('hidden');
        this.elements.currentEpisodeContainer.classList.add('hidden');
    }

    togglePlayPause() {
        if (!this.currentEpisode) return;

        if (this.audio.paused) {
            this.play();
        } else {
            this.pause();
        }
    }

    async play() {
        if (!this.currentEpisode) {
            console.warn('No current episode to play');
            return;
        }

        console.log('Attempting to play episode:', this.currentEpisode.title);
        console.log('Audio src:', this.audio.src);
        console.log('Audio readyState:', this.audio.readyState);

        try {
            await this.audio.play();
            console.log('Audio play succeeded');
        } catch (error) {
            console.error('Play error:', error);
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            announceToScreenReader('Unable to play episode');
            this.onError(error);
        }
    }

    pause() {
        if (!this.audio.paused) {
            this.audio.pause();
        }
    }

    skipBack(seconds = 15) {
        if (!this.currentEpisode) return;

        const newTime = Math.max(0, this.audio.currentTime - seconds);
        this.audio.currentTime = newTime;
        announceToScreenReader(`Skipped back ${seconds} seconds`);
    }

    skipForward(seconds = 30) {
        if (!this.currentEpisode) return;

        const newTime = Math.min(this.audio.duration || 0, this.audio.currentTime + seconds);
        this.audio.currentTime = newTime;
        announceToScreenReader(`Skipped forward ${seconds} seconds`);
    }

    seek(percentage) {
        if (!this.currentEpisode || !this.audio.duration) return;

        const newTime = (percentage / 100) * this.audio.duration;
        this.audio.currentTime = newTime;
    }

    onLoadStart() {
        this.setLoadingState(true);
    }

    onLoadedMetadata() {
        this.duration = this.audio.duration;
        this.elements.totalTimeEl.textContent = formatDuration(this.duration);
        this.setLoadingState(false);
    }

    waitForReadyAndPlay() {
        const tryPlay = () => {
            if (this.audio.readyState >= 3) { // HAVE_FUTURE_DATA
                console.log('Audio ready, attempting auto-play');
                this.play();
            } else {
                console.log('Audio not ready yet, waiting...');
                setTimeout(tryPlay, 100);
            }
        };

        // Start checking immediately
        tryPlay();

        // Also listen for the canplay event as a backup
        const onCanPlay = () => {
            console.log('Audio can play, attempting auto-play');
            this.audio.removeEventListener('canplay', onCanPlay);
            this.play();
        };

        this.audio.addEventListener('canplay', onCanPlay);

        // Timeout after 10 seconds
        setTimeout(() => {
            this.audio.removeEventListener('canplay', onCanPlay);
            if (this.audio.readyState < 3) {
                console.warn('Audio loading timeout');
                this.setLoadingState(false);
                announceToScreenReader('Episode loading timeout. Press play to try again.');
            }
        }, 10000);
    }

    onTimeUpdate() {
        if (!this.audio.duration) return;

        this.currentTime = this.audio.currentTime;
        this.elements.currentTimeEl.textContent = formatDuration(this.currentTime);

        const percentage = (this.currentTime / this.audio.duration) * 100;
        this.elements.progressBar.value = percentage;

        this.savePlaybackPosition();
    }

    onPlay() {
        this.isPlaying = true;
        this.updatePlayPauseButton();
        announceToScreenReader('Playing');
    }

    onPause() {
        this.isPlaying = false;
        this.updatePlayPauseButton();
        announceToScreenReader('Paused');
    }

    onEnded() {
        this.isPlaying = false;
        this.updatePlayPauseButton();
        this.elements.progressBar.value = 0;
        announceToScreenReader('Episode finished');
    }

    onError(error) {
        console.error('Audio error:', error);
        console.error('Audio src:', this.audio.src);
        console.error('Audio readyState:', this.audio.readyState);
        console.error('Audio networkState:', this.audio.networkState);

        this.setLoadingState(false);
        this.isPlaying = false;
        this.updatePlayPauseButton();

        let errorMessage = 'Unable to play this episode';
        if (error.target && error.target.error) {
            console.error('Media error code:', error.target.error.code);
            console.error('Media error message:', error.target.error.message);

            switch (error.target.error.code) {
                case error.target.error.MEDIA_ERR_NETWORK:
                    errorMessage = 'Network error - check your connection';
                    break;
                case error.target.error.MEDIA_ERR_DECODE:
                    errorMessage = 'Audio format not supported';
                    break;
                case error.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    errorMessage = 'Audio source not supported or blocked by CORS';
                    break;
                case error.target.error.MEDIA_ERR_ABORTED:
                    errorMessage = 'Audio loading was aborted';
                    break;
            }
        } else if (error.message) {
            console.error('Error message:', error.message);
            errorMessage = error.message;
        }

        announceToScreenReader(errorMessage);
    }

    onWaiting() {
        this.setLoadingState(true);
    }

    onCanPlayThrough() {
        this.setLoadingState(false);
    }

    updatePlayPauseButton() {
        if (this.isPlaying) {
            this.elements.playIcon.classList.add('hidden');
            this.elements.pauseIcon.classList.remove('hidden');
            this.elements.playPauseBtn.setAttribute('aria-label', 'Pause');
        } else {
            this.elements.playIcon.classList.remove('hidden');
            this.elements.pauseIcon.classList.add('hidden');
            this.elements.playPauseBtn.setAttribute('aria-label', 'Play');
        }
    }

    setLoadingState(loading) {
        this.elements.playPauseBtn.disabled = loading;
        this.elements.skipBackBtn.disabled = loading;
        this.elements.skipForwardBtn.disabled = loading;
        this.elements.progressBar.disabled = loading;

        // Add/remove loading spinner on the play button
        if (loading) {
            this.elements.playPauseBtn.classList.add('loading');
            this.elements.playIcon.classList.add('hidden');
            this.elements.pauseIcon.classList.add('hidden');

            // Add spinner if it doesn't exist
            if (!this.elements.playPauseBtn.querySelector('.button-spinner')) {
                const spinner = document.createElement('div');
                spinner.className = 'button-spinner';
                this.elements.playPauseBtn.appendChild(spinner);
            }
        } else {
            this.elements.playPauseBtn.classList.remove('loading');
            const spinner = this.elements.playPauseBtn.querySelector('.button-spinner');
            if (spinner) {
                spinner.remove();
            }
            this.updatePlayPauseButton();
        }
    }

    handleKeyPress(event) {
        if (!this.currentEpisode) return;

        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        switch (event.key) {
            case ' ':
                event.preventDefault();
                this.togglePlayPause();
                break;
            case 'ArrowLeft':
                event.preventDefault();
                this.skipBack();
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.skipForward();
                break;
        }
    }

    setupMediaSession() {
        navigator.mediaSession.setActionHandler('play', () => this.play());
        navigator.mediaSession.setActionHandler('pause', () => this.pause());
        navigator.mediaSession.setActionHandler('seekbackward', () => this.skipBack());
        navigator.mediaSession.setActionHandler('seekforward', () => this.skipForward());
    }

    updateMediaSession(episode, podcastName) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: episode.title,
                artist: podcastName,
                album: podcastName,
                artwork: episode.artwork ? [
                    { src: episode.artwork, sizes: '300x300', type: 'image/jpeg' }
                ] : []
            });
        }
    }

    saveCurrentEpisode() {
        if (this.currentEpisode) {
            saveToLocalStorage('currentEpisode', {
                episode: this.currentEpisode,
                timestamp: Date.now()
            });
        }
    }

    savePlaybackPosition() {
        if (this.currentEpisode && this.currentTime > 0) {
            saveToLocalStorage('playbackPosition', {
                episodeGuid: this.currentEpisode.guid,
                position: this.currentTime,
                timestamp: Date.now()
            });
        }
    }

    loadSavedState() {
        const savedEpisode = loadFromLocalStorage('currentEpisode');
        if (savedEpisode && savedEpisode.episode) {
            const timeDiff = Date.now() - savedEpisode.timestamp;
            if (timeDiff < 24 * 60 * 60 * 1000) {
                this.updatePlayerUI(savedEpisode.episode, 'Previously Played');
                this.showPlayer();
                this.currentEpisode = savedEpisode.episode;

                const savedPosition = loadFromLocalStorage('playbackPosition');
                if (savedPosition && savedPosition.episodeGuid === savedEpisode.episode.guid) {
                    const positionDiff = Date.now() - savedPosition.timestamp;
                    if (positionDiff < 24 * 60 * 60 * 1000 && savedPosition.position > 0) {
                        this.audio.currentTime = savedPosition.position;
                    }
                }
            }
        }
    }

    getCurrentEpisode() {
        return this.currentEpisode;
    }

    isCurrentlyPlaying() {
        return this.isPlaying;
    }

    destroy() {
        this.pause();
        this.currentEpisode = null;
        this.hidePlayer();
    }
}

const audioPlayer = new AudioPlayer();
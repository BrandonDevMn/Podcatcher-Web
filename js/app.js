class PodcatcherApp {
    constructor() {
        this.currentPage = 'search-page';
        this.searchTimeout = null;
        this.currentPodcast = null;

        this.elements = {
            loading: document.getElementById('loading'),
            mainContent: document.getElementById('main-content'),
            bottomNav: document.getElementById('bottom-nav'),
            searchInput: document.getElementById('search-input'),
            searchButton: document.getElementById('search-button'),
            searchResults: document.getElementById('search-results'),
            podcastModal: document.getElementById('podcast-modal'),
            closeModal: document.getElementById('close-modal'),
            podcastTitle: document.getElementById('podcast-title'),
            podcastArtwork: document.getElementById('podcast-artwork'),
            podcastArtist: document.getElementById('podcast-artist'),
            podcastDescription: document.getElementById('podcast-description'),
            episodesList: document.getElementById('episodes-list'),
            navTabs: document.querySelectorAll('.nav-tab'),
            pages: document.querySelectorAll('.page')
        };

        this.init();
    }

    async init() {
        try {
            await this.registerServiceWorker();
            this.setupEventListeners();
            this.setupNavigation();
            this.hideLoading();

            announceToScreenReader('Podcatcher app loaded successfully');
        } catch (error) {
            console.error('App initialization error:', error);
            this.hideLoading();
            showError('Failed to initialize app', this.elements.searchResults);
        }
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('./sw.js');
                console.log('ServiceWorker registered successfully:', registration.scope);
            } catch (error) {
                console.log('ServiceWorker registration failed:', error);
            }
        }
    }

    setupEventListeners() {
        this.elements.searchInput.addEventListener('input', (e) => {
            this.handleSearchInput(e.target.value);
        });

        this.elements.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.performSearch(e.target.value);
            }
        });

        this.elements.searchButton.addEventListener('click', () => {
            this.performSearch(this.elements.searchInput.value);
        });

        this.elements.closeModal.addEventListener('click', () => {
            this.closeModal();
        });

        this.elements.podcastModal.addEventListener('click', (e) => {
            if (e.target === this.elements.podcastModal) {
                this.closeModal();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });

        window.addEventListener('beforeunload', () => {
            this.saveAppState();
        });
    }

    setupNavigation() {
        this.elements.navTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetPage = tab.dataset.page;
                this.navigateToPage(targetPage);
            });
        });
    }

    navigateToPage(pageId) {
        if (this.currentPage === pageId) return;

        this.elements.pages.forEach(page => {
            page.classList.remove('active');
        });

        this.elements.navTabs.forEach(tab => {
            tab.classList.remove('active');
        });

        const targetPage = document.getElementById(pageId);
        const targetTab = document.querySelector(`[data-page="${pageId}"]`);

        if (targetPage && targetTab) {
            targetPage.classList.add('active');
            targetTab.classList.add('active');
            this.currentPage = pageId;

            announceToScreenReader(`Navigated to ${targetTab.querySelector('span').textContent}`);
        }
    }

    handleSearchInput(query) {
        clearTimeout(this.searchTimeout);

        if (query.trim().length === 0) {
            this.clearSearchResults();
            return;
        }

        this.searchTimeout = setTimeout(() => {
            this.performSearch(query);
        }, 500);
    }

    async performSearch(query) {
        const trimmedQuery = query.trim();

        if (trimmedQuery.length === 0) {
            this.clearSearchResults();
            return;
        }

        showLoading(this.elements.searchResults, 'Searching podcasts...');

        try {
            const podcasts = await podcastAPI.searchPodcasts(trimmedQuery);
            this.displaySearchResults(podcasts);

            announceToScreenReader(`Found ${podcasts.length} podcasts for "${trimmedQuery}"`);
        } catch (error) {
            console.error('Search error:', error);
            showError(extractErrorMessage(error), this.elements.searchResults);
            announceToScreenReader('Search failed');
        }
    }

    displaySearchResults(podcasts) {
        if (podcasts.length === 0) {
            this.elements.searchResults.innerHTML = `
                <div class="empty-state">
                    <p>No podcasts found. Try a different search term.</p>
                </div>
            `;
            return;
        }

        const resultsHTML = podcasts.map(podcast => this.createPodcastCard(podcast)).join('');
        this.elements.searchResults.innerHTML = resultsHTML;

        this.elements.searchResults.querySelectorAll('.podcast-card').forEach((card, index) => {
            card.addEventListener('click', () => {
                this.openPodcastModal(podcasts[index]);
            });
        });
    }

    createPodcastCard(podcast) {
        const artwork = podcast.artwork || 'icon.svg';
        const description = truncateText(podcast.description, 100);

        return `
            <div class="podcast-card" role="button" tabindex="0" aria-label="View ${podcast.name} podcast details">
                <div class="podcast-card-content">
                    <img src="${artwork}" alt="${podcast.name} artwork" class="podcast-thumbnail" loading="lazy">
                    <div class="podcast-info">
                        <h3 class="podcast-name">${podcast.name}</h3>
                        <p class="podcast-artist">${podcast.artistName}</p>
                        <p class="podcast-genre">${podcast.primaryGenreName}</p>
                    </div>
                </div>
            </div>
        `;
    }

    async openPodcastModal(podcast) {
        this.currentPodcast = podcast;

        this.elements.podcastTitle.textContent = podcast.name;
        this.elements.podcastArtist.textContent = podcast.artistName;
        this.elements.podcastDescription.textContent = podcast.description || 'No description available.';

        if (podcast.artwork) {
            const imageUrl = await getImageWithFallback(podcast.artwork, 'icon.svg');
            this.elements.podcastArtwork.src = imageUrl;
            this.elements.podcastArtwork.alt = `${podcast.name} artwork`;
        } else {
            this.elements.podcastArtwork.src = 'icon.svg';
            this.elements.podcastArtwork.alt = 'Default podcast artwork';
        }

        this.elements.podcastModal.classList.remove('hidden');
        this.elements.closeModal.focus();

        this.loadPodcastEpisodes(podcast);

        announceToScreenReader(`Opened ${podcast.name} details`);
    }

    async loadPodcastEpisodes(podcast) {
        if (!podcast.feedUrl) {
            this.elements.episodesList.innerHTML = `
                <div class="error-message">
                    <p>Unable to load episodes - feed URL not available</p>
                </div>
            `;
            return;
        }

        showLoading(this.elements.episodesList, 'Loading episodes...');

        try {
            const episodes = await podcastAPI.getPodcastEpisodes(podcast.feedUrl);
            this.displayEpisodes(episodes, podcast.name);

            announceToScreenReader(`Loaded ${episodes.length} episodes`);
        } catch (error) {
            console.error('Episodes loading error:', error);

            const errorMessage = error.message.includes('CORS')
                ? 'Episodes cannot be loaded due to technical restrictions. Try visiting the podcast website directly.'
                : extractErrorMessage(error);

            this.elements.episodesList.innerHTML = `
                <div class="error-message">
                    <p>${errorMessage}</p>
                </div>
            `;

            announceToScreenReader('Failed to load episodes');
        }
    }

    displayEpisodes(episodes, podcastName) {
        if (episodes.length === 0) {
            this.elements.episodesList.innerHTML = `
                <div class="empty-state">
                    <p>No episodes available</p>
                </div>
            `;
            return;
        }

        const episodesHTML = episodes.map(episode => this.createEpisodeItem(episode)).join('');
        this.elements.episodesList.innerHTML = episodesHTML;

        this.elements.episodesList.querySelectorAll('.episode-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.playEpisode(episodes[index], podcastName);
            });
        });
    }

    createEpisodeItem(episode) {
        const formattedDate = formatDate(episode.pubDate);
        const duration = episode.duration ? formatDuration(episode.duration) : '';
        const description = truncateText(stripHtml(episode.description), 120);

        return `
            <div class="episode-item" role="button" tabindex="0" aria-label="Play ${episode.title}">
                <h4 class="episode-title">${episode.title}</h4>
                <div class="episode-meta">
                    <span class="episode-date">${formattedDate}</span>
                    ${duration ? `<span class="episode-duration">${duration}</span>` : ''}
                </div>
                <p class="episode-description">${description}</p>
            </div>
        `;
    }

    async playEpisode(episode, podcastName) {
        try {
            await audioPlayer.loadEpisode(episode, podcastName);
            this.navigateToPage('player-page');
            this.closeModal();

            announceToScreenReader(`Now playing: ${episode.title}`);
        } catch (error) {
            console.error('Play episode error:', error);
            showError('Unable to play episode. Please try again.', this.elements.episodesList);
            announceToScreenReader('Failed to play episode');
        }
    }

    closeModal() {
        this.elements.podcastModal.classList.add('hidden');
        this.currentPodcast = null;
    }

    clearSearchResults() {
        this.elements.searchResults.innerHTML = `
            <div class="empty-state">
                <p>Search for your favorite podcasts above</p>
            </div>
        `;
    }

    hideLoading() {
        this.elements.loading.classList.add('hidden');
        this.elements.mainContent.classList.remove('hidden');
        this.elements.bottomNav.classList.remove('hidden');
    }

    saveAppState() {
        const state = {
            currentPage: this.currentPage,
            searchQuery: this.elements.searchInput.value,
            timestamp: Date.now()
        };

        saveToLocalStorage('appState', state);
    }

    loadAppState() {
        const state = loadFromLocalStorage('appState');

        if (state && state.timestamp && (Date.now() - state.timestamp < 3600000)) {
            if (state.currentPage && state.currentPage !== 'search-page') {
                this.navigateToPage(state.currentPage);
            }

            if (state.searchQuery) {
                this.elements.searchInput.value = state.searchQuery;
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new PodcatcherApp();
});
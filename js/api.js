class PodcastAPI {
    constructor() {
        this.baseURL = 'https://itunes.apple.com';
        this.cache = new Map();
        this.corsProxy = '';
    }

    async searchPodcasts(query, limit = 50) {
        if (!query || query.trim().length === 0) {
            throw new Error('Search query is required');
        }

        const sanitizedQuery = sanitizeInput(query);
        const cacheKey = `search_${sanitizedQuery}_${limit}`;

        const cached = getCachedData(cacheKey, 900000);
        if (cached) {
            return cached;
        }

        try {
            const url = `${this.baseURL}/search?term=${encodeURIComponent(sanitizedQuery)}&media=podcast&limit=${limit}&entity=podcast`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.results) {
                throw new Error('Invalid response format');
            }

            const podcasts = data.results.map(this.transformPodcastData);
            setCachedData(cacheKey, podcasts);

            return podcasts;
        } catch (error) {
            console.error('Search error:', error);
            throw new Error('Failed to search podcasts. Please check your connection and try again.');
        }
    }

    transformPodcastData(rawPodcast) {
        return {
            id: rawPodcast.collectionId || rawPodcast.trackId,
            name: rawPodcast.collectionName || rawPodcast.trackName || 'Unknown Podcast',
            description: stripHtml(rawPodcast.description || ''),
            artwork: rawPodcast.artworkUrl600 || rawPodcast.artworkUrl100 || '',
            feedUrl: rawPodcast.feedUrl || '',
            artistName: rawPodcast.artistName || 'Unknown Artist',
            trackCount: rawPodcast.trackCount || 0,
            primaryGenreName: rawPodcast.primaryGenreName || 'Podcast',
            country: rawPodcast.country || '',
            releaseDate: rawPodcast.releaseDate || ''
        };
    }

    async getPodcastById(podcastId) {
        if (!podcastId) {
            throw new Error('Podcast ID is required');
        }

        const cacheKey = `podcast_${podcastId}`;
        const cached = getCachedData(cacheKey, 1800000);
        if (cached) {
            return cached;
        }

        try {
            const url = `${this.baseURL}/lookup?id=${podcastId}&entity=podcast`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.results || data.results.length === 0) {
                throw new Error('Podcast not found');
            }

            const podcast = this.transformPodcastData(data.results[0]);
            setCachedData(cacheKey, podcast);

            return podcast;
        } catch (error) {
            console.error('Get podcast error:', error);
            throw new Error('Failed to get podcast details. Please try again.');
        }
    }

    async getPodcastEpisodes(feedUrl) {
        if (!feedUrl || !isValidUrl(feedUrl)) {
            throw new Error('Valid feed URL is required');
        }

        const cacheKey = `episodes_${btoa(feedUrl)}`;
        const cached = getCachedData(cacheKey, 1800000);
        if (cached) {
            return cached;
        }

        try {
            const response = await fetch(feedUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const xmlText = await response.text();
            const xmlDoc = parseXMLFromString(xmlText);

            if (!xmlDoc) {
                throw new Error('Failed to parse RSS feed');
            }

            const episodes = this.parseEpisodesFromXML(xmlDoc);
            setCachedData(cacheKey, episodes);

            return episodes;
        } catch (error) {
            console.error('Get episodes error:', error);

            if (error.message.includes('CORS') || error.message.includes('blocked')) {
                throw new Error('Unable to load episodes due to CORS restrictions. This podcast may not support direct streaming.');
            }

            throw new Error('Failed to load episodes. Please try again later.');
        }
    }

    parseEpisodesFromXML(xmlDoc) {
        const episodes = [];
        const items = xmlDoc.querySelectorAll('item');

        items.forEach((item, index) => {
            try {
                const episode = this.parseEpisodeItem(item);
                if (episode) {
                    episodes.push(episode);
                }
            } catch (error) {
                console.warn(`Error parsing episode ${index}:`, error);
            }
        });

        return episodes.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    }

    parseEpisodeItem(item) {
        const title = this.getTextContent(item, 'title');
        const description = this.getTextContent(item, 'description') || this.getTextContent(item, 'itunes\\:summary');
        const pubDate = this.getTextContent(item, 'pubDate');
        const guid = this.getTextContent(item, 'guid');

        const enclosure = item.querySelector('enclosure');
        const audioUrl = enclosure ? enclosure.getAttribute('url') : '';

        if (!title || !audioUrl) {
            return null;
        }

        const duration = this.getTextContent(item, 'itunes\\:duration') || this.getTextContent(item, 'duration');
        const artwork = this.getImageUrl(item);

        return {
            title: stripHtml(title),
            description: stripHtml(description),
            audioUrl: audioUrl,
            pubDate: pubDate,
            duration: this.parseDuration(duration),
            artwork: artwork,
            guid: guid || audioUrl,
            type: enclosure ? enclosure.getAttribute('type') : 'audio/mpeg'
        };
    }

    getTextContent(element, selector) {
        const node = element.querySelector(selector);
        return node ? node.textContent.trim() : '';
    }

    getImageUrl(item) {
        let imageUrl = '';

        const itunesImage = item.querySelector('itunes\\:image');
        if (itunesImage) {
            imageUrl = itunesImage.getAttribute('href');
        }

        if (!imageUrl) {
            const mediaContent = item.querySelector('media\\:content[medium="image"]');
            if (mediaContent) {
                imageUrl = mediaContent.getAttribute('url');
            }
        }

        if (!imageUrl) {
            const enclosure = item.querySelector('enclosure[type^="image"]');
            if (enclosure) {
                imageUrl = enclosure.getAttribute('url');
            }
        }

        return imageUrl || '';
    }

    parseDuration(durationStr) {
        if (!durationStr) return 0;

        const timePattern = /(\d+):(\d+):(\d+)/;
        const shortPattern = /(\d+):(\d+)/;
        const numberPattern = /^\d+$/;

        if (numberPattern.test(durationStr)) {
            return parseInt(durationStr, 10);
        }

        if (timePattern.test(durationStr)) {
            const [, hours, minutes, seconds] = durationStr.match(timePattern);
            return parseInt(hours, 10) * 3600 + parseInt(minutes, 10) * 60 + parseInt(seconds, 10);
        }

        if (shortPattern.test(durationStr)) {
            const [, minutes, seconds] = durationStr.match(shortPattern);
            return parseInt(minutes, 10) * 60 + parseInt(seconds, 10);
        }

        return 0;
    }

    clearCache() {
        this.cache.clear();

        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('search_') || key.startsWith('podcast_') || key.startsWith('episodes_')) {
                localStorage.removeItem(key);
            }
        });
    }

    async getPopularPodcasts(genre = '', limit = 20) {
        const cacheKey = `popular_${genre}_${limit}`;
        const cached = getCachedData(cacheKey, 3600000);
        if (cached) {
            return cached;
        }

        try {
            const genreParam = genre ? `&genreId=${genre}` : '';
            const url = `${this.baseURL}/search?term=podcast&media=podcast&limit=${limit}${genreParam}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const podcasts = data.results.map(this.transformPodcastData);
            setCachedData(cacheKey, podcasts);

            return podcasts;
        } catch (error) {
            console.error('Get popular podcasts error:', error);
            throw new Error('Failed to load popular podcasts');
        }
    }
}

const podcastAPI = new PodcastAPI();
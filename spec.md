# Podcatcher Web - Podcast App Specification

## Overview
A Progressive Web App (PWA) for iOS that allows users to search for podcasts, view episodes, and play audio content using the iTunes Search API. Built with vanilla HTML, CSS, and JavaScript following iOS design patterns.

## Core Features

### 1. Podcast Search
- Real-time search using iTunes Search API with debounced input
- Display search results in responsive grid layout with podcast cards
- Show podcast artwork, title, artist, and genre information
- Cached search results for improved performance
- Empty state messaging for no results

### 2. Episode Management
- Modal-based episode viewing with podcast details
- RSS feed parsing for comprehensive episode data
- Episode list with titles, descriptions, publish dates, and durations
- Automatic sorting by date (newest first)
- Fallback artwork handling for missing images
- Smart text truncation for descriptions

### 3. Enhanced Audio Playback
- HTML5 audio with custom player interface
- **Auto-play functionality** - Episodes start playing automatically when selected
- **Smart loading states** - Loading spinner on play button during audio preparation
- **Instant tab switching** - Automatic navigation to player tab when episode is selected
- Advanced playback controls:
  - Play/pause with visual state indicators
  - Skip backward (15 seconds) and forward (30 seconds)
  - Seek functionality with progress bar
  - Real-time duration and current time display
- **Media Session API integration** for lock screen controls
- **Playback position persistence** - Remembers where user left off
- **Background playback support** where browser allows

## API Integration

### iTunes Search API Endpoints

#### Search Podcasts
```
GET https://itunes.apple.com/search?term={searchTerm}&media=podcast&limit=50
```

#### Get Podcast Feed
```
GET https://itunes.apple.com/lookup?id={podcastId}&entity=podcast
```

### Response Handling
- Parse JSON responses from iTunes API
- Extract podcast RSS feed URLs for episode data
- Handle CORS limitations with appropriate proxy or direct RSS parsing
- Implement error handling for network failures

## App Structure

### Navigation (Bottom Tabs)
- **Left Tab**: Search - Main podcast search functionality
- **Middle Tab**: Player - Current episode playback controls
- **Right Tab**: About - App information and settings

### Pages/Views

#### Search Page
- Search input field
- Search results grid/list
- Podcast detail view (episodes list)

#### Player Page
- Currently playing episode information
- Audio playback controls
- Progress bar with seek functionality
- Episode artwork display

#### About Page
- App version and information
- API attribution (iTunes/Apple)
- Contact/feedback information

## Technical Implementation

### File Structure
```
/
├── index.html              # Main entry point
├── manifest.json           # PWA manifest
├── sw.js                  # Service worker
├── icon.jpg               # App icon (180x180px)
├── css/
│   ├── main.css           # Main styles
│   └── responsive.css     # iOS responsive styles
├── js/
│   ├── app.js             # Main app logic
│   ├── api.js             # iTunes API integration
│   ├── player.js          # Audio player functionality
│   └── utils.js           # Utility functions
└── assets/
    └── icons/             # Additional icons
```

### Data Models

#### Podcast Object
```javascript
{
  id: string,
  name: string,
  description: string,
  artwork: string,
  feedUrl: string,
  artistName: string,
  trackCount: number,
  primaryGenreName: string
}
```

#### Episode Object
```javascript
{
  title: string,
  description: string,
  audioUrl: string,
  pubDate: string,
  duration: string,
  artwork: string,
  guid: string
}
```

### Core Functions

#### Search Functionality
```javascript
async function searchPodcasts(query) {
  // Search iTunes API for podcasts
  // Return array of podcast objects
}

async function getPodcastEpisodes(feedUrl) {
  // Parse RSS feed to get episodes
  // Return array of episode objects
}
```

#### Player Functionality
```javascript
function playEpisode(episode) {
  // Load and play episode audio
  // Update player UI
}

function updatePlayerUI() {
  // Update playback time, progress bar
  // Handle play/pause state
}
```

### Local Storage
- Save search history
- Cache recently viewed podcasts
- Store playback position for episodes
- Remember user preferences

## UI/UX Requirements

### Design Guidelines
- Follow iOS design patterns
- Use system font stack (San Francisco)
- Implement touch-friendly controls (min 56px tap targets)
- Support both portrait and landscape orientations
- Handle iOS safe areas and notches

### Color Scheme
```css
:root {
  --primary-color: #007AFF;
  --secondary-color: #5AC8FA;
  --background-color: #F2F2F7;
  --text-color: #000000;
  --text-secondary: #8E8E93;
  --border-color: #C6C6C8;
}
```

### Responsive Breakpoints
- iPhone SE: 375px
- iPhone: 390px - 428px
- iPad: 768px - 1024px
- iPad Pro: 1024px+

## Performance Requirements

### Loading Performance
- Initial page load under 3 seconds
- Search results display within 1 second
- Episode list loads within 2 seconds

### Caching Strategy
- Cache podcast artwork and metadata
- Store search results temporarily
- Offline support for recently viewed content

### Audio Performance
- Audio begins playback within 2 seconds of play button press
- Smooth seeking without interruption
- Background playback support (iOS limitations apply)

## Accessibility Features

### WCAG 2.1 AA Compliance
- Proper heading hierarchy (h1-h6)
- Alt text for all images
- ARIA labels for interactive elements
- Keyboard navigation support
- Screen reader announcements

### Audio Accessibility
- Transcript support when available
- Playback speed controls
- Skip forward/backward buttons (15/30 seconds)

## Error Handling

### Network Errors
- Display user-friendly error messages
- Retry mechanisms for failed requests
- Offline mode with cached content

### Audio Errors
- Handle unsupported audio formats
- Network interruption recovery
- Invalid/expired audio URL handling

## Security Considerations

### Content Security Policy
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               connect-src 'self' https://itunes.apple.com https://*.apple.com;
               media-src *;
               img-src *;">
```

### Data Privacy
- No user data collection
- Local storage only
- Transparent API usage disclosure

## Testing Requirements

### Device Testing
- iPhone (various models and iOS versions)
- iPad (various sizes)
- Safari browser compatibility
- PWA installation and functionality

### Feature Testing
- Search functionality across different query types
- Episode playback with various audio formats
- Network interruption handling
- Background/foreground app switching

## Future Enhancements

### Phase 2 Features
- Download episodes for offline listening
- Playlist creation and management
- Subscription management
- Push notifications for new episodes

### Phase 3 Features
- User accounts and sync across devices
- Social features (sharing, recommendations)
- Advanced audio features (speed control, EQ)
- Podcast recommendations based on listening history

## API Limitations & Considerations

### iTunes API Constraints
- Rate limiting (exact limits not publicly documented)
- CORS restrictions for browser requests
- RSS feed parsing required for episode details
- Limited metadata compared to dedicated podcast APIs

### Workarounds
- Implement client-side RSS parsing
- Use CORS proxy for development/testing
- Cache responses to minimize API calls
- Handle API unavailability gracefully
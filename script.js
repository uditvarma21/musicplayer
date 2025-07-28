// YouTube API configuration
const API_KEY = 'YOUR_YOUTUBE_API_KEY'; // You need to replace this with your actual API key

// Application state
let player = null;
let currentVideoId = null;
let favorites = JSON.parse(localStorage.getItem('musicFavorites') || '[]');
let searchResults = [];
let currentTab = 'search';

// YouTube Player API ready callback
function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtube-player', {
        height: '0',
        width: '0',
        playerVars: {
            'autoplay': 0,
            'controls': 0,
            'disablekb': 1,
            'enablejsapi': 1,
            'fs': 0,
            'modestbranding': 1,
            'playsinline': 1,
            'rel': 0
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    console.log('YouTube player ready');
}

function onPlayerStateChange(event) {
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (event.data === YT.PlayerState.PLAYING) {
        playPauseBtn.textContent = '⏸️';
    } else if (event.data === YT.PlayerState.PAUSED) {
        playPauseBtn.textContent = '▶️';
    } else if (event.data === YT.PlayerState.ENDED) {
        playPauseBtn.textContent = '▶️';
        document.getElementById('nowPlaying').classList.remove('visible');
    }
}

// Search functionality
async function searchVideos() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;

    showLoading();

    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=20&key=${API_KEY}`
        );
        
        if (!response.ok) {
            throw new Error('Search failed');
        }

        const data = await response.json();
        searchResults = data.items || [];
        displaySearchResults();
    } catch (error) {
        console.error('Search error:', error);
        showError('Search failed. Please check your API key configuration.');
    }
}

function showLoading() {
    document.getElementById('searchResults').innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Searching for music...</p>
        </div>
    `;
}

function showError(message) {
    document.getElementById('searchResults').innerHTML = `
        <div class="empty-state">
            <h3>⚠️ Error</h3>
            <p>${message}</p>
        </div>
    `;
}

function displaySearchResults() {
    const container = document.getElementById('searchResults');
    
    if (searchResults.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>🔍 No results found</h3>
                <p>Try searching with different keywords</p>
            </div>
        `;
        return;
    }

    container.innerHTML = searchResults.map(video => `
        <div class="video-card">
            <img src="${video.snippet.thumbnails.medium.url}" 
                 alt="${video.snippet.title}" 
                 class="video-thumbnail"
                 onclick="playVideo('${video.id.videoId}', '${escapeHtml(video.snippet.title)}', '${escapeHtml(video.snippet.channelTitle)}')">
            <div class="video-info">
                <div class="video-title">${video.snippet.title}</div>
                <div class="video-channel">${video.snippet.channelTitle}</div>
                <div class="video-actions">
                    <button class="btn play-btn" onclick="playVideo('${video.id.videoId}', '${escapeHtml(video.snippet.title)}', '${escapeHtml(video.snippet.channelTitle)}')">
                        ▶️ Play
                    </button>
                    <button class="btn fav-btn ${isFavorite(video.id.videoId) ? 'favorited' : ''}" 
                            onclick="toggleFavorite('${video.id.videoId}', '${escapeHtml(video.snippet.title)}', '${escapeHtml(video.snippet.channelTitle)}', '${video.snippet.thumbnails.medium.url}')">
                        ❤️ ${isFavorite(video.id.videoId) ? 'Favorited' : 'Favorite'}
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function displayFavorites() {
    const container = document.getElementById('favoritesTab');
    
    if (favorites.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>❤️ No favorites yet</h3>
                <p>Add some songs to your favorites to see them here</p>
            </div>
        `;
        return;
    }

    container.innerHTML = favorites.map(video => `
        <div class="video-card">
            <img src="${video.thumbnail}" 
                 alt="${video.title}" 
                 class="video-thumbnail"
                 onclick="playVideo('${video.id}', '${escapeHtml(video.title)}', '${escapeHtml(video.channel)}')">
            <div class="video-info">
                <div class="video-title">${video.title}</div>
                <div class="video-channel">${video.channel}</div>
                <div class="video-actions">
                    <button class="btn play-btn" onclick="playVideo('${video.id}', '${escapeHtml(video.title)}', '${escapeHtml(video.channel)}')">
                        ▶️ Play
                    </button>
                    <button class="btn fav-btn favorited" onclick="removeFavorite('${video.id}')">
                        💔 Remove
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Player functions
function playVideo(videoId, title, channel) {
    if (!player) {
        alert('Player not ready yet. Please wait a moment and try again.');
        return;
    }

    currentVideoId = videoId;
    player.loadVideoById(videoId);
    
    document.getElementById('currentTitle').textContent = title;
    document.getElementById('currentChannel').textContent = channel;
    document.getElementById('nowPlaying').classList.add('visible');
}

function togglePlayPause() {
    if (!player || !currentVideoId) return;

    const state = player.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
        player.pauseVideo();
    } else {
        player.playVideo();
    }
}

function stopPlayer() {
    if (player) {
        player.stopVideo();
    }
    document.getElementById('nowPlaying').classList.remove('visible');
    document.getElementById('playPauseBtn').textContent = '▶️';
}

// Favorites functionality
function toggleFavorite(videoId, title, channel, thumbnail) {
    if (isFavorite(videoId)) {
        removeFavorite(videoId);
    } else {
        addFavorite(videoId, title, channel, thumbnail);
    }
}

function addFavorite(videoId, title, channel, thumbnail) {
    const favorite = {
        id: videoId,
        title: title,
        channel: channel,
        thumbnail: thumbnail,
        addedAt: new Date().toISOString()
    };
    
    favorites.unshift(favorite);
    localStorage.setItem('musicFavorites', JSON.stringify(favorites));
    
    // Update UI
    if (currentTab === 'search') {
        displaySearchResults();
    } else {
        displayFavorites();
    }
}

function removeFavorite(videoId) {
    favorites = favorites.filter(fav => fav.id !== videoId);
    localStorage.setItem('musicFavorites', JSON.stringify(favorites));
    
    // Update UI
    if (currentTab === 'search') {
        displaySearchResults();
    } else {
        displayFavorites();
    }
}

function isFavorite(videoId) {
    return favorites.some(fav => fav.id === videoId);
}

// Tab switching
function switchTab(tabName) {
    currentTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    // Show/hide content
    if (tabName === 'search') {
        document.getElementById('searchResults').style.display = 'grid';
        document.getElementById('favoritesTab').style.display = 'none';
    } else {
        document.getElementById('searchResults').style.display = 'none';
        document.getElementById('favoritesTab').style.display = 'grid';
        displayFavorites();
    }
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Add event listener for search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchVideos();
            }
        });
    }

    // Show initial empty state
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
        searchResults.innerHTML = `
            <div class="empty-state">
                <h3>🎵 Ready to discover music?</h3>
                <p>Use the search box above to find your favorite songs</p>
            </div>
        `;
    }
});

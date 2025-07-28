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

    // Ensure all search results are displayed in tiles
    container.innerHTML = searchResults.map(video => {
        const videoData = {
            id: video.id.videoId,
            title: video.snippet.title,
            channel: video.snippet.channelTitle,
            thumbnail: video.snippet.thumbnails.medium.url,
            url: `https://www.youtube.com/watch?v=${video.id.videoId}`
        };

        return `
            <div class="video-card" data-video-id="${video.id.videoId}">
                <img src="${video.snippet.thumbnails.medium.url}" 
                     alt="${escapeHtml(video.snippet.title)}" 
                     class="video-thumbnail"
                     onclick="playMusicOnly('${video.id.videoId}', '${escapeHtml(video.snippet.title)}', '${escapeHtml(video.snippet.channelTitle)}')">
                <div class="video-info">
                    <div class="video-title" title="${escapeHtml(video.snippet.title)}">${video.snippet.title}</div>
                    <div class="video-channel">${video.snippet.channelTitle}</div>
                    <div class="video-actions">
                        <button class="btn play-btn" onclick="playMusicOnly('${video.id.videoId}', '${escapeHtml(video.snippet.title)}', '${escapeHtml(video.snippet.channelTitle)}')">
                            🎵 Play Music
                        </button>
                        <button class="btn fav-btn ${isFavorite(video.id.videoId) ? 'favorited' : ''}" 
                                onclick="addToFavorites('${video.id.videoId}', '${escapeHtml(video.snippet.title)}', '${escapeHtml(video.snippet.channelTitle)}', '${video.snippet.thumbnails.medium.url}', '${videoData.url}')">
                            ${isFavorite(video.id.videoId) ? '❤️ Favorited' : '🤍 Add to Favorites'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
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
        <div class="video-card" data-video-id="${video.id}">
            <img src="${video.thumbnail}" 
                 alt="${escapeHtml(video.title)}" 
                 class="video-thumbnail"
                 onclick="playFavoriteFromUrl('${video.id}', '${escapeHtml(video.title)}', '${escapeHtml(video.channel)}', '${video.url}')">
            <div class="video-info">
                <div class="video-title" title="${escapeHtml(video.title)}">${video.title}</div>
                <div class="video-channel">${video.channel}</div>
                <div class="video-url">
                    <small>🔗 <a href="${video.url}" target="_blank" rel="noopener">YouTube Link</a></small>
                </div>
                <div class="video-actions">
                    <button class="btn play-btn" onclick="playFavoriteFromUrl('${video.id}', '${escapeHtml(video.title)}', '${escapeHtml(video.channel)}', '${video.url}')">
                        🎵 Play Music
                    </button>
                    <button class="btn fav-btn remove-btn" onclick="removeFromFavorites('${video.id}')">
                        💔 Remove
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Player functions - Music Only Playback
function playMusicOnly(videoId, title, channel) {
    if (!player) {
        alert('Player not ready yet. Please wait a moment and try again.');
        return;
    }

    currentVideoId = videoId;
    
    // Load video for audio-only playback
    player.loadVideoById({
        videoId: videoId,
        startSeconds: 0,
        suggestedQuality: 'small' // Use lowest quality to save bandwidth since we only want audio
    });
    
    // Update player UI
    document.getElementById('currentTitle').textContent = title;
    document.getElementById('currentChannel').textContent = channel;
    document.getElementById('nowPlaying').classList.add('visible');
    
    console.log(`Playing music: ${title} by ${channel}`);
}

function playFavoriteFromUrl(videoId, title, channel, url) {
    console.log(`Playing favorite from URL: ${url}`);
    
    // Extract video ID from URL if needed
    const urlVideoId = extractVideoIdFromUrl(url) || videoId;
    
    playMusicOnly(urlVideoId, title, channel);
}

function extractVideoIdFromUrl(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
    } catch (error) {
        console.error('Error extracting video ID from URL:', error);
        return null;
    }
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

// Enhanced Favorites functionality with URL saving
function addToFavorites(videoId, title, channel, thumbnail, url) {
    if (isFavorite(videoId)) {
        alert('This song is already in your favorites!');
        return;
    }

    const favorite = {
        id: videoId,
        title: title,
        channel: channel,
        thumbnail: thumbnail,
        url: url, // Save the complete YouTube URL
        addedAt: new Date().toISOString()
    };
    
    favorites.unshift(favorite);
    localStorage.setItem('musicFavorites', JSON.stringify(favorites));
    
    // Update UI to show it's favorited
    updateFavoriteButton(videoId, true);
    
    // Show success feedback
    showNotification(`Added "${title}" to favorites!`);
    
    console.log(`Added to favorites: ${title} - URL: ${url}`);
}

function removeFromFavorites(videoId) {
    const songToRemove = favorites.find(fav => fav.id === videoId);
    
    if (songToRemove && confirm(`Remove "${songToRemove.title}" from favorites?`)) {
        favorites = favorites.filter(fav => fav.id !== videoId);
        localStorage.setItem('musicFavorites', JSON.stringify(favorites));
        
        // Update UI
        if (currentTab === 'search') {
            updateFavoriteButton(videoId, false);
        } else {
            displayFavorites();
        }
        
        showNotification(`Removed "${songToRemove.title}" from favorites`);
        console.log(`Removed from favorites: ${songToRemove.title}`);
    }
}

function updateFavoriteButton(videoId, isFavorited) {
    const card = document.querySelector(`[data-video-id="${videoId}"]`);
    if (card) {
        const button = card.querySelector('.fav-btn');
        if (button) {
            if (isFavorited) {
                button.classList.add('favorited');
                button.innerHTML = '❤️ Favorited';
            } else {
                button.classList.remove('favorited');
                button.innerHTML = '🤍 Add to Favorites';
            }
        }
    }
}

function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(45deg, #4ecdc4, #45b7d1);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        font-weight: 500;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
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

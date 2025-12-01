/**
 * SkateQuest - Background Video Loops System
 * Dynamic video experience with curated skating videos
 * Copyright (c) 2024 SkateQuest. All Rights Reserved.
 */

class VideoLoopManager {
    constructor() {
        this.videoElement = document.getElementById('background-video');
        this.playPauseBtn = document.getElementById('video-play-pause');
        this.playPauseIcon = document.getElementById('play-pause-icon');
        this.nextBtn = document.getElementById('video-next');
        this.categoryBtns = document.querySelectorAll('.category-btn');

        this.currentCategory = 'street';
        this.currentVideoIndex = 0;
        this.isPlaying = true;
        this.isTransitioning = false;

        // Video playlist organized by category
        // Using free skateboarding videos from Pexels/Pixabay
        this.videoPlaylists = {
            street: [
                {
                    url: 'https://cdn.pixabay.com/video/2020/01/31/31431-389773717_large.mp4',
                    title: 'Street Skating - Downtown',
                    credit: 'Pixabay'
                },
                {
                    url: 'https://cdn.pixabay.com/video/2019/07/21/24947-349831482_large.mp4',
                    title: 'Street Tricks',
                    credit: 'Pixabay'
                },
                {
                    url: 'https://cdn.pixabay.com/video/2020/08/11/47230-450294976_large.mp4',
                    title: 'Urban Skating',
                    credit: 'Pixabay'
                }
            ],
            park: [
                {
                    url: 'https://cdn.pixabay.com/video/2022/06/22/121348-724227467_large.mp4',
                    title: 'Skatepark Session',
                    credit: 'Pixabay'
                },
                {
                    url: 'https://cdn.pixabay.com/video/2019/08/30/26330-356823048_large.mp4',
                    title: 'Park Tricks',
                    credit: 'Pixabay'
                },
                {
                    url: 'https://cdn.pixabay.com/video/2021/04/22/72276-540878437_large.mp4',
                    title: 'Ramp Session',
                    credit: 'Pixabay'
                }
            ],
            vert: [
                {
                    url: 'https://cdn.pixabay.com/video/2022/11/04/138015-770034889_large.mp4',
                    title: 'Vert Ramp',
                    credit: 'Pixabay'
                },
                {
                    url: 'https://cdn.pixabay.com/video/2019/08/30/26330-356823048_large.mp4',
                    title: 'Half Pipe',
                    credit: 'Pixabay'
                },
                {
                    url: 'https://cdn.pixabay.com/video/2021/04/22/72276-540878437_large.mp4',
                    title: 'Bowl Riding',
                    credit: 'Pixabay'
                }
            ],
            cruising: [
                {
                    url: 'https://cdn.pixabay.com/video/2019/07/21/24947-349831482_large.mp4',
                    title: 'City Cruising',
                    credit: 'Pixabay'
                },
                {
                    url: 'https://cdn.pixabay.com/video/2020/08/11/47230-450294976_large.mp4',
                    title: 'Smooth Ride',
                    credit: 'Pixabay'
                },
                {
                    url: 'https://cdn.pixabay.com/video/2020/01/31/31431-389773717_large.mp4',
                    title: 'Street Cruise',
                    credit: 'Pixabay'
                }
            ]
        };

        this.init();
    }

    init() {
        // Load saved preferences
        this.loadPreferences();

        // Set initial video
        this.loadVideo(this.currentCategory, this.currentVideoIndex);

        // Set up event listeners
        this.setupEventListeners();

        // Auto-rotate videos
        this.setupAutoRotation();

        console.log('✓ Video Loop Manager initialized');
    }

    loadPreferences() {
        const savedCategory = localStorage.getItem('skq_video_category');
        const savedPlayState = localStorage.getItem('skq_video_playing');

        if (savedCategory && this.videoPlaylists[savedCategory]) {
            this.currentCategory = savedCategory;
        }

        if (savedPlayState === 'false') {
            this.isPlaying = false;
        }
    }

    savePreferences() {
        localStorage.setItem('skq_video_category', this.currentCategory);
        localStorage.setItem('skq_video_playing', this.isPlaying.toString());
    }

    setupEventListeners() {
        // Play/Pause button
        this.playPauseBtn.addEventListener('click', () => {
            this.togglePlayPause();
        });

        // Next video button
        this.nextBtn.addEventListener('click', () => {
            this.playNextVideo();
        });

        // Category buttons
        this.categoryBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                this.switchCategory(category);
            });
        });

        // Video ended event (for smooth transitions)
        this.videoElement.addEventListener('ended', () => {
            this.playNextVideo();
        });

        // Video error handling
        this.videoElement.addEventListener('error', (e) => {
            console.error('Video playback error:', e);
            this.playNextVideo();
        });

        // Preload next video when current is halfway through
        this.videoElement.addEventListener('timeupdate', () => {
            if (this.videoElement.currentTime > this.videoElement.duration / 2) {
                this.preloadNextVideo();
            }
        });
    }

    setupAutoRotation() {
        // Rotate to next video every 2 minutes if looping is disabled
        // Since we're using loop attribute, this is optional
        // You can enable this for playlist rotation instead of individual video loop

        // Uncomment to enable playlist auto-rotation:
        // setInterval(() => {
        //     if (this.isPlaying && !this.isTransitioning) {
        //         this.playNextVideo();
        //     }
        // }, 120000); // 2 minutes
    }

    loadVideo(category, index) {
        const playlist = this.videoPlaylists[category];
        if (!playlist || !playlist[index]) {
            console.error('Invalid category or video index');
            return;
        }

        const video = playlist[index];

        // Smooth transition
        this.videoElement.style.opacity = '0';
        this.isTransitioning = true;

        setTimeout(() => {
            this.videoElement.src = video.url;
            this.videoElement.load();

            if (this.isPlaying) {
                const playPromise = this.videoElement.play();

                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        // Fade in
                        this.videoElement.style.opacity = '1';
                        this.isTransitioning = false;
                    }).catch(error => {
                        console.error('Auto-play prevented:', error);
                        // Show play button
                        this.isPlaying = false;
                        this.updatePlayPauseIcon();
                        this.videoElement.style.opacity = '1';
                        this.isTransitioning = false;
                    });
                }
            } else {
                this.videoElement.style.opacity = '1';
                this.isTransitioning = false;
            }

            console.log(`Playing: ${video.title} (${category})`);
        }, 300);
    }

    togglePlayPause() {
        if (this.isPlaying) {
            this.videoElement.pause();
            this.isPlaying = false;
        } else {
            const playPromise = this.videoElement.play();

            if (playPromise !== undefined) {
                playPromise.then(() => {
                    this.isPlaying = true;
                }).catch(error => {
                    console.error('Play failed:', error);
                    alert('Unable to play video. Please check your browser settings.');
                });
            }
        }

        this.updatePlayPauseIcon();
        this.savePreferences();
    }

    updatePlayPauseIcon() {
        this.playPauseIcon.textContent = this.isPlaying ? '⏸' : '▶';
    }

    playNextVideo() {
        if (this.isTransitioning) return;

        const playlist = this.videoPlaylists[this.currentCategory];
        this.currentVideoIndex = (this.currentVideoIndex + 1) % playlist.length;
        this.loadVideo(this.currentCategory, this.currentVideoIndex);
    }

    preloadNextVideo() {
        // Preload next video for smooth transitions
        const playlist = this.videoPlaylists[this.currentCategory];
        const nextIndex = (this.currentVideoIndex + 1) % playlist.length;
        const nextVideo = playlist[nextIndex];

        if (nextVideo && !document.querySelector(`link[href="${nextVideo.url}"]`)) {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = nextVideo.url;
            link.as = 'video';
            document.head.appendChild(link);
        }
    }

    switchCategory(category) {
        if (category === this.currentCategory || this.isTransitioning) return;

        // Update active button
        this.categoryBtns.forEach(btn => {
            if (btn.dataset.category === category) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Switch to new category
        this.currentCategory = category;
        this.currentVideoIndex = 0;
        this.loadVideo(category, 0);
        this.savePreferences();

        console.log(`Switched to category: ${category}`);
    }

    // Public API for integration with navigation
    setCategoryByContext(context) {
        const contextMap = {
            'discover': 'street',
            'challenges': 'street',
            'spots': 'street',
            'events': 'park',
            'crews': 'park',
            'profile': 'cruising',
            'shops': 'cruising'
        };

        const category = contextMap[context] || 'street';

        // Only switch if different
        if (category !== this.currentCategory) {
            this.switchCategory(category);
        }
    }

    // Allow external control
    pause() {
        if (this.isPlaying) {
            this.togglePlayPause();
        }
    }

    play() {
        if (!this.isPlaying) {
            this.togglePlayPause();
        }
    }
}

// Initialize when DOM is ready
let videoManager;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVideoLoops);
} else {
    initVideoLoops();
}

function initVideoLoops() {
    try {
        videoManager = new VideoLoopManager();

        // Expose to window for external control
        window.videoLoopManager = videoManager;

        console.log('✓ Background video loops ready');
    } catch (error) {
        console.error('Failed to initialize video loops:', error);
    }
}

// Export for module usage
export { VideoLoopManager };
export default videoManager;

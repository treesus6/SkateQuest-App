/**
 * SkateQuest Video Uploader
 * Native camera integration for recording and uploading trick videos
 */

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Share } from '@capacitor/share';

class VideoUploader {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.currentVideo = null;
    }

    /**
     * Record video using native camera
     */
    async recordVideo() {
        try {
            const video = await Camera.getPhoto({
                quality: 90,
                source: CameraSource.Camera,
                resultType: CameraResultType.Uri,
                // For video, we'll use the native camera app
                saveToGallery: true
            });

            this.currentVideo = video;
            return video;
        } catch (error) {
            console.error('Error recording video:', error);
            throw new Error('Failed to record video. Please check camera permissions.');
        }
    }

    /**
     * Pick video from gallery
     */
    async pickFromGallery() {
        try {
            const video = await Camera.getPhoto({
                quality: 90,
                source: CameraSource.Photos,
                resultType: CameraResultType.Uri
            });

            this.currentVideo = video;
            return video;
        } catch (error) {
            console.error('Error picking video:', error);
            throw new Error('Failed to select video from gallery.');
        }
    }

    /**
     * Upload video to Supabase Storage
     */
    async uploadToSupabase(videoUri, metadata = {}) {
        try {
            // Convert URI to blob
            const response = await fetch(videoUri);
            const blob = await response.blob();

            // Generate unique filename
            const timestamp = Date.now();
            const filename = `trick_${timestamp}.mp4`;
            const filepath = `videos/${metadata.userId || 'anonymous'}/${filename}`;

            // Upload to Supabase Storage
            const { data, error } = await this.supabase.storage
                .from('spot-videos')
                .upload(filepath, blob, {
                    contentType: 'video/mp4',
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // Get public URL
            const { data: urlData } = this.supabase.storage
                .from('spot-videos')
                .getPublicUrl(filepath);

            return {
                path: filepath,
                url: urlData.publicUrl,
                filename: filename
            };
        } catch (error) {
            console.error('Error uploading video:', error);
            throw new Error('Failed to upload video. Please try again.');
        }
    }

    /**
     * Save video metadata to database
     */
    async saveVideoMetadata(videoUrl, metadata) {
        try {
            const videoData = {
                video_url: videoUrl,
                user_id: metadata.userId,
                spot_id: metadata.spotId,
                trick_name: metadata.trickName,
                description: metadata.description,
                tags: metadata.tags || [],
                created_at: new Date().toISOString()
            };

            // Save to a videos table (you'll need to create this in Supabase)
            const { data, error } = await this.supabase
                .from('videos')
                .insert([videoData])
                .select();

            if (error) throw error;

            return data[0];
        } catch (error) {
            console.error('Error saving video metadata:', error);
            throw new Error('Failed to save video information.');
        }
    }

    /**
     * Share video to social media
     */
    async shareVideo(videoUrl, text = 'Check out my trick on SkateQuest!') {
        try {
            await Share.share({
                title: 'SkateQuest Trick Video',
                text: text,
                url: videoUrl,
                dialogTitle: 'Share your trick!'
            });
        } catch (error) {
            console.error('Error sharing video:', error);
            // Sharing cancelled is not an error
        }
    }

    /**
     * Complete video upload workflow
     */
    async uploadTrickVideo(options = {}) {
        try {
            // Step 1: Record or pick video
            const video = options.fromGallery
                ? await this.pickFromGallery()
                : await this.recordVideo();

            // Step 2: Show preview and get metadata
            const metadata = await this.showVideoPreview(video, options);

            // Step 3: Upload to Supabase
            const uploadResult = await this.uploadToSupabase(video.webPath, metadata);

            // Step 4: Save metadata to database
            const videoRecord = await this.saveVideoMetadata(uploadResult.url, metadata);

            // Step 5: Optionally share
            if (options.autoShare) {
                await this.shareVideo(uploadResult.url, metadata.description);
            }

            return {
                ...videoRecord,
                ...uploadResult
            };
        } catch (error) {
            console.error('Video upload workflow failed:', error);
            throw error;
        }
    }

    /**
     * Show video preview modal and collect metadata
     */
    async showVideoPreview(video, options) {
        return new Promise((resolve) => {
            // Create preview modal
            const modal = document.createElement('div');
            modal.className = 'video-preview-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h2>🎥 Your Trick Video</h2>
                    <video src="${video.webPath}" controls autoplay playsinline></video>

                    <div class="video-metadata-form">
                        <input type="text" id="trickName" placeholder="Trick name (e.g., Kickflip)" />
                        <textarea id="description" placeholder="Describe your trick..."></textarea>
                        <input type="text" id="tags" placeholder="Tags (comma separated)" />
                    </div>

                    <div class="modal-actions">
                        <button id="retakeBtn" class="btn-secondary">🔄 Retake</button>
                        <button id="uploadBtn" class="btn-primary">⬆️ Upload</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Handle retake
            document.getElementById('retakeBtn').onclick = () => {
                document.body.removeChild(modal);
                this.uploadTrickVideo(options); // Restart workflow
            };

            // Handle upload
            document.getElementById('uploadBtn').onclick = () => {
                const metadata = {
                    userId: options.userId,
                    spotId: options.spotId,
                    trickName: document.getElementById('trickName').value,
                    description: document.getElementById('description').value,
                    tags: document.getElementById('tags').value.split(',').map(t => t.trim())
                };

                document.body.removeChild(modal);
                resolve(metadata);
            };
        });
    }
}

// Export for use in main app
export default VideoUploader;

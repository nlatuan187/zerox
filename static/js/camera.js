let stream;
let capturedImages = [];

export async function initCamera() {
    try {
        await stopCamera(); // Ensure any existing stream is stopped
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        const video = document.getElementById('video');
        if (video) {
            video.srcObject = stream;
        }
    } catch (err) {
        showError('Không thể truy cập camera: ' + err.message);
    }
}

export function stopCamera() {
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => {
            track.stop();
            stream.removeTrack(track);
        });
        stream = null;
    }
    const video = document.getElementById('video');
    if (video) {
        video.srcObject = null;
        video.load(); // Force video element to clear
    }
    return Promise.resolve();
}

export function captureImage() {
    const video = document.getElementById('video');
    if (!video || !stream) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    canvas.toBlob(blob => {
        capturedImages.push(blob);
        updateCapturedImagesPreview();
    }, 'image/jpeg');
}

export function deleteImage(index) {
    capturedImages.splice(index, 1);
    updateCapturedImagesPreview();
}

export function getCapturedImages() {
    return capturedImages;
}

export function clearCapturedImages() {
    capturedImages = [];
    updateCapturedImagesPreview();
}

function updateCapturedImagesPreview() {
    const preview = document.getElementById('capturedImages');
    if (!preview) return;
    
    preview.innerHTML = '';
    
    capturedImages.forEach((blob, index) => {
        // Create container for image and delete button
        const container = document.createElement('div');
        container.className = 'preview-container';

        // Create image preview
        const img = document.createElement('img');
        img.src = URL.createObjectURL(blob);
        img.className = 'preview-image';
        container.appendChild(img);

        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-button';
        deleteBtn.innerHTML = '×';
        deleteBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            deleteImage(index);
        };
        container.appendChild(deleteBtn);

        preview.appendChild(container);
    });
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    if (errorDiv) {
        document.getElementById('errorMessage').textContent = message;
        errorDiv.classList.remove('hidden');
    }
}

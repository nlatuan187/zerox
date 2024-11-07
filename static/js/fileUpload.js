export function previewImages(input) {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '';
    
    if (input.files) {
        Array.from(input.files).forEach(file => {
            // Create container first
            const container = document.createElement('div');
            container.className = 'preview-container';
            preview.appendChild(container);

            // Create image element
            const img = document.createElement('img');
            img.className = 'preview-image';
            
            // Prevent any default image behaviors
            img.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }, true);
            
            // Use createObjectURL instead of FileReader
            img.src = URL.createObjectURL(file);
            
            // Clean up the object URL when image loads
            img.onload = () => {
                container.appendChild(img);
            };

            // Handle any errors
            img.onerror = () => {
                container.innerHTML = '<div class="error">Error loading image</div>';
            };
        });
    }
}

export function validatePdfUpload(files) {
    if (!files || files.length === 0) {
        throw new Error('Vui lòng chọn file PDF để phân tích');
    }
    
    const file = files[0];
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        throw new Error('Vui lòng chọn file PDF hợp lệ');
    }
}

export function validateImageUpload(files) {
    if (!files || files.length === 0) {
        throw new Error('Vui lòng chọn ít nhất một ảnh để phân tích');
    }

    const validImageTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    Array.from(files).forEach((file, index) => {
        if (!validImageTypes.includes(file.type)) {
            throw new Error(`File "${file.name}" không phải là file ảnh hợp lệ. Vui lòng chỉ tải lên file ảnh (JPEG, PNG)`);
        }
    });
}

export function createFormDataFromFiles(files, fieldName) {
    const formData = new FormData();
    Array.from(files).forEach((file, index) => {
        formData.append(fieldName, file);
    });
    return formData;
}

// Clean up object URLs when needed
export function cleanupImagePreviews() {
    const images = document.querySelectorAll('.preview-image');
    images.forEach(img => {
        if (img.src.startsWith('blob:')) {
            URL.revokeObjectURL(img.src);
        }
    });
}

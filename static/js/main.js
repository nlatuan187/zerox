import { formatContent } from './markdown.js';
import { analyzeContract, showError, hideError, showLoading, hideLoading, showResults, updateResults } from './api.js';
import { initCamera, stopCamera, captureImage, getCapturedImages, clearCapturedImages } from './camera.js';
import { previewImages, validatePdfUpload, validateImageUpload, createFormDataFromFiles, cleanupImagePreviews } from './fileUpload.js';

// Tab switching with camera cleanup
async function showTab(tabName) {
    try {
        // Clean up any existing resources
        await stopCamera();
        clearCapturedImages();
        cleanupImagePreviews();
        
        // Switch tabs
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.getElementById(tabName + 'Tab').classList.add('active');
        
        // Initialize camera if switching to camera tab
        if (tabName === 'camera') {
            // Small delay to ensure DOM is updated
            setTimeout(async () => {
                await initCamera();
            }, 100);
        }
    } catch (error) {
        console.error('Error switching tabs:', error);
    }
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Tab switching
    document.querySelectorAll('button[data-tab]').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            await showTab(button.dataset.tab);
        });
    });

    // PDF form submission
    document.getElementById('pdfForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const file = e.target.querySelector('input[type="file"]').files[0];
            validatePdfUpload([file]);
            const formData = new FormData();
            formData.append('file', file);
            await processSubmission(formData);
        } catch (error) {
            showError(error.message);
        }
    });

    // Image form submission
    document.getElementById('imageForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const files = e.target.querySelector('input[type="file"]').files;
            validateImageUpload(files);
            const formData = createFormDataFromFiles(files, 'images');
            await processSubmission(formData);
            cleanupImagePreviews(); // Clean up after submission
        } catch (error) {
            showError(error.message);
        }
    });

    // Image preview on selection
    document.querySelector('#imageForm input[type="file"]').addEventListener('change', function(e) {
        cleanupImagePreviews(); // Clean up previous previews
        previewImages(this);
    });

    // Camera capture button
    document.getElementById('captureBtn').addEventListener('click', captureImage);

    // Analysis button for captured images
    document.getElementById('analyzeBtn').addEventListener('click', async () => {
        try {
            const images = getCapturedImages();
            if (images.length === 0) {
                showError('Vui lòng chụp ít nhất một ảnh để phân tích');
                return;
            }

            const formData = new FormData();
            images.forEach((blob, index) => {
                formData.append('images', blob, `capture${index}.jpg`);
            });

            // Stop camera and clean up before analysis
            await stopCamera();
            await processSubmission(formData);
            clearCapturedImages();
            
            // Switch to results view
            document.getElementById('cameraTab').classList.remove('active');
        } catch (error) {
            console.error('Error analyzing images:', error);
            showError(error.message);
        }
    });

    // Prevent default behavior on all images
    document.addEventListener('click', (e) => {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }, true);
});

// Process form submission
async function processSubmission(formData) {
    try {
        // Ensure camera is stopped before processing
        await stopCamera();
        cleanupImagePreviews();
        
        showLoading();
        hideError();
        const data = await analyzeContract(formData);
        
        // Format markdown content
        if (data.quyền_lợi) data.quyền_lợi = formatContent(data.quyền_lợi);
        if (data.chi_phí_tổng_thể_hàng_năm) data.chi_phí_tổng_thể_hàng_năm = formatContent(data.chi_phí_tổng_thể_hàng_năm);
        if (data.giá_trị_hoàn_lại) data.giá_trị_hoàn_lại = formatContent(data.giá_trị_hoàn_lại);
        if (data.các_điều_khoản_loại_trừ) data.các_điều_khoản_loại_trừ = formatContent(data.các_điều_khoản_loại_trừ);
        if (data.quy_trình_claim) data.quy_trình_claim = formatContent(data.quy_trình_claim);

        updateResults(data);
        showResults();
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', async () => {
    await stopCamera();
    clearCapturedImages();
    cleanupImagePreviews();
});

// Make showTab available globally for any remaining inline handlers
window.showTab = showTab;

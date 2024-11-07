export async function analyzeContract(formData) {
    try {
        // Start analysis and get job ID
        const response = await fetch('/analyze', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            let errorMessage;
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || 'Lỗi khi phân tích file';
            } catch {
                errorMessage = await response.text() || 'Lỗi khi phân tích file';
            }
            throw new Error(errorMessage);
        }

        const { job_id } = await response.json();
        
        // Show initial progress
        showProgress();
        
        // Poll for status with exponential backoff
        return await pollStatus(job_id);
    } catch (error) {
        console.error('API Error:', error);
        hideProgress();
        throw new Error(error.message || 'Lỗi khi phân tích file');
    }
}

async function pollStatus(jobId) {
    const maxAttempts = 60; // 5 minutes total with increasing delays
    let attempt = 0;
    let delay = 1000; // Start with 1 second

    while (attempt < maxAttempts) {
        try {
            console.log(`Polling attempt ${attempt + 1}/${maxAttempts}`);
            const response = await fetch(`/status/${jobId}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch status');
            }

            const data = await response.json();
            console.log('Status data:', data);

            // Update UI with current progress
            updateProgress(data);

            // Show partial results if available
            if (data.partial_result) {
                showResults();
                updateResults(data.partial_result, true);
            }

            // Check status
            if (data.status === 'completed' && data.result) {
                console.log('Analysis completed');
                hideProgress();
                return data.result;
            } else if (data.status === 'error') {
                console.error('Analysis error:', data.error);
                hideProgress();
                throw new Error(data.error || 'Lỗi khi phân tích file');
            }

            // Calculate next delay with exponential backoff
            delay = Math.min(delay * 1.5, 10000); // Cap at 10 seconds
            console.log(`Waiting ${delay}ms before next poll`);
            await new Promise(resolve => setTimeout(resolve, delay));
            attempt++;
        } catch (error) {
            console.error('Polling error:', error);
            // Only retry on network errors
            if (error.message === 'Failed to fetch status') {
                delay = Math.min(delay * 2, 10000);
                console.log(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                attempt++;
            } else {
                throw error;
            }
        }
    }

    throw new Error('Quá thời gian chờ phân tích. Vui lòng thử lại.');
}

function updateProgress(data) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    if (progressBar && progressText) {
        progressBar.style.width = `${data.progress}%`;
        
        let statusText = 'Đang xử lý...';
        if (data.status.startsWith('processing_image')) {
            const [_, current, total] = data.status.split('_')[2].split('/');
            statusText = `Đang xử lý ảnh ${current}/${total}`;
        } else if (data.status === 'processing_pdf') {
            statusText = 'Đang xử lý PDF...';
        } else if (data.status === 'validating') {
            statusText = 'Đang kiểm tra tài liệu...';
        } else if (data.status.startsWith('analyzing')) {
            const section = data.status.split('_')[1];
            const sections = {
                'quyền_lợi': 'quyền lợi bảo hiểm',
                'chi_phí_tổng_thể_hàng_năm': 'chi phí',
                'giá_trị_hoàn_lại': 'giá trị hoàn lại',
                'các_điều_khoản_loại_trừ': 'điều khoản loại trừ',
                'quy_trình_claim': 'quy trình claim'
            };
            statusText = `Đang phân tích ${sections[section] || section}...`;
        }
        
        progressText.textContent = statusText;
    }
}

function showProgress() {
    const progress = document.getElementById('progress');
    if (progress) {
        progress.classList.remove('hidden');
    }
}

function hideProgress() {
    const progress = document.getElementById('progress');
    if (progress) {
        progress.classList.add('hidden');
    }
}

export function showError(message) {
    const errorDiv = document.getElementById('error');
    if (!errorDiv) {
        console.error('Error element not found');
        return;
    }
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.textContent = message;
    }
    errorDiv.classList.remove('hidden');
}

export function hideError() {
    const errorDiv = document.getElementById('error');
    if (errorDiv) {
        errorDiv.classList.add('hidden');
    }
}

export function showLoading() {
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const error = document.getElementById('error');
    
    if (loading) loading.classList.add('active');
    if (results) results.classList.add('hidden');
    if (error) error.classList.add('hidden');
    showProgress();
}

export function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.remove('active');
    }
    hideProgress();
}

export function showResults() {
    const results = document.getElementById('results');
    if (results) {
        results.classList.remove('hidden');
    }
}

export function updateResults(data, isPartial = false) {
    try {
        const elements = {
            'benefits': data.quyền_lợi,
            'costs': data.chi_phí_tổng_thể_hàng_năm,
            'surrender': data.giá_trị_hoàn_lại,
            'exclusions': data.các_điều_khoản_loại_trừ,
            'claim': data.quy_trình_claim
        };

        let hasContent = false;
        for (const [id, content] of Object.entries(elements)) {
            if (!content && isPartial) continue;
            
            const element = document.getElementById(id);
            if (element) {
                if (content) {
                    element.innerHTML = content;
                    hasContent = true;
                } else if (!isPartial) {
                    element.innerHTML = 'Đang phân tích...';
                }
            }
        }

        // Only show results if we have content
        if (hasContent) {
            showResults();
        }
    } catch (error) {
        console.error('Error updating results:', error);
        showError('Lỗi khi hiển thị kết quả');
    }
}

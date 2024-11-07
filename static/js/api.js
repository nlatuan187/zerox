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
        
        // Connect to SSE stream
        return new Promise((resolve, reject) => {
            const eventSource = new EventSource(`/stream/${job_id}`);
            
            eventSource.onmessage = (event) => {
                const data = JSON.parse(event.data);
                updateProgress(data);
                
                if (data.status === 'completed') {
                    eventSource.close();
                    resolve(data.result);
                } else if (data.status === 'error') {
                    eventSource.close();
                    reject(new Error(data.error || 'Lỗi khi phân tích file'));
                }
            };
            
            eventSource.onerror = (error) => {
                eventSource.close();
                reject(new Error('Mất kết nối với máy chủ'));
            };
        });
    } catch (error) {
        console.error('API Error:', error);
        throw new Error(error.message || 'Lỗi khi phân tích file');
    }
}

function updateProgress(data) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    if (progressBar && progressText) {
        progressBar.style.width = `${data.progress}%`;
        
        let statusText = 'Đang xử lý...';
        if (data.status.startsWith('processing_image')) {
            statusText = `Đang xử lý ảnh ${data.status.split('_')[2]}`;
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
    const progress = document.getElementById('progress');
    
    if (loading) loading.classList.add('active');
    if (results) results.classList.add('hidden');
    if (error) error.classList.add('hidden');
    if (progress) progress.classList.remove('hidden');
}

export function hideLoading() {
    const loading = document.getElementById('loading');
    const progress = document.getElementById('progress');
    
    if (loading) loading.classList.remove('active');
    if (progress) progress.classList.add('hidden');
}

export function showResults() {
    const results = document.getElementById('results');
    if (results) {
        results.classList.remove('hidden');
        results.scrollIntoView({ behavior: 'smooth' });
    }
}

export function updateResults(data) {
    try {
        const elements = {
            'benefits': data.quyền_lợi,
            'costs': data.chi_phí_tổng_thể_hàng_năm,
            'surrender': data.giá_trị_hoàn_lại,
            'exclusions': data.các_điều_khoản_loại_trừ,
            'claim': data.quy_trình_claim
        };

        for (const [id, content] of Object.entries(elements)) {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = content || 'Không tìm thấy thông tin';
            } else {
                console.warn(`Element with id '${id}' not found`);
            }
        }
    } catch (error) {
        console.error('Error updating results:', error);
        showError('Lỗi khi hiển thị kết quả');
    }
}

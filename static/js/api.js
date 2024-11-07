export async function analyzeContract(formData) {
    let eventSource = null;

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
        
        // Connect to SSE stream with retry logic
        return new Promise((resolve, reject) => {
            let retryCount = 0;
            const maxRetries = 5;
            const retryDelay = 1000; // Start with 1 second
            
            function connectSSE() {
                if (eventSource) {
                    eventSource.close();
                }

                eventSource = new EventSource(`/stream/${job_id}`);
                console.log('Connecting to SSE stream...');

                eventSource.onopen = () => {
                    console.log('SSE connection opened');
                    retryCount = 0; // Reset retry count on successful connection
                };

                eventSource.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        console.log('Received SSE data:', data);
                        
                        updateProgress(data);
                        
                        if (data.partial_result) {
                            showResults();
                            updateResults(data.partial_result, true);
                        }
                        
                        if (data.status === 'completed' && data.result) {
                            console.log('Analysis completed');
                            eventSource.close();
                            hideProgress();
                            resolve(data.result);
                        } else if (data.status === 'error') {
                            console.error('Analysis error:', data.error);
                            eventSource.close();
                            hideProgress();
                            reject(new Error(data.error || 'Lỗi khi phân tích file'));
                        }
                    } catch (error) {
                        console.error('Error processing SSE message:', error);
                    }
                };

                eventSource.onerror = async (error) => {
                    console.error('SSE connection error:', error);
                    eventSource.close();
                    
                    if (retryCount < maxRetries) {
                        retryCount++;
                        const currentDelay = retryDelay * Math.pow(2, retryCount - 1); // Exponential backoff
                        console.log(`Retrying connection in ${currentDelay}ms (${retryCount}/${maxRetries})...`);
                        
                        // Update UI to show retry status
                        updateRetryStatus(retryCount, maxRetries);
                        
                        setTimeout(connectSSE, currentDelay);
                    } else {
                        console.error('Max retries reached');
                        hideProgress();
                        reject(new Error('Không thể kết nối với máy chủ sau nhiều lần thử lại'));
                    }
                };
            }

            // Start initial connection
            connectSSE();

            // Cleanup on page unload
            window.addEventListener('beforeunload', () => {
                if (eventSource) {
                    console.log('Closing SSE connection on page unload');
                    eventSource.close();
                }
            });
        });
    } catch (error) {
        console.error('API Error:', error);
        hideProgress();
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

function updateRetryStatus(retryCount, maxRetries) {
    const progressText = document.getElementById('progressText');
    if (progressText) {
        progressText.textContent = `Đang kết nối lại... (${retryCount}/${maxRetries})`;
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

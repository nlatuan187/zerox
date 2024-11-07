export async function analyzeContract(formData) {
    try {
        showLoading();
        hideError();

        const response = await fetch('/analyze', {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'text/event-stream',
                'Cache-Control': 'no-cache'
            }
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

        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
                console.log('Stream complete');
                break;
            }

            // Decode chunk and add to buffer
            buffer += decoder.decode(value, { stream: true });

            // Process complete events in buffer
            const events = buffer.split('\n\n');
            buffer = events.pop() || ''; // Keep incomplete event in buffer

            for (const event of events) {
                if (!event.trim()) continue;

                try {
                    // Parse event data
                    const dataMatch = event.match(/^data: (.+)$/m);
                    if (!dataMatch) continue;

                    const data = JSON.parse(dataMatch[1]);
                    console.log('Received event:', data);

                    // Update progress
                    updateProgress(data);

                    // Handle partial results
                    if (data.status === 'partial_result' && data.result) {
                        showResults();
                        updateResults(data.result, true);
                    }

                    // Handle completion
                    if (data.status === 'completed' && data.result) {
                        hideLoading();
                        return data.result;
                    }

                    // Handle errors
                    if (data.status === 'error') {
                        throw new Error(data.error || 'Lỗi khi phân tích file');
                    }
                } catch (error) {
                    console.error('Error processing event:', error);
                    throw error;
                }
            }
        }
    } catch (error) {
        console.error('API Error:', error);
        hideLoading();
        throw new Error(error.message || 'Lỗi khi phân tích file');
    }
}

function updateProgress(data) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progress = document.getElementById('progress');
    
    if (progress) progress.classList.remove('hidden');
    
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

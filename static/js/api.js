export async function analyzeContract(formData) {
    try {
        const response = await fetch('/analyze', {
            method: 'POST',
            body: formData,
            headers: {
                'Accept-Encoding': 'gzip, deflate',
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

        // Handle large responses
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let result = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            result += decoder.decode(value, { stream: true });
        }

        // Parse the complete response
        try {
            return JSON.parse(result);
        } catch (e) {
            console.error('Error parsing response:', e);
            throw new Error('Lỗi khi xử lý kết quả phân tích');
        }
    } catch (error) {
        console.error('API Error:', error);
        throw new Error(error.message || 'Lỗi khi phân tích file');
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
}

export function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.remove('active');
    }
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

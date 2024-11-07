export async function analyzeContract(formData) {
    try {
        const response = await fetch('/analyze', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.detail || 'Lỗi khi phân tích file');
        }

        return await response.json();
    } catch (error) {
        throw new Error(error.message);
    }
}

export function showError(message) {
    const errorDiv = document.getElementById('error');
    document.getElementById('errorMessage').textContent = message;
    errorDiv.classList.remove('hidden');
}

export function hideError() {
    document.getElementById('error').classList.add('hidden');
}

export function showLoading() {
    document.getElementById('loading').classList.add('active');
    document.getElementById('results').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');
}

export function hideLoading() {
    document.getElementById('loading').classList.remove('active');
}

export function showResults() {
    document.getElementById('results').classList.remove('hidden');
}

export function updateResults(data) {
    document.getElementById('benefits').innerHTML = data.quyền_lợi || 'Không tìm thấy thông tin';
    document.getElementById('costs').innerHTML = data.chi_phí_tổng_thể_hàng_năm || 'Không tìm thấy thông tin';
    document.getElementById('surrender').innerHTML = data.giá_trị_hoàn_lại || 'Không tìm thấy thông tin';
    document.getElementById('exclusions').innerHTML = data.các_điều_khoản_loại_trừ || 'Không tìm thấy thông tin';
    document.getElementById('claim').innerHTML = data.quy_trình_claim || 'Không tìm thấy thông tin';
}

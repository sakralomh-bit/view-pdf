const root = document.getElementById('root');
const urlParams = new URLSearchParams(window.location.search);
const certificateId = urlParams.get('certificate');

if (!certificateId) {
    showError('⚠️ لم يتم تحديد رقم العرض في الرابط.');
} else {
    const appsScriptUrl = 'https://script.google.com/macros/s/AKfycbyPMfMDJNHe3JQ4x2ZiRUKejIoZc3ZSWCbeaAFyKd4HBrEjam-OTo6UjNf-Ba7fP94n/exec';

    fetch(`${appsScriptUrl}?certificate=${certificateId}`)
        .then(res => res.json())
        .then(data => {
            if (!data.success) return showError(`⚠️ ${data.message}`);

            if (data.mimeType.includes('image')) {
                renderImage(data);
            } else {
                renderPDF(data);
            }
        })
        .catch((err) => {
            console.error(err);
            showError('⚠️ فشل في الاتصال بالخادم. تحقق من الإنترنت أو مفتاح API.');
        });
}

function base64ToBlob(b64, mime) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
}

function renderPDF(data) {
    const blob = base64ToBlob(data.base64, data.mimeType);
    const url = URL.createObjectURL(blob);
    root.innerHTML = `
        <div class="doc-container">
            <iframe src="${url}" class="doc-content" type="application/pdf"></iframe>
        </div>
    `;
}

function renderImage(data) {
    root.innerHTML = `
        <div class="doc-container">
            <img src="data:${data.mimeType};base64,${data.base64}" class="doc-content" style="object-fit: contain; max-width: 100%; max-height: 100%;" alt="وثيقة" />
        </div>
    `;
}

function showError(msg) {
    root.innerHTML = `<div class="message error">${msg}</div>`;
}

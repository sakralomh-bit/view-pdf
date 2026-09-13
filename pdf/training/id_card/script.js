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
    
    // تهيئة PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    root.innerHTML = `
        <div class="doc-container" style="background: #525659; position: fixed; top: 0; left: 0; right: 0; bottom: 0; display: flex; justify-content: center; align-items: center;">
            <canvas id="pdf-canvas" style="max-width: 100%; max-height: 100%; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></canvas>
        </div>
    `;
    
    const canvas = document.getElementById('pdf-canvas');
    const ctx = canvas.getContext('2d');
    
    pdfjsLib.getDocument(url).promise.then(pdf => {
        // عرض الصفحة الأولى فقط (أو عدّل لعرض كل الصفحات)
        pdf.getPage(1).then(page => {
            const viewport = page.getViewport({ scale: 1.0 }); // مقياس 100% ثابت
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            
            page.render(renderContext);
        });
    });
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

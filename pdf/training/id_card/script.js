// منع المتصفح من حفظ حالة التكبير
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

// مسح أي zoom محفوظ لهذا الرابط
window.addEventListener('beforeunload', () => {
    sessionStorage.setItem('pdfZoom', '1.0');
});

// فرض 100% عند التحميل
window.addEventListener('load', () => {
    document.body.style.zoom = '100%';
    document.documentElement.style.zoom = '100%';
    
    // تكرار المحاولة عدة مرات
    let attempts = 0;
    const forceZoom = setInterval(() => {
        document.body.style.zoom = '100%';
        document.body.style.transform = 'scale(1.0)';
        attempts++;
        if (attempts > 5) clearInterval(forceZoom);
    }, 200);
});
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

// ضبط مسار worker لمكتبة PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

async function renderPDF(data) {
    const blob = base64ToBlob(data.base64, data.mimeType);
    const url = URL.createObjectURL(blob);
    
    root.innerHTML = `
        <div class="doc-container" style="overflow-y:auto; background:#525659;">
            <div id="pdf-viewer" style="display:flex; flex-direction:column; align-items:center; padding:10px;"></div>
        </div>
    `;
    
    try {
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        const viewer = document.getElementById('pdf-viewer');
        
        // عرض جميع الصفحات (لشهادة عادة صفحة واحدة)
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const containerWidth = Math.min(window.innerWidth, 900);
            const viewport = page.getViewport({ scale: 1 });
            const scale = containerWidth / viewport.width;
            const scaledViewport = page.getViewport({ scale });
            
            const canvas = document.createElement('canvas');
            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;
            canvas.style.marginBottom = '10px';
            canvas.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
            canvas.style.background = '#fff';
            viewer.appendChild(canvas);
            
            await page.render({
                canvasContext: canvas.getContext('2d'),
                viewport: scaledViewport
            }).promise;
        }
    } catch (err) {
        console.error(err);
        showError('⚠️ تعذّر عرض الشهادة.');
    }
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

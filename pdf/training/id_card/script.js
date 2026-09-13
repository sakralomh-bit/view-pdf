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
// فرض التكبير 100% عند تحميل عارض PDF
function forceZoomTo100() {
    setTimeout(() => {
        // البحث عن حقل التكبير في شريط الأدوات
        const zoomInput = document.querySelector('input[aria-label="مستوى التكبير أو التصغير"]');
        
        if (zoomInput && zoomInput.value !== '100%') {
            zoomInput.value = '100%';
            
            // محاكاة حدث التغيير لتطبيق التكبير
            zoomInput.dispatchEvent(new Event('change', { bubbles: true }));
            zoomInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // البحث عن زر "احتواء ضمن الصفحة" والنقر عليه إذا لزم الأمر
        const fitButton = document.getElementById('fit');
        if (fitButton) {
            // تأكد من أن الزر غير مفعل (لأنه قد يغير التكبير)
            if (fitButton.getAttribute('aria-pressed') === 'true') {
                fitButton.click();
            }
        }
    }, 1000); // انتظر ثانية واحدة حتى يتم تحميل العارض بالكامل
}

// استدعاء الدالة عند تحميل الصفحة
window.addEventListener('load', forceZoomTo100);

// إعادة التطبيق عند أي تغيير في الصفحة
window.addEventListener('pageshow', forceZoomTo100);

// مراقبة التغييرات في DOM لفرض التكبير 100%
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
            const zoomInput = document.querySelector('input[aria-label="مستوى التكبير أو التصغير"]');
            if (zoomInput && zoomInput.value !== '100%') {
                forceZoomTo100();
            }
        }
    });
});

// بدء المراقبة بعد تحميل الصفحة
window.addEventListener('load', () => {
    setTimeout(() => {
        observer.observe(document.body, { 
            childList: true, 
            subtree: true 
        });
    }, 2000);
});

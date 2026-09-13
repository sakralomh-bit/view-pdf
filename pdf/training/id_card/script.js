// 1. تعريف المتغيرات الأساسية
const root = document.getElementById('root');
const urlParams = new URLSearchParams(window.location.search);
const certificateId = urlParams.get('certificate');

// 2. منع المتصفح من استعادة حالة التمرير أو التكبير السابقة
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

// 3. الدالة الرئيسية للتشغيل
function init() {
    if (!certificateId) {
        showError('⚠️ لم يتم تحديد رقم العرض في الرابط.');
        return;
    }

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

// تشغيل الدالة فور جاهزية DOM
window.addEventListener('DOMContentLoaded', init);

// 4. دوال المعالجة والعرض
function base64ToBlob(b64, mime) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
}

function renderImage(data) {
    root.innerHTML = `
        <div class="doc-container">
            <img src="data:${data.mimeType};base64,${data.base64}" 
                 class="doc-content" 
                 style="object-fit: contain; width: 100%; height: 100%;" 
                 alt="وثيقة" />
        </div>
    `;
}

function renderPDF(data) {
    // نستخدم Canvas لعرض PDF للتحكم المطلق في المقياس (Scale)
    root.innerHTML = `
        <div class="doc-container" style="overflow: auto; padding: 20px; background: #525659;">
            <canvas id="pdf-canvas" style="box-shadow: 0 4px 12px rgba(0,0,0,0.5); max-width: 100%; background: white;"></canvas>
        </div>
    `;

    const canvas = document.getElementById('pdf-canvas');
    const ctx = canvas.getContext('2d');

    // تحميل مكتبة PDF.js ديناميكياً لضمان عدم تعارضها مع CSP
    if (typeof pdfjsLib === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            loadAndRenderPDF(data, canvas, ctx);
        };
        document.head.appendChild(script);
    } else {
        loadAndRenderPDF(data, canvas, ctx);
    }
}

function loadAndRenderPDF(data, canvas, ctx) {
    const blob = base64ToBlob(data.base64, data.mimeType);
    const url = URL.createObjectURL(blob);

    pdfjsLib.getDocument(url).promise.then(pdf => {
        // عرض الصفحة الأولى (يمكن تعديل الرقم 1 لعرض صفحات أخرى)
        pdf.getPage(1).then(page => {
            // هنا نحدد المقياس بدقة. 1.5 يعطي وضوحاً ممتازاً على جميع الشاشات دون تكبير المتصفح
            const scale = 1.5; 
            const viewport = page.getViewport({ scale: scale });

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            page.render({
                canvasContext: ctx,
                viewport: viewport
            });
        });
    }).catch(err => {
        console.error('فشل تحميل PDF:', err);
        showError('⚠️ فشل في معالجة وعرض ملف PDF.');
    });
}

function showError(msg) {
    root.innerHTML = `<div class="message error" style="padding: 20px; text-align: center; font-size: 1.2rem;">${msg}</div>`;
}

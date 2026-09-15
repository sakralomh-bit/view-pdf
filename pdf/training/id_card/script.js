const root = document.getElementById('root');
const urlParams = new URLSearchParams(window.location.search);
const certificateId = urlParams.get('certificate');

// 1. كشف دقيق للأجهزة المحمولة
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

if (!certificateId) {
    showError('⚠️ لم يتم تحديد رقم العرض في الرابط.');
} else {
    const appsScriptUrl = 'https://script.google.com/macros/s/AKfycbxd8GVmsIQBp1ZcAY3Fkxq7bukMBdDKYzIB23-0EDAn8FlmB7XYjdA4JGogRV7AqCcp/exec';

    fetch(`${appsScriptUrl}?certificate=${certificateId}`)
        .then(res => res.json())
        .then(data => {
            if (!data.success) return showError(`⚠️ ${data.message}`);

            if (data.mimeType.includes('image')) {
                renderImage(data);
            } else {
                // 2. توجيه العرض حسب نوع الجهاز
                if (isMobile) {
                    loadPDFjsForMobile(data);
                } else {
                    renderPDFDesktop(data);
                }
            }
        })
        .catch((err) => {
            console.error(err);
            showError('⚠️ فشل في الاتصال بالخادم. تحقق من الإنترنت.');
        });
}

// ================= دوال الكمبيوتر (الأصلية) =================
function renderPDFDesktop(data) {
    const blob = base64ToBlob(data.base64, data.mimeType);
    const url = URL.createObjectURL(blob);
    
    root.innerHTML = `
        <div class="doc-container">
            <iframe src="${url}#zoom=100" 
                    class="doc-content" 
                    type="application/pdf"
                    style="transform: scale(1.0); transform-origin: top center;">
            </iframe>
        </div>
    `;
    
    setTimeout(() => {
        const iframe = document.querySelector('iframe');
        if (iframe) {
            iframe.style.transform = 'scale(1.0)';
            iframe.parentElement.style.overflow = 'hidden';
        }
    }, 100);
}

// ================= دوال الجوال (الجديدة) =================
function loadPDFjsForMobile(data) {
    root.innerHTML = `<div class="doc-container" style="background:#f0f2f5;"><div class="loader"></div><div style="text-align:center; color:#666;">جاري تجهيز العرض للجوال...</div></div>`;
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        renderPDFMobile(data);
    };
    document.head.appendChild(script);
}

async function renderPDFMobile(data) {
    root.innerHTML = `<div class="doc-container" style="overflow-y:auto; padding:10px; background:#525659;"><div id="pdf-viewer" style="display:flex; flex-direction:column; align-items:center;"></div></div>`;
    
    try {
        const blob = base64ToBlob(data.base64, data.mimeType);
        const url = URL.createObjectURL(blob);
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        const viewer = document.getElementById('pdf-viewer');
        
        // 1. جلب دقة الشاشة (Device Pixel Ratio)
        const dpr = window.devicePixelRatio || 1; 

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const containerWidth = Math.min(window.innerWidth - 20, 800);
            const viewport = page.getViewport({ scale: 1 });
            
            // 2. مضاعفة الـ Scale بدقة الشاشة لزيادة حدة النص
            const scale = (containerWidth / viewport.width) * dpr;
            const scaledViewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            
            // 3. تحديد الأبعاد الفعلية للبكسلات (عالية الدقة)
            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;

            // 4. تحديد الأبعاد الظاهرة على الشاشة (تصغير بـ dpr ليعود للحجم الطبيعي)
            canvas.style.width = (scaledViewport.width / dpr) + 'px';
            canvas.style.height = 'auto';
            canvas.style.maxWidth = '100%';

            canvas.style.marginBottom = '10px';
            canvas.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
            canvas.style.background = '#fff';

            viewer.appendChild(canvas);
            await page.render({ canvasContext: canvas.getContext('2d'), viewport: scaledViewport }).promise;
        }
    } catch (err) {
        console.error(err);
        showError('⚠️ تعذّر عرض الشهادة على هذا الجهاز.');
    }
}
// ================= دوال مشتركة =================
function base64ToBlob(b64, mime) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
}

function renderImage(data) {
    root.innerHTML = `
        <div class="doc-container">
            <img src="data:${data.mimeType};base64,${data.base64}" class="doc-content" style="object-fit: contain; max-width: 100%; max-height: 100%;" alt="وثيقة" />
        </div>`;
}

function showError(msg) {
    root.innerHTML = `<div class="message error" style="color:#d32f2f; font-weight:bold; text-align:center; padding:20px;">${msg}</div>`;
}

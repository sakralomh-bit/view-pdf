const root = document.getElementById('root');
const urlParams = new URLSearchParams(window.location.search);
const certificateId = urlParams.get('certificate');

// 1. كشف دقيق للأجهزة المحمولة
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

if (!certificateId) {
    showError('⚠️ لم يتم تحديد رقم العرض في الرابط.');
} else {
    const appsScriptUrl = 'https://script.google.com/macros/s/AKfycbxd8GVmsIQBp1ZcAY3Fkxq7bukMBdDKYzIB23-0EDAn8FlmB7XYjdA4JGogRV7AqCcp/exec';

    fetch(`${appsScriptUrl}?certificate=${certificateId}`, {
    method: 'GET',
    mode: 'cors',
    redirect: 'follow'
})
.then(async res => {
    // التحقق من أن الاستجابة ناجحة قبل تحويلها لـ JSON
    if (!res.ok) {
        throw new Error(`خطأ في الخادم: ${res.status} ${res.statusText}`);
    }
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return res.json();
    } else {
        throw new Error("الخادم لم يعد بيانات JSON (قد يكون بسبب أذونات الوصول)");
    }
})
.then(data => {
    if (!data.success) return showError(`⚠️ ${data.message}`);

    if (data.mimeType.includes('image')) {
        renderImage(data);
    } else {
        if (isMobile) {
            loadPDFjsForMobile(data);
        } else {
            renderPDFDesktop(data);
        }
    }
})
.catch((err) => {
    console.error("تفاصيل الخطأ:", err);
    // عرض الخطأ الحقيقي للمستخدم للتشخيص
    showError(`⚠️ فشل الاتصال: ${err.message}`);
});

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
async function renderPDFMobile(data) {
    root.innerHTML = `<div class="doc-container" style="overflow-y:auto; padding:10px; background:#525659;"><div id="pdf-viewer" style="display:flex; flex-direction:column; align-items:center;"></div></div>`;

    try {
        const blob = base64ToBlob(data.base64, data.mimeType);
        const url = URL.createObjectURL(blob);
        
        // 1. تفعيل دعم الخطوط العربية لمنع التداخل
        const loadingTask = pdfjsLib.getDocument({
            url: url,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true,
            standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/'
        });
        
        const pdf = await loadingTask.promise;
        const viewer = document.getElementById('pdf-viewer');
        const dpr = window.devicePixelRatio || 1;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const containerWidth = Math.min(window.innerWidth - 20, 800);
            const viewport = page.getViewport({ scale: 1 });

            const cssWidth = containerWidth;
            const cssHeight = (cssWidth * viewport.height) / viewport.width;

            const scale = (cssWidth / viewport.width) * dpr;
            const scaledViewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            
            // 2. استخدام Math.floor لمنع الكسور العشرية التي تسبب تباعد النصوص
            canvas.width = Math.floor(scaledViewport.width);
            canvas.height = Math.floor(scaledViewport.height);

            // 3. تحديد الأبعاد بـ CSS بدقة متناهية ومنع أي تغيير
            canvas.style.width = cssWidth + 'px';
            canvas.style.height = cssHeight + 'px';
            canvas.style.flexShrink = '0'; // يمنع انكماش العنصر داخل Flexbox

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

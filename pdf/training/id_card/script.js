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
async function renderPDFMobile(data) {
    root.innerHTML = `<div class="doc-container" style="overflow-y:auto; padding:10px; background:#525659;"><div id="pdf-viewer" style="display:flex; flex-direction:column; align-items:center;"></div></div>`;

    try {
        const blob = base64ToBlob(data.base64, data.mimeType);
        const url = URL.createObjectURL(blob);
        
        // 1. تفعيل دعم الخطوط (CMaps) لضمان عرض النصوص العربية والإنجليزية بدقة
        const loadingTask = pdfjsLib.getDocument({
            url: url,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
            cMapPacked: true,
            standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/'
        });
        const pdf = await loadingTask.promise;
        const viewer = document.getElementById('pdf-viewer');

        // 2. ضمان دقة عالية (على الأقل 2x للجوال)
        const dpr = Math.max(window.devicePixelRatio || 1, 2);

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const containerWidth = Math.min(window.innerWidth - 20, 800);
            const viewport = page.getViewport({ scale: 1 });

            const cssWidth = containerWidth;
            const cssHeight = (cssWidth * viewport.height) / viewport.width;

            const renderScale = (cssWidth / viewport.width) * dpr;
            const scaledViewport = page.getViewport({ scale: renderScale });

            const canvas = document.createElement('canvas');
            canvas.width = Math.floor(scaledViewport.width);
            canvas.height = Math.floor(scaledViewport.height);

            // 3. إعدادات Context لتحسين حدة النص ومنع التشويش
            const context = canvas.getContext('2d', { alpha: false });
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';
            if ('textRendering' in context) {
                context.textRendering = 'optimizeLegibility';
            }

            // 4. تحديد الأبعاد الظاهرة بدقة لمنع أي تشوه
            canvas.style.width = `${cssWidth}px`;
            canvas.style.height = `${cssHeight}px`;
            canvas.style.marginBottom = '10px';
            canvas.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
            canvas.style.background = '#fff';

            viewer.appendChild(canvas);
            await page.render({ canvasContext: context, viewport: scaledViewport }).promise;
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

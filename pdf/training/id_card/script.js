const root = document.getElementById('root');
const urlParams = new URLSearchParams(window.location.search);
const certificateId = urlParams.get('certificate');

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

if (!certificateId) {
    showError('⚠️ لم يتم تحديد رقم العرض في الرابط.');
} else {
    const appsScriptUrl = 'https://script.google.com/macros/s/AKfycbxd8GVmsIQBp1ZcAY3Fkxq7bukMBdDKYzIB23-0EDAn8FlmB7XYjdA4JGogRV7AqCcp/exec';

    fetch(`${appsScriptUrl}?certificate=${certificateId}`, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow',
        cache: 'no-cache' // منع متصفح الجوال من تحميل استجابة خطأ مخزنة
    })
    .then(async res => {
        if (!res.ok) throw new Error(`خطأ في الخادم: ${res.status}`);
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return res.json();
        } else {
            throw new Error("الخادم لم يعد بيانات JSON");
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
        showError(`⚠️ فشل الاتصال: ${err.message}`);
    });
}

// ================= دوال الكمبيوتر =================
function renderPDFDesktop(data) {
    const blob = base64ToBlob(data.base64, data.mimeType);
    const url = URL.createObjectURL(blob);
    root.innerHTML = `
        <div class="doc-container">
            <iframe src="${url}#zoom=100" class="doc-content" type="application/pdf"></iframe>
        </div>`;
}

// ================= دوال الجوال =================
function loadPDFjsForMobile(data) {
    root.innerHTML = `<div class="doc-container" style="background:#f0f2f5; flex-direction:column;">
        <div class="loader"></div>
        <div style="text-align:center; color:#666; margin-top:10px;">جاري تجهيز العرض...</div>
    </div>`;

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
        
        // 1. تفعيل دعم الخطوط العربية لمنع تداخل الحروف
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

            // 2. الأبعاد المنطقية (التي ستظهر على الشاشة بنسب صحيحة)
            const cssWidth = containerWidth;
            const cssHeight = (cssWidth * viewport.height) / viewport.width;

            // 3. الأبعاد الفعلية للرسم (مضروبة في dpr للحصول على وضوح فائق)
            const renderScale = (cssWidth / viewport.width) * dpr;
            const scaledViewport = page.getViewport({ scale: renderScale });

            const canvas = document.createElement('canvas');
            
            // دقة الرسم الداخلية (أعداد صحيحة لمنع الفراغات)
            canvas.width = Math.floor(scaledViewport.width);
            canvas.height = Math.floor(scaledViewport.height);

            // 4. تحديد أبعاد العرض على الشاشة بصرامة لمنع أي تمدد أو تكبير عشوائي
            canvas.style.width = `${cssWidth}px`;
            canvas.style.height = `${cssHeight}px`;
            canvas.style.flexShrink = '0'; // منع انكماش العنصر داخل Flexbox
            canvas.style.marginBottom = '10px';
            canvas.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
            canvas.style.background = '#fff';
            canvas.style.display = 'block';

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
    root.innerHTML = `<div class="message error" style="color:#d32f2f; font-weight:bold; text-align:center; padding:20px; background:#fff; border-radius:8px; margin:20px;">${msg}</div>`;
}

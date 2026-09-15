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
                    renderPDFMobileNative(data);
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
function renderPDFMobileNative(data) {
    const blob = base64ToBlob(data.base64, data.mimeType);
    const url = URL.createObjectURL(blob);
    
    // نستخدم <object> مع <iframe> كاحتياطي لضمان التوافق التام مع iOS و Android
    root.innerHTML = `
        <div class="doc-container">
            <object data="${url}" type="application/pdf" class="doc-content">
                <iframe src="${url}" class="doc-content"></iframe>
            </object>
        </div>
    `;
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

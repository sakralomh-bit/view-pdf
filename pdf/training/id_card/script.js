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
        cache: 'no-cache'
    })
    .then(async res => {
        if (!res.ok) throw new Error(`خطأ في الخادم: ${res.status}`);
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) return res.json();
        throw new Error("الخادم لم يعد بيانات JSON");
    })
    .then(data => {
        if (!data.success) return showError(`⚠️ ${data.message}`);
        
        if (data.mimeType.includes('image')) {
            renderImage(data);
        } else {
            // التوجيه حسب نوع الجهاز
            if (isMobile) {
                triggerMobileDownload(data); // الحل الجديد للجوال
            } else {
                renderPDFDesktop(data); // العرض العادي للكمبيوتر
            }
        }
    })
    .catch((err) => {
        console.error(err);
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

// ================= دوال الجوال (تنزيل/فتح مباشر) =================
function triggerMobileDownload(data) {
    root.innerHTML = `
        <div class="doc-container" style="flex-direction:column; background:#fff; color:#333; text-align:center; padding:20px;">
            <div class="loader"></div>
            <p style="font-weight:bold; margin-top:15px;">جاري تجهيز الملف...</p>
            <p style="font-size:0.9em; color:#666; margin-top:5px;">سيتم فتح الملف أو تنزيله تلقائياً.</p>
            <p style="font-size:0.85em; color:#888; margin-top:10px;">إذا لم يبدأ تلقائياً، اضغط على الزر أدناه:</p>
            <a id="manual-download-btn" href="#" style="background:#3498db; color:#fff; padding:10px 20px; border-radius:5px; text-decoration:none; margin-top:15px; display:inline-block; font-weight:bold;">اضغط هنا لفتح/تنزيل الملف</a>
        </div>`;

    try {
        const blob = base64ToBlob(data.base64, data.mimeType);
        const url = URL.createObjectURL(blob);
        const fileName = `Certificate_${certificateId}.pdf`;

        // إنشاء رابط مؤقت للتحفيز التلقائي
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName; // يعمل على Android
        a.target = '_blank';    // ضروري جداً لـ iOS Safari لفتحه في العارض الأصلي
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // تحديث الزر اليدوي احتياطياً
        const manualBtn = document.getElementById('manual-download-btn');
        if (manualBtn) {
            manualBtn.href = url;
            manualBtn.download = fileName;
        }
    } catch (err) {
        console.error(err);
        showError('⚠️ حدث خطأ أثناء تجهيز الملف.');
    }
}

// ================= دوال مشتركة =================
function base64ToBlob(b64, mime) {
    const bytes = new Uint8Array(atob(b64).split('').map(c => c.charCodeAt(0)));
    return new Blob([bytes], { type: mime });
}

function renderImage(data) {
    root.innerHTML = `
        <div class="doc-container">
            <img src="data:${data.mimeType};base64,${data.base64}" class="doc-content" style="object-fit: contain;" alt="وثيقة" />
        </div>`;
}

function showError(msg) {
    root.innerHTML = `<div class="message error" style="color:#d32f2f; font-weight:bold; text-align:center; padding:20px; background:#fff; border-radius:8px; margin:20px;">${msg}</div>`;
}

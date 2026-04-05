// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyDeKBkk7OjILKwmfNaNr1J-8c99WeRk_Y8",
    authDomain: "company-payments-system.firebaseapp.com",
    projectId: "company-payments-system",
    storageBucket: "company-payments-system.firebasestorage.app",
    messagingSenderId: "827863505736",
    appId: "1:827863505736:web:2d924cfcc7c3a45415b17d"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let allReportData = []; // تخزين البيانات للتصدير

auth.onAuthStateChanged(async (user) => {
    const loadingScreen = document.getElementById('loadingScreen');
    const appContent = document.getElementById('appContent');
    
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // تحميل الإحصائيات السريعة
    await loadQuickStats();
    
    loadingScreen.style.display = 'none';
    appContent.style.display = 'block';
    
    showToast('✅ تم تحميل التقارير بنجاح', 'success');
});

// ================== الإحصائيات السريعة ==================
async function loadQuickStats() {
    const usersSnapshot = await db.collection('users').get();
    const totalCustomers = usersSnapshot.size;
    document.getElementById('totalCustomers').textContent = totalCustomers;

    let totalPayments = 0;
    for (const userDoc of usersSnapshot.docs) {
        const paymentsSnapshot = await db.collection('users').doc(userDoc.id).collection('payments').get();
        totalPayments += paymentsSnapshot.size;
    }
    document.getElementById('totalPayments').textContent = totalPayments;
    document.getElementById('reportCount').textContent = `الدفعات: ${totalPayments}`;
}

// ================== استخراج التاريخ ==================
function extractDateFromISO(isoString) {
    return isoString ? isoString.split('T')[0] : '';
}

function formatDateForDisplay(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : dateString;
}

// ================== عرض التقرير حسب التاريخ ==================
async function generateReport() {
    const table = document.getElementById('reportTableBody');
    const dateFilter = document.getElementById('reportDate').value;
    
    if (!dateFilter) {
        showToast('يرجى اختيار تاريخ', 'warning');
        return;
    }

    table.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin fa-2x"></i><br>جاري البحث...</td></tr>';

    try {
        const usersSnapshot = await db.collection('users').get();
        allReportData = [];
        let foundCount = 0;

        for (const userDoc of usersSnapshot.docs) {
            const user = userDoc.data();
            const userId = userDoc.id;
            const paymentsSnapshot = await db.collection('users').doc(userId).collection('payments').get();

            for (const paymentDoc of paymentsSnapshot.docs) {
                const payment = paymentDoc.data();
                const paymentDateOnly = extractDateFromISO(payment.paymentDate);

                if (paymentDateOnly === dateFilter) {
                    foundCount++;
                    const displayDate = formatDateForDisplay(paymentDateOnly);
                    
                    const row = createReportRow(user, payment, displayDate);
                    table.insertAdjacentHTML('beforeend', row);
                    
                    // حفظ للتصدير
                    allReportData.push({
                        nameAr: user.nameAr || '',
                        nameEn: user.nameEn || '',
                        amount: payment.amount || '',
                        remaining: payment.remaining || '',
                        speed: payment.speed || '',
                        note: payment.note || '',
                        date: displayDate
                    });
                }
            }
        }

        updateReportStats(foundCount);
        if (foundCount === 0) {
            table.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:#666;">لا توجد دفعات في هذا التاريخ</td></tr>';
        }
        
    } catch (error) {
        console.error('خطأ في التقرير:', error);
        table.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#ef4444;">حدث خطأ في تحميل التقرير</td></tr>';
        showToast('خطأ في تحميل التقرير', 'error');
    }
}

// ================== عرض كل الدفعات ==================
async function showAllReport() {
    const table = document.getElementById('reportTableBody');
    table.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin fa-2x"></i><br>جاري التحميل...</td></tr>';

    try {
        const usersSnapshot = await db.collection('users').get();
        allReportData = [];
        let foundCount = 0;

        for (const userDoc of usersSnapshot.docs) {
            const user = userDoc.data();
            const userId = userDoc.id;
            const paymentsSnapshot = await db.collection('users').doc(userId).collection('payments').orderBy('paymentDate', 'desc').get();

            for (const paymentDoc of paymentsSnapshot.docs) {
                const payment = paymentDoc.data();
                const displayDate = formatDateForDisplay(extractDateFromISO(payment.paymentDate));
                
                foundCount++;
                const row = createReportRow(user, payment, displayDate);
                table.insertAdjacentHTML('beforeend', row);
                
                allReportData.push({
                    nameAr: user.nameAr || '',
                    nameEn: user.nameEn || '',
                    amount: payment.amount || '',
                    remaining: payment.remaining || '',
                    speed: payment.speed || '',
                    note: payment.note || '',
                    date: displayDate
                });
            }
        }

        updateReportStats(foundCount);
        
    } catch (error) {
        console.error('خطأ:', error);
        showToast('خطأ في تحميل التقرير', 'error');
    }
}

// ================== إنشاء صف التقرير ==================
function createReportRow(user, payment, displayDate) {
    return `
        <tr>
            <td style="font-weight:600; color:#1f2937;">${user.nameAr || '-'}</td>
            <td style="color:#6b7280;">${user.nameEn || '-'}</td>
            <td style="font-weight:700; color:#059669;">${payment.amount || '-'}</td>
            <td style="color:#d97706;">${payment.remaining || '-'}</td>
            <td>${payment.speed || '-'}</td>
            <td style="max-width:200px;">${payment.note || '-'}</td>
            <td style="font-weight:500;">${displayDate}</td>
        </tr>
    `;
}

// ================== تحديث الإحصائيات ==================
function updateReportStats(count) {
    document.getElementById('reportCount').textContent = `الدفعات: ${count}`;
}

// ================== تصدير Excel ==================
function exportToExcel() {
    if (allReportData.length === 0) {
        showToast('لا توجد بيانات للتصدير', 'warning');
        return;
    }

    let csv = 'الاسم العربي,English Name,المبلغ,الباقي,السرعة,ملاحظة,تاريخ الدفعة\n';
    allReportData.forEach(row => {
        csv += `"${row.nameAr}","${row.nameEn}","${row.amount}","${row.remaining}","${row.speed}","${row.note}","${row.date}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `تقرير_الدفعات_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('تم تصدير البيانات بنجاح ✅', 'success');
}

// ================== طباعة التقرير ==================
function printReport() {
    if (allReportData.length === 0) {
        showToast('لا توجد بيانات للطباعة', 'warning');
        return;
    }
    window.print();
}

// ================== إشعارات ==================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast-notification toast-${type} toast-show`;
    setTimeout(() => toast.classList.remove('toast-show'), 3000);
}

// ================== تسجيل الخروج ==================
function logout() {
    auth.signOut().then(() => {
        window.location.href = 'login.html';
    });
}
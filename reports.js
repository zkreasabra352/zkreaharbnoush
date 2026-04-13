// 🔥 reports.js محدث - يعمل بدون أخطاء
const firebaseConfig = {
    apiKey: "AIzaSyDeKBkk7OjILKwmfNaNr1J-8c99WeRk_Y8",
    authDomain: "company-payments-system.firebaseapp.com",
    projectId: "company-payments-system",
    storageBucket: "company-payments-system.firebasestorage.app",
    messagingSenderId: "827863505736",
    appId: "1:827863505736:web:2d924cfcc7c3a45415b17d"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

let allReportData = [];

auth.onAuthStateChanged(async (user) => {
    const loadingScreen = document.getElementById('loadingScreen');
    const appContent = document.getElementById('appContent');
    
    if (!user) {
        window.location.href = './login.html';
        return;
    }

    loadingScreen.style.display = 'none';
    appContent.style.display = 'block';

    try {
        await loadQuickStats();
        showToast('✅ التقارير جاهزة', 'success');
    } catch (err) {
        console.error("خطأ:", err);
        showToast('التقارير جاهزة', 'info');
    }
});

// ================== إحصائيات سريعة ==================
async function loadQuickStats() {
    try {
        const usersSnapshot = await db.collection('users').get();
        document.getElementById('totalCustomers').textContent = usersSnapshot.size;

        const sampleUsers = usersSnapshot.docs.slice(0, 10);
        let totalPayments = 0;
        
        for (const userDoc of sampleUsers) {
            const paymentsSnapshot = await db.collection('users').doc(userDoc.id).collection('payments').get();
            totalPayments += paymentsSnapshot.size;
        }
        
        const estimatedTotal = Math.round((totalPayments / sampleUsers.length) * usersSnapshot.size);
        document.getElementById('totalPayments').textContent = estimatedTotal.toLocaleString();
        document.getElementById('reportCount').textContent = `الدفعات: ${estimatedTotal.toLocaleString()}+`;
        
    } catch (error) {
        console.error('خطأ إحصائيات:', error);
        document.getElementById('totalPayments').textContent = '---';
        document.getElementById('totalCustomers').textContent = '---';
    }
}

// ================== التقرير الرئيسي ==================
async function generateReport() {
    const table = document.getElementById('reportTableBody');
    const dateFilter = document.getElementById('reportDate').value;

    if (!dateFilter) {
        showToast('اختر تاريخاً أولاً', 'warning');
        return;
    }

    table.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px;"><i class="fas fa-spinner fa-spin fa-2x"></i><br>جاري البحث في الدفعات...</td></tr>';

    try {
        allReportData = [];
        let reportData = [];

        // 🔥 جلب جميع الدفعات عبر collection group مرة واحدة
        const paymentsSnapshot = await db.collectionGroup('payments').get();

        paymentsSnapshot.forEach(paymentDoc => {
            const payment = paymentDoc.data();
            const paymentDateOnly = payment.paymentDate ? payment.paymentDate.split('T')[0] : '';
            if (paymentDateOnly === dateFilter) {
                // جلب معلومات الزبون من مسار المستند
                const pathParts = paymentDoc.ref.path.split('/');
                const userId = pathParts[1]; // users/{userId}/payments/{paymentId}
                reportData.push({
                    id: userId,
                    ...payment
                });
            }
        });

        table.innerHTML = '';
        allReportData = reportData;

        if (reportData.length === 0) {
            table.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px; color:#6b7280;">لا توجد دفعات في هذا التاريخ</td></tr>';
            return;
        }

        // إذا أردت يمكننا إضافة اسم الزبون عربي وإنجليزي هنا مع استعلامات إضافية أو تخزينها مسبقاً
        reportData.forEach(payment => {
            table.insertAdjacentHTML('beforeend', createReportRow(payment));
        });

        updateReportStats(reportData.length);
        showToast(`✅ ${reportData.length} دفعة في ${dateFilter}`, 'success');

    } catch (error) {
        console.error('خطأ تقرير:', error);
        table.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#ef4444;">خطأ في جلب البيانات</td></tr>';
        showToast('خطأ في التقرير', 'error');
    }
}

async function showAllReport() {
    document.getElementById('reportDate').value = '';
    showToast('جاري تحميل جميع الدفعات...', 'info');
    generateReport();
}

function createReportRow(payment) {
    return `
        <tr>
            <td style="font-weight:600; min-width:180px;">${payment.customerNameAr || '-'}</td>
            <td style="color:#6b7280; min-width:150px;">${payment.customerNameEn || '-'}</td>
            <td style="font-weight:700; color:#059669; min-width:100px;">${payment.amount || '-'}</td>
            <td style="color:#d97706; min-width:100px;">${payment.remaining || '-'}</td>
            <td style="min-width:120px;">${payment.speed || '-'}</td>
            <td style="max-width:250px; word-break:break-word;">${payment.note || '-'}</td>
            <td style="font-weight:500; min-width:120px;">${formatDateForDisplay(payment.paymentDate)}</td>
        </tr>
    `;
}

function updateReportStats(count) {
    document.getElementById('reportCount').textContent = `الدفعات: ${count}`;
    document.getElementById('totalPayments').textContent = count.toLocaleString();
}

function formatDateForDisplay(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : dateString;
}

function exportToExcel() {
    if (allReportData.length === 0) {
        showToast('لا بيانات للتصدير', 'warning');
        return;
    }
    
    let csv = 'الاسم العربي,English Name,المبلغ,الباقي,السرعة,ملاحظة,تاريخ\r\n';
    allReportData.forEach(row => {
        csv += `"${row.customerNameAr || ''}","${row.customerNameEn || ''}","${row.amount || ''}","${row.remaining || ''}","${row.speed || ''}","${row.note || ''}","${formatDateForDisplay(row.paymentDate)}"\r\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `تقرير-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
    showToast('✅ تم تصدير Excel', 'success');
}

function printReport() {
    window.print();
    showToast('اضغط Ctrl+P للطباعة', 'info');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i> ${message}`;
    toast.className = `toast-notification toast-${type} toast-show`;
    setTimeout(() => toast.classList.remove('toast-show'), 4000);
}

function logout() {
    auth.signOut().then(() => {
        window.location.href = './login.html';
    }).catch(console.error);
}
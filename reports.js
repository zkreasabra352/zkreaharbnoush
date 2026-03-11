// ================== إعداد Firebase ==================
const firebaseConfig = {
    apiKey: "AIzaSyDeKBkk7OjILKwmfNaNr1J-8c99WeRk_Y8",
    authDomain: "company-payments-system.firebaseapp.com",
    databaseURL: "https://company-payments-system-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "company-payments-system",
    storageBucket: "company-payments-system.firebasestorage.app",
    messagingSenderId: "827863505736",
    appId: "1:827863505736:web:2d924cfcc7c3a45415b17d",
    measurementId: "G-0V1KLHFT35"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }
});

// ================== دالة استخراج التاريخ من ISO ==================
function extractDateFromISO(isoString) {
    if (!isoString) return '';
    return isoString.split('T')[0];
}

// ================== دالة تحويل التاريخ للعرض ==================
function formatDateForDisplay(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];
        return `${day}-${month}-${year}`;
    }
    return dateString;
}

// ================== دالة عرض التقرير حسب التاريخ (مُحسّنة) ==================
async function generateReport() {
    const table = document.getElementById('reportTableBody');
    const dateFilter = document.getElementById('reportDate').value;
    const countSpan = document.getElementById('reportCount');

    // مسح الجدول أولاً
    table.innerHTML = '';

    if (!dateFilter) {
        alert('يرجى اختيار تاريخ للعرض');
        return;
    }

    // إظهار مؤشر التحميل
    table.innerHTML = '<tr><td colspan="7" style="text-align:center;">جاري التحميل...</td></tr>';

    // جلب جميع الزبائن
    const usersSnapshot = await db.collection('users').get();
    let foundCount = 0;

    // استخدام Promise.all لتسريع التحميل
    const userPromises = usersSnapshot.docs.map(async (userDoc) => {
        const user = userDoc.data();
        const userId = userDoc.id;

        // جلب دفعات الزبون
        const paymentsSnapshot = await db.collection('users').doc(userId).collection('payments').get();

        // تصفية الدفعات حسب التاريخ المحدد
        for (const paymentDoc of paymentsSnapshot.docs) {
            const payment = paymentDoc.data();
            const paymentDate = payment.paymentDate;
            const paymentDateOnly = extractDateFromISO(paymentDate);

            if (paymentDateOnly && paymentDateOnly === dateFilter) {
                foundCount++;

                const displayDate = formatDateForDisplay(paymentDateOnly);

                const row = `
                <tr>
                    <td>${user.nameAr || ''}</td>
                    <td>${user.nameEn || ''}</td>
                    <td>${payment.amount || ''}</td>
                    <td>${payment.remaining || ''}</td>
                    <td>${payment.speed || ''}</td>
                    <td>${payment.note || ''}</td>
                    <td>${displayDate}</td>
                </tr>
                `;
                table.insertAdjacentHTML('beforeend', row);
            }
        }
    });

    // انتظار جميع الطلبات
    await Promise.all(userPromises);

    // تحديث العداد
    if (countSpan) {
        countSpan.innerText = `عدد الدفعات: ${foundCount}`;
    }

    // إزالة رسالة التحميل إذا لم توجد دفعات
    if (foundCount === 0) {
        table.innerHTML = '<tr><td colspan="7" style="text-align:center;">لا توجد دفعات في هذا التاريخ</td></tr>';
    }
}

// ================== دالة عرض التقرير بدون فلتر (مُحسّنة) ==================
async function showAllReport() {
    const table = document.getElementById('reportTableBody');
    const countSpan = document.getElementById('reportCount');

    // مسح الجدول أولاً
    table.innerHTML = '';
    table.innerHTML = '<tr><td colspan="7" style="text-align:center;">جاري التحميل...</td></tr>';

    const usersSnapshot = await db.collection('users').get();
    let foundCount = 0;

    const userPromises = usersSnapshot.docs.map(async (userDoc) => {
        const user = userDoc.data();
        const userId = userDoc.id;

        const paymentsSnapshot = await db.collection('users').doc(userId).collection('payments').get();

        for (const paymentDoc of paymentsSnapshot.docs) {
            const payment = paymentDoc.data();
            const displayDate = formatDateForDisplay(extractDateFromISO(payment.paymentDate));

            foundCount++;

            const row = `
            <tr>
                <td>${user.nameAr || ''}</td>
                <td>${user.nameEn || ''}</td>
                <td>${payment.amount || ''}</td>
                <td>${payment.remaining || ''}</td>
                <td>${payment.speed || ''}</td>
                <td>${payment.note || ''}</td>
                <td>${displayDate}</td>
            </tr>
            `;
            table.insertAdjacentHTML('beforeend', row);
        }
    });

    await Promise.all(userPromises);

    if (countSpan) {
        countSpan.innerText = `عدد الدفعات: ${foundCount}`;
    }
}

// ================== دالة اختبار تنسيق التاريخ ==================
async function testDateFormat() {
    const dateFilter = document.getElementById('reportDate').value;
    if (!dateFilter) {
        alert('يرجى اختيار تاريخ أولاً');
        return;
    }

    const usersSnapshot = await db.collection('users').get();
    let testResults = [];

    for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const paymentsSnapshot = await db.collection('users').doc(userId).collection('payments').get();

        for (const paymentDoc of paymentsSnapshot.docs) {
            const payment = paymentDoc.data();
            const paymentDate = payment.paymentDate;

            if (paymentDate) {
                const dateOnly = extractDateFromISO(paymentDate);
                testResults.push({
                    user: userDoc.data().nameAr,
                    paymentDate: paymentDate,
                    dateOnly: dateOnly,
                    matches: dateOnly === dateFilter
                });
            }
        }
    }

    console.log('=== نتائج اختبار التاريخ ===');
    console.log('التاريخ المختار:', dateFilter);
    console.log('عدد الدفعات:', testResults.length);
    console.log('الدفعات المطابقة:', testResults.filter(r => r.matches).length);

    alert(`✅ تم الاختبار!\n\nالتاريخ المختار: ${dateFilter}\nعدد الدفعات في النظام: ${testResults.length}\nالدفعات المطابقة: ${testResults.filter(r => r.matches).length}`);
}
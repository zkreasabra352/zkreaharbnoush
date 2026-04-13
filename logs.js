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

let currentUserEmail = '';

auth.onAuthStateChanged(user => {
    if (user) {
        currentUserEmail = user.email || 'غير معروف';
        loadLogs();
    } else {
        window.location.href = "login.html";
    }
});

// ================== تحميل السجلات ==================
function formatLogDetails(details) {
    if (!details || Object.keys(details).length === 0) return '-';
    let html = '<ul style="padding-left:15px; margin:0;">';
    for (const [key, value] of Object.entries(details)) {
        html += `<li><strong>${key}:</strong> ${value}</li>`;
    }
    html += '</ul>';
    return html;
}

// ... الكود السابق كما هو ...

async function loadLogs() {
    const table = document.getElementById('logsTable');
    if (!table) return;

    db.collection('logs')
    .orderBy('timestamp', 'desc')
    .limit(100)
    .onSnapshot(snapshot => {
        table.innerHTML = '';

        snapshot.forEach(doc => {
            const log = doc.data();
            
            // اسم الزبون المؤقت من السجل مباشرة
            let customerName = log.customerName || 'جاري التحميل...';

            const row = `
            <tr data-customer-id="${log.customerId || ''}">
                <td>${log.timestamp ? new Date(log.timestamp).toLocaleString('ar-EG') : ''}</td>
                <td>${log.action || ''}</td>
                <td>${log.userEmail || currentUserEmail}</td>
                <td id="customer-${doc.id}">${customerName}</td>
                <td>${formatLogDetails(log.details)}</td>
            </tr>
            `;

            table.insertAdjacentHTML('beforeend', row);

            // البحث التلقائي عن الاسم الحقيقي
            findCustomerName(doc.id, log);
        });
    });
}





// ✅ البحث الشامل عن اسم الزبون
function findCustomerName(logId, log) {

    // ✅ 1. إذا الاسم موجود جاهز
    const directName = getCustomerName(log);
    if (directName) {
        updateCustomerCell(logId, directName);
        return;
    }

    // ✅ 2. البحث باستخدام userId
    if (log.customerId) {
    db.collection('customers').doc(log.customerId).get()
    .then(doc => {
        if (doc.exists) {
            const customer = doc.data();
            const name = customer.name || customer.nameEn || 'غير معروف';
            updateCustomerCell(logId, name);
        } else {
            updateCustomerCell(logId, 'غير معروف');
        }
    })
    .catch(() => {
        updateCustomerCell(logId, 'غير معروف');
    });
}
}

// ✅ البحث في قاعدة الزبائن حسب ID
function searchCustomerById(logId, customerId) {
    db.collection('customers')
    .doc(customerId)
    .get()
    .then(doc => {
        if (doc.exists) {
            const customer = doc.data();
            const name = customer.nameEn || customer.name || customer.customerNameEn || customer.customerName || 'غير معروف';
            updateCustomerCell(logId, name);
        } else {
            // جرب في users أيضاً
            db.collection('users').doc(customerId).get()
            .then(userDoc => {
                if (userDoc.exists) {
                    const name = userDoc.data().nameEn || userDoc.data().name || 'غير معروف';
                    updateCustomerCell(logId, name);
                } else {
                    updateCustomerCell(logId, 'غير معروف');
                }
            });
        }
    })
    .catch(() => updateCustomerCell(logId, 'غير معروف'));
}
function fallbackToEmail(logId, log) {
    if (log.userEmail) {
        db.collection('customers')
        .where('email', '==', log.userEmail)
        .limit(1)
        .get()
        .then(snapshot => {
            if (!snapshot.empty) {
                const customer = snapshot.docs[0].data();
                const name = customer.name || customer.nameEn || extractNameFromEmail(log.userEmail);
                updateCustomerCell(logId, name);
            } else {
                updateCustomerCell(logId, extractNameFromEmail(log.userEmail));
            }
        })
        .catch(() => {
            updateCustomerCell(logId, extractNameFromEmail(log.userEmail));
        });
    } else {
        updateCustomerCell(logId, 'غير معروف');
    }
}
function updateCustomerCell(logId, name) {
    const cell = document.getElementById(`customer-${logId}`);
    if (cell) {
        cell.textContent = name;
    }}

// ✅ استخراج اسم من البريد الإلكتروني
function extractNameFromEmail(email) {
    if (!email) return '';
    return email.split('@')[0].replace(/[^a-zA-Z\s]/g, ' ').trim() || 'مستخدم';
}

// ✅ البحث عن المستخدم حسب البريد الإلكتروني
function findUserByEmail(logId, email) {
    db.collection('users')
    .where('email', '==', email)
    .limit(1)
    .get()
    .then(snapshot => {
        if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            const userData = userDoc.data();
            const fullName = userData.nameEn || userData.name || userData.fullName || extractNameFromEmail(email);
            
            const cell = document.getElementById(`user-${logId}`);
            if (cell) {
                cell.textContent = fullName;
                console.log(`✅ تم العثور على: ${fullName} للبريد: ${email}`);
            }
        }
    })
    .catch(err => {
        console.error('خطأ في البحث عن المستخدم:', err);
    });
}

// ✅ استخراج اسم الزبون من السجل مباشرة
function getCustomerNameFromLog(log) {
    const fields = [
        'customerNameEn', 'nameEn', 'customer_name_en', 'fullNameEn',
        'customerName', 'nameAr', 'customer_name', 'name', 'fullName'
    ];
    
    for (const field of fields) {
        if (log[field]) {
            console.log(`تم العثور على الاسم في: ${field} = ${log[field]}`);
            return log[field];
        }
    }
    return null;
}

// ✅ جلب اسم الزبون من قاعدة البيانات
function loadCustomerName(logId, customerId) {
    if (!customerId) return;

    // ✅ البحث في مجموعة الزبائن
    db.collection('customers')
    .doc(customerId)
    .get()
    .then(customerDoc => {
        if (customerDoc.exists) {
            const customer = customerDoc.data();
            const name = customer.nameEn || customer.name || customer.customerNameEn || customer.customerName || 'غير معروف';
            
            const cell = document.getElementById(`name-${logId}`);
            if (cell) {
                cell.innerText = name;
                console.log(`تم تحديث اسم الزبون: ${name}`);
            }
        } else {
            // ✅ إذا لم توجد في customers، جرب users
            db.collection('users').doc(customerId).get()
            .then(userDoc => {
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    const name = userData.nameEn || userData.name || 'غير معروف';
                    
                    const cell = document.getElementById(`name-${logId}`);
                    if (cell) cell.innerText = name;
                }
            });
        }
    })
    .catch(err => {
        console.error("خطأ في جلب اسم الزبون:", err);
    });
}

// ✅ دالة مساعدة للبحث عن اسم الزبون
function getCustomerName(log) {
    const nameFields = [
        'customerNameEn', 'nameEn', 'customer_name_en', 'fullNameEn',
        'customerName', 'name', 'customer_name', 'fullName'
    ];
    
    for (const field of nameFields) {
        if (log[field]) {
            return log[field];
        }
    }
    return null;
}

// ✅ تحسين البحث عن اسم المستخدم
function searchUserName(docId, userId) {
    if (!userId) return;
    
    db.collection('users').doc(userId).get()
        .then(userDoc => {
            if (userDoc.exists) {
                const userData = userDoc.data();
                const name = userData.nameEn || userData.name || userData.fullName || "-";
                
                const cell = document.getElementById(`user-${docId}`);
                if (cell) cell.innerText = name;
            }
        })
        .catch(err => console.error("خطأ في جلب الاسم:", err));
}
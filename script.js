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

    // إذا كانت صفحة الزبائن
    if (document.getElementById('customersTable')) {
        loadCustomers();
    }

    // إذا كانت صفحة الدفعات
    if (document.getElementById('paymentsTable')) {
        loadPayments();
    }

    // إذا كانت صفحة السجلات
    if (document.getElementById('logsTable')) {
        loadLogs();
    }
});
// ================== دوال الزبائن ==================
let editingCustomerId = null;
const customerModal = document.getElementById('customerModal');
const customerModalTitle = document.getElementById('customerModalTitle');
let selectedIds = [];
let allCustomers = []; // لتخزين جميع الزبائن للبحث

function loadCustomers() {
    const table = document.getElementById('customersTable');
    const totalSpan = document.getElementById('totalCustomers');
    const searchInput = document.getElementById('customerSearch');

    if (!table) return;

    db.collection('users').onSnapshot(snapshot => {
        table.innerHTML = '';
        allCustomers = [];

        snapshot.forEach(doc => {
            const user = doc.data();
            allCustomers.push({ id: doc.id, ...user });
        });

        // عرض كل الزبائن
        renderCustomers(allCustomers);

        // تحديث العدد الكلي
        if (totalSpan) {
            totalSpan.innerText = `العدد: ${allCustomers.length}`;
        }
    });

    // البحث أثناء الكتابة
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase().trim();
            const filtered = allCustomers.filter(c =>
                (c.nameAr && c.nameAr.toLowerCase().includes(query)) ||
                (c.nameEn && c.nameEn.toLowerCase().includes(query))
            );
            renderCustomers(filtered);

            // تحديث العدد حسب النتائج
            if (totalSpan) {
                totalSpan.innerText = `النتائج: ${filtered.length} / ${allCustomers.length}`;
            }
        });
    }
}

// دالة عرض الزبائن في الجدول
function renderCustomers(customers) {
    const table = document.getElementById('customersTable');
    if (!table) return;

    table.innerHTML = '';

    customers.forEach(user => {
        const row = `
        <tr id="row-${user.id}">
            <td data-label="تحديد">
                <input type="checkbox" class="customer-checkbox" value="${user.id}" onclick="updateSelection()">
            </td>
            <td data-label="الاسم العربي" style="font-weight:700">${user.nameAr || ''}</td>
            <td data-label="English Name" style="color:#64748b">${user.nameEn || ''}</td>
            <td data-label="ملاحظات"><small>${user.note || '-'}</small></td>
<td data-label="تاريخ الانضمام">
    ${user.createdAt ? formatDate(user.createdAt) : ''}
</td>            <td data-label="السجلات">
                <button class="view-btn" onclick="goToPayments('${user.id}')">
                    <i class="fas fa-file-invoice-dollar"></i> السجل
                </button>
            </td>
        </tr>
        `;
        table.insertAdjacentHTML('beforeend', row);
    });
}

// دالة تحديث الاختيارات
function updateSelection() {
    const checkboxes = document.querySelectorAll('.customer-checkbox');
    selectedIds = [];

    checkboxes.forEach(cb => {
        const row = cb.closest('tr');

        if (cb.checked) {
            selectedIds.push(cb.value);
            row.classList.add('selected-row');
        } else {
            row.classList.remove('selected-row');
        }
    });

    const bar = document.getElementById('selectionBar');
    const countSpan = document.getElementById('selectedCount');
    const editBtn = document.querySelector('.btn-edit-alt'); // زر التعديل

    if (selectedIds.length > 0) {
        bar.style.display = 'flex';
        countSpan.innerText = selectedIds.length;

        // التحكم في زر التعديل
        if (selectedIds.length === 1) {
            editBtn.disabled = false; // تفعيل
        } else {
            editBtn.disabled = true; // تعطيل
        }
    } else {
        bar.style.display = 'none';
        editBtn.disabled = true; // تعطيل
    }
}
// دالة تحديد الكل
function toggleSelectAll() {
    const mainCb = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.customer-checkbox');
    checkboxes.forEach(cb => cb.checked = mainCb.checked);
    updateSelection();
}

// دالة الإلغاء
function clearSelection() {
    document.getElementById('selectAll').checked = false;
    const checkboxes = document.querySelectorAll('.customer-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
    updateSelection();
}

// دالة الحذف الجماعي
function deleteSelected() {
    if (selectedIds.length === 0) return;
    if (confirm(`هل أنت متأكد من حذف ${selectedIds.length} من الزبائن مع كافة بياناتهم؟`)) {
        selectedIds.forEach(id => {
            // نستخدم نفس منطق الحذف القديم لكل ID
            deleteCustomer(id);
        });
        clearSelection();
    }
}

// دالة التعديل (تأخذ أول عنصر محدد)
function editSelected() {
    if (selectedIds.length > 0) {
        editCustomer(selectedIds[0]);
        clearSelection();
    }
}
function openCustomerModal(editId = null) {
    if (!customerModal) return;
    editingCustomerId = editId;
    if (editId) {
        customerModalTitle.innerText = "تعديل زبون";
        db.collection('users').doc(editId).get().then(doc => {
            const data = doc.data();
            document.getElementById('customerNameAr').value = data.nameAr || '';
            document.getElementById('customerNameEn').value = data.nameEn || '';
            document.getElementById('customerNote').value = data.note || '';
        });
    } else {
        customerModalTitle.innerText = "إضافة زبون";
        document.getElementById('customerNameAr').value = '';
        document.getElementById('customerNameEn').value = '';
        document.getElementById('customerNote').value = '';
    }
    customerModal.style.display = 'block';
}

function closeCustomerModal() {
    if (customerModal) customerModal.style.display = 'none';
}

const addCustomerBtn = document.getElementById('addCustomerBtn');
if (addCustomerBtn) addCustomerBtn.addEventListener('click', () => openCustomerModal());

const saveCustomerBtn = document.getElementById('saveCustomerBtn');
if (saveCustomerBtn) saveCustomerBtn.addEventListener('click', () => {
    const nameAr = document.getElementById('customerNameAr').value.trim();
    const nameEn = document.getElementById('customerNameEn').value.trim();
    const note = document.getElementById('customerNote').value.trim();
    const createdAt = new Date().toISOString().split('T')[0];

    if (!nameAr || !nameEn) return alert("الاسم بالعربي والإنكليزي مطلوب");

    // التحقق من تكرار الاسم (عربي أو إنكليزي)
    db.collection('users').where('nameAr', '==', nameAr).get()
        .then(snapshotAr => {
            // إذا كنا نعدل زبون، نتحقق إذا كان الزبون الحالي هو نفسه
            if (editingCustomerId && snapshotAr.size === 1) {
                const firstDoc = snapshotAr.docs[0];
                if (firstDoc.id === editingCustomerId) {
                    // نفس الزبون، لا نعتبره تكرار
                    return db.collection('users').where('nameEn', '==', nameEn).get();
                }
            }

            if (!snapshotAr.empty) {
                return { error: "الاسم العربي موجود مسبقاً في النظام!" };
            }
            return db.collection('users').where('nameEn', '==', nameEn).get();
        })
        .then(result => {
            if (result && result.error) {
                alert(result.error);
                return;
            }

            // التحقق من الاسم الإنكليزي
            if (!result.empty) {
                // إذا كنا نعدل زبون، نتحقق إذا كان الزبون الحالي هو نفسه
                if (editingCustomerId && result.size === 1) {
                    const firstDoc = result.docs[0];
                    if (firstDoc.id === editingCustomerId) {
                        // نفس الزبون، لا نعتبره تكرار
                    } else {
                        alert("الاسم بالإنكليزي موجود مسبقاً في النظام!");
                        return;
                    }
                } else {
                    alert("الاسم بالإنكليزي موجود مسبقاً في النظام!");
                    return;
                }
            }

            // إذا لم يكن هناك تكرار، احفظ البيانات
            if (editingCustomerId) {
                db.collection('users').doc(editingCustomerId).update({ nameAr, nameEn, note })
                    .then(() => {
                        db.collection('logs').add({
                            action: 'editCustomer',
                            userEmail: auth.currentUser.email || 'غير معروف',
                            userId: editingCustomerId,
                            details: { nameAr, nameEn, note },
                            timestamp: new Date().toISOString()
                        });
                    });
            } else {
                db.collection('users').add({ nameAr, nameEn, note, createdAt })
                    .then(docRef => {
                        db.collection('logs').add({
                            action: 'addCustomer',
                            userEmail: auth.currentUser.email || 'غير معروف',
                            userId: docRef.id,
                            details: { nameAr, nameEn, note },
                            timestamp: new Date().toISOString()
                        });
                    });
            }
            closeCustomerModal();
        })
        .catch(error => {
            console.error("خطأ في التحقق من الاسم:", error);
            alert("حدث خطأ أثناء التحقق من الاسم، يرجى المحاولة لاحقاً.");
        });
});

function editCustomer(userId) { openCustomerModal(userId); }

// حذف الزبون مع جميع الدفعات
function deleteCustomer(userId) {
    if (!userId) return;

    db.collection('users').doc(userId).collection('payments').get()
        .then(snapshot => {
            const batch = db.batch();
            snapshot.forEach(doc => batch.delete(doc.ref));
            return batch.commit();
        })
        .then(() => db.collection('users').doc(userId).delete())
        .then(() => {
            db.collection('logs').add({
                action: 'deleteCustomer',
                userEmail: auth.currentUser.email || 'غير معروف',
                userId,
                timestamp: new Date().toISOString()
            });
        });
}

function goToPayments(userId) {
    if (!userId) return;
    localStorage.setItem('currentUserId', userId);
    window.location.href = 'customer.html';
}

// ================== دوال الدفعات ==================
let editingPaymentId = null;
const paymentModal = document.getElementById('paymentModal');
const paymentModalTitle = document.getElementById('paymentModalTitle');

function loadPayments() {
    const userId = localStorage.getItem('currentUserId');
    if (!userId) return;
    const table = document.getElementById('paymentsTable');
    const countSpan = document.getElementById('paymentsCount');

    if (!table) return;

    db.collection('users')
        .doc(userId)
        .collection('payments')
        .onSnapshot(snapshot => {
            table.innerHTML = '';
            let count = 0;

            snapshot.forEach(doc => {
                const p = doc.data();
                count++;

                const row = `
    <tr id="payment-row-${doc.id}">
        <td data-label="تحديد">
            <input type="checkbox"
                   class="payment-checkbox"
                   value="${doc.id}"
                   onchange="updatePaymentSelectionBar()">
        </td>

        <td data-label="المبلغ">
            ${p.amount || ''}
        </td>

        <td data-label="الباقي">
            ${p.remaining || ''}
        </td>

        <td data-label="السرعة">
            ${p.speed || ''}
        </td>

        <td data-label="ملاحظة">
            ${p.note || ''}
        </td>

        <td data-label="تاريخ الدفعة">
    ${p.paymentDate ? formatDate(p.paymentDate) : ''}
</td>
    </tr>
    `;

                table.insertAdjacentHTML('beforeend', row);
            });

            // تحديث العداد
            if (countSpan) {
                countSpan.innerText = `عدد الدفعات: ${count}`;
            }
        });
}
function formatDate(dateString) {
    const d = new Date(dateString);
    if (isNaN(d)) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
}
function openPaymentModal(editId = null) {
    const userId = localStorage.getItem('currentUserId');
    if (!userId || !paymentModal) return;
    editingPaymentId = editId;

    if (editId) {
        paymentModalTitle.innerText = "تعديل دفعة";
        db.collection('users').doc(userId).collection('payments').doc(editId).get().then(doc => {
            const p = doc.data() || {};
            document.getElementById('paymentAmount').value = p.amount || '';
            document.getElementById('paymentRemaining').value = p.remaining || '';
            document.getElementById('paymentSpeed').value = p.speed || '';
            document.getElementById('paymentNote').value = p.note || '';
            document.getElementById('paymentDate').value = p.paymentDate || new Date().toISOString().split('T')[0];
        });
    } else {
        paymentModalTitle.innerText = "إضافة دفعة";
        document.getElementById('paymentAmount').value = '';
        document.getElementById('paymentRemaining').value = '';
        document.getElementById('paymentSpeed').value = '';
        document.getElementById('paymentNote').value = '';
        document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
    }

    paymentModal.style.display = 'block';
}

function closePaymentModal() {
    if (paymentModal) paymentModal.style.display = 'none';
}

const addPaymentBtn = document.getElementById('addPaymentBtn');
if (addPaymentBtn) addPaymentBtn.addEventListener('click', () => openPaymentModal());

const savePaymentBtn = document.getElementById('savePaymentBtn');
if (savePaymentBtn) savePaymentBtn.addEventListener('click', () => {
    const userId = localStorage.getItem('currentUserId');
    if (!userId) return;

    const amount = document.getElementById('paymentAmount').value.trim();
    const remaining = document.getElementById('paymentRemaining').value.trim();
    const speed = document.getElementById('paymentSpeed').value.trim();
    const note = document.getElementById('paymentNote').value.trim();
    const paymentDate = document.getElementById('paymentDate').value;

    if (!amount) return alert("المبلغ مطلوب");

    // حفظ النص كما هو بدون أي حسابات
    const data = { amount, remaining, speed, note, paymentDate };

    if (editingPaymentId) {
        db.collection('users').doc(userId).collection('payments').doc(editingPaymentId).update(data)
            .then(() => {
                db.collection('logs').add({
                    action: 'editPayment',
                    userEmail: auth.currentUser.email || 'غير معروف',
                    userId,
                    paymentId: editingPaymentId,
                    details: data,
                    timestamp: new Date().toISOString()
                });
            });
    } else {
        db.collection('users').doc(userId).collection('payments').add(data)
            .then(docRef => {
                db.collection('logs').add({
                    action: 'addPayment',
                    userEmail: auth.currentUser.email || 'غير معروف',
                    userId,
                    paymentId: docRef.id,
                    details: data,
                    timestamp: new Date().toISOString()
                });
            });
    }

    closePaymentModal();
});
function updatePaymentSelectionBar() {
    const selected = document.querySelectorAll('.payment-checkbox:checked');
    const count = selected.length;

    const bar = document.getElementById('paymentSelectionBar');
    const countSpan = document.getElementById('selectedPaymentsCount');
    const editBtn = document.querySelector('#paymentSelectionBar .btn-edit-alt');

    countSpan.textContent = count;

    if (count > 0) {
        bar.style.display = 'flex';
    } else {
        bar.style.display = 'none';
    }

    // تعطيل زر التعديل إذا لم يكن هناك عنصر واحد فقط
    if (count === 1) {
        editBtn.disabled = false;
        editBtn.style.opacity = "1";
        editBtn.style.cursor = "pointer";
    } else {
        editBtn.disabled = true;
        editBtn.style.opacity = "0.5";
        editBtn.style.cursor = "not-allowed";
    }
}
function clearPaymentsSelection() {
    document.getElementById('selectAllPayments').checked = false;

    const checkboxes = document.querySelectorAll('.payment-checkbox');
    checkboxes.forEach(cb => cb.checked = false);

    updatePaymentSelectionBar();
}
function editSelectedPayments() {
    const selected = document.querySelectorAll('.payment-checkbox:checked');

    if (selected.length === 1) {
        editPayment(selected[0].value);
        clearPaymentsSelection();
    }
}
async function printCustomerInvoice() {
    const userId = localStorage.getItem('currentUserId');
    if (!userId) return;

    const userDoc = await db.collection('users').doc(userId).get();
    const user = userDoc.data();

    const paymentsSnapshot = await db.collection('users')
        .doc(userId)
        .collection('payments')
        .get();

    // تعبئة البيانات
    document.getElementById("invNameAr").innerText = user.nameAr || "";
    document.getElementById("invNameEn").innerText = user.nameEn || "";
    document.getElementById("invDate").innerText = new Date().toLocaleDateString('ar-EG');

    const tbody = document.getElementById("invTableBody");
    tbody.innerHTML = "";

    paymentsSnapshot.forEach(docSnap => {
        const p = docSnap.data();

        tbody.innerHTML += `
    <tr>
        <td>${p.amount || ""}</td>
        <td>${p.remaining || ""}</td>
        <td>${p.speed || ""}</td>
        <td>${p.note || ""}</td>
        <td>${p.paymentDate ? formatDate(p.paymentDate) : ""}</td>
    </tr>
`;
    });

    const invoice = document.getElementById("invoiceTemplate");
    invoice.style.display = "block";

    const canvas = await html2canvas(invoice, { scale: 2, useCORS: true });

    const imgData = canvas.toDataURL("image/png");

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");

    const imgWidth = 190;
    const pageHeight = 280;
    const imgHeight = canvas.height * imgWidth / canvas.width;

    pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);

    pdf.save(`Invoice_${user.nameEn}.pdf`);

    invoice.style.display = "none";
}
function deleteSelectedPayments() {
    const userId = localStorage.getItem('currentUserId');
    if (!userId) return;

    const selected = document.querySelectorAll('.payment-checkbox:checked');
    if (selected.length === 0) return;

    if (!confirm(`هل تريد حذف ${selected.length} دفعة؟`)) return;

    selected.forEach(cb => {
        db.collection('users')
            .doc(userId)
            .collection('payments')
            .doc(cb.value)
            .delete()
            .then(() => {
                db.collection('logs').add({
                    action: 'deletePayment',
                    userEmail: auth.currentUser.email || 'غير معروف',
                    userId,
                    paymentId: cb.value,
                    timestamp: new Date().toISOString()
                });
            });
    });

    clearPaymentsSelection();
}
function toggleSelectAllPayments() {
    const mainCb = document.getElementById('selectAllPayments');
    const checkboxes = document.querySelectorAll('.payment-checkbox');

    checkboxes.forEach(cb => cb.checked = mainCb.checked);
    updatePaymentSelectionBar();
}
// ================== دالة فلتر الدفعات حسب التاريخ ==================
function filterPaymentsByDate() {
    const dateFilter = document.getElementById('paymentDateFilter').value;
    const table = document.getElementById('paymentsTable');
    const countSpan = document.getElementById('paymentsCount');

    if (!dateFilter) {
        // إذا لم يتم اختيار تاريخ، أعد تحميل كل الدفعات
        loadPayments();
        return;
    }

    // عرض الدفعات حسب التاريخ المحدد
    const rows = table.querySelectorAll('tr');
    let visibleCount = 0;

    rows.forEach(row => {
        const dateCell = row.querySelector('td:nth-child(6)'); // عمود التاريخ
        if (dateCell) {
            const rowDate = dateCell.innerText;
            if (rowDate.includes(dateFilter)) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        }
    });

    countSpan.innerText = `عدد الدفعات: ${visibleCount}`;
}
function editPayment(paymentId) { openPaymentModal(paymentId); }

function deletePayment(paymentId) {
    const userId = localStorage.getItem('currentUserId');
    if (!userId) return;
    if (!confirm("هل تريد حذف هذه الدفعة؟")) return;

    db.collection('users').doc(userId).collection('payments').doc(paymentId).delete()
        .catch(err => console.error("خطأ عند حذف الدفعة:", err));
}

// ================== تشغيل التحميل التلقائي ==================

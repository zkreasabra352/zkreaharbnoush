
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
function loadCustomerName() {
    const userId = localStorage.getItem('currentUserId');
    if (!userId) return;

    db.collection('users').doc(userId).get()
        .then(doc => {
            if (!doc.exists) return;

            const data = doc.data();
            const name = data.nameAr || data.nameEn || "غير معروف";

            const title = document.getElementById("customerNameTitle");
            if (title) {
                title.innerText = name;
            }
        })
        .catch(err => {
            console.error("خطأ في جلب اسم الزبون:", err);
        });
}
// فتح القائمة
const accountBtn = document.getElementById("accountBtn");
const dropdown = document.getElementById("accountDropdown");

if (accountBtn) {
    accountBtn.onclick = () => {

        dropdown.style.display =
            dropdown.style.display === "block" ? "none" : "block";

    };
}

window.onclick = function (e) {

    if (!e.target.closest(".account-menu")) {
        if (dropdown) dropdown.style.display = "none";
    }

}

// جلب بيانات المستخدم
firebase.auth().onAuthStateChanged(user => {

    if (user) {

        const email = user.email;
        const name = user.displayName || "المستخدم";

        const nameBox = document.getElementById("accountName");
        const emailBox = document.getElementById("accountEmail");

        if (nameBox) nameBox.innerText = name;
        if (emailBox) emailBox.innerText = email;

    }

});

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
                        showToast("تم تعديل بيانات الزبون");

                       db.collection('logs').add({
    action: 'editCustomer',
    userEmail: auth.currentUser.email || 'غير معروف',
    userId: editingCustomerId,
    customerName: nameAr, // 🔥
    details: { nameAr, nameEn, note },
    timestamp: new Date().toISOString()
});
                    });
            } else {
                db.collection('users').add({ nameAr, nameEn, note, createdAt })
                    .then(docRef => {
                        showToast("تم إضافة الزبون بنجاح");
                        db.collection('logs').add({
                          action: 'addCustomer',
                          userEmail: auth.currentUser.email || 'غير معروف',
                          userId: docRef.id,
                          customerName: nameAr, // 🔥 أضف هذا
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

// حذف الزبون مع جميع الدفعات والديون
function deleteCustomer(userId) {
    if (!userId) return;

    // جلب اسم الزبون أولاً
    db.collection('users').doc(userId).get().then(userDoc => {
        const userData = userDoc.data();
        const customerName = userData?.nameAr || userData?.nameEn || "غير معروف";

        const batch = db.batch();

        // 1️⃣ حذف جميع دفعات الزبون
        db.collection('users').doc(userId).collection('payments').get()
            .then(paymentsSnap => {
                paymentsSnap.forEach(doc => batch.delete(doc.ref));

                // 2️⃣ حذف كل الديون
                return db.collection('debts').where('customerId', '==', userId).get();
            })
            .then(debtsSnap => {
                debtsSnap.forEach(doc => batch.delete(doc.ref));

                // 3️⃣ حذف الزبون
                batch.delete(db.collection('users').doc(userId));

                // تنفيذ الحذف
                return batch.commit();
            })
            .then(() => {
                // 4️⃣ حفظ السجل
                db.collection('logs').add({
                    action: 'deleteCustomer',
                    userEmail: auth.currentUser?.email || 'غير معروف',
                    customerId: userId,
                    customerName: customerName,
                    timestamp: new Date().toISOString()
                });

                showToast("✅ تم حذف الزبون وجميع بياناته بنجاح");
            })
            .catch(err => {
                console.error("خطأ في الحذف:", err);
                showToast("خطأ في الحذف", "error");
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

    // تنظيف المصفوفة
    allPayments = [];

    db.collection('users')
        .doc(userId)
        .collection('payments')
        .orderBy('paymentDate', 'desc')
        .onSnapshot(snapshot => {
            table.innerHTML = '';
            let count = 0;

            snapshot.forEach(doc => {
                const p = { id: doc.id, ...doc.data() };
                allPayments.push(p); // 🔥 حفظ في المصفوفة العالمية
                count++;

                const row = `
                    <tr id="payment-row-${doc.id}">
                        <td data-label="تحديد">
                            <input type="checkbox"
                                   class="payment-checkbox"
                                   value="${doc.id}"
                                   onchange="updatePaymentSelectionBar()">
                        </td>
                        <td data-label="المبلغ">${p.amount || ''}</td>
                        <td data-label="الباقي">${p.remaining || ''}</td>
                        <td data-label="السرعة">${p.speed || ''}</td>
                        <td data-label="ملاحظة">${p.note || ''}</td>
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

    const data = { amount, remaining, speed, note, paymentDate };

    if (editingPaymentId) {
        // تعديل دفعة موجودة
        db.collection('users').doc(userId).collection('payments').doc(editingPaymentId).update(data)
            .then(() => {
                showToast("تم تعديل الدفعة");

                // جلب اسم الزبون للسجل
                return db.collection('users').doc(userId).get();
            })
            .then(userDoc => {
                const customerData = userDoc.data();
                const customerName = customerData.nameAr || customerData.nameEn || "غير معروف";
                
                return db.collection('logs').add({
                    action: 'editPayment',
                    userEmail: auth.currentUser?.email || 'غير معروف',
                    customerId: userId,
                    customerName: customerName,
                    paymentId: editingPaymentId,
                    details: data,
                    timestamp: new Date().toISOString()
                });
            })
            .then(() => {
                showToast("✅ تم تعديل الدفعة والسجل بنجاح");
            })
            .catch(err => {
                console.error("خطأ:", err);
                showToast("تم تعديل الدفعة لكن خطأ في السجل", "warning");
            });
    } else {
        // إضافة دفعة جديدة
        db.collection('users').doc(userId).collection('payments').add(data)
            .then((docRef) => {
                showToast("تم إضافة دفعة بنجاح");
                
                // جلب اسم الزبون
                return db.collection('users').doc(userId).get();
            })
            .then((userDoc) => {
                const customerData = userDoc.data();
                const customerName = customerData.nameAr || customerData.nameEn || "غير معروف";
                
                // حفظ السجل مع paymentId
                return db.collection('logs').add({
                    action: 'addPayment',
                    userEmail: auth.currentUser?.email || 'غير معروف',
                    customerId: userId,
                    customerName: customerName,
                    paymentId: editingPaymentId || 'جديد', // ✅ آمن
                    timestamp: new Date().toISOString(),
                    details: {
                        paymentDate,
                        speed,
                        amount,
                        remaining,
                        note
                    }
                });
            })
            .then(() => {
                showToast("✅ تم حفظ الدفعة والسجل بنجاح");
            })
            .catch(err => {
                console.error("خطأ في حفظ الدفعة أو السجل:", err);
                showToast("تم حفظ الدفعة لكن خطأ في السجل", "warning");
            });
    }

    closePaymentModal();
});
function goToDebts() {
    const userId = localStorage.getItem('currentUserId');
    if (userId) {
        window.location.href = `debts.html?customerId=${userId}`;
    } else {
        alert('خطأ: لم يتم العثور على بيانات الزبون');
    }
}
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
let allPayments = [];
function printCustomerInvoice() {
    const printWindow = window.open('', '_blank');
    const customerNameTitle = document.getElementById('customerNameTitle').textContent;
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>فاتورة دفعات ${customerNameTitle}</title>
            <style>
                @page { margin: 20mm; }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Cairo', 'Arial', sans-serif; 
                    font-size: 12px; 
                    line-height: 1.4;
                    color: #333;
                    direction: rtl;
                    text-align: right;
                }
                .header { 
                    text-align: center; 
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white; 
                    padding: 25px; 
                    margin-bottom: 25px;
                    border-radius: 10px 10px 0 0;
                }
                .header h1 { font-size: 24px; margin-bottom: 8px; }
                .header p { font-size: 15px; opacity: 0.95; }
                .info-box { 
                    background: #f0fdf4; 
                    padding: 20px; 
                    border-radius: 12px; 
                    margin-bottom: 25px;
                    border-right: 5px solid #10b981;
                    box-shadow: 0 4px 12px rgba(16,185,129,0.15);
                }
                .info-row { margin-bottom: 12px; font-size: 14px; }
                .info-label { font-weight: 700; color: #10b981; margin-left: 8px; }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 20px;
                    box-shadow: 0 8px 25px rgba(0,0,0,0.1);
                    border-radius: 12px;
                    overflow: hidden;
                }
                th, td { 
                    padding: 15px 10px; 
                    text-align: center; 
                    border: 1px solid #e2e8f0;
                }
                th { 
                    background: #10b981; 
                    color: white; 
                    font-weight: 700;
                    font-size: 12px;
                }
                tr:nth-child(even) { background: #f0fdf4; }
                tr:hover { background: #d1fae5 !important; transform: scale(1.01); transition: all 0.2s; }
                .footer { 
                    margin-top: 35px; 
                    padding-top: 25px; 
                    border-top: 3px dashed #a7f3d0;
                    text-align: center;
                    font-size: 13px;
                    color: #047857;
                    font-weight: 600;
                }
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .header { border-radius: 0; }
                    tr:hover { background: inherit !important; transform: none; }
                }
            </style>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap" rel="stylesheet">
        </head>
        <body>
            <div class="header">
                <h1>💰 سجل الدفعات</h1>
                <p>نظام إدارة الزبائن المتكامل</p>
            </div>
            
            <div class="info-box">
                <div class="info-row">
                    <span class="info-label">👤 الزبون:</span> 
                    <strong>${customerNameTitle}</strong>
                </div>
                <div class="info-row">
                    <span class="info-label">📅 تاريخ التقرير:</span> 
                    <strong>${new Date().toLocaleDateString('ar-SA', {year: 'numeric', month: 'long', day: 'numeric'})}</strong>
                </div>
                <div class="info-row">
                    <span class="info-label">📊 إجمالي الدفعات:</span> 
                    <strong>${allPayments.length}</strong>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>المبلغ</th>
                        <th>الباقي</th>
                        <th>السرعة</th>
                        <th>ملاحظة</th>
                        <th>تاريخ الدفعة</th>
                    </tr>
                </thead>
                <tbody>
                    ${allPayments.map(payment => `
                        <tr>
                            <td style="font-weight: 600; font-size: 13px;">${payment.amount || '-'}</td>
                            <td>${payment.remaining || '-'}</td>
                            <td>${payment.speed || '-'}</td>
                            <td style="max-width: 120px; word-break: break-word;">${payment.note || '-'}</td>
                            <td style="font-weight: 500;">${payment.paymentDate ? formatDate(payment.paymentDate) : '-'}</td>
                        </tr>
                    `).join('') || '<tr><td colspan="5" style="text-align:center; padding:30px; color:#666; font-size:16px;"><i class="fas fa-inbox"></i><br>لا توجد دفعات</td></tr>'}
                </tbody>
            </table>
            
            <div class="footer">
                <p>✅ تم إنشاء هذا التقرير بواسطة <strong>نظام إدارة الزبائن</strong></p>
                <p>شكراً لثقتكم بنا 💚</p>
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.onload = () => {
        setTimeout(() => printWindow.print(), 500);
    };
    
    showToast('✅ انقر "طباعة" في النافذة الجديدة', 'success');
}
function deleteSelectedPayments() {
    const userId = localStorage.getItem('currentUserId');
    if (!userId) return;

    const selected = document.querySelectorAll('.payment-checkbox:checked');
    if (selected.length === 0) return;

    if (!confirm(`هل تريد حذف ${selected.length} دفعة؟`)) return;

    // جلب اسم الزبون مرة واحدة
    db.collection('users').doc(userId).get().then(userDoc => {
        const customerData = userDoc.data();
        const customerName = customerData.nameAr || customerData.nameEn || "غير معروف";

        let deletedCount = 0;
        selected.forEach(cb => {
            db.collection('users')
                .doc(userId)
                .collection('payments')
                .doc(cb.value)
                .delete()
                .then(() => {
                    deletedCount++;
                    
                    // حفظ سجل لكل دفعة
                    db.collection('logs').add({
                        action: 'deletePayment',
                        userEmail: auth.currentUser?.email || 'غير معروف',
                        customerId: userId,
                        customerName: customerName,
                        paymentId: cb.value,
                        timestamp: new Date().toISOString()
                    });

                    if (deletedCount === selected.length) {
                        showToast(`تم حذف ${deletedCount} دفعة بنجاح`);
                        clearPaymentsSelection();
                    }
                })
                .catch(err => {
                    console.error("خطأ في حذف دفعة:", err);
                });
        });
    }).catch(err => {
        console.error("خطأ في جلب اسم الزبون:", err);
    });
}
function toggleSelectAllPayments() {
    const mainCb = document.getElementById('selectAllPayments');
    const checkboxes = document.querySelectorAll('.payment-checkbox');

    checkboxes.forEach(cb => cb.checked = mainCb.checked);
    updatePaymentSelectionBar();
}
// ================= إشعارات النظام =================

function showToast(message, type = "success") {

    const toast = document.getElementById("toast");

    toast.className = "toast-notification toast-show toast-" + type;

    let icon = "fa-check-circle";

    if (type === "error") icon = "fa-times-circle";
    if (type === "warning") icon = "fa-exclamation-triangle";

    toast.innerHTML = `<i class="fas ${icon}"></i> ${message}`;

    setTimeout(() => {
        toast.classList.remove("toast-show");
    }, 3000);
}
// ================== دالة فلتر الدفعات حسب التاريخ ==================
// ================== دالة فلتر الدفعات حسب التاريخ ==================
function filterPaymentsByDate() {
    const dateFilter = document.getElementById('paymentDateFilter').value;
    const table = document.getElementById('paymentsTable');
    const countSpan = document.getElementById('paymentsCount');

    if (!dateFilter) {
        // إذا لم يتم اختيار تاريخ، أعد تحميل كل الدفعات
        loadPayments();
        loadCustomerName();
        return;
    }

    // عرض الدفعات حسب التاريخ المحدد
    const rows = table.querySelectorAll('tr');
    let visibleCount = 0;

    rows.forEach(row => {
        const dateCell = row.querySelector('td:nth-child(6)'); // عمود التاريخ
        if (dateCell) {
            const rowDate = dateCell.innerText; // تنسيق الجدول: DD-MM-YYYY

            // تحويل تاريخ الفلتر (YYYY-MM-DD) إلى تنسيق قابل للمقارنة
            // أو تحويل تاريخ الجدول إلى YYYY-MM-DD للمقارنة
            // هنا سنقوم بتحويل تاريخ الجدول للمقارنة
            const parts = rowDate.split('-');
            if (parts.length === 3) {
                const formattedRowDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD

                if (formattedRowDate === dateFilter) {
                    row.style.display = '';
                    visibleCount++;
                } else {
                    row.style.display = 'none';
                }
            } else {
                // في حال لم يكن التاريخ صالحاً
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

    // جلب اسم الزبون أولاً
    db.collection('users').doc(userId).get().then(userDoc => {
        const customerData = userDoc.data();
        const customerName = customerData.nameAr || customerData.nameEn || "غير معروف";

        // حذف الدفعة
        db.collection('users').doc(userId).collection('payments').doc(paymentId).delete()
            .then(() => {
                showToast("تم حذف الدفعة بنجاح");

                // حفظ السجل
                db.collection('logs').add({
                    action: 'deletePayment',
                    userEmail: auth.currentUser?.email || 'غير معروف',
                    customerId: userId,
                    customerName: customerName,
                    paymentId: paymentId,
                    timestamp: new Date().toISOString()
                });
            })
            .catch(err => {
                console.error("خطأ في حذف الدفعة:", err);
                showToast("خطأ في الحذف", "error");
            });
    }).catch(err => {
        console.error("خطأ في جلب اسم الزبون:", err);
    });
}

// ================== تشغيل التحميل التلقائي ==================

// 🔥 هنا تضع الكود
window.addEventListener('online', () => {
  showToast('✅ متصل بالإنترنت', 'success');
});

window.addEventListener('offline', () => {
  showToast('⚠️ غير متصل - العمل offline', 'warning');
});
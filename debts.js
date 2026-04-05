
window.selectedDebts = new Set();
window.allDebts = [];

// إدارة التحديد المتعدد
function toggleDebtSelection(debtId) {
    if (window.selectedDebts.has(debtId)) {
        window.selectedDebts.delete(debtId);
    } else {
        window.selectedDebts.add(debtId);
    }
    updateSelectionCount();
    toggleSelectionBar(window.selectedDebts.size > 0);
    updateSelectAllCheckbox();
}
function updateSelectAllCheckbox() {
    const selectAll = document.getElementById('selectAllDebts');
    if (window.allDebts.length === 0) {
        selectAll.checked = false;
        return;
    }
    selectAll.checked = window.allDebts.every(debt => window.selectedDebts.has(debt.id));
}
function toggleSelectAllDebts() {
    const checkboxes = document.querySelectorAll('.debt-checkbox');
    const selectAll = document.getElementById('selectAllDebts');

    if (selectAll.checked) {
        window.allDebts.forEach(debt => window.selectedDebts.add(debt.id));
    } else {
        window.allDebts.forEach(debt => window.selectedDebts.delete(debt.id));
    }

    checkboxes.forEach(cb => {
        cb.checked = selectAll.checked;
    });

    updateSelectionCount();
    toggleSelectionBar(window.selectedDebts.size > 0);
}

function updateSelectionCount() {
    document.getElementById('selectedDebtsCount').textContent = window.selectedDebts.size;
}

function toggleSelectionBar(show) {
    const bar = document.getElementById('debtSelectionBar');
    bar.style.display = show ? 'flex' : 'none';
}

function clearDebtsSelection() {
    window.selectedDebts.clear();
    document.querySelectorAll('.debt-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('selectAllDebts').checked = false;
    updateSelectionCount();
    toggleSelectionBar(false);
}

function editSelectedDebts() {
    if (window.selectedDebts.size !== 1) {
        showToast('يرجى تحديد دين واحد فقط للتعديل', 'warning');
        return;
    }
    const debtId = Array.from(window.selectedDebts)[0];
    editDebt(debtId);
}

function deleteSelectedDebts() {
    if (window.selectedDebts.size === 0) {
        showToast('لم يتم تحديد أي ديون', 'warning');
        return;
    }

    if (!confirm(`هل أنت متأكد من حذف ${window.selectedDebts.size} دين؟`)) return;

    const batch = db.batch();
   window.selectedDebts.forEach(debtId => {
    const docRef = db.collection('debts').doc(debtId);
    batch.delete(docRef);

    // ✅ تسجيل حذف لكل دين
    addLog('حذف', { id: debtId });
});

    batch.commit()
        .then(() => {
            showToast('تم حذف جميع الديون المحددة بنجاح', 'success');
            clearDebtsSelection();
            loadDebts();
        })
        .catch(error => {
            console.error(error);
            showToast('حدث خطأ أثناء الحذف', 'error');
        });
}
function loadDebts() {
    if (!currentCustomerId) return;

    const tbody = document.getElementById('debtsTable');
    if (!tbody) return;

    tbody.innerHTML = '';
    window.allDebts = [];         // إعادة تعيين مصفوفة الديون
    window.selectedDebts.clear(); // الآن آمنة
    toggleSelectionBar(false);
    updateSelectionCount();

    db.collection('debts')
        .where('customerId', '==', currentCustomerId)
        .orderBy('date', 'desc')
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:10px;">لا توجد ديون</td></tr>`;
                updateDebtsCount();
                return;
            }

            snapshot.forEach(doc => {
                const debt = { id: doc.id, ...doc.data() };
                window.allDebts.push(debt);

                const tr = document.createElement('tr');
                const formattedDate = (debt.date && typeof debt.date.toDate === 'function')
                    ? debt.date.toDate().toLocaleDateString('ar-SA')
                    : '';

                tr.innerHTML = `
                <td><input type="checkbox" class="debt-checkbox" onclick="toggleDebtSelection('${debt.id}')"></td>
                <td>${debt.amount || ''}</td>
                <td>${debt.cableShare || ''}</td>
                <td>${debt.cutShare || ''}</td>
                <td>${debt.macShare || ''}</td>
                <td>${debt.noteShare || ''}</td>
                <td>${formattedDate}</td>
              `;
                tbody.appendChild(tr);
            });

            updateDebtsCount();
            updateSelectAllCheckbox();
        })
        .catch(error => {
            console.error('Error loading debts:', error);
            showToast('حدث خطأ أثناء تحميل الديون', 'error');
        });
}
function addLog(actionType, debtData) {
    if (!currentCustomerId) return;

    try {
        const logData = {
            customerId: currentCustomerId,
            customerName: document.getElementById('customerNameDebtTitle')?.textContent || "-",
            action: actionType,
            userEmail: auth.currentUser?.email || "غير معروف",
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),

            details: {
                "نوع العملية": actionType,
                "المبلغ": debtData.amount || '-',
                "نصي الكيبل": debtData.cableShare || '-',
                "نصي القطع": debtData.cutShare || '-',
                "نصي الماك": debtData.macShare || '-',
                "ملاحظة": debtData.noteShare || '-',
                "التاريخ": debtData.date && debtData.date.toDate
                    ? debtData.date.toDate().toLocaleDateString('ar-SA')
                    : '-'
            }
        };

        db.collection('logs').add(logData)
            .then(() => console.log('✅ تم تسجيل العملية'))
            .catch(err => console.error('❌ خطأ في Firestore:', err));

    } catch (error) {
        console.error('❌ خطأ داخل addLog:', error);
    }
}
// إدارة المودال
function openDebtModal(debtId = null) {
    document.getElementById('debtModal').style.display = 'block';
    document.getElementById('debtModalTitle').textContent = debtId ? 'تعديل الدين' : 'إضافة دين جديد';

    if (debtId) {
        db.collection('debts').doc(debtId).get().then(doc => {
            if (!doc.exists) return;
            const debt = doc.data();
            document.getElementById('debtAmount').value = debt.amount || '';
            document.getElementById('cableShare').value = debt.cableShare || '';
            document.getElementById('cutShare').value = debt.cutShare || '';
            document.getElementById('macShare').value = debt.macShare || '';
            document.getElementById('noteShare').value = debt.noteShare || '';
            document.getElementById('debtDate').value = debt.date ? debt.date.toDate().toISOString().split('T')[0] : '';
            window.currentEditingDebtId = debtId;
        });
    } else {
        document.querySelectorAll('#debtModal input').forEach(input => input.value = '');
        document.getElementById('debtDate').value = new Date().toISOString().split('T')[0];
        window.currentEditingDebtId = null;
    }
}

function closeDebtModal() {
    document.getElementById('debtModal').style.display = 'none';
}

// حفظ/تعديل الدين
window.saveDebt = function () {
    const dateValue = document.getElementById('debtDate').value;
    if (!dateValue) {
        showToast('يرجى اختيار تاريخ الدين', 'warning');
        return;
    }

    const debtData = {
        customerId: currentCustomerId,
        amount: document.getElementById('debtAmount').value || '',
        cableShare: document.getElementById('cableShare').value || '',
        cutShare: document.getElementById('cutShare').value || '',
        macShare: document.getElementById('macShare').value || '',
        noteShare: document.getElementById('noteShare').value || '',
        date: firebase.firestore.Timestamp.fromDate(new Date(dateValue)),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    const debtId = window.currentEditingDebtId;

    if (debtId) {
    db.collection('debts').doc(debtId).update(debtData)
        .then(() => {
            showToast('تم تعديل الدين بنجاح', 'success');
            closeDebtModal();
            loadDebts();
            updateDebtsCount();

            // سجل العملية
            addLog('تعديل', { id: debtId, ...debtData });
        })
        .catch(error => {
            console.error(error);
            showToast('حدث خطأ أثناء التعديل', 'error');
        });
} else {
        db.collection('debts').add(debtData)
    .then(docRef => {
        showToast('تم إضافة الدين بنجاح', 'success');
        closeDebtModal();
        loadDebts();
        updateDebtsCount();

        // سجل العملية
        addLog('إضافة', { id: docRef.id, ...debtData });
    })
    .catch(error => {
        console.error(error);
        showToast('حدث خطأ أثناء الإضافة', 'error');
    });
    }
};

// تعديل دين واحد
function editDebt(debtId) {
    openDebtModal(debtId);
}

// حذف دين واحد
function deleteDebt(debtId) {
    if (confirm('هل أنت متأكد من الحذف؟')) {
       // لحذف دين واحد
db.collection('debts').doc(debtId).delete()
    .then(() => {
        showToast('تم الحذف بنجاح', 'success');
        clearDebtsSelection();
        loadDebts();

        // سجل العملية
        addLog('حذف', { id: debtId });
    })
    .catch(error => {
        console.error(error);
        showToast('حدث خطأ أثناء الحذف', 'error');
    });
    }
}
window.showToast = function (message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast-notification toast-${type} toast-show`;

    setTimeout(() => {
        toast.classList.remove('toast-show');
    }, 3000);
}
// فلترة حسب التاريخ
function filterDebtsByDate() {
    const filterDate = document.getElementById('debtDateFilter').value;
    // يمكن تطبيق الفلترة هنا
    showToast('تم تطبيق الفلترة', 'success');
}

// الإحصائيات
function updateDebtsCount() {
    document.getElementById('debtsCount').textContent = `عدد الديون: ${allDebts.length}`;
}

function goToPayments() {
    const userId = localStorage.getItem('currentUserId') || currentCustomerId;
    if (userId) {
        localStorage.setItem('currentUserId', userId);
        window.location.href = `customer.html?customerId=${userId}`;
    }
}

// الطباعة
// 🔥 دالة طباعة الديون النظيفة (بدون إجمالي وبدون ريال)
function printDebtsReport() {
    const printWindow = window.open('', '_blank');
    const customerName = document.getElementById('customerNameDebtTitle').textContent;
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>سجل الديون ${customerName}</title>
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
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    color: white; 
                    padding: 25px; 
                    margin-bottom: 25px;
                    border-radius: 10px 10px 0 0;
                }
                .header h1 { font-size: 24px; margin-bottom: 8px; }
                .header p { font-size: 15px; opacity: 0.95; }
                .info-box { 
                    background: #fef2f2; 
                    padding: 20px; 
                    border-radius: 12px; 
                    margin-bottom: 25px;
                    border-right: 5px solid #ef4444;
                    box-shadow: 0 4px 12px rgba(239,68,68,0.15);
                }
                .info-row { margin-bottom: 12px; font-size: 14px; }
                .info-label { font-weight: 700; color: #ef4444; margin-left: 8px; }
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
                    border: 1px solid #fee2e2;
                }
                th { 
                    background: #ef4444; 
                    color: white; 
                    font-weight: 700;
                    font-size: 12px;
                }
                tr:nth-child(even) { background: #fef2f2; }
                tr:hover { background: #fecaca !important; transform: scale(1.01); transition: all 0.2s; }
                .footer { 
                    margin-top: 35px; 
                    padding-top: 25px; 
                    border-top: 3px dashed #fca5a5;
                    text-align: center;
                    font-size: 13px;
                    color: #991b1b;
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
                <h1>📊 سجل الديون</h1>
                <p>نظام إدارة الزبائن المتكامل</p>
            </div>
            
            <div class="info-box">
                <div class="info-row">
                    <span class="info-label">👤 الزبون:</span> 
                    <strong>${customerName}</strong>
                </div>
                <div class="info-row">
                    <span class="info-label">📅 تاريخ التقرير:</span> 
                    <strong>${new Date().toLocaleDateString('ar-SA', {year: 'numeric', month: 'long', day: 'numeric'})}</strong>
                </div>
                <div class="info-row">
                    <span class="info-label">📊 إجمالي الديون:</span> 
                    <strong>${allDebts.length}</strong>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>المبلغ</th>
                        <th>نصي الكيبل</th>
                        <th>نصي القطع</th>
                        <th>نصي الماك</th>
                        <th>ملاحظة</th>
                        <th>التاريخ</th>
                    </tr>
                </thead>
                <tbody>
                    ${allDebts.map(debt => `
                        <tr>
                            <td style="font-weight: 600; font-size: 13px;">${debt.amount || '-'}</td>
                            <td>${debt.cableShare || '-'}</td>
                            <td>${debt.cutShare || '-'}</td>
                            <td>${debt.macShare || '-'}</td>
                            <td style="max-width: 120px; word-break: break-word;">${debt.noteShare || '-'}</td>
                            <td style="font-weight: 500;">${debt.date ? debt.date.toDate().toLocaleDateString('ar-SA') : '-'}</td>
                        </tr>
                    `).join('') || '<tr><td colspan="6" style="text-align:center; padding:30px; color:#666; font-size:16px;"><i class="fas fa-inbox"></i><br>لا توجد ديون</td></tr>'}
                </tbody>
            </table>
            
            <div class="footer">
                <p>✅ تم إنشاء هذا التقرير بواسطة <strong>نظام إدارة الزبائن</strong></p>
                <p>للاستفسارات: اتصل بالإدارة</p>
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

// تهيئة الأحداث
document.addEventListener('DOMContentLoaded', function () {
    // زر إضافة دين
    document.getElementById('addDebtBtn').onclick = () => openDebtModal();

    // زر حفظ الدين
    document.getElementById('saveDebtBtn').onclick = saveDebt;

    // إغلاق المودال عند الضغط خارجها
    window.onclick = function (event) {
        const modal = document.getElementById('debtModal');
        if (event.target == modal) {
            closeDebtModal();
        }
    }
});

// تسجيل الخروج
function logout() {
    auth.signOut().then(() => {
        window.location.href = 'login.html';
    });
}
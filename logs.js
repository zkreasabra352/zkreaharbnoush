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

function loadLogs() {
    const table = document.getElementById('logsTable');
    if (!table) return;

    db.collection('logs')
        .orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
            table.innerHTML = '';

            snapshot.forEach(doc => {
                const log = doc.data();

                const row = `
            <tr data-action="${log.action || ''}">
                <td>${log.timestamp ? new Date(log.timestamp).toLocaleString('ar-EG') : ''}</td>
                <td>${log.action || ''}</td>
                <td>${log.userEmail || 'غير معروف'}</td>
                <td>${log.userId || log.paymentId || '-'}</td>
                <td>${formatLogDetails(log.details)}</td>
            </tr>
            `;
                table.insertAdjacentHTML('beforeend', row);
            });
        });
}
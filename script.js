// ===========================
// STATE & CONSTANTS
// ===========================

const APP_VERSION = 'rx-v1';
const DEFAULT_PROFILE = {
    name: 'Dr. Timothy James',
    spec: 'Family Medicine',
    license: '',
    ptr: '',
    s2: '',
    clinic: 'Santa Maria Medical Clinic',
    address: 'Santa Maria, Bulacan',
    phone: '09505598253',
    email: 'tjblazo21@gmail.com',
    hours: 'Mon–Fri 8AM–6PM, Sat 9AM–2PM'
};

let isLoggedIn = false;
let rxCounter = parseInt(localStorage.getItem('rxCounter') || '0');
let currentPreviewData = null;

// Password stored as a simple hash (SHA-256 via Web Crypto)
async function hashPassword(pw) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getStoredHash() {
    return localStorage.getItem('doctorHash') || await hashPassword('doctor123');
}

// ===========================
// INIT
// ===========================
window.addEventListener('load', () => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js', { scope: './' })
            .then(() => console.log('✅ Offline Rx ready'))
            .catch(err => console.warn('SW failed:', err));
    }

    // Offline detection
    window.addEventListener('online', () => document.getElementById('offlineBanner').classList.add('hidden'));
    window.addEventListener('offline', () => document.getElementById('offlineBanner').classList.remove('hidden'));
    if (!navigator.onLine) document.getElementById('offlineBanner').classList.remove('hidden');

    // Init first medication row on load
    initMedicationRow();

    // Live date in header
    updateLiveDate();
    setInterval(updateLiveDate, 60000);

    // Load profile
    loadProfile();
    updateHistoryCount();
});

function updateLiveDate() {
    const el = document.getElementById('liveDateDisplay');
    if (el) {
        el.textContent = new Date().toLocaleDateString('en-PH', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }
}

// ===========================
// AUTH
// ===========================
async function loginDoctor() {
    const pass = document.getElementById('doctorPass').value;
    if (!pass) return;

    const inputHash = await hashPassword(pass);
    const storedHash = await getStoredHash();

    if (inputHash === storedHash) {
        // Initialize default hash if not yet set
        if (!localStorage.getItem('doctorHash')) {
            localStorage.setItem('doctorHash', storedHash);
        }
        isLoggedIn = true;
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        document.getElementById('loginError').classList.add('hidden');
        document.getElementById('doctorPass').value = '';
    } else {
        document.getElementById('loginError').classList.remove('hidden');
        document.getElementById('doctorPass').value = '';
        document.getElementById('doctorPass').focus();
    }
}

function logout() {
    isLoggedIn = false;
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('doctorPass').value = '';
    document.getElementById('loginError').classList.add('hidden');
    // Close mobile sidebar if open
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
}

async function changePassword() {
    const current = document.getElementById('currentPass').value;
    const newPw = document.getElementById('newPass').value;
    const msgEl = document.getElementById('passMsg');

    if (!current || !newPw) {
        showPassMsg('Please fill in both fields.', 'error'); return;
    }
    if (newPw.length < 8) {
        showPassMsg('New password must be at least 8 characters.', 'error'); return;
    }

    const currentHash = await hashPassword(current);
    const storedHash = await getStoredHash();

    if (currentHash !== storedHash) {
        showPassMsg('Current password is incorrect.', 'error'); return;
    }

    const newHash = await hashPassword(newPw);
    localStorage.setItem('doctorHash', newHash);
    document.getElementById('currentPass').value = '';
    document.getElementById('newPass').value = '';
    showPassMsg('✅ Password updated successfully.', 'success');
}

function showPassMsg(text, type) {
    const el = document.getElementById('passMsg');
    el.textContent = text;
    el.className = 'pass-msg ' + type;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 4000);
}

// ===========================
// NAVIGATION
// ===========================
function showView(viewId, navId) {
    document.querySelectorAll('.view').forEach(v => {
        v.classList.remove('active');
        v.classList.remove('hidden');
    });
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    if (navId) document.getElementById(navId).classList.add('active');

    if (viewId === 'historyView') renderHistory();
    if (viewId === 'profileView') loadProfileIntoForm();

    // Close sidebar on mobile after navigation
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('open');
}

// ===========================
// MEDICATION ROWS
// ===========================
function initMedicationRow() {
    const container = document.getElementById('medications');
    container.innerHTML = '';
    addMedication();
}

function addMedication() {
    const meds = document.getElementById('medications');
    const row = document.createElement('div');
    row.className = 'medication-row';
    row.innerHTML = `
        <input type="text" class="med-name" placeholder="e.g. Amoxicillin 500mg" autocomplete="off">
        <input type="text" class="med-dosage" placeholder="e.g. 1 capsule">
        <input type="text" class="med-freq" placeholder="e.g. 3x daily">
        <input type="text" class="med-duration" placeholder="e.g. 7 days">
        <button type="button" class="remove-med" onclick="removeMed(this)" title="Remove">✕</button>
    `;
    meds.appendChild(row);
    // Focus the med name of the new row
    row.querySelector('.med-name').focus();
}

function removeMed(button) {
    const rows = document.querySelectorAll('.medication-row');
    if (rows.length > 1) {
        button.closest('.medication-row').remove();
    } else {
        showToast('Must have at least one medication');
    }
}

function collectMedications() {
    const meds = [];
    document.querySelectorAll('.medication-row').forEach(row => {
        const name = row.querySelector('.med-name').value.trim();
        const dosage = row.querySelector('.med-dosage').value.trim();
        const freq = row.querySelector('.med-freq').value.trim();
        const duration = row.querySelector('.med-duration').value.trim();
        if (name) {
            meds.push({
                name,
                dosage: dosage || 'As directed',
                freq: freq || 'As directed',
                duration: duration || 'As directed'
            });
        }
    });
    return meds;
}

// ===========================
// GENERATE RX
// ===========================
function generatePrescription() {
    const patientName = document.getElementById('patientName').value.trim();
    const patientAge = document.getElementById('patientAge').value.trim();
    const patientDOB = document.getElementById('patientDOB').value;
    const patientSex = document.getElementById('patientSex').value;
    const patientAddress = document.getElementById('patientAddress').value.trim();
    const symptoms = document.getElementById('symptoms').value.trim();
    const diagnosis = document.getElementById('diagnosis').value.trim();
    const instructions = document.getElementById('instructions').value.trim();
    const refills = document.getElementById('refills').value;
    const followUp = document.getElementById('followUp').value;
    const medications = collectMedications();

    if (!patientName) { showToast('⚠ Patient name is required'); document.getElementById('patientName').focus(); return; }
    if (medications.length === 0) { showToast('⚠ Add at least one medication'); return; }

    const profile = getProfile();
    rxCounter++;
    localStorage.setItem('rxCounter', rxCounter);

    const today = new Date();
    const rxId = `RX-${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}-${String(rxCounter).padStart(4,'0')}`;
    const dateStr = today.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    const dobStr = patientDOB ? new Date(patientDOB + 'T00:00:00').toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

    currentPreviewData = {
        rxId, dateStr, patientName, patientAge, patientDOB: dobStr, patientSex,
        patientAddress, symptoms, diagnosis, medications, instructions, refills,
        followUp: followUp ? new Date(followUp + 'T00:00:00').toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
        profile
    };

    const html = buildPrescriptionHTML(currentPreviewData);
    document.getElementById('previewContent').innerHTML = html;
    document.getElementById('previewRxId').textContent = rxId;
    document.getElementById('preview').classList.remove('hidden');
    document.getElementById('preview').scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Save to history
    saveToHistory(currentPreviewData);
    updateHistoryCount();
}

function buildPrescriptionHTML(data) {
    const { rxId, dateStr, patientName, patientAge, patientDOB, patientSex, patientAddress,
        symptoms, diagnosis, medications, instructions, refills, followUp, profile } = data;

    const medsHTML = medications.map((med, i) => `
        <div class="rx-med-item">
            <div>
                <div class="rx-med-name">${i + 1}. ${esc(med.name)}</div>
            </div>
            <div class="rx-med-detail">
                <div class="rx-med-detail-label">Dosage</div>
                ${esc(med.dosage)}
            </div>
            <div class="rx-med-detail">
                <div class="rx-med-detail-label">Frequency</div>
                ${esc(med.freq)}
            </div>
            <div class="rx-med-detail">
                <div class="rx-med-detail-label">Duration</div>
                ${esc(med.duration)}
            </div>
        </div>
    `).join('');

    const refillText = refills === 'PRN' ? 'PRN (as needed)' : (refills === '0' ? 'No refills' : `${refills} refill${refills > 1 ? 's' : ''}`);

    return `
    <div class="printable-rx" id="printArea">
        <div class="rx-letterhead">
            <div>
                <div class="rx-doc-name">${esc(profile.name)}</div>
                <div class="rx-doc-meta">
                    ${esc(profile.spec)}<br>
                    ${profile.license ? `PRC Lic. No. ${esc(profile.license)}` : ''}
                    ${profile.ptr ? ` &nbsp;|&nbsp; PTR No. ${esc(profile.ptr)}` : ''}
                    ${profile.s2 ? `<br>S2 License: ${esc(profile.s2)}` : ''}
                </div>
            </div>
            <div class="rx-clinic-info">
                ${profile.clinic ? `<strong>${esc(profile.clinic)}</strong><br>` : ''}
                ${esc(profile.address)}<br>
                ${esc(profile.phone)}
                ${profile.email ? `<br>${esc(profile.email)}` : ''}
                ${profile.hours ? `<br>${esc(profile.hours)}` : ''}
            </div>
        </div>

        <div class="rx-id-bar">
            <span>Prescription</span>
            <span class="rx-id-code">${rxId}</span>
            <span>${dateStr}</span>
        </div>

        <div class="rx-patient-block">
            <div class="rx-patient-field">
                <div class="field-label">Patient Name</div>
                <div class="field-value">${esc(patientName)}</div>
            </div>
            <div class="rx-patient-field">
                <div class="field-label">Age / Sex</div>
                <div class="field-value">${patientAge ? patientAge + ' y/o' : '—'}${patientSex ? ' / ' + patientSex : ''}</div>
            </div>
            <div class="rx-patient-field">
                <div class="field-label">Date of Birth</div>
                <div class="field-value">${patientDOB || '—'}</div>
            </div>
            ${patientAddress ? `<div class="rx-patient-field" style="grid-column:1/-1">
                <div class="field-label">Address</div>
                <div class="field-value">${esc(patientAddress)}</div>
            </div>` : ''}
        </div>

        ${(symptoms || diagnosis) ? `
        <div class="rx-clinical">
            ${symptoms ? `<div class="rx-clinical-block">
                <div class="rx-clinical-label">Chief Complaint / Symptoms</div>
                ${esc(symptoms)}
            </div>` : ''}
            ${diagnosis ? `<div class="rx-clinical-block">
                <div class="rx-clinical-label">Diagnosis</div>
                <strong>${esc(diagnosis)}</strong>
            </div>` : ''}
        </div>` : ''}

        <div class="rx-section-title">Medications</div>
        ${medsHTML}

        ${instructions ? `
        <div class="rx-section-title">Special Instructions</div>
        <div class="rx-instructions-block">${esc(instructions)}</div>
        ` : ''}

        <div class="rx-footer">
            <div class="rx-refill-box">
                <strong>Refills:</strong> ${refillText}
                ${followUp ? `<br><strong>Follow-up:</strong> ${followUp}` : ''}
            </div>
            <div class="rx-signature">
                <div class="rx-sig-line">
                    ${esc(profile.name)}, MD<br>
                    <span style="font-size:0.75rem;color:#64748b;font-weight:400;">${esc(profile.spec)}</span>
                </div>
            </div>
        </div>

        <div class="rx-warning">
            ⚠ This prescription is valid for 30 days from date of issue.
            Professional use only — verify before dispensing.
        </div>
    </div>`;
}

// ===========================
// PRINT & EMAIL
// ===========================
function printPrescription() {
    const content = document.getElementById('previewContent').innerHTML;
    const profile = getProfile();
    const win = window.open('', '_blank', 'width=860,height=700');
    win.document.write(`<!DOCTYPE html><html><head>
        <title>${currentPreviewData?.rxId || 'Prescription'} — ${profile.name}</title>
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:opsz,wght@9..40,400;9..40,600&display=swap" rel="stylesheet">
        <style>
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',Arial,sans-serif; padding:2cm 2.5cm; color:#1e293b; font-size:13px; line-height:1.6; }
        .printable-rx { max-width:100%; }
        .rx-letterhead { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:10px; border-bottom:2.5px solid #1a56db; margin-bottom:12px; }
        .rx-doc-name { font-family:'DM Serif Display',serif; font-size:22px; color:#1a56db; }
        .rx-doc-meta { font-size:11px; color:#64748b; margin-top:4px; line-height:1.7; }
        .rx-clinic-info { text-align:right; font-size:11px; color:#64748b; line-height:1.7; }
        .rx-id-bar { display:flex; justify-content:space-between; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 12px; margin-bottom:12px; font-size:12px; }
        .rx-id-code { font-family:monospace; font-weight:700; color:#1a56db; }
        .rx-patient-block { background:#f0f4f8; border-radius:6px; padding:10px 14px; margin-bottom:12px; display:grid; grid-template-columns:repeat(3,1fr); gap:6px 16px; }
        .rx-patient-field { font-size:12px; }
        .field-label { font-size:10px; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; }
        .field-value { font-weight:700; color:#1e293b; margin-top:2px; }
        .rx-clinical { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px; }
        .rx-clinical-block { background:#fafbfc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 12px; font-size:12px; }
        .rx-clinical-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#64748b; margin-bottom:3px; }
        .rx-section-title { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#64748b; margin:14px 0 8px; }
        .rx-med-item { display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:8px; padding:8px 12px; border-left:3px solid #0d9488; background:#f0faf9; border-radius:0 6px 6px 0; margin-bottom:6px; align-items:center; }
        .rx-med-name { font-weight:700; font-size:13px; }
        .rx-med-detail { font-size:11px; }
        .rx-med-detail-label { font-size:9px; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; }
        .rx-instructions-block { background:#fef3c7; border-left:3px solid #d97706; border-radius:0 6px 6px 0; padding:8px 12px; font-size:12px; margin-bottom:10px; }
        .rx-footer { margin-top:20px; display:flex; justify-content:space-between; align-items:flex-end; padding-top:10px; border-top:1px solid #e2e8f0; }
        .rx-refill-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:6px 12px; font-size:12px; }
        .rx-signature { text-align:center; min-width:200px; }
        .rx-sig-line { border-top:1.5px solid #1e293b; margin-top:35px; padding-top:6px; font-size:12px; font-weight:700; }
        .rx-warning { text-align:center; font-size:10px; color:#94a3b8; margin-top:12px; padding-top:8px; border-top:1px dashed #e2e8f0; }
        @media print { body { padding:1.5cm 2cm; } }
        </style>
    </head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
}

function emailPrescription() {
    if (!currentPreviewData) return;
    const { rxId, patientName, dateStr, medications, profile } = currentPreviewData;
    const medList = medications.map(m => `• ${m.name} — ${m.dosage}, ${m.freq} for ${m.duration}`).join('\n');
    const body = encodeURIComponent(
        `PRESCRIPTION ${rxId}\nDate: ${dateStr}\n\nDoctor: ${profile.name}, ${profile.spec}\nClinic: ${profile.clinic}, ${profile.address}\nPhone: ${profile.phone}\n\nPatient: ${patientName}\n\nMEDICATIONS:\n${medList}\n\n---\nGenerated via Digital Rx System`
    );
    const subject = encodeURIComponent(`Prescription ${rxId} — ${patientName}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
}

// ===========================
// CLEAR FORM
// ===========================
function clearForm() {
    if (!confirm('Clear all prescription fields?')) return;
    ['patientName','patientAge','patientDOB','patientAddress','symptoms','diagnosis','instructions','followUp']
        .forEach(id => document.getElementById(id).value = '');
    document.getElementById('patientSex').value = '';
    document.getElementById('refills').value = '0';
    initMedicationRow();
    document.getElementById('preview').classList.add('hidden');
    document.getElementById('patientName').focus();
}

// ===========================
// HISTORY
// ===========================
function saveToHistory(data) {
    const history = getHistory();
    history.unshift({
        rxId: data.rxId,
        date: data.dateStr,
        patientName: data.patientName,
        patientAge: data.patientAge,
        patientSex: data.patientSex,
        diagnosis: data.diagnosis,
        medications: data.medications,
        html: buildPrescriptionHTML(data)
    });
    // Keep max 100 entries
    localStorage.setItem('rxHistory', JSON.stringify(history.slice(0, 100)));
}

function getHistory() {
    try { return JSON.parse(localStorage.getItem('rxHistory') || '[]'); }
    catch { return []; }
}

function updateHistoryCount() {
    const count = getHistory().length;
    const badge = document.getElementById('historyCount');
    badge.textContent = count;
    badge.style.display = count > 0 ? '' : 'none';
}

function renderHistory() {
    const list = document.getElementById('historyList');
    const history = getHistory();

    if (history.length === 0) {
        list.innerHTML = `<div class="history-empty">
            <span class="empty-icon">📋</span>
            <p>No prescriptions yet. Generate one to see it here.</p>
        </div>`;
        return;
    }

    list.innerHTML = history.map((item, idx) => `
        <div class="history-card">
            <div class="history-info">
                <div class="history-patient">${esc(item.patientName)}</div>
                <div class="history-meta">
                    ${item.patientAge ? item.patientAge + ' y/o' : ''}
                    ${item.patientSex ? '• ' + item.patientSex : ''}
                    ${item.diagnosis ? '• ' + esc(item.diagnosis) : ''}
                    <br>${item.medications.length} medication(s) — ${item.date}
                </div>
            </div>
            <span class="history-rx-id">${esc(item.rxId)}</span>
            <div class="history-actions">
                <button class="btn-sm" onclick="reprintFromHistory(${idx})">🖨 Print</button>
                <button class="btn-ghost danger" onclick="deleteHistoryItem(${idx})">✕</button>
            </div>
        </div>
    `).join('');
}

function reprintFromHistory(idx) {
    const history = getHistory();
    const item = history[idx];
    if (!item) return;
    const win = window.open('', '_blank', 'width=860,height=700');
    win.document.write(`<!DOCTYPE html><html><head>
        <title>${item.rxId}</title>
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:opsz,wght@9..40,400;9..40,600&display=swap" rel="stylesheet">
        <style>
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',Arial,sans-serif; padding:2cm 2.5cm; color:#1e293b; font-size:13px; line-height:1.6; }
        .printable-rx { max-width:100%; }
        .rx-letterhead { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:10px; border-bottom:2.5px solid #1a56db; margin-bottom:12px; }
        .rx-doc-name { font-family:'DM Serif Display',serif; font-size:22px; color:#1a56db; }
        .rx-doc-meta { font-size:11px; color:#64748b; margin-top:4px; line-height:1.7; }
        .rx-clinic-info { text-align:right; font-size:11px; color:#64748b; line-height:1.7; }
        .rx-id-bar { display:flex; justify-content:space-between; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 12px; margin-bottom:12px; font-size:12px; }
        .rx-id-code { font-family:monospace; font-weight:700; color:#1a56db; }
        .rx-patient-block { background:#f0f4f8; border-radius:6px; padding:10px 14px; margin-bottom:12px; display:grid; grid-template-columns:repeat(3,1fr); gap:6px 16px; }
        .rx-patient-field { font-size:12px; }
        .field-label { font-size:10px; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; }
        .field-value { font-weight:700; color:#1e293b; margin-top:2px; }
        .rx-clinical { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px; }
        .rx-clinical-block { background:#fafbfc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 12px; font-size:12px; }
        .rx-clinical-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#64748b; margin-bottom:3px; }
        .rx-section-title { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#64748b; margin:14px 0 8px; }
        .rx-med-item { display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:8px; padding:8px 12px; border-left:3px solid #0d9488; background:#f0faf9; border-radius:0 6px 6px 0; margin-bottom:6px; align-items:center; }
        .rx-med-name { font-weight:700; font-size:13px; }
        .rx-med-detail { font-size:11px; }
        .rx-med-detail-label { font-size:9px; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; }
        .rx-instructions-block { background:#fef3c7; border-left:3px solid #d97706; border-radius:0 6px 6px 0; padding:8px 12px; font-size:12px; margin-bottom:10px; }
        .rx-footer { margin-top:20px; display:flex; justify-content:space-between; align-items:flex-end; padding-top:10px; border-top:1px solid #e2e8f0; }
        .rx-refill-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:6px 12px; font-size:12px; }
        .rx-signature { text-align:center; min-width:200px; }
        .rx-sig-line { border-top:1.5px solid #1e293b; margin-top:35px; padding-top:6px; font-size:12px; font-weight:700; }
        .rx-warning { text-align:center; font-size:10px; color:#94a3b8; margin-top:12px; padding-top:8px; border-top:1px dashed #e2e8f0; }
        @media print { body { padding:1.5cm 2cm; } }
        </style>
    </head><body>${item.html}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
}

function deleteHistoryItem(idx) {
    const history = getHistory();
    history.splice(idx, 1);
    localStorage.setItem('rxHistory', JSON.stringify(history));
    updateHistoryCount();
    renderHistory();
}

function clearHistory() {
    if (!confirm('Delete all prescription history from this device?')) return;
    localStorage.removeItem('rxHistory');
    updateHistoryCount();
    renderHistory();
    showToast('History cleared');
}

// ===========================
// PROFILE / CLINIC
// ===========================
function getProfile() {
    try {
        const saved = JSON.parse(localStorage.getItem('doctorProfile') || '{}');
        return { ...DEFAULT_PROFILE, ...saved };
    } catch { return { ...DEFAULT_PROFILE }; }
}

function loadProfile() {
    const p = getProfile();
    // Update sidebar
    document.getElementById('sidebarName').textContent = p.name || DEFAULT_PROFILE.name;
    document.getElementById('sidebarSpec').textContent = p.spec || DEFAULT_PROFILE.spec;
    const initials = (p.name || 'TJ').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('sidebarAvatar').textContent = initials;
}

function loadProfileIntoForm() {
    const p = getProfile();
    document.getElementById('profName').value = p.name || '';
    document.getElementById('profSpec').value = p.spec || '';
    document.getElementById('profLicense').value = p.license || '';
    document.getElementById('profPTR').value = p.ptr || '';
    document.getElementById('profS2').value = p.s2 || '';
    document.getElementById('profClinic').value = p.clinic || '';
    document.getElementById('profAddress').value = p.address || '';
    document.getElementById('profPhone').value = p.phone || '';
    document.getElementById('profEmail').value = p.email || '';
    document.getElementById('profHours').value = p.hours || '';
}

function saveProfile() {
    const profile = {
        name: document.getElementById('profName').value.trim() || DEFAULT_PROFILE.name,
        spec: document.getElementById('profSpec').value.trim() || DEFAULT_PROFILE.spec,
        license: document.getElementById('profLicense').value.trim(),
        ptr: document.getElementById('profPTR').value.trim(),
        s2: document.getElementById('profS2').value.trim(),
        clinic: document.getElementById('profClinic').value.trim(),
        address: document.getElementById('profAddress').value.trim(),
        phone: document.getElementById('profPhone').value.trim(),
        email: document.getElementById('profEmail').value.trim(),
        hours: document.getElementById('profHours').value.trim()
    };
    localStorage.setItem('doctorProfile', JSON.stringify(profile));
    loadProfile();
    showToast('✅ Clinic info saved');
}

// ===========================
// UTILITIES
// ===========================
function esc(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

let toastTimer;
function showToast(msg) {
    let toast = document.getElementById('globalToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'globalToast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// Keyboard shortcut: Enter on login
document.addEventListener('DOMContentLoaded', () => {
    const passInput = document.getElementById('doctorPass');
    if (passInput) {
        passInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') loginDoctor();
        });
    }
});

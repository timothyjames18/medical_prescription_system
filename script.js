let medCount = 1;
let isLoggedIn = false;

const DOCTOR_PASSWORD = 'doctor123'; // CHANGE THIS IN PRODUCTION!
window.addEventListener('load', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js', {scope: './'})
            .then(reg => console.log('✅ Offline Rx ready'))
            .catch(err => console.log('SW failed:', err));
    }

    // Show offline status
    const statusDiv = document.createElement('div');
    statusDiv.id = 'offline-status';
    statusDiv.className = 'offline-status';
    document.body.appendChild(statusDiv);
    
    window.addEventListener('online', () => updateStatus(false));
    window.addEventListener('offline', () => updateStatus(true));
});

function updateStatus(isOffline) {
    const status = document.getElementById('offline-status');
    status.textContent = isOffline ? '📱 OFFLINE - Rx Works!' : '🟢 ONLINE';
    status.className = `offline-status ${isOffline ? 'offline' : 'online'}`;
}
// Smooth scroll navigation
function scrollTo(id) {
    document.querySelector(id).scrollIntoView({ behavior: 'smooth' });
    document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
    event?.target?.classList.add('active');
}

// Doctor login
function loginDoctor() {
    const pass = document.getElementById('doctorPass').value;
    if (pass === DOCTOR_PASSWORD) {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('prescriptionForm').style.display = 'block';
        isLoggedIn = true;
        alert('✅ Access granted!');
    } else {
        alert('❌ Incorrect password');
        document.getElementById('doctorPass').value = '';
        document.getElementById('doctorPass').focus();
    }
}

// Add medication row
function addMedication() {
    const meds = document.getElementById('medications');
    const row = document.createElement('div');
    row.className = 'medication-row';
    row.dataset.index = document.querySelectorAll('.medication-row').length;
    row.innerHTML = `
        <input type="text" class="med-name" placeholder="Medication Name">
        <input type="text" class="med-dosage" placeholder="Dosage">
        <input type="text" class="med-freq" placeholder="Frequency">
        <input type="text" class="med-duration" placeholder="Duration">
        <button type="button" class="remove-med" onclick="removeMed(this)">Remove</button>
    `;
    meds.appendChild(row);
}

// Remove medication row
function removeMed(button) {
    if (document.querySelectorAll('.medication-row').length > 1) {
        button.closest('.medication-row').remove();
    } else {
        alert('Must have at least 1 medication');
    }
}

// Generate prescription
function generatePrescription() {
    if (!isLoggedIn) {
        alert('Please login first (doctor123)');
        return;
    }

    const patientName = document.getElementById('patientName').value.trim();
    const patientAge = document.getElementById('patientAge').value.trim();
    const symptoms = document.getElementById('symptoms').value.trim();
    const diagnosis = document.getElementById('diagnosis').value.trim();
    const instructions = document.getElementById('instructions').value.trim();

    // Collect ALL medications (text inputs)
    const medRows = document.querySelectorAll('.medication-row');
    let medications = [];
    
    medRows.forEach(row => {
        const name = row.querySelector('.med-name').value.trim();
        const dosage = row.querySelector('.med-dosage').value.trim();
        const freq = row.querySelector('.med-freq').value.trim();
        const duration = row.querySelector('.med-duration').value.trim();
        
        if (name) { // Only require name
            medications.push({ 
                name, 
                dosage: dosage || 'As directed', 
                freq: freq || 'As directed',
                duration: duration || 'As directed'
            });
        }
    });

    if (!patientName) {
        alert('Please enter patient name');
        return;
    }
    
    if (medications.length === 0) {
        alert('Please add at least one medication');
        return;
    }

    // Generate professional preview
    const date = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    const previewHTML = `
        <div class="printable-prescription">
            <div class="rx-header">
                <h2 style="color: #007BFF; margin-bottom: 1rem;">🏥 PRESCRIPTION</h2>
                <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <div style="font-size: 1.3rem; font-weight: bold; margin-bottom: 0.5rem;">
                        ${patientName.toUpperCase()}
                    </div>
                    <div style="font-size: 1rem; color: #666;">
                        Dr. Timothy James | Santa Maria Bulacan | 09505598253
                    </div>
                    <div style="margin-top: 0.5rem; font-size: 0.95rem;">
                        Date: ${date} | Age/DOB: ${patientAge || 'N/A'}
                    </div>
                </div>
            </div>

            ${symptoms ? `<p><strong>SYMPTOMS:</strong> ${symptoms}</p>` : ''}
            ${diagnosis ? `<p><strong>DIAGNOSIS:</strong> ${diagnosis}</p>` : ''}

            <h3 style="color: #007BFF; margin: 2rem 0 1rem 0;">📋 MEDICATIONS</h3>
            <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 10px;">
                ${medications.map((med, index) => `
                    <div style="margin-bottom: 1.5rem; padding: 1rem; background: white; border-left: 4px solid #28a745; border-radius: 8px;">
                        <div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 0.5rem;">
                            ${index + 1}. ${med.name}
                        </div>
                        <div style="color: #666; line-height: 1.6;">
                            <strong>Dosage:</strong> ${med.dosage}<br>
                            <strong>Frequency:</strong> ${med.freq}<br>
                            <strong>Duration:</strong> ${med.duration}
                        </div>
                    </div>
                `).join('')}
            </div>

            ${instructions ? `
                <div style="margin-top: 2rem; padding: 1.5rem; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
                    <strong style="color: #856404;">📝 SPECIAL INSTRUCTIONS:</strong>
                    <div style="margin-top: 0.5rem;">${instructions}</div>
                </div>
            ` : ''}

            <div style="margin-top: 3rem; text-align: center; padding: 1.5rem; background: #f8f9fa; border-radius: 8px;">
                <p style="font-size: 0.9rem; color: #666; margin-bottom: 1rem;">
                    ⚠️ For professional use only. Verify before dispensing.
                </p>
                <div style="text-align: right; max-width: 300px; margin: 0 auto;">
                    <div style="font-weight: bold; font-size: 1.2rem; margin-bottom: 1rem;">
                        Dr. Timothy James, MD
                    </div>
                    <div style="border-top: 1px solid #333; padding-top: 0.5rem;">
                        Signature: ____________________
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('previewContent').innerHTML = previewHTML;
    document.getElementById('preview').style.display = 'block';
    document.getElementById('preview').scrollIntoView({ behavior: 'smooth' });
}

// Print function (add if missing)


// Clear form
function clearForm() {
    document.getElementById('prescriptionForm').querySelectorAll('input, textarea, select').forEach(el => {
        el.value = '';
    });

    // Reset medications to one row
    const medsContainer = document.getElementById('medications');
    medsContainer.innerHTML = `
        <div class="medication-row" data-index="0">
            <select class="med-select">
                <option>Amoxicillin 500mg</option>
                <option>Ibuprofen 400mg</option>
                <option>Lisinopril 10mg</option>
                <option>Metformin 500mg</option>
                <option>Custom...</option>
            </select>
            <input type="text" class="med-dosage" placeholder="Dosage (e.g., 1 tablet)">
            <input type="text" class="med-freq" placeholder="Frequency (e.g., twice daily)">
            <input type="text" class="med-duration" placeholder="Duration (e.g., 7 days)">
            <button type="button" class="remove-med" onclick="removeMed(this)">Remove</button>
        </div>
    `;

    medCount = 1;
    document.getElementById('preview').style.display = 'none';
}

// Print prescription
function printPrescription() {
    const previewContent = document.getElementById('previewContent').innerHTML;
    const printWindow = window.open('', '_blank', 'width=800,height=600');

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Prescription - Dr. Timothy James</title>
            <style>
                body { 
                    font-family: 'Arial', sans-serif; 
                    margin: 40px; 
                    max-width: 800px;
                    line-height: 1.6;
                }
                .printable-prescription {
                    border: 2px solid #007BFF;
                    padding: 30px;
                    border-radius: 10px;
                }
                .prescription-header h2 {
                    color: #007BFF;
                    text-align: center;
                    margin-bottom: 20px;
                }
                .practice-info {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                }
                .medication-item {
                    background: #f8f9fa;
                    padding: 15px;
                    margin: 10px 0;
                    border-left: 5px solid #28a745;
                    border-radius: 5px;
                }
                .med-details {
                    font-size: 0.95rem;
                    color: #666;
                    margin-top: 5px;
                }
                .med-details span {
                    margin-right: 20px;
                }
                .special-instructions {
                    background: #fff3cd;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                }
                .signature {
                    margin-top: 40px;
                    text-align: right;
                }
                @media print {
                    body { margin: 0; }
                    .printable-prescription { box-shadow: none; border: 1px solid #000; }
                }
            </style>
        </head>
        <body>${previewContent}</body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
}

// Initialize navigation
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('nav a[href^="#"]').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            scrollTo(targetId);
        });
    });

    // Form submission demo
    document.querySelector('.contact-form')?.addEventListener('submit', function (e) {
        e.preventDefault();
        alert('Thank you! Message sent. We\'ll respond within 24 hours.');
    });
});
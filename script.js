let medCount = 1;
let isLoggedIn = false;
const DOCTOR_PASSWORD = 'doctor123'; // CHANGE THIS IN PRODUCTION!

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
    row.dataset.index = medCount;
    row.innerHTML = `
        <select class="med-select">
            <option>Amoxicillin 500mg</option>
            <option>Ibuprofen 400mg</option>
            <option>Lisinopril 10mg</option>
            <option>Metformin 500mg</option>
            <option>Custom...</option>
        </select>
        <input type="text" class="med-dosage" placeholder="Dosage">
        <input type="text" class="med-freq" placeholder="Frequency">
        <input type="text" class="med-duration" placeholder="Duration">
        <button type="button" class="remove-med" onclick="removeMed(this)">Remove</button>
    `;
    meds.appendChild(row);
    medCount++;
}

// Remove medication row
function removeMed(button) {
    button.closest('.medication-row').remove();
}

// Generate prescription
function generatePrescription() {
    if (!isLoggedIn) {
        alert('Please login first');
        return;
    }

    // Collect form data
    const patientName = document.getElementById('patientName').value.trim();
    const patientAge = document.getElementById('patientAge').value.trim();
    const symptoms = document.getElementById('symptoms').value.trim();
    const diagnosis = document.getElementById('diagnosis').value.trim();
    const instructions = document.getElementById('instructions').value.trim();

    // Collect medications
    const medRows = document.querySelectorAll('.medication-row');
    let medications = [];

    medRows.forEach(row => {
        const name = row.querySelector('.med-select').value;
        const dosage = row.querySelector('.med-dosage').value.trim();
        const freq = row.querySelector('.med-freq').value.trim();
        const duration = row.querySelector('.med-duration').value.trim();

        if (name && dosage && freq) {
            medications.push({ name, dosage, freq, duration });
        }
    });

    // Validation
    if (!patientName) {
        alert('Please enter patient name');
        document.getElementById('patientName').focus();
        return;
    }

    if (medications.length === 0) {
        alert('Please add at least one medication');
        return;
    }

    // Generate preview HTML
    const date = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const previewHTML = `
        <div class="printable-prescription">
            <div class="prescription-header">
                <h2>🏥 ${patientName.toUpperCase()} PRESCRIPTION</h2>
                <div class="practice-info">
                    <p>Dr. Timothy James • Santa Maria Bulacan</p>
                    <p>Phone: 09505598253 | Email: tjblazo21@gmail.com</p>
                    <p>Date: ${date} | Patient Age/DOB: ${patientAge || 'N/A'}</p>
                </div>
            </div>
            
            ${symptoms ? `<p><strong>SYMPTOMS:</strong> ${symptoms}</p>` : ''}
            ${diagnosis ? `<p><strong>DIAGNOSIS:</strong> ${diagnosis}</p>` : ''}
            
            <h3>📋 MEDICATIONS:</h3>
            ${medications.map((med, index) => `
                <div class="medication-item">
                    <strong>${index + 1}. ${med.name}</strong>
                    <div class="med-details">
                        <span>Dosage: ${med.dosage}</span>
                        <span>Frequency: ${med.freq}</span>
                        <span>Duration: ${med.duration}</span>
                    </div>
                </div>
            `).join('')}
            
            ${instructions ? `
                <div class="special-instructions">
                    <strong>📝 SPECIAL INSTRUCTIONS:</strong>
                    <p>${instructions}</p>
                </div>
            ` : ''}
            
            <div class="prescription-footer">
                <p style="font-size: 0.9rem; color: #666; text-align: center;">
                    ⚠️ For medical use only. Verify before dispensing. Rx valid for 6 months.
                </p>
                <div class="signature">
                    <p style="font-weight: bold; font-size: 1.2rem;">Dr. Timothy James, MD</p>
                    <p>Signature: ____________________</p>
                </div>
            </div>
        </div>
    `;

    // Show preview
    document.getElementById('previewContent').innerHTML = previewHTML;
    document.getElementById('preview').style.display = 'block';
    document.getElementById('preview').scrollIntoView({ behavior: 'smooth' });
}

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
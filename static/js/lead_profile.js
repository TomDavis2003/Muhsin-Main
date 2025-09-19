document.addEventListener('DOMContentLoaded', async function() {
    const leadId = window.leadId;
    const contentDiv = document.getElementById('lead-profile-content');
    const tabs = document.querySelectorAll('#processFlowTabs .nav-link');
    let lead = null;
    let currentUser = window.currentUser;

    async function fetchLead() {
        const resp = await fetch(`/api/leads/${leadId}`);
        lead = await resp.json();
    }

    function renderPrimaryProfile(editMode = false) {
        contentDiv.innerHTML = `
            <h4>Primary Profile</h4>
            <form id="primary-profile-form">
                <div class="mb-3">
                    <label>Customer Name</label>
                    <input type="text" class="form-control" name="customer_name" value="${lead.customer_name}" ${editMode ? '' : 'readonly'}>
                </div>
                <div class="mb-3">
                    <label>Contact Number</label>
                    <input type="text" class="form-control" name="contact_number" value="${lead.contact_number}" ${editMode ? '' : 'readonly'}>
                </div>
                <div class="mb-3">
                    <label>Loan Type</label>
                    <input type="text" class="form-control" name="loan_type" value="${lead.loan_type}" ${editMode ? '' : 'readonly'}>
                </div>
                <div class="mb-3">
                    <label>Source</label>
                    <input type="text" class="form-control" name="source" value="${lead.source}" ${editMode ? '' : 'readonly'}>
                </div>
                <div class="mb-3">
                    <label>Status</label>
                    <input type="text" class="form-control" name="status" value="${lead.status}" ${editMode ? '' : 'readonly'}>
                </div>
                <div class="mb-3">
                    <label>Referred By</label>
                    <input type="text" class="form-control" name="referred_by" value="${lead.referred_by || ''}" ${editMode ? '' : 'readonly'}>
                </div>
                ${editMode ? `<button type="submit" class="btn btn-success">Save</button>` : `<button type="button" class="btn btn-primary" id="edit-primary-btn">Edit</button>`}
            </form>
        `;
        if (!editMode) {
            document.getElementById('edit-primary-btn').onclick = () => renderPrimaryProfile(true);
        } else {
            document.getElementById('primary-profile-form').onsubmit = async function(e) {
                e.preventDefault();
                const form = e.target;
                const data = Object.fromEntries(new FormData(form));
                await fetch(`/api/leads/${leadId}/section/primary`, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                });
                await fetchLead();
                renderPrimaryProfile(false);
            };
        }
    }

    function renderSecondaryProfile(editMode = false) {
        let sec = lead.secondary_profile ? JSON.parse(lead.secondary_profile) : {};
        contentDiv.innerHTML = `
            <h4>Secondary Profile</h4>
            <form id="secondary-profile-form">
                <div class="mb-3">
                    <label>PAN No</label>
                    <input type="text" class="form-control" name="pan_no" value="${sec.pan_no || ''}" ${editMode ? '' : 'readonly'}>
                </div>
                <div class="mb-3">
                    <label>Aadhar No</label>
                    <input type="text" class="form-control" name="aadhar_no" value="${sec.aadhar_no || ''}" ${editMode ? '' : 'readonly'}>
                </div>
                <div class="mb-3">
                    <label>Email</label>
                    <input type="email" class="form-control" name="email" value="${sec.email || ''}" ${editMode ? '' : 'readonly'}>
                </div>
                <div class="mb-3">
                    <label>Monthly Gross Income</label>
                    <input type="text" class="form-control" name="gross_income" value="${sec.gross_income || ''}" ${editMode ? '' : 'readonly'}>
                </div>
                <div class="mb-3">
                    <label>Monthly Net Income</label>
                    <input type="text" class="form-control" name="net_income" value="${sec.net_income || ''}" ${editMode ? '' : 'readonly'}>
                </div>
                <div class="mb-3">
                    <label>Company/Business Details</label>
                    <textarea class="form-control" name="company_details" ${editMode ? '' : 'readonly'}>${sec.company_details || ''}</textarea>
                </div>
                ${editMode ? `<button type="submit" class="btn btn-success">Save</button>` : `<button type="button" class="btn btn-primary" id="edit-secondary-btn">Edit</button>`}
            </form>
        `;
        if (!editMode) {
            document.getElementById('edit-secondary-btn').onclick = () => renderSecondaryProfile(true);
        } else {
            document.getElementById('secondary-profile-form').onsubmit = async function(e) {
                e.preventDefault();
                const form = e.target;
                const data = Object.fromEntries(new FormData(form));
                await fetch(`/api/leads/${leadId}/section/secondary`, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                });
                await fetchLead();
                renderSecondaryProfile(false);
            };
        }
    }

    function renderLegalChecking(editMode = false) {
        contentDiv.innerHTML = `
            <h4>Legal Checking</h4>
            <form id="legal-form">
                <div class="mb-3">
                    <label>Legal Notes</label>
                    <textarea class="form-control" name="legal_notes" ${editMode ? '' : 'readonly'}>${lead.legal_notes || ''}</textarea>
                </div>
                ${editMode ? `<button type="submit" class="btn btn-success">Save</button>` : (currentUser.role === "Legal Executive" ? `<button type="button" class="btn btn-primary" id="edit-legal-btn">Edit</button>` : '')}
            </form>
        `;
        if (!editMode && currentUser.role === "Legal Executive") {
            document.getElementById('edit-legal-btn').onclick = () => renderLegalChecking(true);
        } else if (editMode) {
            document.getElementById('legal-form').onsubmit = async function(e) {
                e.preventDefault();
                const data = {legal_notes: e.target.legal_notes.value};
                await fetch(`/api/leads/${leadId}/section/legal`, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                });
                await fetchLead();
                renderLegalChecking(false);
            };
        }
    }

    function renderFinancialAnalysis(editMode = false) {
        contentDiv.innerHTML = `
            <h4>Financial Analysis</h4>
            <form id="financial-form">
                <div class="mb-3">
                    <label>Financial Notes</label>
                    <textarea class="form-control" name="financial_notes" ${editMode ? '' : 'readonly'}>${lead.financial_notes || ''}</textarea>
                </div>
                ${editMode ? `<button type="submit" class="btn btn-success">Save</button>` : (currentUser.role === "Financial Analyst" ? `<button type="button" class="btn btn-primary" id="edit-financial-btn">Edit</button>` : '')}
            </form>
        `;
        if (!editMode && currentUser.role === "Financial Analyst") {
            document.getElementById('edit-financial-btn').onclick = () => renderFinancialAnalysis(true);
        } else if (editMode) {
            document.getElementById('financial-form').onsubmit = async function(e) {
                e.preventDefault();
                const data = {financial_notes: e.target.financial_notes.value};
                await fetch(`/api/leads/${leadId}/section/financial`, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                });
                await fetchLead();
                renderFinancialAnalysis(false);
            };
        }
    }

    function renderBankFinalization(editMode = false) {
        let bank = lead.bank_finalization ? JSON.parse(lead.bank_finalization) : {};
        contentDiv.innerHTML = `
            <h4>Bank Finalization</h4>
            <form id="bank-form">
                <div class="mb-3">
                    <label>Bank Name</label>
                    <input type="text" class="form-control" name="bank_name" value="${bank.bank_name || ''}" ${editMode ? '' : 'readonly'}>
                </div>
                <div class="mb-3">
                    <label>Rate</label>
                    <input type="text" class="form-control" name="rate" value="${bank.rate || ''}" ${editMode ? '' : 'readonly'}>
                </div>
                <div class="mb-3">
                    <label>Tenure</label>
                    <input type="text" class="form-control" name="tenure" value="${bank.tenure || ''}" ${editMode ? '' : 'readonly'}>
                </div>
                ${editMode ? `<button type="submit" class="btn btn-success">Save</button>` : (currentUser.role === "Bank Finalizer" ? `<button type="button" class="btn btn-primary" id="edit-bank-btn">Edit</button>` : '')}
            </form>
        `;
        if (!editMode && currentUser.role === "Bank Finalizer") {
            document.getElementById('edit-bank-btn').onclick = () => renderBankFinalization(true);
        } else if (editMode) {
            document.getElementById('bank-form').onsubmit = async function(e) {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(e.target));
                await fetch(`/api/leads/${leadId}/section/bank`, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                });
                await fetchLead();
                renderBankFinalization(false);
            };
        }
    }

    function renderAllDocuments() {
        contentDiv.innerHTML = `
            <h4>All Documents</h4>
            <form id="document-upload-form" enctype="multipart/form-data">
                <div class="mb-3">
                    <label for="doc-type" class="form-label">Document Type</label>
                    <select class="form-select" id="doc-type" name="doc-type" required>
                        <option value="">Select Document Type</option>
                        <option value="pan">PAN</option>
                        <option value="aadhar">Aadhar</option>
                        <option value="bank">Bank Statements</option>
                        <option value="salary-slip">Salary Slip</option>
                        <option value="loan-account-statement">Loan Account Statement</option>
                        <option value="itr-certi">ITR Certificate</option>
                        <option value="gst-certi">GST Certificate</option>
                        <option value="udyam-certi">Udyam Certificate</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label for="doc-note" class="form-label">Document Note</label>
                    <textarea class="form-control" id="doc-note" name="doc-note" rows="2" placeholder="Write a note about this document"></textarea>
                </div>
                <div class="mb-3">
                    <label for="doc-file" class="form-label">Upload File(s)</label>
                    <input type="file" class="form-control" id="doc-file" name="doc-file" ${document.getElementById('doc-type') && document.getElementById('doc-type').value === 'bank' ? 'multiple' : ''} required>
                    <div class="form-text">You can upload multiple PDFs for Bank Statements.</div>
                </div>
                <button type="submit" class="btn btn-success">Upload & Save</button>
            </form>
            <hr>
            <div id="uploaded-documents-list"></div>
        `;

        // Load and display existing documents
        loadAndRenderDocuments();

        // Handle form submission
        document.getElementById('document-upload-form').onsubmit = async function(e) {
            e.preventDefault();
            const docType = document.getElementById('doc-type').value;
            const docNote = document.getElementById('doc-note').value;
            const files = document.getElementById('doc-file').files;
            if (!docType || files.length === 0) {
                alert('Please select a document type and file(s).');
                return;
            }
            let uploadCount = 0;
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const reader = new FileReader();
                reader.onload = async function(ev) {
                    const documentData = {
                        id: `${leadId}-${docType}-${Date.now()}-${i}`,
                        lead_id: leadId,
                        name: file.name,
                        content: ev.target.result,
                        category: docType,
                        note: docNote
                    };
                    await fetch(`/api/documents/${leadId}`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(documentData)
                    });
                    uploadCount++;
                    // Only refresh the list after all files are uploaded
                    if (uploadCount === files.length) {
                        loadAndRenderDocuments();
                        document.getElementById('document-upload-form').reset();
                    }
                };
                reader.readAsDataURL(file);
            }
        };
    }

    async function loadAndRenderDocuments() {
        const resp = await fetch(`/api/documents/${leadId}`);
        const docs = await resp.json();
        const container = document.getElementById('uploaded-documents-list');
        if (!docs || docs.length === 0) {
            container.innerHTML = '<p class="text-muted">No documents uploaded yet.</p>';
            return;
        }
        // Group by category
        const grouped = {};
        docs.forEach(doc => {
            if (!grouped[doc.category]) grouped[doc.category] = [];
            grouped[doc.category].push(doc);
        });
        container.innerHTML = '';
        Object.keys(grouped).forEach(category => {
            const docsList = grouped[category].map(doc => `
                <div class="document-card mb-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <b>${doc.name}</b> <span class="badge bg-secondary">${category.toUpperCase()}</span>
                            <br>
                            <small>${doc.note ? 'Note: ' + doc.note : ''}</small>
                        </div>
                        <div>
                            <a href="${doc.content}" download="${doc.name}" class="btn btn-sm btn-primary me-1">Download</a>
                            <button class="btn btn-sm btn-danger delete-doc-btn" data-id="${doc.id}">Delete</button>
                        </div>
                    </div>
                </div>
            `).join('');
            container.innerHTML += `<h6>${category.replace(/-/g, ' ').toUpperCase()}</h6>${docsList}`;
        });
        // Delete event
        document.querySelectorAll('.delete-doc-btn').forEach(btn => {
            btn.onclick = async function() {
                if (confirm('Delete this document?')) {
                    await fetch(`/api/documents/${btn.getAttribute('data-id')}`, { method: 'DELETE' });
                    loadAndRenderDocuments();
                }
            };
        });
    }


    function renderMerits(editMode = false) {
        contentDiv.innerHTML = `
            <h4>Merits</h4>
            <form id="merits-form">
                <div class="mb-3">
                    <textarea class="form-control" name="merits" rows="5">${lead.merits || ''}</textarea>
                </div>
                <button type="submit" class="btn btn-success">Save</button>
            </form>
        `;
        document.getElementById('merits-form').onsubmit = async function(e) {
            e.preventDefault();
            const data = {merits: e.target.merits.value};
            await fetch(`/api/leads/${leadId}/section/merits`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            await fetchLead();
            renderMerits(false);
        };
    }

    function renderDemerits(editMode = false) {
        contentDiv.innerHTML = `
            <h4>Demerits</h4>
            <form id="demerits-form">
                <div class="mb-3">
                    <textarea class="form-control" name="demerits" rows="5">${lead.demerits || ''}</textarea>
                </div>
                <button type="submit" class="btn btn-success">Save</button>
            </form>
        `;
        document.getElementById('demerits-form').onsubmit = async function(e) {
            e.preventDefault();
            const data = {demerits: e.target.demerits.value};
            await fetch(`/api/leads/${leadId}/section/demerits`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            await fetchLead();
            renderDemerits(false);
        };
    }

    function renderStatus() {
        contentDiv.innerHTML = `
            <h4>Status</h4>
            <ul>
                <li>Telecalling</li>
                <li>Primary Profiling</li>
                <li>Primary Bank Finalising</li>
                <li>Documentation</li>
                <li>Financial Analysis & Legal Checking</li>
                <li>Secondary Bank Profiling</li>
                <li>Secondary Bank Finalization</li>
                <li>Login</li>
                <li>Sanction</li>
                <li>Disbursement</li>
            </ul>
            <p>Current Status: <b>${lead.status}</b></p>
        `;
    }

    // Tab switching logic
    function renderStep(step) {
        switch(step) {
            case 'primary-profile': renderPrimaryProfile(); break;
            case 'secondary-profile': renderSecondaryProfile(); break;
            case 'legal-checking': renderLegalChecking(); break;
            case 'financial-analysis': renderFinancialAnalysis(); break;
            case 'bank-finalization': renderBankFinalization(); break;
            case 'all-documents': renderAllDocuments(); break;
            case 'merits': renderMerits(); break;
            case 'demerits': renderDemerits(); break;
            case 'status': renderStatus(); break;
            default: contentDiv.innerHTML = `<p>Select a step to view details.</p>`;
        }
    }

    await fetchLead();
    renderStep('primary-profile');

    tabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            renderStep(this.getAttribute('data-step'));
        });
    });
});
// DOM Elements
const loginScreen = document.getElementById('login-screen');
const mainApplication = document.getElementById('main-application');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const userNameElement = document.getElementById('user-name');
const userRoleElement = document.getElementById('user-role');
const logoutBtn = document.getElementById('logout-btn');
const moduleLinks = document.querySelectorAll('[data-module]');
const moduleSections = document.querySelectorAll('.module-section');
const userDashboards = document.querySelectorAll('.user-dashboard');
const createLeadBtn = document.getElementById('create-lead-btn');
const newLeadForm = document.getElementById('new-lead-form');
const updateLeadBtn = document.getElementById('update-lead-btn');
const editLeadForm = document.getElementById('edit-lead-form');
const clearNotificationsBtn = document.getElementById('clear-notifications');
const viewAllLeadsBtn = document.getElementById('view-all-leads');
const leadTabs = document.querySelectorAll('[data-tab]');
const documentCustomerSelect = document.getElementById('document-customer-select');
const documentsContainer = document.getElementById('documents-container');
const noCustomerSelected = document.getElementById('no-customer-selected');
const selectedCustomerName = document.getElementById('selected-customer-name');
const uploadedDocumentsList = document.getElementById('uploaded-documents-list');
const documentUpload = document.getElementById('document-upload');
const browseFilesBtn = document.getElementById('browse-files-btn');
const documentDropzone = document.getElementById('document-dropzone');
const addDocumentBtn = document.getElementById('add-document-btn');
const documentCategory = document.getElementById('document-category');
const documentPreviewModal = document.getElementById('documentPreviewModal');
const documentPreviewTitle = document.getElementById('document-preview-title');
const documentPreviewContent = document.getElementById('document-preview-content');
const downloadDocumentBtn = document.getElementById('download-document-btn');
const confirmAssignBtn = document.getElementById('confirm-assign-btn');
const multiAssignSelect = document.getElementById('multi-assign-select');
const assignLeadInfo = document.getElementById('assign-lead-info');
const currentAssignees = document.getElementById('current-assignees');
const assignmentHistory = document.getElementById('assignment-history');
const taskAllocationTable = document.getElementById('task-allocation-table').querySelector('tbody');

// Global variables
let currentUser = null;
let leads = [];
let notifications = [];
let currentDocumentCustomer = null;
let currentLeadToAssign = null;

// API helper
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(endpoint, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// API wrapper functions (renamed to avoid collisions with UI handlers)
async function login(username, password) {
    try {
        const result = await apiCall('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        return result;
    } catch (error) {
        return { success: false, message: 'Login failed' };
    }
}

// filepath: c:\Users\USER\Desktop\Muhsin Main\static\js\script.js
async function logout() {
    await apiCall('/logout');
    currentUser = null;
    window.location.href = '/login';
    window.location.reload(); // Force refresh
}

async function getLeads() {
    return await apiCall('/api/leads');
}

async function apiCreateLead(leadData) {
    return await apiCall('/api/leads', {
        method: 'POST',
        body: JSON.stringify(leadData)
    });
}

async function apiUpdateLead(leadId, leadData) {
    return await apiCall(`/api/leads/${leadId}`, {
        method: 'PUT',
        body: JSON.stringify(leadData)
    });
}

async function deleteLead(leadId) {
    return await apiCall(`/api/leads/${leadId}`, {
        method: 'DELETE'
    });
}

async function getAssignments(leadId) {
    return await apiCall(`/api/assignments/${leadId}`);
}

async function apiAssignLeadToUsers(leadId, assignedTo) {
    return await apiCall(`/api/assignments/${leadId}`, {
        method: 'POST',
        body: JSON.stringify({ assigned_to: assignedTo })
    });
}

async function getDocuments(leadId) {
    return await apiCall(`/api/documents/${leadId}`);
}

async function apiUploadDocument(documentData) {
    return await apiCall(`/api/documents/${documentData.lead_id}`, {
        method: 'POST',
        body: JSON.stringify(documentData)
    });
}

async function apiDeleteDocument(documentId) {
    return await apiCall(`/api/documents/${documentId}`, {
        method: 'DELETE'
    });
}

async function getNotifications() {
    return await apiCall('/api/notifications');
}

async function clearAllNotifications() {
    return await apiCall('/api/notifications', {
        method: 'DELETE'
    });
}

async function getUsers() {
    return await apiCall('/api/users');
}

// Initialize the application
async function initApp() {
    try {
        leads = await getLeads();
        notifications = await getNotifications();
        
        updateDashboardStats();
        await renderLeadTables();
        renderNotifications();
        updateCSOPerformance();
        populateCustomerSelect();
        populateTeamMembers();
        renderTaskAllocationTable();
    } catch (error) {
        console.error('Failed to initialize app:', error);
    }
}

// Update dashboard statistics
function updateDashboardStats() {
    document.getElementById('total-leads').textContent = leads.length;
    document.getElementById('active-leads').textContent = leads.filter(lead => lead.status !== 'rejected').length;
    document.getElementById('pending-tasks').textContent = leads.filter(lead => lead.status === 'pending').length;
    document.getElementById('tat-breaches').textContent = leads.filter(lead => lead.tat_breach).length;
   
    // Update CSO dashboard stats
    const csoActiveLeads = leads.filter(lead =>
        lead.assignedTo && currentUser && lead.assignedTo.includes(currentUser.name) && lead.status !== 'rejected'
    ).length;
    const csoCompleted = leads.filter(lead =>
        lead.assignedTo && currentUser && lead.assignedTo.includes(currentUser.name) && lead.status === 'completed'
    ).length;
    const conversionRate = csoActiveLeads > 0 ? Math.round((csoCompleted / csoActiveLeads) * 100) : 0;
   
    document.getElementById('cso-active-leads').textContent = csoActiveLeads;
    document.getElementById('cso-completed').textContent = csoCompleted;
    document.getElementById('conversion-rate').textContent = `${conversionRate}%`;
    document.getElementById('conversion-rate').style.width = `${conversionRate}%`;
   
    // Update TAT alerts
    const today = new Date();
    const tatToday = leads.filter(lead => {
        const createdDate = new Date(lead.created_at);
        const diffTime = Math.abs(today - createdDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 7; // TAT breach if more than 7 days
    }).length;
   
    document.getElementById('tat-today').textContent = tatToday;
    document.getElementById('tat-week').textContent = leads.filter(lead => lead.tat_breach).length;
}

// Render lead tables
async function renderLeadTables() {
    // Dashboard new leads table
    const newLeadsTable = document.getElementById('new-leads-table').querySelector('tbody');
    newLeadsTable.innerHTML = '';
   
    // Show recent leads
    let recentLeads = leads.filter(lead => lead.status !== 'rejected').slice(0, 5);
   
    if (recentLeads.length === 0) {
        newLeadsTable.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No leads available</td></tr>';
    } else {
        for (const lead of recentLeads) {
            const assignedUsers = await getAssignedUsers(lead.id);
            lead.assignedTo = assignedUsers;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${lead.customer_name}</td>
                <td>${lead.contact_number}</td>
                <td>${lead.loan_type}</td>
                <td>${formatAssignees(assignedUsers)}</td>
                <td><span class="badge bg-${getStatusBadgeClass(lead.status)}">${getStatusText(lead.status)}</span></td>
                <td>
                    ${currentUser && currentUser.role === 'Department Head' ?
                        `<button class="btn btn-sm btn-primary assign-btn" data-id="${lead.id}">Assign</button>` :
                        ''
                    }
                    <button class="btn btn-sm btn-info view-btn ms-1" data-id="${lead.id}">View</button>
                </td>
            `;
            newLeadsTable.appendChild(row);
        }
    }
   
    // Lead master table
    const leadMasterTable = document.getElementById('lead-master-table').querySelector('tbody');
    leadMasterTable.innerHTML = '';
   
    let filteredLeads = leads;
   
    if (filteredLeads.length === 0) {
        leadMasterTable.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No leads available</td></tr>';
    } else {
        for (const lead of filteredLeads) {
            const assignedUsers = await getAssignedUsers(lead.id);
            lead.assignedTo = assignedUsers;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${lead.id}</td>
                <td>${lead.customer_name}</td>
                <td>${lead.contact_number}</td>
                <td>${lead.loan_type}</td>
                <td>${formatAssignees(assignedUsers)}</td>
                <td><span class="badge bg-${getStatusBadgeClass(lead.status)}">${getStatusText(lead.status)}</span></td>
                <td>
                    ${currentUser && currentUser.role === 'Department Head' ?
                        `<button class="btn btn-sm btn-primary edit-btn" data-id="${lead.id}">Edit</button>` :
                        ''
                    }
                    ${currentUser && currentUser.role === 'Department Head' ?
                        `<button class="btn btn-sm btn-success assign-btn ms-1" data-id="${lead.id}">Assign</button>` :
                        ''
                    }
                    <button class="btn btn-sm btn-info view-btn ms-1" data-id="${lead.id}">View</button>
                </td>
            `;
            leadMasterTable.appendChild(row);
        }
    }
   
    // CSO leads table
    const csoLeadsTable = document.getElementById('cso-leads-table').querySelector('tbody');
    csoLeadsTable.innerHTML = '';
   
    const csoLeads = [];
    for (const lead of leads) {
        const assignedUsers = await getAssignedUsers(lead.id);
        if (currentUser && assignedUsers.includes(currentUser.name)) {
            lead.assignedTo = assignedUsers;
            csoLeads.push(lead);
        }
    }
   
    if (csoLeads.length === 0) {
        csoLeadsTable.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No leads assigned</td></tr>';
    } else {
        csoLeads.forEach(lead => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${lead.customer_name}</td>
                <td>${lead.loan_type}</td>
                <td>₹${lead.loan_amount || 'N/A'}</td>
                <td><span class="badge bg-${getStatusBadgeClass(lead.status)}">${getStatusText(lead.status)}</span></td>
                <td><button class="btn btn-sm btn-primary update-btn" data-id="${lead.id}">Update</button></td>
            `;
            csoLeadsTable.appendChild(row);
        });
    }
   
    // Rejected leads section
    const rejectedLeadsContainer = document.getElementById('rejected-leads');
    rejectedLeadsContainer.innerHTML = '';
   
    let rejectedLeads = leads.filter(lead => lead.status === 'rejected').slice(0, 3);
   
    if (rejectedLeads.length === 0) {
        rejectedLeadsContainer.innerHTML = '<p class="text-center text-muted">No rejected leads</p>';
    } else {
        rejectedLeads.forEach(lead => {
            const div = document.createElement('div');
            div.className = 'mb-3';
            div.innerHTML = `
                <h6>${lead.customer_name}</h6>
                <p class="mb-1">${lead.loan_type} - ${lead.rejection_reason || 'No reason provided'}</p>
                <small class="text-muted">Rejected by: ${lead.rejected_by || 'System'}</small>
            `;
            rejectedLeadsContainer.appendChild(div);
        });
    }
   
    // Add event listeners to buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const leadId = this.getAttribute('data-id');
            openEditLeadModal(leadId);
        });
    });
   
    document.querySelectorAll('.assign-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const leadId = this.getAttribute('data-id');
            openAssignLeadModal(leadId);
        });
    });
   
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const leadId = this.getAttribute('data-id');
            window.location.href = `/lead/${leadId}`; // open in same tab
            // OR: window.open(`/lead/${leadId}`, '_blank'); // open in new tab
        });
    });
   
    document.querySelectorAll('.update-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const leadId = this.getAttribute('data-id');
            alert('Update functionality for lead ' + leadId + ' would be implemented here');
        });
    });
}

// Get assigned users for a lead
async function getAssignedUsers(leadId) {
    try {
        const assignments = await getAssignments(leadId);
        return assignments.map(a => a.assigned_to);
    } catch (error) {
        console.error('Failed to get assignments:', error);
        return [];
    }
}

// Render task allocation table for department head
async function renderTaskAllocationTable() {
    if (!currentUser || currentUser.role !== 'Department Head') return;
   
    taskAllocationTable.innerHTML = '';
   
    if (leads.length === 0) {
        taskAllocationTable.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No leads available</td></tr>';
        return;
    }
   
    for (const lead of leads) {
        const assignedUsers = await getAssignedUsers(lead.id);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${lead.id}</td>
            <td>${lead.customer_name}</td>
            <td>${lead.loan_type}</td>
            <td>${formatAssignees(assignedUsers)}</td>
            <td><span class="assignment-status status-${lead.status || 'pending'}">${getStatusText(lead.status)}</span></td>
            <td>${formatTime(lead.updated_at)}</td>
            <td>
                <button class="btn btn-sm btn-primary assign-btn" data-id="${lead.id}">Assign</button>
                <button class="btn btn-sm btn-info view-btn ms-1" data-id="${lead.id}">View</button>
            </td>
        `;
        taskAllocationTable.appendChild(row);
    }
   
    // Add event listeners
    document.querySelectorAll('#task-allocation-table .assign-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const leadId = this.getAttribute('data-id');
            openAssignLeadModal(leadId);
        });
    });
   
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const leadId = this.getAttribute('data-id');
            window.location.href = `/lead/${leadId}`; // open in same tab
            // OR: window.open(`/lead/${leadId}`, '_blank'); // open in new tab
        });
    });
}

// Format assignees for display
function formatAssignees(assignees) {
    if (!assignees || assignees.length === 0) {
        return '<span class="text-muted">Unassigned</span>';
    }
   
    return assignees.map(assignee => {
        return `<span class="assignee-badge">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(assignee)}&background=random&size=32">
            ${assignee}
        </span>`;
    }).join('');
}

// Render notifications
function renderNotifications() {
    const notificationsContainer = document.getElementById('notifications-container');
    notificationsContainer.innerHTML = '';
   
    if (notifications.length === 0) {
        notificationsContainer.innerHTML = '<p class="text-center text-muted">No notifications</p>';
    } else {
        notifications.forEach(notification => {
            const div = document.createElement('div');
            div.className = `notification-item ${notification.urgent ? 'urgent' : ''}`;
            div.innerHTML = `
                <div class="d-flex justify-content-between">
                    <h6>${notification.title}</h6>
                    <small class="text-muted">${formatTime(notification.timestamp)}</small>
                </div>
                <p class="mb-0">${notification.message}</p>
            `;
            notificationsContainer.appendChild(div);
        });
    }
   
    // Update notification badge (handle absence gracefully)
    const badge = document.querySelector('.notification-badge');
    if (badge) badge.textContent = notifications.length;
}

// Update CSO performance
async function updateCSOPerformance() {
    const csoPerformanceContainer = document.getElementById('cso-performance');
    csoPerformanceContainer.innerHTML = '';
   
    try {
        // Get all users
        const users = await getUsers();
        
        // Get team members (CSOs, Financial Analysts, Legal Executives)
        const teamMembers = users.filter(user =>
            user.role === 'CSO' || user.role === 'Financial Analyst' || user.role === 'Legal Executive'
        );
       
        if (teamMembers.length === 0) {
            csoPerformanceContainer.innerHTML = '<p class="text-center text-muted">No team performance data available</p>';
            return;
        }
       
        for (const member of teamMembers) {
            // Count leads assigned to this member
            let memberLeads = 0;
            let completedLeads = 0;
            
            for (const lead of leads) {
                const assignedUsers = await getAssignedUsers(lead.id);
                if (assignedUsers.includes(member.name)) {
                    memberLeads++;
                    if (lead.status === 'completed') {
                        completedLeads++;
                    }
                }
            }
            
            const completionRate = memberLeads > 0 ? Math.round((completedLeads / memberLeads) * 100) : 0;
           
            const div = document.createElement('div');
            div.className = 'mb-3';
            div.innerHTML = `
                <div class="d-flex justify-content-between mb-1">
                    <span>${member.name} (${member.role})</span>
                    <span>${memberLeads} leads (${completionRate}% completion)</span>
                </div>
                <div class="progress" style="height: 10px;">
                    <div class="progress-bar bg-success" role="progressbar" style="width: ${completionRate}%"></div>
                </div>
            `;
            csoPerformanceContainer.appendChild(div);
        }
    } catch (error) {
        console.error('Failed to update CSO performance:', error);
        csoPerformanceContainer.innerHTML = '<p class="text-center text-muted">Error loading performance data</p>';
    }
}

// Get status badge class
function getStatusBadgeClass(status) {
    switch(status) {
        case 'hot': return 'danger';
        case 'warm': return 'warning';
        case 'cold': return 'secondary';
        case 'rejected': return 'dark';
        case 'completed': return 'success';
        default: return 'info';
    }
}

// Get status text
function getStatusText(status) {
    switch(status) {
        case 'hot': return 'Hot Lead';
        case 'warm': return 'Warm Lead';
        case 'cold': return 'Cold Lead';
        case 'rejected': return 'Rejected';
        case 'completed': return 'Completed';
        default: return status;
    }
}

// Format time
function formatTime(timestamp) {
    if (!timestamp) return 'N/A';
   
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
   
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
   
    return time.toLocaleDateString();
}

// Create a new lead (UI handler)
async function createNewLead() {
    const customerName = document.getElementById('customer-name').value;
    const contactNumber = document.getElementById('contact-number').value;
    const loanType = document.getElementById('loan-type').value;
    const leadSource = document.getElementById('lead-source').value;
    const caseStatus = document.getElementById('case-status').value;
    const referredBy = document.getElementById('referred-by').value;
   
    try {
        const leadData = {
            customer_name: customerName,
            contact_number: contactNumber,
            loan_type: loanType,
            source: leadSource,
            status: caseStatus,
            referred_by: referredBy
        };
        
        const result = await apiCreateLead(leadData);
        
        if (result.success) {
            // Refresh leads
            leads = await getLeads();
            
            // Update UI
            updateDashboardStats();
            await renderLeadTables();
            renderTaskAllocationTable();
            populateCustomerSelect();
            
            // Close modal and reset form
            bootstrap.Modal.getInstance(document.getElementById('newLeadModal')).hide();
            newLeadForm.reset();
        } else {
            alert('Failed to create lead');
        }
    } catch (error) {
        console.error('Failed to create lead:', error);
        alert('Failed to create lead');
    }
}

// Open edit lead modal
async function openEditLeadModal(leadId) {
    try {
        const lead = await apiCall(`/api/leads/${leadId}`);
       
        if (!lead) return;
       
        document.getElementById('edit-lead-id').value = lead.id;
        document.getElementById('edit-customer-name').value = lead.customer_name;
        document.getElementById('edit-contact-number').value = lead.contact_number;
        document.getElementById('edit-loan-type').value = lead.loan_type;
        document.getElementById('edit-lead-source').value = lead.source;
        document.getElementById('edit-case-status').value = lead.status;
        document.getElementById('edit-referred-by').value = lead.referred_by || '';
       
        const editModal = new bootstrap.Modal(document.getElementById('editLeadModal'));
        editModal.show();
    } catch (error) {
        console.error('Failed to open edit modal:', error);
        alert('Failed to load lead details');
    }
}

// Update lead (UI handler)
async function updateLead() {
    const leadId = document.getElementById('edit-lead-id').value;
    
    try {
        const leadData = {
            customer_name: document.getElementById('edit-customer-name').value,
            contact_number: document.getElementById('edit-contact-number').value,
            loan_type: document.getElementById('edit-loan-type').value,
            source: document.getElementById('edit-lead-source').value,
            status: document.getElementById('edit-case-status').value,
            referred_by: document.getElementById('edit-referred-by').value
        };
        
        await apiUpdateLead(leadId, leadData);
        
        // Refresh leads
        leads = await getLeads();
        
        // Update UI
        updateDashboardStats();
        await renderLeadTables();
        renderTaskAllocationTable();
        populateCustomerSelect();
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('editLeadModal')).hide();
    } catch (error) {
        console.error('Failed to update lead:', error);
        alert('Failed to update lead');
    }
}

// Open assign lead modal
async function openAssignLeadModal(leadId) {
    currentLeadToAssign = leadId;
    
    try {
        const lead = await apiCall(`/api/leads/${leadId}`);
        const assignments = await getAssignments(leadId);
        const assignedUsers = assignments.map(a => a.assigned_to);
       
        if (!lead) return;
       
        // Populate lead information
        assignLeadInfo.innerHTML = `
            <p><strong>Lead ID:</strong> ${lead.id}</p>
            <p><strong>Customer:</strong> ${lead.customer_name}</p>
            <p><strong>Contact:</strong> ${lead.contact_number}</p>
            <p><strong>Loan Type:</strong> ${lead.loan_type}</p>
            <p><strong>Status:</strong> <span class="badge bg-${getStatusBadgeClass(lead.status)}">${getStatusText(lead.status)}</span></p>
        `;
       
        // Populate current assignees
        currentAssignees.innerHTML = formatAssignees(assignedUsers) || 'No one assigned yet';
       
        // Populate assignment history
        assignmentHistory.innerHTML = '';
        if (assignments && assignments.length > 0) {
            assignments.forEach(assignment => {
                const div = document.createElement('div');
                div.className = 'assignment-item';
                div.innerHTML = `
                    <div><strong>${assignment.assigned_to}</strong> - ${formatTime(assignment.timestamp)}</div>
                    <div>By: ${assignment.assigned_by}</div>
                `;
                assignmentHistory.appendChild(div);
            });
        } else {
            assignmentHistory.innerHTML = '<p class="text-muted">No assignment history</p>';
        }
       
        // Clear previous selection
        Array.from(multiAssignSelect.options).forEach(option => {
            option.selected = false;
        });

        // Select currently assigned team members
        if (assignedUsers && assignedUsers.length > 0) {
            Array.from(multiAssignSelect.options).forEach(option => {
                if (assignedUsers.includes(option.value)) {
                    option.selected = true;
                }
            });
        }
       
        // Show the modal
        const assignModal = new bootstrap.Modal(document.getElementById('assignLeadModal'));
        assignModal.show();
    } catch (error) {
        console.error('Failed to open assign modal:', error);
        alert('Failed to load lead assignment data');
    }
}

// Open lead details modal
async function openLeadDetailsModal(leadId) {
    try {
        const lead = await apiCall(`/api/leads/${leadId}`);
        if (!lead) return;

        // Fill in the process flow modal with lead details
        const content = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Customer Name:</h6>
                    <p>${lead.customer_name}</p>
                    <h6>Contact Number:</h6>
                    <p>${lead.contact_number}</p>
                    <h6>Loan Type:</h6>
                    <p>${lead.loan_type}</p>
                    <h6>Status:</h6>
                    <p>${getStatusText(lead.status)}</p>
                </div>
                <div class="col-md-6">
                    <h6>Source:</h6>
                    <p>${lead.source}</p>
                    <h6>Referred By:</h6>
                    <p>${lead.referred_by || 'N/A'}</p>
                    <h6>Created:</h6>
                    <p>${new Date(lead.created_at).toLocaleDateString()}</p>
                    <h6>Last Updated:</h6>
                    <p>${new Date(lead.updated_at).toLocaleDateString()}</p>
                </div>
            </div>
            <hr>
            <div>
                <h6>Step Details:</h6>
                <div id="step-details-content">
                    <!-- Step-specific content will be loaded here -->
                    <p>Select a step above to view or update details.</p>
                </div>
            </div>
        `;
        document.getElementById('lead-profile-content').innerHTML = content;

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('leadProfileModal'));
        modal.show();

        // Handle step tab switching
        document.querySelectorAll('#processFlowTabs .nav-link').forEach(tab => {
            tab.onclick = function(e) {
                e.preventDefault();
                document.querySelectorAll('#processFlowTabs .nav-link').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                // Load step-specific content here if needed
                document.getElementById('step-details-content').innerHTML = `<p>Details for <b>${this.textContent}</b> will be shown here.</p>`;
            };
        });
    } catch (error) {
        alert('Failed to load lead details');
    }
}

// Assign lead (UI handler)
async function assignLead() {
    if (!currentLeadToAssign) {
        alert('Please select a lead first.');
        return;
    }
   
    const selectedOptions = Array.from(multiAssignSelect.selectedOptions);
    const selectedAssignees = selectedOptions.map(option => option.value);
   
    try {
        await apiAssignLeadToUsers(currentLeadToAssign, selectedAssignees);
        
        // Refresh leads
        leads = await getLeads();
        
        // Update UI
        updateDashboardStats();
        await renderLeadTables();
        renderTaskAllocationTable();
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('assignLeadModal')).hide();
    } catch (error) {
        console.error('Failed to assign lead:', error);
        alert('Failed to assign lead');
    }
}

// Clear notifications
async function clearNotifications() {
    try {
        await clearAllNotifications();
        notifications = [];
        renderNotifications();
    } catch (error) {
        console.error('Failed to clear notifications:', error);
        alert('Failed to clear notifications');
    }
}

// Populate customer select for documents
function populateCustomerSelect() {
    if (!documentCustomerSelect) return;
    documentCustomerSelect.innerHTML = '<option value="">Select a customer</option>';
   
    let customerLeads = leads;
   
    customerLeads.forEach(lead => {
        const option = document.createElement('option');
        option.value = lead.id;
        option.textContent = `${lead.customer_name} (${lead.id})`;
        documentCustomerSelect.appendChild(option);
    });
}

// Populate team members for multi-assign select
async function populateTeamMembers() {
    if (!multiAssignSelect) return;
    multiAssignSelect.innerHTML = '';
   
    try {
        // Get all users
        const users = await getUsers();
        
        // Add team members (CSOs, Financial Analysts, Legal Executives)
        users.forEach(user => {
            if (user.role === 'CSO' || user.role === 'Financial Analyst' || user.role === 'Legal Executive') {
                const option = document.createElement('option');
                option.value = user.name;
                option.textContent = `${user.name} (${user.role})`;
                multiAssignSelect.appendChild(option);
            }
        });
    } catch (error) {
        console.error('Failed to populate team members:', error);
    }
}

// Show documents for a specific lead
async function showDocumentsForLead(leadId) {
    // Switch to documents module
    showModule('documents');
   
    // Update active state in navbar
    moduleLinks.forEach(l => l.classList.remove('active'));
    document.querySelector('[data-module="documents"]').classList.add('active');
   
    // Update active state in sidebar
    const sidebarLinks = document.querySelectorAll('#sidebar-menu .nav-link');
    sidebarLinks.forEach(l => {
        if (l.getAttribute('data-module') === 'documents') {
            l.classList.add('active');
        } else {
            l.classList.remove('active');
        }
    });
   
    // Select the customer in the dropdown
    documentCustomerSelect.value = leadId;
    await loadCustomerDocuments(leadId);
}

// Load customer documents
async function loadCustomerDocuments(leadId) {
    try {
        const lead = leads.find(l => l.id === leadId);
        if (!lead) return;
       
        currentDocumentCustomer = lead;
        selectedCustomerName.textContent = `${lead.customer_name} (${lead.id})`;
        noCustomerSelected.classList.add('d-none');
        documentsContainer.classList.remove('d-none');
       
        const documents = await getDocuments(leadId);
        // Attach documents to currentDocumentCustomer so preview and downloads work
        currentDocumentCustomer.documents = documents || [];
        renderDocumentsList(documents);
    } catch (error) {
        console.error('Failed to load documents:', error);
        alert('Failed to load documents');
    }
}

// Render documents list
function renderDocumentsList(documents) {
    uploadedDocumentsList.innerHTML = '';
   
    if (!documents || documents.length === 0) {
        uploadedDocumentsList.innerHTML = '<p class="text-center text-muted py-4">No documents uploaded yet</p>';
        return;
    }
   
    // Group documents by category
    const documentsByCategory = {};
    documents.forEach(doc => {
        if (!documentsByCategory[doc.category]) {
            documentsByCategory[doc.category] = [];
        }
        documentsByCategory[doc.category].push(doc);
    });
   
    // Render each category
    Object.keys(documentsByCategory).forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'mb-4';
       
        const categoryName = getCategoryName(category);
        categoryDiv.innerHTML = `
            <div class="document-category">${categoryName}</div>
        `;
       
        documentsByCategory[category].forEach(doc => {
            const docElement = document.createElement('div');
            docElement.className = 'document-card';
            docElement.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center">
                        <i class="document-icon ${getFileIcon(doc.name)}"></i>
                        <div>
                            <h6 class="mb-0">${doc.name}</h6>
                            <small class="text-muted">Uploaded: ${formatTime(doc.uploaded_at)}</small>
                            <span class="document-status status-${doc.status}">${doc.status}</span>
                        </div>
                    </div>
                    <div class="document-actions">
                        <button class="btn btn-sm btn-outline-primary view-document-btn" data-id="${doc.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-success download-document-btn" data-id="${doc.id}">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-document-btn" data-id="${doc.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    </div>
            `;
            categoryDiv.appendChild(docElement);
        });
       
        uploadedDocumentsList.appendChild(categoryDiv);
    });
   
    // Add event listeners to document buttons
    document.querySelectorAll('.view-document-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const docId = this.getAttribute('data-id');
            viewDocument(docId);
        });
    });
   
    document.querySelectorAll('.download-document-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const docId = this.getAttribute('data-id');
            downloadDocument(docId);
        });
    });
   
    document.querySelectorAll('.delete-document-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const docId = this.getAttribute('data-id');
            deleteDocument(docId);
        });
    });
}

// Get category name
function getCategoryName(category) {
    const categories = {
        'identity': 'Identity Proof',
        'address': 'Address Proof',
        'income': 'Income Proof',
        'property': 'Property Documents',
        'bank': 'Bank Statements',
        'other': 'Other Documents'
    };
   
    return categories[category] || category;
}

// Get file icon based on extension
function getFileIcon(filename) {
    const extension = filename.split('.').pop().toLowerCase();
   
    switch(extension) {
        case 'pdf':
            return 'fas fa-file-pdf';
        case 'doc':
        case 'docx':
            return 'fas fa-file-word';
        case 'xls':
        case 'xlsx':
            return 'fas fa-file-excel';
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
            return 'fas fa-file-image';
        default:
            return 'fas fa-file';
    }
}

// View document
function viewDocument(docId) {
    if (!currentDocumentCustomer || !currentDocumentCustomer.documents) return;
   
    const document = currentDocumentCustomer.documents.find(d => d.id === docId);
    if (!document) return;
   
    documentPreviewTitle.textContent = document.name;
    documentPreviewContent.innerHTML = '';
   
    // Set download link
    downloadDocumentBtn.href = document.content;
    downloadDocumentBtn.download = document.name;
   
    // Show appropriate preview based on file type
    const extension = document.name.split('.').pop().toLowerCase();
   
    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
        // Image preview
        const img = document.createElement('img');
        img.src = document.content;
        img.className = 'img-fluid document-preview';
        img.style.display = 'block';
        documentPreviewContent.appendChild(img);
    } else if (extension === 'pdf') {
        // PDF preview (using object tag)
        const object = document.createElement('object');
        object.data = document.content;
        object.type = 'application/pdf';
        object.width = '100%';
        object.height = '500px';
        documentPreviewContent.appendChild(object);
       
        const fallback = document.createElement('p');
        fallback.innerHTML = `Your browser doesn't support PDF preview. <a href="${document.content}" download="${document.name}">Download instead</a>`;
        object.appendChild(fallback);
    } else {
        // Unsupported file type
        documentPreviewContent.innerHTML = `
            <i class="fas fa-file fa-5x text-muted mb-3"></i>
            <p>Preview not available for this file type.</p>
            <p>Please download the file to view it.</p>
        `;
    }
   
    // Show modal
    const modal = new bootstrap.Modal(documentPreviewModal);
    modal.show();
}

// Download document
function downloadDocument(docId) {
    if (!currentDocumentCustomer || !currentDocumentCustomer.documents) return;
   
    const document = currentDocumentCustomer.documents.find(d => d.id === docId);
    if (!document) return;
   
    const a = document.createElement('a');
    a.href = document.content;
    a.download = document.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Delete document (UI handler)
async function deleteDocument(docId) {
    if (!currentDocumentCustomer) return;
    if (confirm('Are you sure you want to delete this document?')) {
        try {
            await apiDeleteDocument(docId);
            // Refresh documents from backend
            await loadCustomerDocuments(currentDocumentCustomer.id);
        } catch (error) {
            alert('Failed to delete document');
        }
    }
}

// Handle file upload
async function handleFileUpload(files) {
    if (!currentDocumentCustomer) {
        alert('Please select a customer first.');
        return;
    }
    const category = documentCategory.value;
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const documentData = {
                    id: `doc_${Date.now()}_${i}`,
                    lead_id: currentDocumentCustomer.id,
                    name: file.name,
                    content: e.target.result,
                    category: category,
                    status: 'pending'
                };
                await apiUploadDocument(documentData);
                // Refresh documents from backend
                await loadCustomerDocuments(currentDocumentCustomer.id);
            } catch (error) {
                alert('Failed to upload document');
            }
        };
        reader.readAsDataURL(file);
    }
}

// Login functionality
loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    loginError.style.display = 'none';

    try {
        const result = await login(username, password);
        if (result.success) {
            window.location.href = '/';
        } else {
            loginError.style.display = 'block';
        }
    } catch (error) {
        loginError.style.display = 'block';
    }
});

// Logout functionality
logoutBtn.addEventListener('click', function() {
    logout();
});

// Module navigation
moduleLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const moduleId = this.getAttribute('data-module');
        window.location.hash = moduleId; // update hash in URL
        showModule(moduleId);

        // Update active state in navbar
        moduleLinks.forEach(l => l.classList.remove('active'));
        this.classList.add('active');

        // Update active state in sidebar
        const sidebarLinks = document.querySelectorAll('#sidebar-menu .nav-link');
        sidebarLinks.forEach(l => l.classList.remove('active'));
        const sideLink = document.querySelector(`#sidebar-menu [data-module="${moduleId}"]`);
        if (sideLink) sideLink.classList.add('active');
    });
});



async function fetchEmployees() {
    const users = await getUsers();
    const tbody = document.querySelector('#employee-table tbody');
    tbody.innerHTML = '';
    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.username}</td>
            <td>${user.name}</td>
            <td>${user.role}</td>
            <td>
                ${user.username !== 'admin' ? `<button class="btn btn-danger btn-sm remove-employee-btn" data-username="${user.username}">Remove</button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
    // Remove employee event
    document.querySelectorAll('.remove-employee-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const username = this.getAttribute('data-username');
            if (confirm('Remove this employee?')) {
                await apiCall('/api/users', {
                    method: 'DELETE',
                    body: JSON.stringify({ username })
                });
                fetchEmployees();
            }
        });
    });
}

// Add employee form handler
const addEmployeeForm = document.getElementById('add-employee-form');
if (addEmployeeForm) {
    addEmployeeForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = document.getElementById('emp-username').value;
        const password = document.getElementById('emp-password').value;
        const name = document.getElementById('emp-name').value;
        const role = document.getElementById('emp-role').value;
        await apiCall('/api/users', {
            method: 'POST',
            body: JSON.stringify({ username, password, name, role })
        });
        addEmployeeForm.reset();
        fetchEmployees();
    });
}

// On admin module show, fetch employees
function showModule(moduleId) {
    moduleSections.forEach(section => {
        section.classList.remove('active-module');
    });
    const targetModule = document.getElementById(`${moduleId}-module`);
    if (targetModule) {
        targetModule.classList.add('active-module');
        if (moduleId === 'admin') fetchEmployees();
    }
   
    // Special handling for documents module
    if (moduleId === 'documents') {
        if (!currentDocumentCustomer) {
            noCustomerSelected.classList.remove('d-none');
            documentsContainer.classList.add('d-none');
        }
    }
   
    // Special handling for task allocation module (only for department head)
    if (moduleId === 'task-allocation') {
        if (!currentUser || currentUser.role !== 'Department Head') {
            alert('You do not have permission to access this module.');
            document.getElementById('dashboard-module').classList.add('active-module');
        } else {
            renderTaskAllocationTable();
        }
    }
}

// Show appropriate dashboard based on role
function showDashboard(role) {
    userDashboards.forEach(dashboard => {
        dashboard.classList.remove('active-dashboard');
    });

    let dashboardId;
    switch(role) {
        case 'admin':
            dashboardId = 'admin-dashboard';
            break;
        case 'cso-manager':
            dashboardId = 'cso-manager-dashboard';
            break;
        case 'cso':
            dashboardId = 'cso-dashboard';
            break;
        case 'telecaller':
            dashboardId = 'telecaller-dashboard';
            break;
        case 'bank-finalizer':
            dashboardId = 'bank-finalizer-dashboard';
            break;
        case 'bank-followup-officer':
            dashboardId = 'bank-followup-dashboard';
            break;
        case 'financial-analyst':
            dashboardId = 'financial-analyst-dashboard';
            break;
        case 'legal-executive':
            dashboardId = 'legal-dashboard';
            break;
        case 'accounts':
            dashboardId = 'accounts-dashboard';
            break;
        default:
            dashboardId = 'admin-dashboard';
    }

    const el = document.getElementById(dashboardId);
    if (el) el.classList.add('active-dashboard');
}

// Event listeners
createLeadBtn.addEventListener('click', createNewLead);
updateLeadBtn.addEventListener('click', updateLead);
confirmAssignBtn.addEventListener('click', assignLead);
clearNotificationsBtn.addEventListener('click', clearNotifications);
viewAllLeadsBtn.addEventListener('click', function(e) {
    e.preventDefault();
    showModule('lead-master');
   
    // Update active state in navbar
    moduleLinks.forEach(l => l.classList.remove('active'));
    document.querySelector('[data-module="lead-master"]').classList.add('active');
   
    // Update active state in sidebar
    const sidebarLinks = document.querySelectorAll('#sidebar-menu .nav-link');
    sidebarLinks.forEach(l => {
        if (l.getAttribute('data-module') === 'lead-master') {
            l.classList.add('active');
        } else {
            l.classList.remove('active');
        }
    });
});

// Lead tabs
leadTabs.forEach(tab => {
    tab.addEventListener('click', async function(e) {
        e.preventDefault();
       
        // Update active tab
        leadTabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
       
        // Filter leads based on tab
        const tabType = this.getAttribute('data-tab');
        const leadMasterTable = document.getElementById('lead-master-table').querySelector('tbody');
        leadMasterTable.innerHTML = '';
       
        let filteredLeads = leads;
       
        if (tabType === 'hot-leads') {
            filteredLeads = filteredLeads.filter(lead => lead.status === 'hot');
        } else if (tabType === 'rejected-leads') {
            filteredLeads = filteredLeads.filter(lead => lead.status === 'rejected');
        }
       
        if (filteredLeads.length === 0) {
            leadMasterTable.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No leads available</td></tr>';
        } else {
            for (const lead of filteredLeads) {
                const assignedUsers = await getAssignedUsers(lead.id);
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${lead.id}</td>
                    <td>${lead.customer_name}</td>
                    <td>${lead.contact_number}</td>
                    <td>${lead.loan_type}</td>
                    <td>${formatAssignees(assignedUsers)}</td>
                    <td><span class="badge bg-${getStatusBadgeClass(lead.status)}">${getStatusText(lead.status)}</span></td>
                    <td>
                        ${currentUser && currentUser.role === 'Department Head' ?
                            `<button class="btn btn-sm btn-primary edit-btn" data-id="${lead.id}">Edit</button>` :
                            ''
                        }
                        ${currentUser && currentUser.role === 'Department Head' ?
                            `<button class="btn btn-sm btn-success assign-btn ms-1" data-id="${lead.id}">Assign</button>` :
                            ''
                        }
                        <button class="btn btn-sm btn-info view-btn ms-1" data-id="${lead.id}">View</button>
                    </td>
                `;
                leadMasterTable.appendChild(row);
            }
           
            // Add event listeners to buttons
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const leadId = this.getAttribute('data-id');
                    openEditLeadModal(leadId);
                });
            });
           
            document.querySelectorAll('.assign-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const leadId = this.getAttribute('data-id');
                    openAssignLeadModal(leadId);
                });
            });
           
            document.querySelectorAll('.view-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const leadId = this.getAttribute('data-id');
                    window.location.href = `/lead/${leadId}`; // open in same tab
                    // OR: window.open(`/lead/${leadId}`, '_blank'); // open in new tab
                });
            });
        }
    });
});

// Document-related event listeners
documentCustomerSelect.addEventListener('change', function() {
    const leadId = this.value;
    if (leadId) {
        loadCustomerDocuments(leadId);
    } else {
        noCustomerSelected.classList.remove('d-none');
        documentsContainer.classList.add('d-none');
        currentDocumentCustomer = null;
    }
});

browseFilesBtn.addEventListener('click', function() {
    documentUpload.click();
});

documentUpload.addEventListener('change', function() {
    handleFileUpload(this.files);
    this.value = ''; // Reset input
});

documentDropzone.addEventListener('click', function() {
    documentUpload.click();
});

documentDropzone.addEventListener('dragover', function(e) {
    e.preventDefault();
    this.classList.add('active');
});

documentDropzone.addEventListener('dragleave', function() {
    this.classList.remove('active');
});

documentDropzone.addEventListener('drop', function(e) {
    e.preventDefault();
    this.classList.remove('active');
    handleFileUpload(e.dataTransfer.files);
});

addDocumentBtn.addEventListener('click', function() {
    if (!currentDocumentCustomer) {
        alert('Please select a customer first.');
        return;
    }
    documentUpload.click();
});

// Check if user is already logged in (for page refresh)
document.addEventListener('DOMContentLoaded', function() {
    if (window.currentUser && window.currentUser !== 'null') {
        currentUser = window.currentUser;
        loginScreen.classList.add('d-none');
        mainApplication.classList.remove('d-none');
        userNameElement.textContent = currentUser.name;
        userRoleElement.textContent = currentUser.role;
        showDashboard(currentUser.role.toLowerCase().replace(' ', '-'));
        initApp();
    } else {
        loginScreen.classList.remove('d-none');
        mainApplication.classList.add('d-none');
    }
    if (window.location.hash) {
        const moduleId = window.location.hash.replace('#', '');
        showModule(moduleId);
        // Set active state in navbar/sidebar
        moduleLinks.forEach(l => l.classList.remove('active'));
        const navLink = document.querySelector(`[data-module="${moduleId}"]`);
        if (navLink) navLink.classList.add('active');
        const sidebarLinks = document.querySelectorAll('#sidebar-menu .nav-link');
        sidebarLinks.forEach(l => l.classList.remove('active'));
        const sideLink = document.querySelector(`#sidebar-menu [data-module="${moduleId}"]`);
        if (sideLink) sideLink.classList.add('active');
    }
});

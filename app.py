from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from config import Config
from models import init_db, get_user_by_username, get_all_leads, get_lead_by_id, create_lead, update_lead
from models import delete_lead, get_assignments_for_lead, assign_lead, get_assigned_users
from models import get_documents_for_lead, add_document, delete_document, get_notifications, add_notification, clear_notifications
import json
from datetime import datetime
from models import update_lead_section

app = Flask(__name__)
app.config.from_object(Config)
app.secret_key = Config.SECRET_KEY

# Initialize database
with app.app_context():
    init_db()

@app.route('/')
def index():
    # If not logged in, redirect to login (login route renders same template but with no session user)
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template('index.html', user=session['user'])

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        user = get_user_by_username(username)
        if user and user['password'] == password:
            session['user'] = {
                'username': user['username'],
                'name': user['name'],
                'role': user['role']
            }
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'message': 'Invalid username or password'})
    
    # Render the single-page app (which contains both login screen and main app)
    return render_template('index.html')

# filepath: c:\Users\USER\Desktop\Muhsin Main\app.py
@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('login'))  

@app.route('/api/leads', methods=['GET', 'POST'])
def api_leads():
    if 'user' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    if request.method == 'GET':
        leads = get_all_leads()
        return jsonify(leads)
    
    elif request.method == 'POST':
        data = request.get_json()
        lead_id = create_lead(data)
        add_notification('New Lead Created', f'New lead created for {data["customer_name"]} ({data["loan_type"]})', False)
        return jsonify({'success': True, 'lead_id': lead_id})

@app.route('/api/leads/<lead_id>', methods=['GET', 'PUT', 'DELETE'])
def api_lead(lead_id):
    if 'user' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    if request.method == 'GET':
        lead = get_lead_by_id(lead_id)
        if lead:
            return jsonify(lead)
        return jsonify({'error': 'Lead not found'}), 404
    
    elif request.method == 'PUT':
        data = request.get_json()
        update_lead(lead_id, data)
        add_notification('Lead Updated', f'Lead {lead_id} has been updated', False)
        return jsonify({'success': True})
    
    elif request.method == 'DELETE':
        delete_lead(lead_id)
        return jsonify({'success': True})

@app.route('/api/assignments/<lead_id>', methods=['GET', 'POST'])
def api_assignments(lead_id):
    if 'user' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    if request.method == 'GET':
        assignments = get_assignments_for_lead(lead_id)
        return jsonify(assignments)
    
    elif request.method == 'POST':
        data = request.get_json()
        assigned_to = data.get('assigned_to', [])
        assign_lead(lead_id, assigned_to, session['user']['name'])
        
        # Add notification
        add_notification('Lead Assigned', f'Lead {lead_id} has been assigned to {", ".join(assigned_to)}', False)
        
        # Add notifications for assigned users (recipient-specific)
        for assignee in assigned_to:
            if assignee != session['user']['name']:
                add_notification('New Lead Assigned', f'Lead {lead_id} has been assigned to you', True, assignee)
        
        return jsonify({'success': True})

@app.route('/api/documents/<lead_id>', methods=['GET', 'POST'])
def api_documents(lead_id):
    if 'user' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    if request.method == 'GET':
        documents = get_documents_for_lead(lead_id)
        return jsonify(documents)

    elif request.method == 'POST':
        data = request.get_json()
        document_data = {
            'id': data['id'],
            'lead_id': lead_id,
            'name': data['name'],
            'content': data['content'],
            'category': data['category'],
            'uploaded_by': session['user']['name'],
            'status': data.get('status', 'pending'),
            'note': data.get('note', '')
        }
        add_document(document_data)
        add_notification('Document Uploaded', f'A new document has been uploaded for lead {lead_id}', False)
        return jsonify({'success': True})

@app.route('/api/documents/<document_id>', methods=['DELETE'])
def api_document(document_id):
    if 'user' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    delete_document(document_id)
    return jsonify({'success': True})

@app.route('/api/notifications', methods=['GET', 'DELETE'])
def api_notifications():
    if 'user' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    if request.method == 'GET':
        notifications = get_notifications(session['user']['name'])
        return jsonify(notifications)
    
    elif request.method == 'DELETE':
        clear_notifications()
        return jsonify({'success': True})

@app.route('/api/users')
def api_users():
    if 'user' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    # Fetch from DB instead of hardcoded
    from models import get_all_users
    users = get_all_users()
    return jsonify(users)

@app.route('/lead/<lead_id>')
def lead_profile(lead_id):
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template('lead_profile.html', user=session['user'], lead_id=lead_id)

@app.route('/api/users', methods=['POST', 'DELETE'])
def manage_users():
    if 'user' not in session or session['user']['role'] != 'Admin':
        return jsonify({'error': 'Unauthorized'}), 401

    from models import add_user, remove_user

    if request.method == 'POST':
        data = request.get_json()
        add_user(data['username'], data['password'], data['name'], data['role'])
        return jsonify({'success': True})

    elif request.method == 'DELETE':
        data = request.get_json()
        remove_user(data['username'])
        return jsonify({'success': True})
    

@app.route('/api/leads/<lead_id>/section/<section>', methods=['PUT'])
def api_lead_section(lead_id, section):
    if 'user' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.get_json()
    # Role checks
    if section == "legal" and session['user']['role'] != "Legal Executive":
        return jsonify({'error': 'Forbidden'}), 403
    if section == "financial" and session['user']['role'] != "Financial Analyst":
        return jsonify({'error': 'Forbidden'}), 403
    if section == "bank" and session['user']['role'] != "Bank Finalizer":
        return jsonify({'error': 'Forbidden'}), 403
    update_lead_section(lead_id, section, data)
    return jsonify({'success': True})



if __name__ == '__main__':
    app.run(debug=True)
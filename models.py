from flask_mysqldb import MySQL
import mysql.connector
from config import Config
import json
from datetime import datetime

def get_db_connection():
    return mysql.connector.connect(
        host=Config.MYSQL_HOST,
        user=Config.MYSQL_USER,
        password=Config.MYSQL_PASSWORD,
        database=Config.MYSQL_DB,
        port=Config.MYSQL_PORT
    )

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(100) NOT NULL,
            name VARCHAR(100) NOT NULL,
            role VARCHAR(50) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create leads table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS leads (
            id VARCHAR(20) PRIMARY KEY,
            customer_name VARCHAR(100) NOT NULL,
            contact_number VARCHAR(20) NOT NULL,
            loan_type VARCHAR(50) NOT NULL,
            source VARCHAR(50) NOT NULL,
            status VARCHAR(20) NOT NULL,
            referred_by VARCHAR(100),
            loan_amount DECIMAL(15, 2),
            rejection_reason TEXT,
            rejected_by VARCHAR(100),
            tat_breach BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ''')
    
    # Create assignments table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS assignments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            lead_id VARCHAR(20) NOT NULL,
            assigned_to VARCHAR(100) NOT NULL,
            assigned_by VARCHAR(100) NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
        )
    ''')
    
    # Create documents table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS documents (
            id VARCHAR(50) PRIMARY KEY,
            lead_id VARCHAR(20) NOT NULL,
            name VARCHAR(255) NOT NULL,
            content LONGTEXT NOT NULL,
            category VARCHAR(50) NOT NULL,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            uploaded_by VARCHAR(100) NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
        )
    ''')
    
    # Create notifications table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            urgent BOOLEAN DEFAULT FALSE,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            read_status BOOLEAN DEFAULT FALSE,
            recipient VARCHAR(100)
        )
    ''')

    def add_column_if_not_exists(cursor, table, column, coltype):
        cursor.execute(f"SHOW COLUMNS FROM {table} LIKE '{column}'")
        if not cursor.fetchone():
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {coltype}")

    add_column_if_not_exists(cursor, "leads", "secondary_profile", "JSON DEFAULT NULL")
    add_column_if_not_exists(cursor, "leads", "legal_notes", "TEXT DEFAULT NULL")
    add_column_if_not_exists(cursor, "leads", "financial_notes", "TEXT DEFAULT NULL")
    add_column_if_not_exists(cursor, "leads", "bank_finalization", "JSON DEFAULT NULL")
    add_column_if_not_exists(cursor, "leads", "merits", "TEXT DEFAULT NULL")
    add_column_if_not_exists(cursor, "leads", "demerits", "TEXT DEFAULT NULL")
    add_column_if_not_exists(cursor, "documents", "note", "TEXT DEFAULT NULL") 

    
    # Insert default users if they don't exist
    default_users = [
        ('admin', 'adminpass', 'Admin User', 'Admin')
    ]
    
    for user in default_users:
        cursor.execute('SELECT id FROM users WHERE username = %s', (user[0],))
        if not cursor.fetchone():
            cursor.execute(
                'INSERT INTO users (username, password, name, role) VALUES (%s, %s, %s, %s)',
                user
            )
    
    conn.commit()
    cursor.close()
    conn.close()

# User model functions
def get_user_by_username(username):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT * FROM users WHERE username = %s', (username,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    return user

def update_lead_section(lead_id, section, data):
    conn = get_db_connection()
    cursor = conn.cursor()
    if section == "primary":
        cursor.execute('''
            UPDATE leads SET customer_name=%s, contact_number=%s, loan_type=%s, source=%s, status=%s, referred_by=%s, updated_at=CURRENT_TIMESTAMP
            WHERE id=%s
        ''', (data['customer_name'], data['contact_number'], data['loan_type'], data['source'], data['status'], data.get('referred_by', ''), lead_id))
    elif section == "secondary":
        cursor.execute('UPDATE leads SET secondary_profile=%s, updated_at=CURRENT_TIMESTAMP WHERE id=%s', (json.dumps(data), lead_id))
    elif section == "legal":
        cursor.execute('UPDATE leads SET legal_notes=%s, updated_at=CURRENT_TIMESTAMP WHERE id=%s', (data['legal_notes'], lead_id))
    elif section == "financial":
        cursor.execute('UPDATE leads SET financial_notes=%s, updated_at=CURRENT_TIMESTAMP WHERE id=%s', (data['financial_notes'], lead_id))
    elif section == "bank":
        cursor.execute('UPDATE leads SET bank_finalization=%s, updated_at=CURRENT_TIMESTAMP WHERE id=%s', (json.dumps(data), lead_id))
    elif section == "merits":
        cursor.execute('UPDATE leads SET merits=%s, updated_at=CURRENT_TIMESTAMP WHERE id=%s', (data['merits'], lead_id))
    elif section == "demerits":
        cursor.execute('UPDATE leads SET demerits=%s, updated_at=CURRENT_TIMESTAMP WHERE id=%s', (data['demerits'], lead_id))
    conn.commit()
    cursor.close()
    conn.close()

# Lead model functions
def get_all_leads():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT * FROM leads ORDER BY created_at DESC')
    leads = cursor.fetchall()
    cursor.close()
    conn.close()
    return leads

def get_lead_by_id(lead_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT * FROM leads WHERE id = %s', (lead_id,))
    lead = cursor.fetchone()
    cursor.close()
    conn.close()
    return lead

def create_lead(lead_data):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Generate lead ID based on current count
    cursor.execute('SELECT COUNT(*) FROM leads')
    result = cursor.fetchone()
    count = result[0] if result else 0
    lead_id = f"LM{(count + 1):03d}"
    
    cursor.execute('''
        INSERT INTO leads (id, customer_name, contact_number, loan_type, source, status, referred_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    ''', (lead_id, lead_data['customer_name'], lead_data['contact_number'], 
          lead_data['loan_type'], lead_data['source'], lead_data['status'], 
          lead_data.get('referred_by', '')))
    
    conn.commit()
    cursor.close()
    conn.close()
    return lead_id

def update_lead(lead_id, lead_data):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE leads 
        SET customer_name = %s, contact_number = %s, loan_type = %s, 
            source = %s, status = %s, referred_by = %s, updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
    ''', (lead_data['customer_name'], lead_data['contact_number'], 
          lead_data['loan_type'], lead_data['source'], lead_data['status'], 
          lead_data.get('referred_by', ''), lead_id))
    
    conn.commit()
    cursor.close()
    conn.close()

def delete_lead(lead_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM leads WHERE id = %s', (lead_id,))
    conn.commit()
    cursor.close()
    conn.close()

# Assignment model functions
def get_assignments_for_lead(lead_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute('''
        SELECT * FROM assignments 
        WHERE lead_id = %s 
        ORDER BY timestamp DESC
    ''', (lead_id,))
    assignments = cursor.fetchall()
    cursor.close()
    conn.close()
    return assignments

def assign_lead(lead_id, assigned_to, assigned_by):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # First remove any existing assignments for this lead
    cursor.execute('DELETE FROM assignments WHERE lead_id = %s', (lead_id,))
    
    # Add new assignments
    for assignee in assigned_to:
        cursor.execute('''
            INSERT INTO assignments (lead_id, assigned_to, assigned_by)
            VALUES (%s, %s, %s)
        ''', (lead_id, assignee, assigned_by))
    
    conn.commit()
    cursor.close()
    conn.close()

def get_assigned_users(lead_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute('''
        SELECT assigned_to FROM assignments 
        WHERE lead_id = %s
    ''', (lead_id,))
    assignments = cursor.fetchall()
    cursor.close()
    conn.close()
    return [a['assigned_to'] for a in assignments]

# Document model functions
def get_documents_for_lead(lead_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute('''
        SELECT * FROM documents 
        WHERE lead_id = %s 
        ORDER BY uploaded_at DESC
    ''', (lead_id,))
    documents = cursor.fetchall()
    cursor.close()
    conn.close()
    return documents

def add_document(document_data):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO documents (id, lead_id, name, content, category, uploaded_by, status, note)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    ''', (document_data['id'], document_data['lead_id'], document_data['name'],
          document_data['content'], document_data['category'], 
          document_data['uploaded_by'], document_data.get('status', 'pending'),
          document_data.get('note', '')))
    conn.commit()
    cursor.close()
    conn.close()
    
def delete_document(document_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM documents WHERE id = %s', (document_id,))
    conn.commit()
    cursor.close()
    conn.close()

# Notification model functions
def get_notifications(recipient=None):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    if recipient:
        cursor.execute('''
            SELECT * FROM notifications 
            WHERE recipient IS NULL OR recipient = %s
            ORDER BY timestamp DESC
        ''', (recipient,))
    else:
        cursor.execute('SELECT * FROM notifications ORDER BY timestamp DESC')
    
    notifications = cursor.fetchall()
    cursor.close()
    conn.close()
    return notifications

def add_notification(title, message, urgent=False, recipient=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO notifications (title, message, urgent, recipient)
        VALUES (%s, %s, %s, %s)
    ''', (title, message, urgent, recipient))
    
    conn.commit()
    cursor.close()
    conn.close()

def clear_notifications():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM notifications')
    conn.commit()
    cursor.close()
    conn.close()

def get_all_users():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT username, name, role FROM users')
    users = cursor.fetchall()
    cursor.close()
    conn.close()
    return users


def add_user(username, password, name, role):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO users (username, password, name, role) VALUES (%s, %s, %s, %s)',
        (username, password, name, role)
    )
    conn.commit()
    cursor.close()
    conn.close()


def remove_user(username):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM users WHERE username = %s', (username,))
    conn.commit()
    cursor.close()
    conn.close()
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-this';
const JWT_EXPIRES_IN = '2h';

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Database Initialization
const dbPath = path.join(__dirname, 'fusiondocs.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to SQLite database at', dbPath);
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // Create documents table
    db.run(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        number TEXT NOT NULL UNIQUE,
        date TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        billing_address TEXT NOT NULL,
        shipping_address TEXT NOT NULL,
        gstin TEXT,
        po_reference TEXT,
        discount_type TEXT,
        discount_value REAL,
        transaction_type TEXT NOT NULL,
        bom_items TEXT NOT NULL,
        totals TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user'
      )
    `);

    seedAuthUser();

    // Check if table is empty to insert seed data
    db.get('SELECT COUNT(*) as count FROM documents', (err, row) => {
      if (err) {
        console.error('Error checking document count:', err.message);
        return;
      }
      if (row.count === 0) {
        seedDatabase();
      }
    });
  });
}

function seedAuthUser() {
  const defaultUsername = 'fusionservices@gmail.com';
  const defaultPassword = 'fusion';
  const defaultRole = 'admin';
  const passwordHash = bcrypt.hashSync(defaultPassword, 10);

  db.get('SELECT * FROM users WHERE username = ?', [defaultUsername], (err, existingUser) => {
    if (err) {
      console.error('Error checking auth user:', err.message);
      return;
    }

    if (existingUser) {
      return;
    }

    db.get('SELECT * FROM users WHERE username = ?', ['admin'], (adminErr, adminUser) => {
      if (adminErr) {
        console.error('Error checking admin user:', adminErr.message);
        return;
      }

      if (adminUser) {
        db.run(
          'UPDATE users SET username = ?, password_hash = ? WHERE id = ?',
          [defaultUsername, passwordHash, adminUser.id],
          (updateErr) => {
            if (updateErr) {
              console.error('Error updating admin auth user:', updateErr.message);
            } else {
              console.log(`Updated auth user to ${defaultUsername}`);
            }
          }
        );
      } else {
        db.run(
          'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
          [defaultUsername, passwordHash, defaultRole],
          (insertErr) => {
            if (insertErr) {
              console.error('Error seeding auth user:', insertErr.message);
            } else {
              console.log(`Seeded default auth user: ${defaultUsername} (${defaultPassword})`);
            }
          }
        );
      }
    });
  });
}

function seedDatabase() {
  console.log('Seeding initial documents...');
  const seedDocs = [
    {
      type: 'Quote',
      number: 'QT-001',
      date: '2026-06-15',
      customer_name: 'Acme Corporates Ltd',
      billing_address: '102 Industrial Area, Sector 4, Gandhinagar, Gujarat',
      shipping_address: '102 Industrial Area, Sector 4, Gandhinagar, Gujarat',
      gstin: '24AAAAC1234A1Z1',
      po_reference: 'PO-2026-991',
      discount_type: 'percentage',
      discount_value: 5,
      transaction_type: 'CGST_SGST',
      bom_items: JSON.stringify([
        { id: 1, name: 'Precision Steel Rods', hsn: '7214', quantity: 200, unit: 'pcs', unitPrice: 45000 }, // 450.00
        { id: 2, name: 'Heavy Duty Bearings', hsn: '8482', quantity: 50, unit: 'pcs', unitPrice: 120000 }  // 1200.00
      ]),
      totals: JSON.stringify({
        totalQuantity: 250,
        subtotalPaise: 15000000, // 1,50,000.00
        discountPaise: 750000,   // 7,500.00 (5%)
        taxBasisPaise: 14250000, // 1,42,500.00
        cgstPaise: 1282500,      // 9% CGST = 12,825.00
        sgstPaise: 1282500,      // 9% SGST = 12,825.00
        igstPaise: 0,
        grandTotalPaise: 16815000, // 1,68,150.00
        grandTotalWithoutGstPaise: 14250000
      })
    },
    {
      type: 'Tax Invoice',
      number: 'INV-001',
      date: '2026-06-16',
      customer_name: 'Apex Global Enterprises',
      billing_address: 'Building 4B, Tech Park, Gachibowli, Hyderabad, Telangana',
      shipping_address: 'Building 4B, Tech Park, Gachibowli, Hyderabad, Telangana',
      gstin: '36ABCDE1234F2Z5',
      po_reference: 'PO-7721-AX',
      discount_type: 'flat',
      discount_value: 100000, // 1,000.00 flat
      transaction_type: 'IGST',
      bom_items: JSON.stringify([
        { id: 1, name: 'High-Speed Networking Switches', hsn: '8517', quantity: 5, unit: 'pcs', unitPrice: 2800000 }, // 28,000.00
        { id: 2, name: 'Cat6 Ethernet Spool (305m)', hsn: '8544', quantity: 12, unit: 'coils', unitPrice: 850000 }    // 8,500.00
      ]),
      totals: JSON.stringify({
        totalQuantity: 17,
        subtotalPaise: 24200000, // 2,42,000.00
        discountPaise: 100000,   // 1,000.00
        taxBasisPaise: 24100000, // 2,41,000.00
        cgstPaise: 0,
        sgstPaise: 0,
        igstPaise: 4338000,      // 18% IGST = 43,380.00
        grandTotalPaise: 28438000, // 2,84,380.00
        grandTotalWithoutGstPaise: 24100000
      })
    },
    {
      type: 'Delivery Challan',
      number: 'DC-001',
      date: '2026-06-17',
      customer_name: 'Zenith Logistics',
      billing_address: 'Sector 15, Kalamboli, Navi Mumbai, Maharashtra',
      shipping_address: 'Warehouse A1, Gate 5, JNPT Area, Uran, Navi Mumbai, Maharashtra',
      gstin: '27GHIJK5678L1Z9',
      po_reference: 'PO-LOG-009',
      discount_type: 'percentage',
      discount_value: 0,
      transaction_type: 'CGST_SGST',
      bom_items: JSON.stringify([
        { id: 1, name: 'Industrial Conveyor Belts (Heavy)', hsn: '4010', quantity: 3, unit: 'rolls', unitPrice: 15000000 } // 1,50,000.00
      ]),
      totals: JSON.stringify({
        totalQuantity: 3,
        subtotalPaise: 45000000, // 4,50,000.00
        discountPaise: 0,
        taxBasisPaise: 45000000,
        cgstPaise: 0, // Challans usually don't carry tax amounts, but we compute it if needed
        sgstPaise: 0,
        igstPaise: 0,
        grandTotalPaise: 45000000,
        grandTotalWithoutGstPaise: 45000000
      })
    }
  ];

  const stmt = db.prepare(`
    INSERT INTO documents (
      type, number, date, customer_name, billing_address, shipping_address,
      gstin, po_reference, discount_type, discount_value, transaction_type,
      bom_items, totals
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  seedDocs.forEach((doc) => {
    stmt.run([
      doc.type,
      doc.number,
      doc.date,
      doc.customer_name,
      doc.billing_address,
      doc.shipping_address,
      doc.gstin,
      doc.po_reference,
      doc.discount_type,
      doc.discount_value,
      doc.transaction_type,
      doc.bom_items,
      doc.totals
    ]);
  });
  stmt.finalize(() => {
    console.log('Database seeded successfully.');
  });
}

// Authentication helpers
function authenticateToken(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.user = payload;
    next();
  });
}

// Auth Endpoints
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Authentication error' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 2 * 60 * 60 * 1000
    });

    res.json({ username: user.username, role: user.role });
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: false });
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    res.json({ username: payload.username, role: payload.role });
  });
});

app.use('/api/documents', authenticateToken);

// REST API Endpoints

// 1. Get next auto-incremented document number
app.get('/api/documents/next-number', (req, res) => {
  const { type } = req.query;
  if (!type) {
    return res.status(400).json({ error: 'Document type is required' });
  }

  let prefix = 'QT-';
  if (type === 'Tax Invoice') {
    prefix = 'INV-';
  } else if (type === 'Delivery Challan') {
    prefix = 'DC-';
  }

  db.all('SELECT number FROM documents WHERE type = ?', [type], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error fetching numbers' });
    }

    let maxNum = 0;
    rows.forEach((row) => {
      // e.g. INV-001 -> 001 -> 1
      const part = row.number.substring(prefix.length);
      const numVal = parseInt(part, 10);
      if (!isNaN(numVal) && numVal > maxNum) {
        maxNum = numVal;
      }
    });

    const nextNum = maxNum + 1;
    const formattedNum = `${prefix}${String(nextNum).padStart(3, '0')}`;
    res.json({ nextNumber: formattedNum });
  });
});

// 2. Search and list past documents
app.get('/api/documents', (req, res) => {
  const { customer, number, date } = req.query;
  let sql = 'SELECT * FROM documents WHERE 1=1';
  const params = [];

  if (customer) {
    sql += ' AND customer_name LIKE ?';
    params.push(`%${customer}%`);
  }
  if (number) {
    sql += ' AND number LIKE ?';
    params.push(`%${number}%`);
  }
  if (date) {
    sql += ' AND date = ?';
    params.push(date);
  }

  sql += ' ORDER BY created_at DESC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database query failed' });
    }

    // Parse the JSON strings before sending to front-end
    const documents = rows.map((row) => ({
      ...row,
      bom_items: JSON.parse(row.bom_items),
      totals: JSON.parse(row.totals)
    }));

    res.json(documents);
  });
});

// 3. Save a generated document
app.post('/api/documents', (req, res) => {
  const {
    type,
    number,
    date,
    customer_name,
    billing_address,
    shipping_address,
    gstin,
    po_reference,
    discount_type,
    discount_value,
    transaction_type,
    bom_items,
    totals
  } = req.body;

  // Real-time server side validation
  if (!type || !number || !date || !customer_name || !billing_address || !shipping_address) {
    return res.status(400).json({ error: 'Missing mandatory fields' });
  }

  if (!bom_items || !Array.isArray(bom_items) || bom_items.length === 0) {
    return res.status(400).json({ error: 'Bill of Materials (BOM) must contain at least one item' });
  }

  const bomItemsStr = JSON.stringify(bom_items);
  const totalsStr = JSON.stringify(totals);

  const sql = `
    INSERT INTO documents (
      type, number, date, customer_name, billing_address, shipping_address,
      gstin, po_reference, discount_type, discount_value, transaction_type,
      bom_items, totals
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [
      type,
      number,
      date,
      customer_name,
      billing_address,
      shipping_address,
      gstin,
      po_reference,
      discount_type,
      discount_value,
      transaction_type,
      bomItemsStr,
      totalsStr
    ],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: `Document number ${number} already exists.` });
        }
        return res.status(500).json({ error: 'Failed to save document: ' + err.message });
      }
      res.status(201).json({ id: this.lastID, message: 'Document saved successfully!' });
    }
  );
});

// Start Server
app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});

// Required libraries
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

// Allow requests from frontend
const corsOptions = {
    origin: 'http://localhost:3000', // Replace with your frontend's URL if hosted differently
    methods: ['GET', 'POST'],
};
app.use(cors(corsOptions));

// Serve static HTML file (test.html)
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const db = new sqlite3.Database('./users.db', (err) => {
    if (err) console.error('Could not connect to database', err);
    else console.log('Connected to SQLite database');
});

// Serve test.html at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test.html'));
});

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) return res.status(401).send('Access denied.');

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).send('Invalid token.');
        req.user = user;
        next();
    });
}

// Registration route
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, parseInt(process.env.SALT_ROUNDS) || 10);
        const query = `INSERT INTO users (username, password) VALUES (?, ?)`;
        db.run(query, [username, hashedPassword], function(err) {
            if (err) {
                console.error('Error inserting user:', err);
                return res.status(500).send('Error registering user.');
            }
            res.status(201).send('User registered.');
        });
    } catch (error) {
        console.error('Error hashing password:', error);
        res.status(500).send('Error during registration.');
    }
});

// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const query = `SELECT * FROM users WHERE username = ?`;
    db.get(query, [username], async (err, user) => {
        if (err) {
            console.error('Error querying the database:', err);
            return res.status(500).send('Error querying the database.');
        }
        if (!user) {
            console.log('User not found');
            return res.status(400).send('Invalid credentials.');
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            console.log('Password does not match');
            return res.status(400).send('Invalid credentials.');
        }

        const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

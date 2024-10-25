const sqlite3 = require('sqlite3').verbose();

// Connect to the SQLite database
const db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Create the users table
db.serialize(() => {
    db.run(`DROP TABLE IF EXISTS users`); // Drop the table if it already exists
    db.run(`CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    )`, (err) => {
        if (err) {
            console.error('Error creating users table:', err);
        } else {
            console.log('Users table created');
        }
    });

    // Insert an admin user with plaintext password
    const username = 'Admin';
    const password = '1234'; // Plaintext password

    const insertQuery = `INSERT INTO users (username, password) VALUES (?, ?)`;
    db.run(insertQuery, [username, password], function(err) {
        if (err) {
            console.error('Error inserting admin user:', err);
        } else {
            console.log(`Admin user ${username} created with plaintext password.`);
        }
    });
});

// Close the database connection
db.close((err) => {
    if (err) {
        console.error('Error closing the database:', err);
    } else {
        console.log('Database connection closed.');
    }
});

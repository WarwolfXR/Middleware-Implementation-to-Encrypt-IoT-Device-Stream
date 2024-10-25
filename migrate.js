const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
require('dotenv').config();

const db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Define the salt rounds
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS) || 10;

// Fetch users and update their passwords
db.all(`SELECT username, password FROM users`, async (err, users) => {
    if (err) {
        console.error('Error fetching users:', err);
        return;
    }

    for (const user of users) {
        try {
            // Hash the existing password
            const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);

            // Update the user record with the hashed password
            db.run(`UPDATE users SET password = ? WHERE username = ?`, [hashedPassword, user.username], function (err) {
                if (err) {
                    console.error(`Error updating user ${user.username}:`, err);
                } else {
                    console.log(`Updated password for user: ${user.username}`);
                }
            });
        } catch (error) {
            console.error(`Error hashing password for user ${user.username}:`, error);
        }
    }

    // Close the database connection
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed.');
        }
    });
});

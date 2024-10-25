import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import QRCode from 'qrcode';
import speakeasy from 'speakeasy';
import bcrypt from 'bcrypt';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files from the "public" directory

// Create a new SQLite database connection
const db = new sqlite3.Database('users2.db');

// Endpoint for user login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get(`SELECT password, mfa_secret FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) {
            console.error("Error fetching user:", err.message);
            return res.status(500).send('Internal Server Error');
        }
        if (row) {
            const { password: hashedPassword, mfa_secret } = row;

            // Verify password
            bcrypt.compare(password, hashedPassword, (err, result) => {
                if (err) {
                    console.error("Error verifying password:", err);
                    return res.status(500).send('Internal Server Error');
                }

                if (result) {
                    if (mfa_secret) {
                        // If MFA is already set up, respond with success
                        return res.json({ success: true, message: 'Login successful. MFA is set up.' });
                    } else {
                        // If MFA not set up, create MFA secret and QR code
                        setupMFA(username, res);
                    }
                } else {
                    return res.status(401).send('Invalid username or password.');
                }
            });
        } else {
            return res.status(404).send('User not found.');
        }
    });
});

// Function to set up MFA and generate QR code
function setupMFA(username, res) {
    const mfa_secret = speakeasy.generateSecret({ length: 20 }).base32;

    // Save the MFA secret to the database
    db.run(`UPDATE users SET mfa_secret = ? WHERE username = ?`, [mfa_secret, username], (err) => {
        if (err) {
            console.error("Error updating user:", err.message);
            return res.status(500).send('Internal Server Error');
        }

        const otpauth = `otpauth://totp/${username}?secret=${mfa_secret}&issuer=YourAppName`;
        QRCode.toDataURL(otpauth, (err, qrCodeDataURL) => {
            if (err) {
                console.error("Error generating QR Code:", err);
                return res.status(500).send('Internal Server Error');
            }
            // Send the QR code data back to the client
            res.json({ success: true, message: 'MFA setup successful.', qrCodeDataURL });
        });
    });
}

// Serve the HTML file for login
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

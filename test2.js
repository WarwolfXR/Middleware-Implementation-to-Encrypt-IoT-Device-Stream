import sqlite3 from 'sqlite3';
import QRCode from 'qrcode';
import readline from 'readline';
import speakeasy from 'speakeasy';
import bcrypt from 'bcrypt';

// Create a new SQLite database connection
const db = new sqlite3.Database('users2.db');

// Function to check if user exists and verify password
function verifyUser(username, password, callback) {
    db.get(`SELECT password FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) {
            console.error("Error fetching user:", err.message);
            callback(false);
            return;
        }
        if (row) {
            // Compare the input password with the stored hashed password
            bcrypt.compare(password, row.password, (err, result) => {
                if (err) {
                    console.error("Error verifying password:", err);
                    callback(false);
                    return;
                }
                if (result) {
                    console.log("Password verified.");
                    callback(true);
                } else {
                    console.log("Incorrect password.");
                    callback(false);
                }
            });
        } else {
            console.log("User not found.");
            callback(false);
        }
    });
}

// Function to fetch MFA secret and generate QR code
function fetchQRCode(username, callback) {
    db.get(`SELECT mfa_secret FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) {
            console.error("Error fetching user:", err.message);
            callback(null);
            return;
        }
        if (row) {
            const { mfa_secret } = row;
            const otpauth = `otpauth://totp/${username}?secret=${mfa_secret}&issuer=YourAppName`;
            QRCode.toFile(`./${username}_qr.png`, otpauth, (err) => {
                if (err) {
                    console.error("Error generating QR Code:", err);
                    callback(null);
                    return;
                }
                console.log(`QR Code saved as ${username}_qr.png`);
                callback(`./${username}_qr.png`);
            });
        } else {
            console.log("User not found.");
            callback(null);
        }
    });
}

// Function to authenticate user by OTP
function authenticateUser(username, otp) {
    db.get(`SELECT mfa_secret FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) {
            console.error("Error fetching user:", err.message);
            return;
        }
        if (row) {
            const { mfa_secret } = row;
            const valid = speakeasy.totp.verify({
                secret: mfa_secret,
                encoding: 'base32',
                token: otp
            });
            if (valid) {
                console.log("Access granted.");
            } else {
                console.log("Invalid OTP. Access denied.");
                fetchQRCode(username, (qrCodePath) => {
                    if (qrCodePath) {
                        console.log(`QR Code saved as ${qrCodePath}. Please scan this with your authenticator app.`);
                    }
                });
            }
        } else {
            console.log("User not found.");
        }
    });
}

// Set up readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Prompt user for username, password, and OTP
rl.question("Enter your username: ", (username) => {
    rl.question("Enter your password: ", (password) => {
        verifyUser(username, password, (passwordVerified) => {
            if (passwordVerified) {
                rl.question("Enter the OTP from your authenticator app: ", (otp) => {
                    authenticateUser(username, otp);
                    rl.close();
                });
            } else {
                console.log("User does not exist or password is incorrect. Exiting.");
                rl.close();
            }
        });
    });
});

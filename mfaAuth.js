import sqlite3 from 'sqlite3';
import QRCode from 'qrcode';
import readline from 'readline';
import speakeasy from 'speakeasy';
import fs from 'fs';
import bcrypt from 'bcrypt';

// Create a new SQLite database connection
const db = new sqlite3.Database('users2.db');

// Set up readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to fetch MFA secret and generate QR code
function fetchQRCode(username, mfa_secret, callback) {
    const otpauth = `otpauth://totp/${username}?secret=${mfa_secret}&issuer=YourAppName`;

    // Generate the QR Code
    QRCode.toFile(`./${username}_qr.png`, otpauth, (err) => {
        if (err) {
            console.error("Error generating QR Code:", err);
            callback(null);
            return;
        }
        console.log(`QR Code saved as ${username}_qr.png`);
        callback(`./${username}_qr.png`);
    });
}

// Function to authenticate user
function authenticateUser(username, password) {
    db.get(`SELECT password, mfa_secret FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) {
            console.error("Error fetching user:", err.message);
            return;
        }
        if (row) {
            const { password: hashedPassword, mfa_secret } = row;

            // Verify password
            bcrypt.compare(password, hashedPassword, (err, result) => {
                if (err) {
                    console.error("Error verifying password:", err);
                    return;
                }

                if (result) {
                    console.log("Login successful.");

                    if (mfa_secret) {
                        // MFA is already set up, ask for OTP
                        askForOTP(username);
                    } else {
                        // MFA not set up, create MFA secret and QR code
                        setupMFA(username);
                    }
                } else {
                    console.log("Invalid username or password.");
                    rl.close();
                }
            });
        } else {
            console.log("User not found.");
            rl.close();
        }
    });
}

// Function to ask for OTP
function askForOTP(username) {
    rl.question("Enter the OTP from your authenticator app: ", (otp) => {
        verifyOTP(username, otp);
    });
}

// Function to verify OTP
function verifyOTP(username, otp) {
    db.get(`SELECT mfa_secret FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) {
            console.error("Error fetching user:", err.message);
            rl.close();
            return;
        }
        if (row) {
            const { mfa_secret } = row;

            // Validate the OTP
            const valid = speakeasy.totp.verify({
                secret: mfa_secret,
                encoding: 'base32',
                token: otp
            });

            if (valid) {
                console.log("Access granted.");
            } else {
                console.log("Invalid OTP. Access denied.");
            }
            rl.close();  // Close readline after verifying OTP
        } else {
            console.log("User not found.");
            rl.close();
        }
    });
}

// Function to set up MFA
function setupMFA(username) {
    const mfa_secret = speakeasy.generateSecret({ length: 20 }).base32;

    // Save the MFA secret to the database
    db.run(`UPDATE users SET mfa_secret = ? WHERE username = ?`, [mfa_secret, username], (err) => {
        if (err) {
            console.error("Error updating user:", err.message);
            return;
        }
        console.log("MFA setup successful.");
        fetchQRCode(username, mfa_secret, (qrCodePath) => {
            if (qrCodePath) {
                console.log(`Please scan the QR Code to set up MFA. QR Code saved at: ${qrCodePath}`);
            }
            rl.close();  // Close readline after setting up MFA
        });
    });
}

// Prompt user for username and password
rl.question("Enter your username: ", (username) => {
    rl.question("Enter your password: ", (password) => {
        authenticateUser(username, password);
    });
});

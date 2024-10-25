import sqlite3 from 'sqlite3';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import fs from 'fs';

const db = new sqlite3.Database('users2.db');

async function setupMFA(username) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                mfa_secret TEXT NOT NULL
            )`);

            db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
                if (err) {
                    console.error(err.message);
                    reject(err);
                } else if (row) {
                    console.log(`User ${username} already exists.`);
                    resolve(null);  // User already exists, resolve with null
                } else {
                    const secret = speakeasy.generateSecret({ length: 20 });
                    db.run(`INSERT INTO users (username, password, mfa_secret) VALUES (?, ?, ?)`, 
                        [username, "dummyPassword", secret.base32], 
                        (err) => {
                            if (err) {
                                console.error(err.message);
                                reject(err);
                            } else {
                                console.log(`User ${username} added with MFA secret: ${secret.base32}`);
                                const otpauth = secret.otpauth_url;
                                const qrCodePath = `./${username}_qr.png`;

                                QRCode.toFile(qrCodePath, otpauth, (err) => {
                                    if (err) {
                                        console.error('Error generating QR code:', err);
                                        reject(err);
                                    } else {
                                        console.log(`QR code saved as ${qrCodePath}`);
                                        // Resolve with QR code path
                                        resolve(qrCodePath);
                                    }
                                });
                            }
                        });
                }
            });
        });
    });
}

// Example usage
setupMFA("testuser").then((qrCodePath) => {
    if (qrCodePath) {
        console.log("QR Code Path:", qrCodePath);
    } else {
        console.log("No QR code generated; user may already exist.");
    }
}).catch((error) => {
    console.error("Error setting up MFA:", error);
});

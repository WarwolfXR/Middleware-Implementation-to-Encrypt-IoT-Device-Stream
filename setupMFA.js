const sqlite3 = require('sqlite3').verbose();
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const fs = require('fs');
import open from 'open';

const db = new sqlite3.Database('users.db', (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err.message);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Function to set up MFA for a given user
const setupMFA = async (username) => {
    // Generate MFA secret
    const secret = speakeasy.generateSecret({ length: 20 });
    
    // Save the secret to the database
    const query = `UPDATE users SET mfa_secret = ? WHERE username = ?`;
    db.run(query, [secret.base32, username], function(err) {
        if (err) {
            console.error('Error updating user in database:', err);
            return;
        }
        console.log(`MFA secret saved for user ${username}`);
    });

    // Generate QR code and save as an image file
    const qrCodeData = await QRCode.toDataURL(secret.base32);
    const base64Data = qrCodeData.split(',')[1];
    const qrCodeFilePath = `${username}_qr_code.png`;

    // Save the QR code as a PNG file
    fs.writeFileSync(qrCodeFilePath, base64Data, { encoding: 'base64' });
    console.log(`QR Code saved as ${qrCodeFilePath}`);

    // Open the QR code in a browser
    const html = `<html><body><img src="${qrCodeData}" alt="QR Code" /></body></html>`;
    const htmlFilePath = `${username}_qr_code.html`;
    fs.writeFileSync(htmlFilePath, html);
    open(htmlFilePath);

    console.log(`MFA Secret (keep it safe!): ${secret.base32}`);
};

// Replace 'testuser' with the username you want to set up MFA for
setupMFA('testuser');

// Close the database connection when done
db.close((err) => {
    if (err) {
        console.error('Error closing the database:', err.message);
    } else {
        console.log('Database connection closed');
    }
});

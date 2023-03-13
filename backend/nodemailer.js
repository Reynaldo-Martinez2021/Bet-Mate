const nodemailer = require('nodemailer');
const { env } = require('process');

const EMAIL_USERNAME = process.env.EMAIL_USERNAME;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
    }
});

exports.EMAIL_USERNAME = EMAIL_USERNAME;
exports.transporter = transporter;
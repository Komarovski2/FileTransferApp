const nodemailer = require('nodemailer');

const googleUser = process.env.GOOGLE_USER;
const googleKey = process.env.GOOGLE_KEY;

var nodemailerFrom = googleUser;
var nodemailerobject ={
    service: "gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: googleUser,
        pass: googleKey
    }
};

// Функція для надсилання електронної пошти
function sendEmail(to, subject, text, html) {
    var transporter = nodemailer.createTransport(nodemailerobject);

    return new Promise((resolve, reject) => {
        transporter.sendMail({
            from: nodemailerFrom,
            to: to,
            subject: subject,
            text: text,
            html: html
        }, function(error, info) {
            if (error) {
                console.error(error);
                reject(error);
            } else {
                console.log("Email sent: " + info.response);
                resolve(info);
            }
        });
    });
}

module.exports = {
    sendEmail: sendEmail
};

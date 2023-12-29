const sgMail = require("@sendgrid/mail");

const dotenv = require("dotenv");
dotenv.config({path: "../config.env"});

sgMail.setApiKey(process.env.SG_KEY);

const sendSgMail = async ({
    recipient,
    sender,
    subject,
    // content,
    html,
    text,
    attachments,
}) => {
    try {
        const from = sender || "contact@tawk.com";
        const msg = {
            to: recipient, // Email of receiver
            from, // Email of sender
            subject,
            html,
            text,
            attachments,
        };
        return sgMail.send(msg);
    } catch (error) {
        console.log(error);
    }
};

exports.sendEmail = async (args) => {
    if (process.env.NODE_ENV === "development") {
        return Promise.resolve();
    }
    else {
        return sendSgMail(args);
    }
}

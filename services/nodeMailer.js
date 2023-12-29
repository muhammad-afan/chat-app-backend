const nodemailer = require("nodemailer");

const dotenv = require("dotenv");
dotenv.config({ path: "../config.env" });



const sendNodeMail = async ({
    recipient,
    sender,
    subject,
    // content,
    html,
    text,
    attachments,
}) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: true,
            auth: {
                // TODO: replace `user` and `pass` values from <https://forwardemail.net>
                user: process.env.SMTP_MAIL,
                pass: process.env.SMTP_PASSWORD,
            },
        });

        const from = sender || "afansaeed19971719@gmail.com";
        const msg = {
            to: recipient, // Email of receiver
            from, // Email of sender
            subject,
            html,
            text,
            attachments,
        };
        return await transporter.sendMail(msg);
    } catch (error) {
        console.log(error);
    }
};

exports.sendNodeEmail = async (args) => {
    if (process.env.NODE_ENV === "development") {
        return Promise.resolve();
    }
    else {
        return sendNodeMail(args);
    }
}

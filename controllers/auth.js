const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const crypto = require("crypto");
const mongoose = require("mongoose");
// const mailService = require("../services/mailer");
const mailService = require("../services/nodeMailer");
const otp = require("../Templates/Mail/otp");
//
const User = require("../models/user");
const filterObj = require("../utils/filterObj");
const { promisify } = require("util");
const resetPassword = require("../Templates/Mail/resetPassword");
const OneToAiMessage = require("../models/OntToAiMessage");
const Ai = require("../models/aI.JS");

const signToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET);
};

// Register new user

exports.register = async (req, res, next) => {
    const { firstName, lastName, email, password } = req.body;

    const filteredBody = filterObj(
        req.body,
        "firstName",
        "lastName",
        "password",
        "email"
    );

    // Check if verified user already exists

    const existing_user = await User.findOne({ email });
    console.log({ existing_user });

    if (existing_user && existing_user.verified) {
        res.status(400).json({
            status: "error",
            message: "Email is already in use, Please login",
        });
    } else if (existing_user) {
        await User.findOneAndUpdate({ email }, filteredBody, {
            new: true,
            validateModifiedOnly: true,
        });
        req.userId = existing_user._id;
        next();
    } else {
        // If user record in not in DB
        const new_user = await User.create(filteredBody);

        // generate OTP and send email to user
        req.userId = new_user._id;
        next();
    }
};

exports.sendOTP = async (req, res, next) => {
    const { userId } = req;
    const new_otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
    });
    const otp_expiry_time = Date.now() + 10 * 60 * 1000; // 10 minutes after Otp sent
    const user = await User.findByIdAndUpdate(userId, { otp_expiry_time });
    const otp_str = new_otp.toString();
    console.log({ new_otp });
    user.otp = otp_str;
    await user.save({ new: true, validateModifiedOnly: true });
    console.log({ user });

    // TODO send Email
    mailService.sendNodeEmail({
        from: process.env.SMTP_MAIL,
        recipient: user.email,
        subject: "Verification OTP",
        html: otp(user.firstName, new_otp),
        attachments: [],
    });

    res.status(200).json({ status: "success", message: "OTP send successfully" });
};

exports.verifiyOTP = async (req, res, next) => {
    // verify OTP and update user record accordingly

    const { email, otp } = req.body;
    const user = await User.findOne({
        email,
        otp_expiry_time: { $gt: Date.now() },
    });

    if (!user) {
        res
            .status(400)
            .json({ status: "error", message: "Email is invalid or OTP expired" });
    }

    if (user.verified) {
        return res.status(400).json({
            status: "error",
            message: "Email is already verified",
        });
    }

    if (!(await user.correctOTP(otp, user.otp))) {
        res.status(400).json({ status: "error", messsage: "OTP is incorrect" });
        return;
    }

    // OTP is correct
    user.otp_expiry_time = undefined;
    user.otp = undefined;
    user.verified = true;
    await user.save({ new: true, validateModifiedOnly: true });

    console.log("line 118 auth.js backend controllers ", user);
    const ai = await Ai.create({ firstName: "My", lastName: "Ai", avatar: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSj-InsrF06vCYKxlDepKQaV9e-ZpuJ7Lt5aA&usqp=CAU' });
    await ai.save();
    user.my_ai = ai._id;
    user.save();
    console.log("line 125 auth.js backend controllers ", user);
    console.log("🚀 ~ file: auth.js:120 ~ exports.verifiyOTP= ~ ai:", ai)
    const new_aiMessage = await OneToAiMessage.create({
        participants: [user._id, ai._id],
    });
    await new_aiMessage.save();
    console.log("🚀 ~ file: auth.js:129 ~ exports.verifiyOTP= ~ new_aiMessage:", new_aiMessage)


    const token = signToken(user._id);
    res.status(200).json({
        status: "success",
        message: "OTP verified successfully",
        token,
        user_id: user._id,
    });
};

exports.login = async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({
            status: "error",
            message: "Both email and password are required",
        });
        return;
    }
    const user = await User.findOne({ email }).select("+password");

    if (!user || !user.password) {
        res.status(400).json({
            status: "error",
            message: "Incorrect password",
        });

        return;
    }

    if (!user || !(await user.correctPassword(password, user.password))) {
        res.status(400).json({
            status: "error",
            message: "Email or password is incorrect",
        });
        return;
    }

    const token = signToken(user._id);
    res.status(200).json({
        status: "success",
        message: "Logged in successfully",
        token,
        user_id: user._id,
    });
};

exports.protect = async (req, res, next) => {
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    )
        token = req.headers.authorization.split(" ")[1];
    else if (req.cookies.jwt) token = req.cookies.jwt;
    else {
        req.status(400).json({
            status: "error",
            message: "You are not logged in. Please login to get access",
        });
        return;
    }
    // * Verification of token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    // * Check if user still exists
    console.log("🚀 ~ file: auth.js:180 ~ exports.protect= ~ decoded:", decoded)

    const this_user = await User.findById(decoded.userId);

    if (!this_user) {
        res.status(400).json({ status: "error", message: "User doesn't exists" });
        return;
    }

    if (await this_user.changePasswordAfter(decoded.iat)) {
        res.status(400).json({
            status: "error",
            message: "User recently updated password! Please log in",
        });
        return;
    }
    req.user = this_user;
    next();
};

exports.forgotPassword = async (req, res, next) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        res.status(404).json({
            status: "error",
            message: "There is no user with given email address",
        });
        return;
    }

    const resetToken = await user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
    console.log({ resetToken });
    const resetURL = `http://localhost:3001/auth/new-password?token=${resetToken}`;

    try {
        // Todo send email
        mailService.sendNodeEmail({
            from: process.env.SMTP_MAIL,
            recipient: user.email,
            subject: "Forgot Password",
            html: resetPassword(user.firstName, resetURL),
            attachments: [],
        });
        res.status(200).json({
            status: "success",
            message: "Reset Password link send to email",
        });
    } catch (error) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        res.status(500).json({
            status: "error",
            message: "There was an error send the email. Please try again later",
        });
    }
};

exports.resetPassword = async (req, res, next) => {
    const hashedToken = crypto
        .createHash("sha256")
        .update(req.body.token)
        .digest("hex");
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });
    // * If token has expired or submission is out of time window
    if (!user) {
        res.status(400).json({
            status: "error",
            message: "Token is invalid or expired",
        });
        return;
    }

    // * Update user's password and set reset token and expiry to undefined
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // TODO => Send email to inform password change

    // * Login the user and send new JWT
    const token = signToken(user._id);
    res.status(200).json({
        status: "success",
        message: "Password resseted successfully",
        token,
        user_id: user._id,
    });
};

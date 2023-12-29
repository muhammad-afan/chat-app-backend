const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, "First Name is required"],
    },
    lastName: {
        type: String,
        required: [true, "Last name is required"],
    },
    avatar: {
        type: String,
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        validate: {
            validator: function (email) {
                return String(email)
                    .toLowerCase()
                    .match(
                        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
                    );
            },
            message: (props) => `Email ${props.value} is invalid`,
        },
    },
    password: {
        type: String,
    },
    // confirmPassword: {
    //     type: String,
    // },
    passwordChangedAt: {
        type: Date,
        default: undefined,
    },
    passwordResetToken: {
        type: String,
        default: undefined,
    },
    passwordResetExpires: {
        type: Date,
        default: undefined,
    },
    createdAt: {
        type: Date,
        default: Date.now(),
    },
    updatedAt: {
        type: Date,
    },
    verified: {
        type: Boolean,
        default: false,
    },
    otp: {
        type: String,
        default: undefined,
    },
    otp_expiry_time: {
        type: Date,
        default: undefined,
    },
    socket_id: {
        type: mongoose.SchemaTypes.String,
    },
    friends: [
        {
            type: mongoose.Schema.ObjectId,
            ref: "User",
        }
    ],
    status: {
        type: mongoose.SchemaTypes.String,
        enum: ["Online", "Offline"],
    },
    last_seen: {
        type: mongoose.SchemaTypes.Date,
    },
    my_ai: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: "Ai",
    },
    autoResponses: {
        type: mongoose.SchemaTypes.Boolean,
        default: false,
    }
});

// MiddleWare that will run everytime when user record is saved or modified
userSchema.pre("save", async function (next) {
    // Only run this fxn if otp is actually modified
    if (!this.isModified("otp") || !this.otp) return next();
    // Hash the otp with the cost of 12

    // this.otp = await promisify(bcrypt.hash)(String(this.otp), 12);
    this.otp = await bcrypt.hash(String(this.otp), 12);

    next();
});

userSchema.pre("save", async function (next) {
    // Only run this fxn if password is actually modified
    if (!this.isModified("password") || !this.password) return next();

    // Hash the otp with the cost of 12
    this.password = await bcrypt.hash(this.password, 12);
    // ? this.password = await promisify(bcrypt.hash)(this.password, 12);

    next();
});

userSchema.pre("save", function (next) {
    if (!this.isModified("password") || this.isNew || !this.password)
        return next();

    this.passwordChangedAt = Date.now() - 1000;
    next();
});

// Comparing hashedPassword from database and userPassword
userSchema.methods.correctPassword = async function (
    candidatePassword,
    userPassword
) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

// Comparing hashedPassword from database and userPassword
userSchema.methods.correctOTP = async function (candidateOTP, userOTP) {
    return await bcrypt.compare(candidateOTP, userOTP);
};

userSchema.methods.createPasswordResetToken = async function () {
    // const resetToken = crypto.randomBytes(32).toString("hex");
    const resetToken = await new Promise((resolve, reject) => {
        crypto.randomBytes(32, (err, buffer) => {
            if (err) {
                reject(err);
            } else {
                resolve(buffer.toString("hex"));
            }
        });
    });
    this.passwordResetToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    return resetToken;
};

userSchema.methods.changePasswordAfter = async function (timestampt) {
    return timestampt < this.changePasswordAfter;
};

const User = new mongoose.model("User", userSchema);
module.exports = User;

const mongoose = require("mongoose");

const oneToOneMessageSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.ObjectId,
        ref: "User",
    }],
    messages: [{
        to: {
            type: mongoose.Schema.ObjectId,
            ref: "User",
        },
        from: {
            type: mongoose.Schema.ObjectId,
            ref: "User",
        },
        type: {
            type: mongoose.SchemaTypes.String,
            enum: ["Text", "Media", "Document", "Link"],
        },
        created_at: {
            type: mongoose.SchemaTypes.Date,
            dafault: Date.now(),
        },
        text: {
            type: mongoose.SchemaTypes.String,
        },
        file: {
            type: mongoose.SchemaTypes.String,
        },
    }]
});


const OneToOneMessage = new mongoose.model("OneToOneMessage", oneToOneMessageSchema);
module.exports = OneToOneMessage;
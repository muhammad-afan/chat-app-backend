const mongoose = require("mongoose");

const oneToAiMessageSchema = new mongoose.Schema({
    participants: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User' // Reference to the User model
        },
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Ai' // Reference to the Ai model
        }
    ],
    messages: [{
        to: {
            type: mongoose.SchemaTypes.ObjectId,
            ref: "Ai",
        },
        from: {
            type: mongoose.SchemaTypes.ObjectId,
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
    }]
});


const OneToAiMessage = new mongoose.model("OneToAiMessage", oneToAiMessageSchema);
module.exports = OneToAiMessage;
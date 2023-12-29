const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
    },
    recepient: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
    },
    createdAt: {
        type: mongoose.SchemaTypes.Date,
        default: Date.now(),
    },
});

const FriendRequest = new mongoose.model("FriendRequest", requestSchema)
module.exports = FriendRequest;
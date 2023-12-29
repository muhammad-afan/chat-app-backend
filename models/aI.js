const mongoose = require("mongoose");

const aiSchema = new mongoose.Schema({
    firstName: {
        type: mongoose.SchemaTypes.String,
        required: [true, "Ai first name is required"],
    },
    lastName: {
        type: mongoose.SchemaTypes.String,
        required: [true, "Ai second name is required"],
    },
    avatar: {
        type: mongoose.SchemaTypes.String,
    },
    created_at: {
        type: mongoose.SchemaTypes.Date,
        default: Date.now(),
    },
})

const Ai = new mongoose.model("Ai", aiSchema);
module.exports = Ai;
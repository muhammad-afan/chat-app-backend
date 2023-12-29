const OneToAiMessage = require("../models/OntToAiMessage");
const Ai = require("../models/aI.JS");
const FriendRequest = require("../models/friendRequest");
const User = require("../models/user");
const filterObj = require("../utils/filterObj");

exports.updateMe = async (req, res, next) => {
    const { user } = req;
    const filteredBody = filterObj(
        req.body,
        "firstName",
        "lastName",
        "about",
        "avater"
    );
    const updated_user = await User.findByIdAndUpdate(user._id, filteredBody, {
        new: true,
        validateModifiedOnly: true,
    });
    res.status(200).json({
        status: "success",
        data: updated_user,
        message: "Profile updated successfullly!",
    });
};

exports.getUsers = async (req, res, next) => {
    const all_users = await User.find({
        verified: true,
    }).select("firstName lastName _id");

    const this_user = req.user;

    const remaining_user = all_users.filter(
        (user) =>
            !this_user.friends.includes(user._id) &&
            user._id.toString() !== req.user._id.toString()
    );

    res.status(200).json({
        status: "success",
        data: remaining_user,
        message: "Users found successfully",
    });
};

exports.getAis = async (req, res, next) => {
    const this_user = req.user;
    console.log(
        "🚀 ~ file: user.js:48 ~ exports.getAis= ~ this_user:",
        this_user
    );

    const this_ai = await OneToAiMessage.find({
        participants: { $all: [this_user.my_ai, this_user._id] },
    })
        .populate({
            path: "participants",
            model: "Ai",
            select: "firstName lastName _id avatar",
        })
        .select("firstName lastName _id avatar");

    res.status(200).json({
        status: "success",
        data: this_ai,
        message: "Ais found successfully",
    });
};

exports.getRequests = async (req, res, next) => {
    const requests = await FriendRequest.find({
        recepient: req.user._id,
    }).populate("sender", "_id firstName lastName");

    res.status(200).json({
        status: "success",
        data: requests,
        message: "Friend requests found successfully",
    });
};

exports.getFriends = async (req, res, next) => {
    const this_user = await User.findById(req.user._id).populate(
        "friends",
        "_id firstName lastName"
    );

    res.status(200).json({
        status: "success",
        data: this_user.friends,
        message: "Friends found successfully",
    });
};

exports.updateAiResponse = async (req, res, next) => {
    const this_user = req.user;
    const userId = this_user._id;
    const newAutoResponsesValue = req.body.autoResponses;
    await User.updateOne(
        { _id: userId },
        { $set: { autoResponses: newAutoResponsesValue } }
    );
    res
        .status(200)
        .json({ success: true, message: "AutoResponses updated successfully" });
};

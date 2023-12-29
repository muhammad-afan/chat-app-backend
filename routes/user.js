const router = require("express").Router();
const { protect } = require("../controllers/auth");
const { updateMe, getUsers, getFriends, getRequests, getAis, updateAiResponse } = require("../controllers/user");



router.patch("/update-me", protect, updateMe);
router.get("/get-users", protect, getUsers);
router.get("/get-ais", protect, getAis);
router.get("/get-friends", protect, getFriends);
router.get("/get-friend-requests", protect, getRequests);
router.put("/updateAutoResponses", protect, updateAiResponse);

module.exports = router;
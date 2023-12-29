const router = require("express").Router();
const { login, register, sendOTP, verifiyOTP, forgotPassword, resetPassword } = require("../controllers/auth");




router.post("/login", login);
router.post("/register", register, sendOTP);
router.post("/verify", verifiyOTP);
router.post("/reset-password", resetPassword);
router.post("/forgot-password", forgotPassword);





module.exports = router;
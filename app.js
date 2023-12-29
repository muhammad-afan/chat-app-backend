// Web framework for Node.js
const express = require("express");

const routes = require("./routes"); // automatically seach for index file in the provided folder

// HTTP request logger MiddleWare for Node.js
const morgan = require("morgan");

// Used to limit requests to the public endPoints
const rateLimit = require("express-rate-limit");

// Used to secure app by setting various http headers
const helmet = require("helmet");

// Used to sanitize date collected from user
const mongoSanitize = require("express-mongo-sanitize");


const bodyParser = require("body-parser");

const xss = require("xss");

const cors = require("cors");

const app = express();


app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: "*",
    methods: ["GET", "PATCH", "POST", "DELETE", "PUT"],
    credentials: true
}));
app.use(express.json({ limit: "10kb" }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(helmet());


if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
}


const limiter = rateLimit({
    max: 300,
    windowMs: 60 * 60 * 1000, // In one hour
    message: "Too many requests from this IP, Please try again in an hour"
})

app.use("/tawk", limiter);
app.use(mongoSanitize());
// app.use(xss());

app.use(routes);
module.exports = app;

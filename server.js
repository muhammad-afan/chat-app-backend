const app = require("./app");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const path = require("path");
const http = require("http");
const User = require("./models/user");
const FriendRequest = require("./models/friendRequest");
const OneToOneMessage = require("./models/OneToOneMessage");
const OneToAiMessage = require("./models/OntToAiMessage");
const Ai = require("./models/aI.JS");


dotenv.config({ path: "./config.env" });

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);


process.on("uncaughtException", (err) => {
    console.log(err);
    process.exit(1);
});


const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3001",
        methods: ["GET", "POST"],
    },
});

const DB = process.env.DBURI.replace("<PASSWORD>", process.env.DBPASSWORD);

mongoose
    .connect(DB, {
        useNewUrlParser: true,
        // useCreateIndex: true,
        // useFindAndModify: false,
        useUnifiedTopology: true,
    })
    .then((con) => {
        console.log("DB connection is successful");
    })
    .catch((err) => {
        console.log(err.message);
    });

const port = process.env.PORT || 8000;
// 3000, 5000
server.listen(port, () => {
    console.log("App is running at port", port);
});

io.on("connection", async (socket) => {
    // console.log(JSON.stringify(socket.handshake.query));
    // console.log({ socket });
    const user_id = socket.handshake.query["user_id"];
    console.log("🚀 ~ file: server.js:54 ~ io.on ~ user_id:", user_id)
    const socket_id = socket.id;
    console.log(`User connected ${socket_id}`);
    if (Boolean(user_id)) {
        console.log("line 57 server.js");
        await User.findByIdAndUpdate(user_id, { socket_id, status: "Online" });
    }
    // We can write our socket event listeners here
    socket.on("friend_request", async (data) => {
        console.log("🚀 ~ file: server.js:62 ~ socket.on ~ data:", data)
        // {to, from}
        const to_user = await User.findById(data.to).select("socket_id");
        const from_user = await User.findById(data.from).select("socket_id");

        await FriendRequest.create({
            sender: data.from,
            recepient: data.to,
        });

        // TODO => create a friend request
        // emit event => "new_friend_request"
        io.to(to_user.socket_id).emit("new_friend_request", {
            message: "New Friend Request Received",
            playNotification: true,
        });

        // emit event => "request_sent"
        io.to(from_user.socket_id).emit("request_sent", {
            message: "Request send successfully",

        });
    });

    socket.on("accept_request", async (data) => {
        const request_doc = await FriendRequest.findById(data.request_id);
        console.log("🚀 ~ file: server.js:86 ~ socket.on ~ request_doc:", request_doc)

        const sender = await User.findById(request_doc.sender);
        console.log("🚀 ~ file: server.js:89 ~ socket.on ~ sender:", sender)
        const receiver = await User.findById(request_doc.recepient);
        console.log("🚀 ~ file: server.js:91 ~ socket.on ~ receiver:", receiver)

        sender.friends.push(request_doc.recepient);
        receiver.friends.push(request_doc.sender);

        await receiver.save({ new: true, validateModifiedOnly: true });
        await sender.save({ new: true, validateModifiedOnly: true });

        await FriendRequest.findByIdAndDelete(data.request_id);

        io.to(sender.socket_id).emit("request_accepted", {
            message: "Friend Request Accepted",
            playNotification: true,
        });

        io.to(receiver.socket_id).emit("request_accepted", {
            message: "Friend Request Accepted",
            playNotification: false,
        });
    });

    socket.on("get_direct_conversations", async ({ user_id }, callback) => {
        const existing_conversations = await OneToOneMessage.find({
            participants: { $all: [user_id] },
        }).populate("participants", "firstName lastName email _id status autoResponses");
        callback(existing_conversations);
    });

    // socket.on("start_conversation", async (data) => {
    //     // data => {to, from}
    //     const { to, from } = data;
    //     // check if there is any existing conversation between these users
    //     const existing_conversation = await OneToOneMessage.find({
    //         participants: { $size: 2, $all: [to, from] },
    //     }).populate("participants", "firstName lastName _id email status")
    //     console.log(existing_conversation.length === 0, "hello");

    //     // if no existing_conversation 

    //     if (existing_conversation.length === 0) {
    //         let new_chat = await OneToOneMessage.create({
    //             participants: [to, from],
    //         });

    //         new_chat = await OneToOneMessage.findById(new_chat._id).populate("participants", "firstName lastName _id email status")
    //         console.log({ new_chat });
    //         socket.emit("start_chat", new_chat);
    //     }
    //     else {
    //         socket.emit("start_chat", existing_conversation[0]);
    //     }

    //     // if there is existing_conversation
    // });

    socket.on("start_conversation", async (data) => {
        console.log("🚀 ~ file: server.js:148 ~ socket.on ~ data:", data)
        // data: {to: from:}

        const { to, from } = data;

        // check if there is any existing conversation

        const existing_conversations = await OneToOneMessage.find({
            participants: { $size: 2, $all: [to, from] },
        }).populate("participants", "firstName lastName _id email status autoResponses");
        console.log("🚀 ~ file: server.js:155 ~ socket.on ~ existing_conversations:", existing_conversations)


        // if no => create a new OneToOneMessage doc & emit event "start_chat" & send conversation details as payload
        if (existing_conversations.length === 0) {
            let new_chat = await OneToOneMessage.create({
                participants: [to, from],
            });
            console.log("🚀 ~ file: server.js:163 ~ socket.on ~ new_chat:", new_chat)

            new_chat = await OneToOneMessage.findById(new_chat._id).populate(
                "participants",
                "firstName lastName _id email status autoResponses"
            );
            console.log("🚀 ~ file: server.js:168 ~ socket.on ~ new_chat:", new_chat)


            socket.emit("start_chat", new_chat);
        }
        // if yes => just emit event "start_chat" & send conversation details as payload
        else {
            console.log("else line 179 start_conversation server.js")
            socket.emit("start_chat", existing_conversations[0]);
        }
    });
    socket.on("get_messages", async (data, callback) => {
        console.log("🚀 ~ file: server.js:184 ~ socket.on ~ data:", data)
        try {
            if (data.conversation_id) {
                const { messages } = await OneToOneMessage.findById(
                    data.conversation_id
                ).select("messages");
                callback(messages);
                console.log("🚀 ~ file: server.js:188 ~ socket.on ~ messages:", messages)
            }
        } catch (error) {
            console.log(error);
        }
    });

    // Handle Text and link message
    socket.on("text_message", async (data) => {
        console.log("Received message", data);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });


        // data : {to, from, message, type, conversation_id}

        const { to, from, message, type, conversation_id } = data;

        const to_user = await User.findById(to);
        console.log("🚀 ~ file: server.js:216 ~ socket.on ~ to_user:", to_user)
        const from_user = await User.findById(from);
        console.log("🚀 ~ file: server.js:218 ~ socket.on ~ from_user:", from_user)

        const new_message = {
            to,
            from,
            type,
            text: message,
            created_at: Date.now()
        }

        // Create a new conversation if it doesn't exist yet or add new message to messages list
        const chat = await OneToOneMessage.findById(conversation_id);
        chat.messages.push(new_message);
        // save to db
        chat.save({})
        if (to_user.autoResponses) {
            const result = await model.generateContent(message);
            const response = result.response;
            const text = response.text();
            console.log("🚀 ~ file: server.js:290 ~ socket.on ~ text:", text)

            const new_ai_message = {
                to: from,
                from: to,
                text,
                type: "Text",
                created_at: Date.now(),
            }

            chat.messages.push(new_ai_message);
            // save to db
            await chat.save({});
        }
        // emit new_message -> to user
        io.to(to_user.socket_id).emit("new_message", {
            conversation_id,
            message: new_message,
            snackbarMessage: "New message received",
            playNotificationSound: true,
        })
        // emit new_message
        io.to(from_user.socket_id).emit("new_message", {
            conversation_id,
            message: new_message,
        })
    });
    socket.on("get_ai_messages", async (data, callback) => {
        console.log("🚀 ~ file: server.js:184 ~ socket.on ~ data:", data)
        try {
            if (data.conversation_id) {
                const { messages } = await OneToAiMessage.findById(
                    data.conversation_id
                ).select("messages");
                callback(messages);
                console.log("🚀 ~ file: server.js:188 ~ socket.on ~ messages:", messages)
            }
        } catch (error) {
            console.log(error);
        }
    });

    // Handle Text and link message
    socket.on("ai_text_message", async (data) => {
        console.log("Received message", data);

        // data : {to, from, message, type, conversation_id}

        const { to, from, message, type, conversation_id } = data;

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const to_ai = await Ai.findById(to);
        const from_user = await User.findById(from);

        const new_message = {
            to,
            from,
            type,
            text: message,
            created_at: Date.now()
        }

        // Create a new conversation if it doesn't exist yet or add new message to messages list
        const chat = await OneToAiMessage.findById(conversation_id);
        chat.messages.push(new_message);
        console.log("🚀 ~ file: server.js:279 ~ socket.on ~ new_message:", new_message)

        await chat.save({});
        const lastMessageId = chat.messages[chat.messages.length - 1]._id;
        console.log("line 286: server.js")
        const result = await model.generateContent(message);
        const response = result.response;
        const text = response.text();
        console.log("🚀 ~ file: server.js:290 ~ socket.on ~ text:", text)

        const new_ai_message = {
            to: from,
            from: to,
            text,
            created_at: Date.now(),
        }

        chat.messages.push(new_ai_message);
        // save to db
        await chat.save({});
        const lastAiMessageId = chat.messages[chat.messages.length - 1]._id;

        // Todo => 
        // emit new_message -> to user
        // io.to(to_user.socket_id).emit("new_message", {
        //     conversation_id,
        //     message: new_message,
        //     snackbarMessage: "New message received",
        //     playNotificationSound: true,
        // })
        // // emit new_message
        io.to(from_user.socket_id).emit("new_user_message", {
            lastMessageId,
            conversation_id,
            message: new_message,
        });

        io.to(from_user.socket_id).emit("new_ai_message", {
            lastAiMessageId,
            conversation_id,
            message: new_ai_message,
        });
    });

    socket.on("file_message", (data) => {
        console.log("Received Message", data);

        // data : {to, from, text, file}

        // get file extension

        const fileExtension = path.extname(data.file.name);

        // generate a unique file name

        const fileName = `${Date.now()}_${Math.floor(
            Math.random() * 1000
        )}${fileExtension}`;

        // upload file to aws s3

        // Create a new conversation if it doesn't exist yet or add new message to messages list

        // save to db

        // Emit incoming_message -> to user

        // emit outgoing_message
    });

    socket.on("end", async (data) => {
        console.log("🚀 ~ file: server.js:264 ~ socket.on ~ data:", data)
        console.log("Closing connection");
        // Find user by _id and set the status to offline
        const date = Date.now();
        if (data.user_id) {
            await User.findByIdAndUpdate(data.user_id, { status: "Offline" });
        }

        // TODO =>  Broadcast user disconnected
        
        socket.disconnect(0);
    });
});

process.on("unhandledRejection", (err) => {
    console.log(err);
    server.close(() => {
        process.exit(1);
    });
});

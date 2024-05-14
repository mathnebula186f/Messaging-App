const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/User");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const ws = require("ws");
const Message = require("./models/Message");

dotenv.config();
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URL);
    console.log(`Connected to MongoDB: ${conn.connection.host}`);
  } catch (error) {
    console.log(`Cant Connect to Mongo Due to Error: ${error.message}`);
    process.exit();
  }
};

connectDB();
const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

const app = express();
app.use(express.json());
app.use(cookieParser());
const corsOptions = {
  origin: process.env.CLIENT_URL, // Allow requests from this origin
  //origin: "https://messaging-app-hiwy.vercel.app"
  credentials: true, // Allow cookies to be sent with the request
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
// app.use(cors());

app.get("/test", (req, res) => {
  res.json("test ok");
});

async function getUserDataFromRequest(req) {
  return new Promise((resolve, reject) => {
    const token = req.cookies?.token;
    //console.log("token"+token);
    if (token) {
      jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if (err) throw err;
        resolve(userData);
      });
    } else {
      reject("no token");
    }
  });
}

app.get("/messages/:userId", async (req, res) => {
  const { userId } = req.params;
  const userData = await getUserDataFromRequest(req);
  const ourUserId = userData.userId;
  if (userId == "653546af0562f26076aebdbd") {
    const messages = await Message.find({
      recipient: userId,
    }).sort({ createdAt: 1 });
    res.json(messages);
  } else {
    const messages = await Message.find({
      sender: { $in: [userId, ourUserId] },
      recipient: { $in: [userId, ourUserId] },
    }).sort({ createdAt: 1 });
    res.json(messages);
  }
});

app.get("/profile", (req, res) => {
  const token = req.cookies?.token;
  //console.log("token"+token);

  if (token) {
    jwt.verify(token, jwtSecret, {}, (err, userData) => {
      if (err) throw err;
      const { id, username } = userData;
      res.json(userData);
    });
  } else {
    console.log("Token not found");
    res.status(401).json("no token");
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("Login initiated with username=", username);
  try {
    const foundUser = await User.find({ username});
    console.log("FOundUser=",foundUser[0])
    if (foundUser[0]) {
      const passOk = bcrypt.compareSync(password, foundUser[0].password);
      if (passOk) {
        jwt.sign(
          { userId: foundUser[0]._id, username },
          jwtSecret,
          {},
          (err, token) => {
            res
              .cookie("token", token, { sameSite: "none", secure: true })
              .json({
                id: foundUser[0]._id,
              });
          }
        );
        res.status(200).json({message:"User Logged in successfully"});
      }
      else {
          res.status(401).json({message:"Unauthorized!!"})
      }
      
    }
    else{
      res.status(401).json({ message: "User does not exists!!" });
    }
  } catch (error) {
    console.log(error);
  }
});

/*REGISTER API*/
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const foundUser = await User.findOne({ username });
  if (foundUser) {
    console.log(`User:${username} Already Exists!!`);
    res.status(403).json({ message: "User Already Exists!!" });
  } else {
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
    const createdUser = await User.create({
      username: username,
      password: hashedPassword,
    });

    jwt.sign(
      { userId: createdUser._id, username },
      jwtSecret,
      {},
      (err, token) => {
        if (err) throw err;
        res
          .cookie("token", token, { sameSite: "none", secure: true })
          .status(201)
          .json({
            id: createdUser._id,
          });
      }
    );
    console.log(`User:${username} Registered Successfully!!`);
  }
});

app.get("/ShowAllPeople", async (req, res) => {
  try {
    const allData = await User.find(); // Fetch all data from the MongoDB collection
    //console.log(allData);
    const people = {};
    allData.forEach((user) => {
      people[user._id] = user.username;
    });
    //console.log("people=",people);
    res.json(people);
  } catch (err) {
    res.status(500).json({ error: "Could not fetch data" });
  }
});

const server = app.listen(4000);

const wss = new ws.WebSocketServer({ server });
wss.on("connection", (connection, req) => {
  // read username and id from the cookie for this connection
  const cookies = req.headers.cookie;
  console.log("cookies=", cookies);
  if (cookies) {
    const tokenCookieString = cookies
      .split(";")
      .find((str) => str.startsWith("token="));
    console.log("tokencookeistring=", tokenCookieString);
    if (tokenCookieString) {
      const token = tokenCookieString.split("=")[1];
      console.log("token=", token);
      if (token) {
        //console.log("token="+token);
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
          if (err) throw err;
          //console.log(userData);
          const { userId, username } = userData;
          console.log("connected user=", username);
          connection.userId = userId;
          connection.username = username;
        });
      }
    } else {
      console.log("notgone");
      const tokenCookieString = cookies
        .split(";")
        .find((str) => str.startsWith(" token="));
      if (tokenCookieString) {
        const token = tokenCookieString.split("=")[1];
        console.log("token=", token);
        if (token) {
          //console.log("token="+token);
          jwt.verify(token, jwtSecret, {}, (err, userData) => {
            if (err) throw err;
            //console.log(userData);
            const { userId, username } = userData;
            console.log("connected user=", username);
            connection.userId = userId;
            connection.username = username;
          });
        }
      }
    }

    //console.log(tokenCookieString);
  }

  connection.on("message", async (message) => {
    const messageData = JSON.parse(message.toString());
    console.log("Message Recieved =" + messageData.text);
    const { recipient, text } = messageData;
    if (recipient && text) {
      const messageDoc = await Message.create({
        sender: connection.userId,
        recipient: recipient,
        text: text,
      });

      [...wss.clients]
        .filter((c) => c.userId === recipient)
        .forEach((c) =>
          c.send(
            JSON.stringify({
              text: text,
              sender: connection.userId,
              recipient: recipient,
              _id: messageDoc._id,
            })
          )
        );
    }
  });

  // console.log([...wss.clients].map( c=> c.username));
  //notify everyone abput online people  (when someone connects)
  [...wss.clients].forEach((client) => {
    console.log("Here is the client=", client.username);
    client.send(
      JSON.stringify({
        online: [...wss.clients].map((c) => ({
          userId: c.userId,
          username: c.username,
        })),
      })
    );
  });
  //wss.clients
  // console.log('connected');
  // connection.send('hello');
  //console.log(req.headers);
});

//username-  getgopalbansal

// import { Server } from "socket.io";

// const io = new Server(8000, {
//   cors: true,
// });

// const emailToSocketIdMap = new Map();
// const socketidToEmailMap = new Map();

// io.on("connection", (socket) => {
//   console.log(`Socket Connected`, socket.id);
//   socket.on("room:join", (data) => {
//     const { email, room } = data;
//     emailToSocketIdMap.set(email, socket.id);
//     socketidToEmailMap.set(socket.id, email);
//     io.to(room).emit("user:joined", { email, id: socket.id });
//     socket.join(room);
//     io.to(socket.id).emit("room:join", data);
//   });

//   socket.on("user:call", ({ to, offer }) => {
//     io.to(to).emit("incomming:call", { from: socket.id, offer });
//   });

//   socket.on("call:accepted", ({ to, ans }) => {
//     io.to(to).emit("call:accepted", { from: socket.id, ans });
//   });

//   socket.on("peer:nego:needed", ({ to, offer }) => {
//     console.log("peer:nego:needed", offer);
//     io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
//   });

//   socket.on("peer:nego:done", ({ to, ans }) => {
//     console.log("peer:nego:done", ans);
//     io.to(to).emit("peer:nego:final", { from: socket.id, ans });
//   });
// });

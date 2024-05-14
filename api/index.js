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
const OnlineUser = require("./models/OnlineUser");

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

// app.use(cors(corsOptions));
// app.options("*", cors(corsOptions));
app.use(cors());

app.get("/test", (req, res) => {
  res.json("test ok");
});

async function getUserDataFromRequest(req) {
  return new Promise((resolve, reject) => {
    try {
      const { token } = req.body;
    console.log("token"+token);
    
    if (token) {
      jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if (err) throw err;
        resolve(userData);
      });
    } else {
      reject("no token");
    }
    } catch (error) {
      console.log(error);
    }
    
  });
}  

app.post("/messages/:userId", async (req, res) => {
  try {
    const { userId } = req.body;
    const userData = await getUserDataFromRequest(req);
    const ourUserId = userData.userId;
    updateLastModified(userData.username);
    console.log("recipeint=",userId,"sender",userData.username)
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
      console.log(messages)
      res.json(messages);
    }
  } catch (error) {
    console.log(error)  
  }
});

app.post("/profile", (req, res) => {
  const { token } = req.body;
  //console.log("token"+token);

  if (token) {
    jwt.verify(token, jwtSecret, {}, (err, userData) => {
      if (err) throw err;
      const { id, username } = userData;
      updateLastModified(username);
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
    const foundUser = await User.find({ username });
    console.log("FoundUser=", foundUser[0]);
    if (foundUser[0]) { 
      const passOk = bcrypt.compareSync(password, foundUser[0].password);
      if (passOk) {
        jwt.sign( 
          { userId: foundUser[0]._id, username },
          jwtSecret,
          {},
          async (err, token) => {
            res
              .json({
                id: foundUser[0]._id,
                message:"User Logged in successfully",
                token:token
              });
            await updateLastModified(username);
            console.log("Token while logging in =",token)
            res
              .status(200)
              .json({ message: "User Logged in successfully", token: token });
          }
        );
      } else {
        res.status(401).json({ message: "Unauthorized!!" });
      } 
    } else {
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
    await updateLastModified(username);
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

async function updateLastModified(username) {
  try {
    // Try to find the user by username
    let user = await OnlineUser.findOne({ username: username });

    if (!user) {
      // If user not found, create a new one
      console.log(
        `User with username ${username} not found. Creating a new online user.`
      );
      user = new OnlineUser({ username: username });
    }

    // Update the lastModified field to the current date
    user.lastModified = new Date();

    // Save the user document
    await user.save();

    console.log(`Last modified date of user ${username} updated successfully.`);
  } catch (error) {
    console.error("Error updating last modified date:", error);
  }
}

async function deleteOnlineUser(username) {
  try {
    // Find the user by username and delete them
    const deletedUser = await OnlineUser.findOneAndDelete({
      username: username,
    });

    if (deletedUser) {
      console.log(`Online user '${username}' deleted successfully.`);
    } else {
      console.log(`User with username '${username}' not found.`);
    }
  } catch (error) {
    console.error("Error deleting online user:", error);
  }
}

app.post("/logout", async (req, res) => {
  console.log("logout route called!!");
  const { username } = req.body;
  try {
    deleteOnlineUser(username);
  } catch (error) {
    console.log(error);
  }
});

app.post("/ShowOnlinePeople", async (req, res) => {
  try {
    // Get all online users
    const { username } = req.body;
    const onlineUsers = await OnlineUser.find();

    // Get the current date
    const currentDate = new Date();

    // Array to store online users to be removed
    const usersToRemove = [];

    // Iterate through online users
    for (const user of onlineUsers) {
      // Calculate the difference in milliseconds between current date and lastModified date
      const timeDifference =
        currentDate.getTime() - user.lastModified.getTime();

      // Check if the difference is more than 10 minutes (10 * 60 * 1000 milliseconds)
      if (timeDifference > 10 * 60 * 1000) {
        // If the difference is more than 10 minutes, add the user to the list of users to remove
        usersToRemove.push(user);
      }
    }

    // Delete users to be removed
    for (const user of usersToRemove) {
      await OnlineUser.findOneAndDelete({ _id: user._id });
    }

    // Prepare response data
    const responseData = [];

    // Retrieve username and id from the User collection for each online user
    for (const user of onlineUsers) {
      const userRecord = await User.findOne({ username: user.username });
      if (userRecord) {
        if (user.username != username) {
          responseData.push({
            username: user.username,
            id: userRecord._id,
          });
        }
      }
    }

    // Send the response
    console.log(responseData);
    res.json(responseData);
  } catch (error) {
    console.error("Error processing ShowOnlinePeople:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/sendMessage", async (req, res) => {
  console.log("Send Message called in backend");
  const { recipient, text, sender } = req.body;
  console.log(recipient,text,sender)

  try {
    // Create a new message document
    const messageDoc = await Message.create({
      sender: sender,
      recipient: recipient,
      text: text,
    });

    res
      .status(200)
      .json({ message: "Message sent successfully", data: messageDoc });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const server = app.listen(4000);

// const wss = new ws.WebSocketServer({ server });
// wss.on("connection", (connection, req) => {
//   // read username and id from the cookie for this connection
//   const cookies = req.headers.cookie;
//   console.log("cookies=", cookies);
//   if (cookies) {
//     const tokenCookieString = cookies
//       .split(";")
//       .find((str) => str.startsWith("token="));
//     console.log("tokencookeistring=", tokenCookieString);
//     if (tokenCookieString) {
//       const token = tokenCookieString.split("=")[1];
//       console.log("token=", token);
//       if (token) {
//         //console.log("token="+token);
//         jwt.verify(token, jwtSecret, {}, (err, userData) => {
//           if (err) throw err;
//           //console.log(userData);
//           const { userId, username } = userData;
//           console.log("connected user=", username);
//           connection.userId = userId;
//           connection.username = username;
//         });
//       }
//     } else {
//       console.log("notgone");
//       const tokenCookieString = cookies
//         .split(";")
//         .find((str) => str.startsWith(" token="));
//       if (tokenCookieString) {
//         const token = tokenCookieString.split("=")[1];
//         console.log("token=", token);
//         if (token) {
//           //console.log("token="+token);
//           jwt.verify(token, jwtSecret, {}, (err, userData) => {
//             if (err) throw err;
//             //console.log(userData);
//             const { userId, username } = userData;
//             console.log("connected user=", username);
//             connection.userId = userId;
//             connection.username = username;
//           });
//         }
//       }
//     }

//     //console.log(tokenCookieString);
//   }

//   connection.on("message", async (message) => {
//     const messageData = JSON.parse(message.toString());
//     console.log("Message Recieved =" + messageData.text);
//     const { recipient, text } = messageData;
//     if (recipient && text) {
//       const messageDoc = await Message.create({
//         sender: connection.userId,
//         recipient: recipient,
//         text: text,
//       });

//       [...wss.clients]
//         .filter((c) => c.userId === recipient)
//         .forEach((c) =>
//           c.send(
//             JSON.stringify({
//               text: text,
//               sender: connection.userId,
//               recipient: recipient,
//               _id: messageDoc._id,
//             })
//           )
//         );
//     }
//   });

//   // console.log([...wss.clients].map( c=> c.username));
//   //notify everyone abput online people  (when someone connects)
//   [...wss.clients].forEach((client) => {
//     console.log("Here is the client=", client.username);
//     client.send(
//       JSON.stringify({
//         online: [...wss.clients].map((c) => ({
//           userId: c.userId,
//           username: c.username,
//         })),
//       })
//     );
//   });
//   //wss.clients
//   // console.log('connected');
//   // connection.send('hello');
//   //console.log(req.headers);
// });

// //username-  getgopalbansal

// // import { Server } from "socket.io";

// // const io = new Server(8000, {
// //   cors: true,
// // });

// // const emailToSocketIdMap = new Map();
// // const socketidToEmailMap = new Map();

// // io.on("connection", (socket) => {
// //   console.log(`Socket Connected`, socket.id);
// //   socket.on("room:join", (data) => {
// //     const { email, room } = data;
// //     emailToSocketIdMap.set(email, socket.id);
// //     socketidToEmailMap.set(socket.id, email);
// //     io.to(room).emit("user:joined", { email, id: socket.id });
// //     socket.join(room);
// //     io.to(socket.id).emit("room:join", data);
// //   });

// //   socket.on("user:call", ({ to, offer }) => {
// //     io.to(to).emit("incomming:call", { from: socket.id, offer });
// //   });

// //   socket.on("call:accepted", ({ to, ans }) => {
// //     io.to(to).emit("call:accepted", { from: socket.id, ans });
// //   });

// //   socket.on("peer:nego:needed", ({ to, offer }) => {
// //     console.log("peer:nego:needed", offer);
// //     io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
// //   });

// //   socket.on("peer:nego:done", ({ to, ans }) => {
// //     console.log("peer:nego:done", ans);
// //     io.to(to).emit("peer:nego:final", { from: socket.id, ans });
// //   });
// // });

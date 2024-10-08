const { createServer } = require("http");
const { Server } = require("socket.io");
const Message = require('./models/Message');
const Notification = require("./models/Notification");
const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost:27017/soulmates", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let users = {};

io.on("connection", async (socket) => {
  socket.on('register', (userId) => {
    users[userId] = socket.id;
    console.log(`User con ID ${userId} registered with socket ID ${socket.id}`);
  });

  socket.on('sendMessage', async ({ senderId, senderName, receiverId, message }) => {
    const receiverSocketId = users[receiverId];
    // Salva il messaggio nel database
    const newMessage = new Message({
      senderId,
      receiverId,
      message,
    });
    // Salva la notifica nel db
    const newNotification = new Notification({
      senderId,
      senderName,
      receiverId,
      message,
    })
    try {
      await newMessage.save(); 
      console.log('Messaggio salvato nel DB:', newMessage);
      await newNotification.save();
      console.log("notifica salvata nel db");
      
      if (receiverSocketId) {
        console.log("socket ricevente 3", receiverSocketId);
        //Emit  receiveMessage
        io.to(receiverSocketId).emit('receiveMessage', {
          senderId,
          senderName,
          message,
        });
        //Emit notify
        io.to(receiverSocketId).emit('notify',{ senderName, message });
        console.log("notifica emessa" );
      }
    } catch (error) {
      console.error('Errore nel salvataggio del messaggio:', error);
    }
  });


  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    for (const [userId, socketId] of Object.entries(users)) {
      if (socketId === socket.id) {
        delete users[userId];
        break;
      }
    }
  });
});

httpServer.listen(5001, () => {
  console.log("Server in ascolto sulla porta 5001");
});

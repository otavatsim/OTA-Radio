// server.js
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const DATA_PATH = path.join(__dirname, "userData");

// Ensure userData folder exists
if (!fs.existsSync(DATA_PATH)) fs.mkdirSync(DATA_PATH);

const CONFIG_FILE = path.join(DATA_PATH, "config.json");

// Serve a simple health check
app.get("/", (req, res) => {
  res.send("Backend server is running!");
});

// WebSocket handling
wss.on("connection", (ws) => {
  console.log("New client connected");

  // Send saved username to client on connect
  let username = "Guest";
  if (fs.existsSync(CONFIG_FILE)) {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE));
    username = config.username || "Guest";
  }
  ws.send(JSON.stringify({ type: "username", username }));

  // Broadcast incoming messages to all clients
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === "save-username") {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify({ username: data.username }));
        username = data.username;
      }

      if (data.type === "chat-message") {
        const payload = JSON.stringify({
          type: "chat-message",
          username: username,
          message: data.message,
        });

        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
          }
        });
      }
    } catch (err) {
      console.error("Error processing message:", err);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

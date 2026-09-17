const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const PORT = 8000;
const ROOT_DIR = __dirname;

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.ico': 'image/x-icon'
};

// Connected Co-Op WebSocket clients
const clients = new Map();
let nextClientId = 1;

// Helper to get local IPv4 addresses
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const isApipa = iface.address.startsWith('169.254.');
        const isWifi = /wi-?fi|wlan|wireless/i.test(name);
        const isLan = /ethernet|lan/i.test(name) && !isApipa;
        const priority = isWifi ? 1 : (isLan ? 2 : (isApipa ? 4 : 3));
        ips.push({ name, ip: iface.address, priority });
      }
    }
  }
  ips.sort((a, b) => a.priority - b.priority);
  return ips;
}

// 1. Static HTTP File Server
const server = http.createServer((req, res) => {
  // Simple API endpoint to get local server IP and connected players info
  if (req.url === '/api/coop-info') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({
      status: 'online',
      clientsCount: clients.size,
      localIPs: getLocalIPs(),
      port: PORT
    }));
    return;
  }

  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const safePath = path.normalize(path.join(ROOT_DIR, reqPath));
  if (!safePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found: ' + reqPath);
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(safePath);
    stream.pipe(res);
  });
});

// 2. Zero-Dependency RFC 6455 WebSocket Implementation
function buildWsFrame(payloadStr) {
  const payloadBuf = Buffer.from(payloadStr, 'utf8');
  const len = payloadBuf.length;
  let header;

  if (len <= 125) {
    header = Buffer.from([0x81, len]);
  } else if (len <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }

  return Buffer.concat([header, payloadBuf]);
}

function sendWs(socket, dataObj) {
  try {
    if (socket.writable) {
      const frame = buildWsFrame(JSON.stringify(dataObj));
      socket.write(frame);
    }
  } catch (e) {
    // Socket write error
  }
}

function broadcastWs(dataObj, senderId = null) {
  const frame = buildWsFrame(JSON.stringify(dataObj));
  for (const [id, client] of clients.entries()) {
    if (senderId === null || id !== senderId) {
      try {
        if (client.socket.writable) {
          client.socket.write(frame);
        }
      } catch (e) {}
    }
  }
}

server.on('upgrade', (req, socket, head) => {
  const secKey = req.headers['sec-websocket-key'];
  if (!secKey) {
    socket.destroy();
    return;
  }

  const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
  const acceptKey = crypto.createHash('sha1').update(secKey + GUID).digest('base64');

  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`
  ];

  socket.write(headers.join('\r\n') + '\r\n\r\n');

  const clientId = nextClientId++;
  const clientData = {
    id: clientId,
    socket: socket,
    name: 'Pemain ' + clientId,
    skin: 'sarah',
    x: 0, y: 0, z: 0,
    yaw: 0,
    action: 'idle'
  };

  clients.set(clientId, clientData);
  console.log(`[Co-Op] Player connected: ID=${clientId}. Total players online: ${clients.size}`);

  // Send welcome & existing players list to new client
  const existingPlayers = [];
  for (const [id, c] of clients.entries()) {
    if (id !== clientId) {
      existingPlayers.push({
        id: c.id,
        name: c.name,
        skin: c.skin,
        x: c.x, y: c.y, z: c.z,
        yaw: c.yaw,
        action: c.action
      });
    }
  }

  sendWs(socket, {
    type: 'init',
    yourId: clientId,
    players: existingPlayers
  });

  // Notify other players about new player joined
  broadcastWs({
    type: 'player_join',
    id: clientId,
    name: clientData.name,
    skin: clientData.skin,
    x: clientData.x, y: clientData.y, z: clientData.z,
    yaw: clientData.yaw,
    action: clientData.action
  }, clientId);

  let buffer = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 2) {
      const firstByte = buffer[0];
      const secondByte = buffer[1];
      const opcode = firstByte & 0x0f;
      const isMasked = (secondByte & 0x80) !== 0;
      let payloadLen = secondByte & 0x7f;
      let offset = 2;

      // Handle close or ping/pong
      if (opcode === 0x8) {
        socket.end();
        return;
      }

      if (payloadLen === 126) {
        if (buffer.length < offset + 2) return;
        payloadLen = buffer.readUInt16BE(offset);
        offset += 2;
      } else if (payloadLen === 127) {
        if (buffer.length < offset + 8) return;
        payloadLen = Number(buffer.readBigUInt64BE(offset));
        offset += 8;
      }

      let maskKey = null;
      if (isMasked) {
        if (buffer.length < offset + 4) return;
        maskKey = buffer.slice(offset, offset + 4);
        offset += 4;
      }

      if (buffer.length < offset + payloadLen) return;

      const payload = buffer.slice(offset, offset + payloadLen);
      buffer = buffer.slice(offset + payloadLen);

      if (isMasked && maskKey) {
        for (let i = 0; i < payload.length; i++) {
          payload[i] ^= maskKey[i % 4];
        }
      }

      // Process message
      try {
        const msgStr = payload.toString('utf8');
        const msg = JSON.parse(msgStr);

        if (msg.type === 'update_state') {
          clientData.x = msg.x;
          clientData.y = msg.y;
          clientData.z = msg.z;
          clientData.yaw = msg.yaw;
          clientData.action = msg.action;
          if (msg.name) clientData.name = msg.name;
          if (msg.skin) clientData.skin = msg.skin;

          broadcastWs({
            type: 'player_update',
            id: clientId,
            name: clientData.name,
            skin: clientData.skin,
            x: msg.x,
            y: msg.y,
            z: msg.z,
            yaw: msg.yaw,
            action: msg.action,
            punch: msg.punch || false,
            tray: msg.tray || null
          }, clientId);
        } else if (msg.type === 'chat') {
          broadcastWs({
            type: 'chat',
            id: clientId,
            name: clientData.name,
            text: msg.text
          });
        } else if (msg.type === 'punch_event') {
          broadcastWs({
            type: 'punch_event',
            id: clientId,
            targetType: msg.targetType,
            targetId: msg.targetId
          }, clientId);
        } else if (msg.type === 'set_profile') {
          if (msg.name) clientData.name = msg.name;
          if (msg.skin) clientData.skin = msg.skin;
          broadcastWs({
            type: 'player_profile',
            id: clientId,
            name: clientData.name,
            skin: clientData.skin
          });
        }
      } catch (e) {}
    }
  });

  socket.on('close', () => {
    clients.delete(clientId);
    console.log(`[Co-Op] Player disconnected: ID=${clientId}. Total players online: ${clients.size}`);
    broadcastWs({
      type: 'player_leave',
      id: clientId
    });
  });

  socket.on('error', () => {
    clients.delete(clientId);
    broadcastWs({
      type: 'player_leave',
      id: clientId
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=============================================================`);
  console.log(`☕ Kopi Kenangan Tycoon 3D - Multi-Player Co-Op LAN Server`);
  console.log(`=============================================================`);
  console.log(`HTTP & WebSocket Server running at port ${PORT}:`);
  console.log(` - Local:    http://localhost:${PORT}`);
  const ips = getLocalIPs();
  if (ips.length > 0) {
    console.log(` - LAN WiFi: http://${ips[0].ip}:${PORT} (Share this with your friend!)`);
  }
  console.log(`=============================================================\n`);
});

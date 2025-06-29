const WebSocket = require('ws');
const url = require('url');

const wss = new WebSocket.Server({ port: 8080 });

// roomId -> [player1, player2]
const rooms = {};

wss.on('connection', (ws, req) => {
    const location = url.parse(req.url, true);
    const roomId = location.query.room;
    if (!roomId) {
        ws.close();
        return;
    }

    if (!rooms[roomId]) {
        rooms[roomId] = [];
    }
    const room = rooms[roomId];

    if (room.length >= 2) {
        ws.send(JSON.stringify({ type: 'full' }));
        ws.close();
        return;
    }

    room.push(ws);
    ws.roomId = roomId;
    ws.playerIndex = room.length - 1;

    // Сообщаем клиенту, что он ждет второго игрока
    if (room.length === 1) {
        ws.send(JSON.stringify({ type: 'waiting' }));
    }

    // Если оба игрока на месте — стартуем игру
    if (room.length === 2) {
        room.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'start' }));
            }
        });
    }

    ws.on('message', (message) => {
        // Пересылаем сообщения другому игроку
        try {
            const data = JSON.parse(message);
            // Только двум игрокам в комнате
            if (room.length === 2) {
                room.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'update', data }));
                    }
                });
            }
        } catch (e) {
            // ignore
        }
    });

    ws.on('close', () => {
        // Удаляем игрока из комнаты
        if (rooms[roomId]) {
            rooms[roomId] = rooms[roomId].filter((client) => client !== ws);
            // Оповещаем второго игрока, если он остался
            if (rooms[roomId].length === 1) {
                const other = rooms[roomId][0];
                if (other.readyState === WebSocket.OPEN) {
                    other.send(JSON.stringify({ type: 'opponent_disconnected' }));
                }
            }
            // Если никого не осталось — удаляем комнату
            if (rooms[roomId].length === 0) {
                delete rooms[roomId];
            }
        }
    });
});

console.log('WebSocket server started on ws://localhost:8080');

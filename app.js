const WebSocket = require('ws')
const rooms = require("./database/Room.json");

const wss = new WebSocket.Server({ port: 8080 })

wss.on('connection', ws => {
    ws.on('message', message => {
        const obj = JSON.parse(message);
        if (obj.join) {
            ws.room = obj.join;
            ws.username = obj.username;
            onopen(ws)
        } else {
            let room = rooms.find(
                room => room.name == ws.room
            );
            let order = room.jogadas.length
            let jogada = {
                "username": ws.username,
                "order": order,
                "jogada": obj.jogada
            };
            room.jogadas.push(jogada);
            if (order == 1) {
                jogadas = room.jogadas
                switch (jogadas[0].jogada + jogadas[1].jogada) {
                    case "paperrock":
                    case "rockscissors":
                    case "scissorspaper":
                        jogada['result'] = jogadas[0].username;
                        break;
                    case "rockpaper":
                    case "scissorsrock":
                    case "paperscissors":
                        jogada['result'] = jogadas[1].username;
                        break;
                    default:
                        jogada['result'] = 'Empate'
                }
                console.log('result' + jogada['result'])
                let user = room.users.find(
                    user => user.username == jogada['result']
                );
                if (user) {
                    user.score += 1;
                    jogada['score'] = user.score;
                }
                room.jogadas = [];
            }
            broadcast(room.name, JSON.stringify(jogada));
        }
    })

    // retira usuario da sala, zera pontuação e jogadas
    ws.on('close', message => {
        let room = rooms.find(
            room => room.name == ws.room
        );
        let users = room.users;
        let user = null;
        for (let i = 0; i < users.length; i++) {
            user = users[i];
            if (!user) {} else if (user.username == ws.username) {
                delete users[i];
                room.jogadas = [];
            } else
                user.score = 0;
        }
        room.users = users.filter(function(el) {
            return el;
        })
    })
})

// envia mensagem para todos da sala
function broadcast(room, message) {
    wss.clients.forEach(client => {
        if (client.room == room) {
            client.send(message)
        }
    })
}

// cria sala/usuario para cada nova conexão
function onopen(ws) {
    let room = rooms.find(
        room => room.name == ws.room
    );
    if (!room) {
        i = rooms.push({
            "name": ws.room,
            "users": [],
            "jogadas": []
        });
        room = rooms[i - 1];
    }
    let players = room.users.length;
    if (players >= 2) {
        ws.close();
    } else {
        room.users.push({
            "username": ws.username,
            "score": 0
        })
        if (players + 1 == 2)
            broadcast(room.name, JSON.stringify({ "message": "Jogo iniciado", "jogador": room.users[0].username }));
    }
}
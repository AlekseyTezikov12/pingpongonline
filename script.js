const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const playerScore = document.getElementById('player-score');
const computerScore = document.getElementById('computer-score');
const menu = document.getElementById('menu');
const difficultyMenu = document.getElementById('difficulty-menu');
const onlineMenu = document.getElementById('online-menu');
const roomMenu = document.getElementById('room-menu');
const joinMenu = document.getElementById('join-menu');
const game = document.getElementById('game');
const vsAIButton = document.getElementById('vsAI');
const vsPlayerButton = document.getElementById('vsPlayer');
const vsOnlineButton = document.getElementById('vsOnline');
const createRoomButton = document.getElementById('create-room');
const joinRoomButton = document.getElementById('join-room');
const backToMainOnlineButton = document.getElementById('back-to-main-online');
const backToOnlineButton = document.getElementById('back-to-online');
const roomIdSpan = document.getElementById('room-id');
const roomStatusSpan = document.getElementById('room-status');
const copyLinkButton = document.getElementById('copy-link');
const leaveRoomButton = document.getElementById('leave-room');
const roomInput = document.getElementById('room-input');
const joinButton = document.getElementById('join-button');
const backToMenuButton = document.getElementById('backToMenu');
const controlsText = document.getElementById('controls-text');
const easyButton = document.getElementById('easy');
const mediumButton = document.getElementById('medium');
const hardButton = document.getElementById('hard');
const backToMainButton = document.getElementById('back-to-main');
const startGameButton = document.getElementById('startGameButton');

// Set canvas size
canvas.width = 800;
canvas.height = 500;

// Game objects
const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 10,
    speed: 7,
    dx: 7,
    dy: 7
};

const paddleHeight = 100;
const paddleWidth = 10;
const player = {
    x: 0,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    dy: 8,
    score: 0
};

const computer = {
    x: canvas.width - paddleWidth,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    dy: 5,
    score: 0,
    reactionDelay: 35,
    accuracy: 1.0
};

// Game state
let gameStarted = false;
let animationId;
let gameMode = ''; // 'ai', 'player', 'online'
let difficulty = ''; // 'easy', 'medium', 'hard'
let ws = null;
let isHost = false;
let roomId = '';

// Event listeners
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);
vsAIButton.addEventListener('click', showDifficultyMenu);
vsPlayerButton.addEventListener('click', () => startGameMode('player'));
vsOnlineButton.addEventListener('click', showOnlineMenu);
createRoomButton.addEventListener('click', createRoom);
joinRoomButton.addEventListener('click', showJoinMenu);
backToMainOnlineButton.addEventListener('click', showMainMenu);
backToOnlineButton.addEventListener('click', showOnlineMenu);
copyLinkButton.addEventListener('click', copyRoomLink);
leaveRoomButton.addEventListener('click', leaveRoom);
joinButton.addEventListener('click', joinRoom);
easyButton.addEventListener('click', () => startGameMode('ai', 'easy'));
mediumButton.addEventListener('click', () => startGameMode('ai', 'medium'));
hardButton.addEventListener('click', () => startGameMode('ai', 'hard'));
backToMainButton.addEventListener('click', showMainMenu);
backToMenuButton.addEventListener('click', returnToMenu);
startGameButton.addEventListener('click', () => {
    startGameButton.style.display = 'none';
    canvas.style.opacity = 1;
    controlsText.textContent = 'Управление: Используйте клавиши ↑ и ↓ для движения ракетки';
    resetScores();
    resetGame();
    gameStarted = true;
    gameLoop();
});

// Key states
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    w: false,
    s: false
};

function showOnlineMenu() {
    menu.style.display = 'none';
    onlineMenu.style.display = 'block';
}

function showJoinMenu() {
    onlineMenu.style.display = 'none';
    joinMenu.style.display = 'block';
}

function createRoom() {
    roomId = generateRoomId();
    isHost = true;
    onlineMenu.style.display = 'none';
    roomMenu.style.display = 'block';
    roomIdSpan.textContent = roomId;
    connectToServer(roomId);
}

function joinRoom() {
    const inputRoomId = roomInput.value.trim();
    if (inputRoomId) {
        roomId = inputRoomId;
        isHost = false;
        joinMenu.style.display = 'none';
        roomMenu.style.display = 'block';
        roomIdSpan.textContent = roomId;
        connectToServer(roomId);
    }
}

function leaveRoom() {
    if (ws) {
        ws.close();
        ws = null;
    }
    roomMenu.style.display = 'none';
    onlineMenu.style.display = 'block';
}

function copyRoomLink() {
    const link = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(link).then(() => {
        alert('Ссылка скопирована в буфер обмена!');
    });
}

function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function connectToServer(roomId) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/?room=${roomId}`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('Connected to server');
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch(data.type) {
            case 'waiting':
                roomStatusSpan.textContent = 'Ожидание игрока...';
                break;
            case 'start':
                roomStatusSpan.textContent = 'Игра началась!';
                startGameMode('online');
                break;
            case 'update':
                if (data.data.type === 'paddle') {
                    if (isHost) {
                        computer.y = data.data.y;
                    } else {
                        player.y = data.data.y;
                    }
                } else if (data.data.type === 'ball') {
                    ball.x = data.data.x;
                    ball.y = data.data.y;
                    ball.dx = data.data.dx;
                    ball.dy = data.data.dy;
                } else if (data.data.type === 'score') {
                    if (isHost) {
                        computer.score = data.data.score;
                        computerScore.textContent = computer.score;
                    } else {
                        player.score = data.data.score;
                        playerScore.textContent = player.score;
                    }
                }
                break;
            case 'opponent_disconnected':
                roomStatusSpan.textContent = 'Противник отключился';
                setTimeout(() => {
                    leaveRoom();
                }, 2000);
                break;
        }
    };
    
    ws.onclose = () => {
        console.log('Disconnected from server');
    };
}

function showDifficultyMenu() {
    menu.style.display = 'none';
    difficultyMenu.style.display = 'block';
}

function showMainMenu() {
    difficultyMenu.style.display = 'none';
    onlineMenu.style.display = 'none';
    roomMenu.style.display = 'none';
    joinMenu.style.display = 'none';
    menu.style.display = 'block';
}

function handleKeyDown(e) {
    const key = e.key.toLowerCase();
    if (key === 'arrowup' || key === 'arrowdown' || key === 'w' || key === 's') {
        keys[key] = true;
    }
}

function handleKeyUp(e) {
    const key = e.key.toLowerCase();
    if (key === 'arrowup' || key === 'arrowdown' || key === 'w' || key === 's') {
        keys[key] = false;
    }
}

function startGameMode(mode, diff = '') {
    gameMode = mode;
    difficulty = diff;
    difficultyMenu.style.display = 'none';
    menu.style.display = 'none';
    roomMenu.style.display = 'none';
    game.style.display = 'block';
    startGameButton.style.display = 'block';
    canvas.style.opacity = 0.5;
    controlsText.textContent = 'Нажмите "Начать игру"';
    if (mode === 'ai') {
        switch(difficulty) {
            case 'easy':
                computer.reactionDelay = 100;
                computer.accuracy = 0.4;
                computer.dy = 3;
                break;
            case 'medium':
                computer.reactionDelay = 35;
                computer.accuracy = 0.85;
                computer.dy = 5;
                break;
            case 'hard':
                computer.reactionDelay = 15;
                computer.accuracy = 1.0;
                computer.dy = 7;
                break;
        }
    }
}

function returnToMenu() {
    cancelAnimationFrame(animationId);
    gameStarted = false;
    game.style.display = 'none';
    menu.style.display = 'block';
    startGameButton.style.display = 'block';
    canvas.style.opacity = 0.5;
    if (ws) {
        ws.close();
        ws = null;
    }
    showMainMenu();
    resetScores();
}

function resetScores() {
    player.score = 0;
    computer.score = 0;
    playerScore.textContent = '0';
    computerScore.textContent = '0';
}

function resetGame() {
    // Reset ball position and direction
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    
    // Set initial ball direction
    const direction = Math.random() > 0.5 ? 1 : -1;
    ball.dx = ball.speed * direction;
    ball.dy = ball.speed * (Math.random() > 0.5 ? 1 : -1) * 0.5; // Reduced vertical speed
    
    // Reset paddles
    player.y = canvas.height / 2 - paddleHeight / 2;
    computer.y = canvas.height / 2 - paddleHeight / 2;
}

function gameLoop() {
    if (!gameStarted) return;
    
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
}

function update() {
    if (gameMode === 'online') {
        if (isHost) {
            if (keys.w && player.y > 0) {
                player.y -= player.dy;
                sendPaddlePosition();
            }
            if (keys.s && player.y + player.height < canvas.height) {
                player.y += player.dy;
                sendPaddlePosition();
            }
        } else {
            if (keys.arrowup && player.y > 0) {
                player.y -= player.dy;
                sendPaddlePosition();
            }
            if (keys.arrowdown && player.y + player.height < canvas.height) {
                player.y += player.dy;
                sendPaddlePosition();
            }
        }
    } else if (gameMode === 'ai') {
        if (keys.arrowup && player.y > 0) {
            player.y -= player.dy;
        }
        if (keys.arrowdown && player.y + player.height < canvas.height) {
            player.y += player.dy;
        }

        // Simplified AI movement logic
        const computerCenter = computer.y + computer.height / 2;
        const ballCenter = ball.y;
        
        // Add small random error to target position
        const error = (Math.random() - 0.5) * (1 - computer.accuracy) * 50;
        const targetY = ballCenter + error;
        
        // Move with delay
        if (Math.abs(computerCenter - targetY) > computer.reactionDelay) {
            if (computerCenter < targetY) {
                computer.y += computer.dy;
            } else {
                computer.y -= computer.dy;
            }
        }
    } else {
        if (keys.w && player.y > 0) {
            player.y -= player.dy;
        }
        if (keys.s && player.y + player.height < canvas.height) {
            player.y += player.dy;
        }
        if (keys.arrowup && computer.y > 0) {
            computer.y -= computer.dy;
        }
        if (keys.arrowdown && computer.y + computer.height < canvas.height) {
            computer.y += computer.dy;
        }
    }

    if (gameMode !== 'online' || isHost) {
        // Move ball
        ball.x += ball.dx;
        ball.y += ball.dy;

        // Ball collision with top and bottom walls
        if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) {
            ball.dy *= -1;
            // Keep ball within bounds
            ball.y = ball.y + ball.radius > canvas.height ? 
                canvas.height - ball.radius : 
                ball.radius;
        }

        // Ball collision with paddles
        if (
            ball.x - ball.radius < player.x + player.width &&
            ball.y > player.y &&
            ball.y < player.y + player.height
        ) {
            ball.dx = Math.abs(ball.dx); // Ensure positive direction
            ball.x = player.x + player.width + ball.radius;
        }

        if (
            ball.x + ball.radius > computer.x &&
            ball.y > computer.y &&
            ball.y < computer.y + computer.height
        ) {
            ball.dx = -Math.abs(ball.dx); // Ensure negative direction
            ball.x = computer.x - ball.radius;
        }

        // Score points
        if (ball.x + ball.radius < 0) {
            updateScore(false); // Computer scores
        } else if (ball.x - ball.radius > canvas.width) {
            updateScore(true); // Player scores
        }

        if (gameMode === 'online') {
            sendBallPosition();
        }
    }
}

function sendPaddlePosition() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'paddle',
            y: player.y
        }));
    }
}

function sendBallPosition() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'ball',
            x: ball.x,
            y: ball.y,
            dx: ball.dx,
            dy: ball.dy
        }));
    }
}

function sendScore(score) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'score',
            score: score
        }));
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw center line with gradient
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw ball with glow effect
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    const ballGradient = ctx.createRadialGradient(
        ball.x, ball.y, 0,
        ball.x, ball.y, ball.radius
    );
    ballGradient.addColorStop(0, '#ffffff');
    ballGradient.addColorStop(1, 'rgba(255, 255, 255, 0.7)');
    ctx.fillStyle = ballGradient;
    ctx.fill();
    
    // Add glow effect to ball
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw paddles with gradient and glow
    const paddleGradient1 = ctx.createLinearGradient(
        player.x, 0,
        player.x + player.width, 0
    );
    paddleGradient1.addColorStop(0, '#4CAF50');
    paddleGradient1.addColorStop(1, '#45a049');
    
    const paddleGradient2 = ctx.createLinearGradient(
        computer.x, 0,
        computer.x + computer.width, 0
    );
    if (gameMode === 'ai') {
        paddleGradient2.addColorStop(0, '#2196F3');
        paddleGradient2.addColorStop(1, '#1976D2');
    } else if (gameMode === 'online') {
        paddleGradient2.addColorStop(0, '#FF9800');
        paddleGradient2.addColorStop(1, '#F57C00');
    } else {
        paddleGradient2.addColorStop(0, '#FF9800');
        paddleGradient2.addColorStop(1, '#F57C00');
    }

    // Draw player paddle with glow
    ctx.shadowColor = 'rgba(76, 175, 80, 0.5)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = paddleGradient1;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.shadowBlur = 0;

    // Draw computer/second player paddle with glow
    ctx.shadowColor = gameMode === 'ai' 
        ? 'rgba(33, 150, 243, 0.5)'
        : 'rgba(255, 152, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = paddleGradient2;
    ctx.fillRect(computer.x, computer.y, computer.width, computer.height);
    ctx.shadowBlur = 0;

    // Add trail effect to ball
    const trailLength = 5;
    for (let i = trailLength; i > 0; i--) {
        const alpha = 0.2 - (i * 0.04);
        ctx.beginPath();
        ctx.arc(
            ball.x - (ball.dx * i * 0.5),
            ball.y - (ball.dy * i * 0.5),
            ball.radius * (1 - i * 0.1),
            0,
            Math.PI * 2
        );
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
    }
}

function createScoreEffect(x, y) {
    const particles = [];
    const particleCount = 20;
    
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: x,
            y: y,
            dx: (Math.random() - 0.5) * 8,
            dy: (Math.random() - 0.5) * 8,
            radius: Math.random() * 3 + 1,
            alpha: 1
        });
    }
    
    function animateParticles() {
        ctx.save();
        particles.forEach((particle, index) => {
            particle.x += particle.dx;
            particle.y += particle.dy;
            particle.alpha -= 0.02;
            
            if (particle.alpha <= 0) {
                particles.splice(index, 1);
                return;
            }
            
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${particle.alpha})`;
            ctx.fill();
        });
        ctx.restore();
        
        if (particles.length > 0) {
            requestAnimationFrame(animateParticles);
        }
    }
    
    animateParticles();
}

function updateScore(isPlayer) {
    if (isPlayer) {
        player.score++;
        playerScore.textContent = player.score;
        createScoreEffect(canvas.width - 50, canvas.height / 2);
    } else {
        computer.score++;
        computerScore.textContent = computer.score;
        createScoreEffect(50, canvas.height / 2);
    }
    resetGame();
}

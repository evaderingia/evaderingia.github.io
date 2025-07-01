// --- Snake Game ---
(function() {
    const canvas = document.getElementById('snake-game');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const gridSize = 20;
    const tileCount = 20;
    let snake = [{x: 10, y: 10}];
    let direction = {x: 0, y: 0};
    let food = {x: 5, y: 5};
    let score = 0;
    let gameOver = false;
    let movePending = false;

    function draw() {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Draw food
        ctx.fillStyle = '#ffe600';
        ctx.beginPath();
        ctx.arc((food.x + 0.5) * gridSize, (food.y + 0.5) * gridSize, gridSize/2.2, 0, Math.PI * 2);
        ctx.fill();
        // Draw snake
        for (let i = 0; i < snake.length; i++) {
            ctx.fillStyle = i === 0 ? '#fff' : '#ffe600';
            ctx.fillRect(snake[i].x * gridSize, snake[i].y * gridSize, gridSize, gridSize);
        }
        // Draw score
        ctx.fillStyle = '#fff';
        ctx.font = '16px Georgia, serif';
        ctx.fillText('Score: ' + score, 10, 24);
        // Game over
        if (gameOver) {
            ctx.fillStyle = '#fff';
            ctx.font = '32px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.fillText('Game Over', 200, 200);
            ctx.font = '18px Georgia, serif';
            ctx.fillText('Press Space to Restart', 200, 240);
            ctx.textAlign = 'left';
        }
    }

    function placeFood() {
        let valid = false;
        while (!valid) {
            food.x = Math.floor(Math.random() * tileCount);
            food.y = Math.floor(Math.random() * tileCount);
            valid = !snake.some(s => s.x === food.x && s.y === food.y);
        }
    }

    function update() {
        if (gameOver) return;
        const head = {x: snake[0].x + direction.x, y: snake[0].y + direction.y};
        // Wall collision
        if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
            gameOver = true;
            draw();
            return;
        }
        // Self collision
        if (snake.some(s => s.x === head.x && s.y === head.y)) {
            gameOver = true;
            draw();
            return;
        }
        snake.unshift(head);
        // Eat food
        if (head.x === food.x && head.y === food.y) {
            score++;
            placeFood();
        } else {
            snake.pop();
        }
        draw();
        movePending = false;
    }

    function resetGame() {
        snake = [{x: 10, y: 10}];
        direction = {x: 0, y: 0};
        score = 0;
        gameOver = false;
        placeFood();
        draw();
    }

    document.addEventListener('keydown', function(e) {
        if (gameOver && e.code === 'Space') {
            resetGame();
            return;
        }
        if (movePending) return;
        let newDir = null;
        if (e.key === 'ArrowUp' && direction.y !== 1) newDir = {x: 0, y: -1};
        if (e.key === 'ArrowDown' && direction.y !== -1) newDir = {x: 0, y: 1};
        if (e.key === 'ArrowLeft' && direction.x !== 1) newDir = {x: -1, y: 0};
        if (e.key === 'ArrowRight' && direction.x !== -1) newDir = {x: 1, y: 0};
        if (newDir) {
            direction = newDir;
            movePending = true;
        }
    });

    function gameLoop() {
        if (!gameOver && (direction.x !== 0 || direction.y !== 0)) {
            update();
        } else {
            draw();
        }
        setTimeout(gameLoop, 180);
    }
    resetGame();
    gameLoop();
})(); 
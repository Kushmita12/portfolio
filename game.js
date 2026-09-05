const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const quizData = [
    { question: "What is 1 + 1?", options: ["2", "3", "4"], answerIndex: 0 },
    { question: "What is 2 + 3?", options: ["4", "5", "6"], answerIndex: 1 },
    { question: "What is 4 + 2?", options: ["5", "7", "6"], answerIndex: 2 },
    { question: "What is 3 + 3?", options: ["6", "5", "8"], answerIndex: 0 },
    { question: "What is 5 + 4?", options: ["8", "9", "10"], answerIndex: 1 },
    { question: "What is 6 + 2?", options: ["7", "9", "8"], answerIndex: 2 },
    { question: "What is 7 + 1?", options: ["8", "6", "9"], answerIndex: 0 },
    { question: "What is 3 + 5?", options: ["7", "8", "9"], answerIndex: 1 },
    { question: "What is 4 + 4?", options: ["9", "7", "8"], answerIndex: 2 },
    { question: "What is 5 + 5?", options: ["10", "11", "12"], answerIndex: 0 },
    { question: "What is 6 + 3?", options: ["8", "9", "10"], answerIndex: 1 },
    { question: "What is 7 + 3?", options: ["9", "8", "10"], answerIndex: 2 },
    { question: "What is 8 + 2?", options: ["10", "11", "9"], answerIndex: 0 },
    { question: "What is 9 + 1?", options: ["11", "10", "12"], answerIndex: 1 },
    { question: "What is 6 + 4?", options: ["9", "11", "10"], answerIndex: 2 }
];

let currentQuestion = 0;
let score = 0;
let isAnimating = false;
let isGameOver = false;
let pendingSound = null; // Stores sound to play on impact

// Vector Positions
let bowlerX = 80;
let ballX = 110;
let ballY = 220;
let ballProgress = 0;

// Timer Logic
let timerStartTime = Date.now();
const TIMER_DURATION = 4000; // 4 Seconds
let timerRemaining = 4000;

// Browser Web Audio Context
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Generate Bat Hit Sound (Wooden Crack Impact)
function playHitSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    // Low frequency pop
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);

    // High frequency wooden click
    const click = audioCtx.createOscillator();
    const clickGain = audioCtx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(1200, audioCtx.currentTime);
    click.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.03);
    clickGain.gain.setValueAtTime(0.7, audioCtx.currentTime);
    clickGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.03);
    
    click.connect(clickGain);
    clickGain.connect(audioCtx.destination);
    
    click.start();
    click.stop(audioCtx.currentTime + 0.03);
}

// Generate Wicket/Out Sound (Low Buzzer Impact)
function playOutSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(60, audioCtx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}

function loadQuestion() {
    isGameOver = false;
    pendingSound = null;
    const q = quizData[currentQuestion];
    document.getElementById("question-box").innerText = q.question;
    document.getElementById("feedback-banner").innerText = "";

    const buttons = document.querySelectorAll(".answer-btn");
    buttons.forEach((btn, index) => {
        btn.innerText = q.options[index];
        btn.style.display = "flex";
    });

    const retryBtn = document.getElementById("retry-btn");
    if (retryBtn) retryBtn.remove();

    timerStartTime = Date.now();
    timerRemaining = TIMER_DURATION;
}

function checkAnswer(buttonIndex) {
    if (isAnimating || isGameOver) return;

    const q = quizData[currentQuestion];
    const feedback = document.getElementById("feedback-banner");
    isAnimating = true;

    if (buttonIndex === q.answerIndex) {
        pendingSound = "hit"; // Queue hit sound for impact moment

        if (timerRemaining <= 2000) {
            score += 1;
            feedback.innerText = "ONE RUN!";
        } else {
            score += 6;
            feedback.innerText = "SIX RUNS! GREAT SHOT!";
        }
        document.getElementById("score").innerText = score;
        feedback.style.color = "#4caf50";
    } else {
        pendingSound = "out"; // Queue out sound for impact moment
        feedback.innerText = "OUT! WRONG ANSWER";
        feedback.style.color = "#f44336";
    }

    animateDelivery(false);
}

function handleTimeout() {
    isGameOver = true;
    playOutSound();
    const feedback = document.getElementById("feedback-banner");
    feedback.innerText = "TIME OUT! OUT!";
    feedback.style.color = "#f44336";

    const buttons = document.querySelectorAll(".answer-btn");
    buttons.forEach(btn => btn.style.display = "none");

    const controls = document.getElementById("controls");
    let retryBtn = document.getElementById("retry-btn");
    if (!retryBtn) {
        retryBtn = document.createElement("button");
        retryBtn.id = "retry-btn";
        retryBtn.className = "answer-btn";
        retryBtn.innerText = "RETRY";
        retryBtn.style.backgroundColor = "#c62828";
        retryBtn.onclick = resetGame;
        controls.appendChild(retryBtn);
    }
}

function resetGame() {
    isGameOver = false;
    isAnimating = false;
    ballProgress = 0;
    bowlerX = 80;
    ballX = 110;
    ballY = 220;
    loadQuestion();
}

function animateDelivery(isTimeout) {
    let interval = setInterval(() => {
        ballProgress += 0.05;
        
        bowlerX = 80 + (ballProgress * 20);
        ballX = 110 + (210 * ballProgress);
        ballY = 220 + (190 * ballProgress);

        if (ballProgress >= 1) {
            clearInterval(interval);

            // Play the queued sound right as the ball hits the bat/wicket
            if (pendingSound === "hit") {
                playHitSound();
            } else if (pendingSound === "out") {
                playOutSound();
            }

            setTimeout(() => {
                ballProgress = 0;
                bowlerX = 80;
                ballX = 110;
                ballY = 220;
                isAnimating = false;
                
                if (!isTimeout) {
                    currentQuestion = (currentQuestion + 1) % quizData.length;
                    loadQuestion();
                }
            }, 1000);
        }
    }, 30);
}

function updateTimer() {
    if (!isAnimating && !isGameOver) {
        const elapsed = Date.now() - timerStartTime;
        timerRemaining = Math.max(0, TIMER_DURATION - elapsed);

        if (timerRemaining === 0) {
            handleTimeout();
        }
    }
}

function draw() {
    updateTimer();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Sky Background
    ctx.fillStyle = "#87ceeb";
    ctx.fillRect(0, 0, canvas.width, 300);

    // Sun
    ctx.fillStyle = "#ffeb3b";
    ctx.beginPath();
    ctx.arc(430, 60, 35, 0, Math.PI * 2);
    ctx.fill();

    // Field Grass
    ctx.fillStyle = "#4caf50";
    ctx.fillRect(0, 250, canvas.width, canvas.height - 250);

    // Pitch Strip
    ctx.fillStyle = "#c8b282";
    ctx.beginPath();
    ctx.moveTo(120, 250);
    ctx.lineTo(380, 250);
    ctx.lineTo(440, 480);
    ctx.lineTo(60, 480);
    ctx.closePath();
    ctx.fill();

    // Crease Line
    ctx.strokeStyle = "white";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(100, 440);
    ctx.lineTo(400, 440);
    ctx.stroke();

    // Wickets
    ctx.fillStyle = "#e0a96d";
    ctx.fillRect(345, 375, 4, 45);
    ctx.fillRect(353, 375, 4, 45);
    ctx.fillRect(361, 375, 4, 45);

    // Batter
    ctx.strokeStyle = "#c62828";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(360, 370, 12, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(360, 382); ctx.lineTo(360, 420); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(360, 420); ctx.lineTo(350, 450); ctx.moveTo(360, 420); ctx.lineTo(370, 450); ctx.stroke();
    ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(355, 395); ctx.lineTo(335, 425); ctx.stroke();

    // Bowler
    ctx.strokeStyle = "#1565c0"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(bowlerX, 180, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bowlerX, 190); ctx.lineTo(bowlerX, 220); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bowlerX, 200); ctx.lineTo(bowlerX + 15, 190);
    ctx.moveTo(bowlerX, 220); ctx.lineTo(bowlerX - 10, 240); ctx.moveTo(bowlerX, 220); ctx.lineTo(bowlerX + 10, 240); ctx.stroke();

    // Cricket Ball
    ctx.fillStyle = "#d32f2f";
    ctx.beginPath(); ctx.arc(ballX, ballY, 8 + (ballProgress * 6), 0, Math.PI * 2); ctx.fill();

    // Timer Bar
    const barWidth = 120;
    const barHeight = 14;
    const barX = 350;
    const barY = 18;
    const progressRatio = timerRemaining / TIMER_DURATION;

    ctx.fillStyle = "#111111";
    ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

    ctx.fillStyle = (timerRemaining > 2000) ? "#4caf50" : "#f44336";
    ctx.fillRect(barX, barY, barWidth * progressRatio, barHeight);

    requestAnimationFrame(draw);
}

loadQuestion();
draw();
/**
 * Verification Script for Neon Dream Layout (720p)
 */
const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

// 1. Setup Canvas
const WIDTH = 1280;
const HEIGHT = 720;
const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

// 2. Register Fonts
const fontPath = path.join(__dirname, 'assets', 'fonts', 'MouldyCheese-Regular.ttf');
if (fs.existsSync(fontPath)) {
    registerFont(fontPath, { family: 'MouldyCheese' });
    console.log("Registered MouldyCheese font");
}

// 3. Mock Data
const gameState = {
    status: 'question',
    questionText: {
        english: "What is the capital of France?",
        telugu: "ఫ్రాన్స్ రాజధాని ఏది?",
        hindi: "फ्रांस की राजधानी क्या है?"
    },
    options: [
        { prefix: 'A', label: { english: 'London' } },
        { prefix: 'B', label: { english: 'Paris' }, status: 'selected' },
        { prefix: 'C', label: { english: 'Berlin' } },
        { prefix: 'D', label: { english: 'Madrid' } }
    ],
    timer: { timeLeft: 12, totalTime: 20 }
};

const leaderboard = [
    { username: 'Top Player', score: 1250 },
    { username: 'NeonFan', score: 980 }
];

// 4. Import Template
const neonLayout = require('./src/templates/neon-dream-layout');
const templateRenderer = require('./src/games/quiz/template-renderer');

// 5. Render
async function verify() {
    console.log("Rendering Neon Dream Layout...");

    // Render UI directly using neonLayout
    templateRenderer.renderQuizUI(ctx, gameState, leaderboard, Date.now(), neonLayout);

    // Save to file
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync('verify_neon_dream_final.png', buffer);
    console.log("Saved verify_neon_dream_final.png");
}

verify().catch(console.error);

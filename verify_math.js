const fs = require('fs');
const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const slices = values.length;
const sliceAngle = (Math.PI * 2) / slices;

// Clear log
fs.writeFileSync('math_output.txt', '');

const log = (msg) => {
    console.log(msg);
    fs.appendFileSync('math_output.txt', msg + '\n');
};

log(`Slices: ${slices}, SliceAngle: ${sliceAngle.toFixed(4)} rad (${(sliceAngle * 180 / Math.PI).toFixed(1)} deg)`);

// Simulation function
function simulate(winningNumber) {
    const sliceIndex = values.indexOf(winningNumber);

    // Logic from state.js
    const targetAngle = sliceIndex * sliceAngle + sliceAngle / 2;

    // Logic from live/index.js (visual rotation calculation)
    // Assume start pos 0. extraSpins 0 for simplicity (mod 2PI doesn't change position)
    // targetRotation = 0 - targetAngle
    const visualRotation = -targetAngle;

    log(`\nTesting Win: ${winningNumber} (Index ${sliceIndex})`);
    log(`Target Angle (Center of slice from 0): ${targetAngle.toFixed(4)} rad (${(targetAngle * 180 / Math.PI).toFixed(1)} deg)`);
    log(`Visual Rotation applied: ${visualRotation.toFixed(4)} rad`);

    // Verify pointer alignment
    // Visual draw rotation: visualRotation - PI/2
    const drawRot = visualRotation - Math.PI / 2;

    log(`Draw Rotation (Context): ${drawRot.toFixed(4)} rad`);

    // Slice bounds in unrotated world: [Index * Angle, (Index+1) * Angle]
    // After rotation: [Start + DrawRot, End + DrawRot]

    const startRad = sliceIndex * sliceAngle;
    const endRad = (sliceIndex + 1) * sliceAngle;

    // Normalize to [0, 2PI] for readability
    const norm = (r) => {
        let x = r % (Math.PI * 2);
        if (x < 0) x += Math.PI * 2;
        return x;
    };

    const finalStart = norm(startRad + drawRot);
    const finalEnd = norm(endRad + drawRot);

    const finalStartDeg = finalStart * 180 / Math.PI;
    const finalEndDeg = finalEnd * 180 / Math.PI;

    log(`Slice on Screen: ${finalStartDeg.toFixed(1)}° to ${finalEndDeg.toFixed(1)}°`);

    // Pointer is at 12 o'clock (-90 deg or 270 deg)
    const pointerDeg = 270;

    // Check if pointer is between start and end
    // Handling wrap around
    let hit = false;
    if (finalStartDeg > finalEndDeg) {
        // Wraps 0
        hit = (pointerDeg >= finalStartDeg) || (pointerDeg <= finalEndDeg);
    } else {
        hit = (pointerDeg >= finalStartDeg) && (pointerDeg <= finalEndDeg);
    }

    log(`Pointer at 270° (Top). Hit? ${hit ? "✅ YES" : "❌ NO"}`);
}

simulate(10); // Index 0
simulate(20); // Index 1
simulate(50); // Index 4 (Bottom?)

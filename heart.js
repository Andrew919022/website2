const canvas = document.getElementById('heartCanvas');
const ctx = canvas.getContext('2d');
const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;
const CANVAS_CENTER_X = CANVAS_WIDTH / 2;
const CANVAS_CENTER_Y = CANVAS_HEIGHT / 2;
const IMAGE_ENLARGE = 11;
const HEART_COLOR = "#ff2121";
let countdownDate = null;
let isAnimating = true;
let textOpacity = 1;

let countdownTextX = CANVAS_CENTER_X;
let countdownTextY = CANVAS_CENTER_Y + 25;

let setting_time = "24:00:00"

let onCountdownEnd = null;

function heartFunction(t, shrinkRatio = IMAGE_ENLARGE) {
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    return {
        x: CANVAS_CENTER_X + x * shrinkRatio,
        y: CANVAS_CENTER_Y + y * shrinkRatio
    };
}

function scatterInside(x, y, beta = 1.15) {
    const ratioX = -beta * Math.log(Math.random());
    const ratioY = -beta * Math.log(Math.random());
    const dx = ratioX * (x - CANVAS_CENTER_X);
    const dy = ratioY * (y - CANVAS_CENTER_Y);
    return { x: x - dx, y: y - dy };
}

function shrink(x, y, ratio) {
    const force = -1 / Math.pow(((x - CANVAS_CENTER_X) ** 2 + (y - CANVAS_CENTER_Y) ** 2), 0.6);
    const dx = ratio * force * (x - CANVAS_CENTER_X);
    const dy = ratio * force * (y - CANVAS_CENTER_Y);
    return { x: x - dx, y: y - dy };
}

function curve(p) {
    return 2 * (2 * Math.sin(4 * p)) / (2 * Math.PI);
}

class Heart {
    constructor(generateFrame = 60) {
        this.points = [];
        this.edgeDiffusionPoints = [];
        this.centerDiffusionPoints = [];
        this.allPoints = [];
        this.generateFrame = generateFrame;
        this.build(1500);
        this.randomHalo = 1000;
        this.calcAllFrames();
    }

    build(number) {
        for (let i = 0; i < number; i++) {
            const t = Math.random() * 2 * Math.PI;
            const { x, y } = heartFunction(t);
            this.points.push({ x, y });
        }

        for (const { x, y } of this.points) {
            for (let i = 0; i < 2; i++) {
                const { x: nx, y: ny } = scatterInside(x, y, 0.05);
                this.edgeDiffusionPoints.push({ x: nx, y: ny });
            }
        }

        for (let i = 0; i < 4000; i++) {
            const { x, y } = this.points[Math.floor(Math.random() * this.points.length)];
            const { x: nx, y: ny } = scatterInside(x, y, 0.17);
            this.centerDiffusionPoints.push({ x: nx, y: ny });
        }
    }

    calcPosition(x, y, ratio) {
        const force = 1 / Math.pow(((x - CANVAS_CENTER_X) ** 2 + (y - CANVAS_CENTER_Y) ** 2), 0.520);
        const dx = ratio * force * (x - CANVAS_CENTER_X) + Math.random() * 2 - 1;
        const dy = ratio * force * (y - CANVAS_CENTER_Y) + Math.random() * 2 - 1;
        return { x: x - dx, y: y - dy };
    }

    calc(frame) {
        const ratio = 10 * curve(frame / this.generateFrame * Math.PI);
        const allPoints = [];

        const heartHaloPoints = [];
        const haloRadius = 4 + 6 * (1 + curve(frame / this.generateFrame * Math.PI));
        const haloNumber = 3000 + 6000 * Math.abs(Math.pow(curve(frame / this.generateFrame * Math.PI), 2));

        for (let i = 0; i < haloNumber; i++) {
            const t = Math.random() * 2 * Math.PI;
            let { x, y } = heartFunction(t, 11.6);
            ({ x, y } = shrink(x, y, haloRadius));
            if (!heartHaloPoints.some(p => p.x === x && p.y === y)) {
                heartHaloPoints.push({ x, y });
                x += Math.random() * 28 - 14;
                y += Math.random() * 28 - 14;
                const size = Math.random() > 0.5 ? 2 : 1;
                allPoints.push({ x, y, size });
            }
        }

        for (const { x, y } of this.points) {
            const { x: nx, y: ny } = this.calcPosition(x, y, ratio);
            const size = Math.random() > 0.67 ? 3 : 2;
            allPoints.push({ x: nx, y: ny, size });
        }

        for (const { x, y } of this.edgeDiffusionPoints) {
            const { x: nx, y: ny } = this.calcPosition(x, y, ratio);
            const size = Math.random() > 0.5 ? 2 : 1;
            allPoints.push({ x: nx, y: ny, size });
        }

        for (const { x, y } of this.centerDiffusionPoints) {
            const { x: nx, y: ny } = this.calcPosition(x, y, ratio);
            const size = Math.random() > 0.5 ? 2 : 1;
            allPoints.push({ x: nx, y: ny, size });
        }

        return allPoints;
    }

    calcAllFrames() {
        for (let frame = 0; frame < this.generateFrame; frame++) {
            this.allPoints[frame] = this.calc(frame);
        }
    }

    render(frame) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        for (const { x, y, size } of this.allPoints[frame]) {
            ctx.fillStyle = isAnimating ? HEART_COLOR : `rgba(255, 33, 33, ${textOpacity})`;
            ctx.fillRect(x, y, size, size);
        }

        ctx.fillStyle = `rgba(255, 0, 80, ${textOpacity})`;
        ctx.font = "30px Helvetica, sans-serif"; 
        ctx.textAlign = "center";

        const timeDiff = countdownDate.getTime() - new Date().getTime();
        const seconds = Math.floor((timeDiff / 1000) % 60);
        const minutes = Math.floor((timeDiff / 1000 / 60) % 60);
        const hours = Math.floor((timeDiff / (1000 * 60 * 60)) % 24);
        ctx.fillText(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`, countdownTextX, countdownTextY);
    }
}

const heart = new Heart();

let lastBeat = Date.now();
const beatInterval = 1000;

let animationId;

function animate() {
    const now = Date.now();
    
    if (isAnimating) {
        const frame = Math.floor((now - lastBeat) / (beatInterval / heart.generateFrame)) % heart.generateFrame;
        heart.render(frame);

        if (now - lastBeat >= beatInterval) {
            lastBeat = now;
            if (countdownDate.getTime() <= now) {
                isAnimating = false;
            }
        }
    } else {
        textOpacity -= 0.05;
        if (textOpacity < 0) textOpacity = 0;
        
        // Fade out the heart
        ctx.fillStyle = `rgba(0, 0, 0, ${1 - textOpacity})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        heart.render(0);

        if (textOpacity === 0) {
            cancelAnimationFrame(animationId);
            // Clear the canvas completely
            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            if (onCountdownEnd) {
                onCountdownEnd();
            }
            return;
        }
    }

    animationId = requestAnimationFrame(animate);
}

const customCountdownTime = setting_time; 
if (customCountdownTime) {
    const [hours, minutes, seconds] = customCountdownTime.split(':');
    countdownDate = new Date();
    countdownDate.setHours(hours);
    countdownDate.setMinutes(minutes);
    countdownDate.setSeconds(seconds);
    if (countdownDate.getTime() <= Date.now()) {
        countdownDate.setDate(countdownDate.getDate() + 1);
    }
}

function updateTextPosition(newX, newY) {
    countdownTextX = newX;
    countdownTextY = newY;
}

function setCountdownEndCallback(callback) {
    onCountdownEnd = callback;
}

// Start the animation
animationId = requestAnimationFrame(animate);

export { setCountdownEndCallback };

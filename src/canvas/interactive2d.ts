// Interactive 2D Canvas for curve visualization

import { Point, DEFAULT_CANVAS_CONFIG } from '../types';
import { createPointsEditor } from './pointsEditor';

export interface Interactive2DCanvasConfig {
    canvasId: string;
    sliderId: string;
    constructionToggleId: string | null;
    pointsEditorId: string | null;
    color: string;
    initialPoints: Point[];
    showWeights: boolean;
    drawCurve: (ctx: CanvasRenderingContext2D, points: Point[], maxT: number) => void;
    drawExtras?: (ctx: CanvasRenderingContext2D, points: Point[], maxT: number) => void;
}

export function initInteractive2DCanvas(config: Interactive2DCanvasConfig): void {
    const {
        canvasId,
        sliderId,
        constructionToggleId,
        pointsEditorId,
        color,
        initialPoints,
        showWeights,
        drawCurve,
        drawExtras
    } = config;

    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Responsive sizing
    let canvasWidth = DEFAULT_CANVAS_CONFIG.baseWidth;
    let canvasHeight = DEFAULT_CANVAS_CONFIG.baseHeight;
    let scale = 1;

    function updateCanvasSize() {
        const container = canvas.parentElement;
        if (!container) return;

        const containerWidth = container.clientWidth;
        const maxWidth = Math.min(containerWidth - 220, DEFAULT_CANVAS_CONFIG.baseWidth); // Leave room for points editor

        scale = maxWidth / DEFAULT_CANVAS_CONFIG.baseWidth;
        canvasWidth = DEFAULT_CANVAS_CONFIG.baseWidth;
        canvasHeight = DEFAULT_CANVAS_CONFIG.baseHeight;

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        canvas.style.width = `${canvasWidth * scale}px`;
        canvas.style.height = `${canvasHeight * scale}px`;

        render();
    }

    let points = initialPoints;
    let draggedIdx = -1;
    let maxT = 0.5;

    function getMousePos(e: MouseEvent) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    canvas.addEventListener('mousedown', e => {
        const pos = getMousePos(e);
        points.forEach((p, i) => {
            if (Math.hypot(p.x - pos.x, p.y - pos.y) < 15) draggedIdx = i;
        });
    });

    window.addEventListener('mousemove', e => {
        if (draggedIdx !== -1) {
            if (points[draggedIdx].fixed) return;
            const pos = getMousePos(e);
            points[draggedIdx].x = pos.x;
            points[draggedIdx].y = pos.y;
            render();
            updatePointsEditor();
        }
    });

    window.addEventListener('mouseup', () => draggedIdx = -1);

    const slider = document.getElementById(sliderId) as HTMLInputElement;
    if (slider) {
        slider.addEventListener('input', e => {
            maxT = parseFloat((e.target as HTMLInputElement).value);
            render();
        });
    }

    if (constructionToggleId) {
        const toggle = document.getElementById(constructionToggleId) as HTMLInputElement;
        if (toggle) {
            toggle.addEventListener('change', () => {
                render();
            });
        }
    }

    // Points Editor
    const pointsEditorContainer = pointsEditorId ? document.getElementById(pointsEditorId) : null;

    function updatePointsEditor() {
        if (!pointsEditorContainer) return;
        createPointsEditor({
            container: pointsEditorContainer,
            color,
            showWeights,
            onPointsChanged: () => {
                render();
                updatePointsEditor();
            }
        }, points);
    }

    function render() {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Draw Hull
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = '#444';
        ctx.moveTo(points[0].x, points[0].y);
        points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw Curve
        ctx.beginPath();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        drawCurve(ctx, points, maxT);
        ctx.stroke();

        // Draw construction extras if provided
        if (typeof drawExtras === 'function') {
            drawExtras(ctx, points, maxT);
        }

        // Draw Handles
        points.forEach((p, index) => {
            if (p.fixed) {
                ctx.fillStyle = '#888';
            } else {
                ctx.fillStyle = color;
            }
            ctx.beginPath();
            if (p.w !== undefined) {
                // Draw weight indicator for NURBS points
                const r = 4 + Math.min(Math.max(p.w, 1), 5);
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            } else {
                ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
            }
            ctx.fill();

            if (!p.fixed) {
              // Draw point label
              ctx.fillStyle = '#fff';
              ctx.font = '12px monospace';
              ctx.textAlign = 'left';
              ctx.textBaseline = 'middle';
              ctx.fillText(`P${index}`, p.x + 12, p.y);
            }
        });

        updatePointsEditor();
    }

    // Handle window resize
    window.addEventListener('resize', updateCanvasSize);

    // Initial setup
    updateCanvasSize();
}


// Bezier Curve implementation

import { Point } from '../types';
import { initInteractive2DCanvas } from '../canvas/interactive2d';
import { deCasteljau, deCasteljauLevels } from '../utils/math';

export function initBezierCurve(): void {
    initInteractive2DCanvas({
        canvasId: 'bezierCanvas',
        sliderId: 'bezierCanvasT',
        constructionToggleId: 'bezierConstruction',
        pointsEditorId: 'bezierPoints',
        color: '#ff3b3b',
        initialPoints: [
            { x: 100, y: 400 },
            { x: 200, y: 100 },
            { x: 600, y: 100 },
            { x: 700, y: 400 }
        ],
        showWeights: false,
        drawCurve: (ctx, p, maxT) => {
            if (p.length < 2) return;
            ctx.moveTo(p[0].x, p[0].y);
            for (let t = 0; t <= maxT; t += 0.01) {
                const pt = deCasteljau(p, t);
                ctx.lineTo(pt.x, pt.y);
            }
            // Ensure we draw exactly to maxT
            const endPt = deCasteljau(p, maxT);
            ctx.lineTo(endPt.x, endPt.y);
        },
        drawExtras: (ctx, p, t) => {
            const checkbox = document.getElementById('bezierConstruction') as HTMLInputElement;
            if (!checkbox || !checkbox.checked) return;
            if (p.length < 2) return;

            const levels = deCasteljauLevels(p, t);

            // Color gradient for levels
            const levelColors = ['#ff8888', '#ffaa88', '#ffcc88', '#ffdd88', '#ffee88', '#ffffaa'];
            const pointColors = ['#ffbbbb', '#ffd0b0', '#ffe0c0', '#fff0d0', '#ffffe0', '#ffffff'];

            ctx.save();
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);

            // Draw construction lines for each intermediate level
            for (let level = 1; level < levels.length; level++) {
                const pts = levels[level];
                if (pts.length < 1) continue;

                const colorIdx = Math.min(level - 1, levelColors.length - 1);
                ctx.strokeStyle = levelColors[colorIdx];

                if (pts.length > 1) {
                    ctx.beginPath();
                    ctx.moveTo(pts[0].x, pts[0].y);
                    for (let i = 1; i < pts.length; i++) {
                        ctx.lineTo(pts[i].x, pts[i].y);
                    }
                    ctx.stroke();
                }
            }

            // Draw intermediate points
            ctx.setLineDash([]);
            const drawPoint = (pt: Point, color: string, r = 4) => {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
                ctx.fill();
            };

            for (let level = 1; level < levels.length - 1; level++) {
                const pts = levels[level];
                const colorIdx = Math.min(level - 1, pointColors.length - 1);
                const radius = 3 + level * 0.5;
                for (const pt of pts) {
                    drawPoint(pt, pointColors[colorIdx], radius);
                }
            }

            // Draw final point on curve
            if (levels.length > 1) {
                const finalPt = levels[levels.length - 1][0];
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(finalPt.x, finalPt.y, 6, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    });
}


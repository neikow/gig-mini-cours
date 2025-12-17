// NURBS Curve implementation

import { Point } from '../types';
import { initInteractive2DCanvas } from '../canvas/interactive2d';
import { binomialCoefficient, rationalDeCasteljauLevels } from '../utils/math';

export function initNurbsCurve(): void {
    initInteractive2DCanvas({
        canvasId: 'nurbsCanvas',
        sliderId: 'nurbsCanvasT',
        constructionToggleId: 'nurbsConstruction',
        pointsEditorId: 'nurbsPoints',
        color: '#38b6ff',
        initialPoints: [
            { x: 150, y: 400, w: 1 },
            { x: 300, y: 50, w: 8 },
            { x: 500, y: 80, w: 3 },
            { x: 650, y: 400, w: 1 }
        ],
        showWeights: true,
        drawCurve: (ctx, p, maxT) => {
            const n = p.length - 1; // Degree of the curve

            // Precompute binomial coefficients
            const C: number[] = [];
            for (let i = 0; i <= n; i++) {
                C[i] = binomialCoefficient(n, i);
            }

            ctx.moveTo(p[0].x, p[0].y);

            // Helper to calculate point at parameter t
            const getRationalBezierPoint = (t: number) => {
                let sumX = 0, sumY = 0, sumW = 0;
                for (let i = 0; i <= n; i++) {
                    const basis = C[i] * Math.pow(1 - t, n - i) * Math.pow(t, i);
                    const w = p[i].w !== undefined ? p[i].w : 1;

                    sumX += basis * (w ?? 1) * p[i].x;
                    sumY += basis * (w ?? 1) * p[i].y;
                    sumW += basis * (w ?? 1);
                }
                return { x: sumX / sumW, y: sumY / sumW };
            };

            for (let t = 0; t <= maxT; t += 0.01) {
                const pt = getRationalBezierPoint(t);
                ctx.lineTo(pt.x, pt.y);
            }

            // Ensure the curve ends exactly at maxT
            const endPt = getRationalBezierPoint(maxT);
            ctx.lineTo(endPt.x, endPt.y);
        },
        drawExtras: (ctx, p, t) => {
            const checkbox = document.getElementById('nurbsConstruction') as HTMLInputElement;
            if (!checkbox || !checkbox.checked) return;
            if (p.length < 2) return;

            const levels = rationalDeCasteljauLevels(p, t);

            // Color gradient for levels (blue tones for NURBS)
            const levelColors = ['#88ccff', '#99ddff', '#aaeeff', '#bbffff', '#ccffff', '#ddffff'];
            const pointColors = ['#aaddff', '#bbeeee', '#ccffff', '#ddfffe', '#eeffff', '#ffffff'];

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


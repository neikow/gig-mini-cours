// B-Spline Curve implementation

import { Point } from '../types';
import { initInteractive2DCanvas } from '../canvas/interactive2d';

export function initBSplineCurve(): void {
    initInteractive2DCanvas({
        canvasId: 'bsplineCanvas',
        sliderId: 'bsplineCanvasT',
        constructionToggleId: 'bsplineConstruction',
        pointsEditorId: 'bsplinePoints',
        color: '#38ffaf',
        initialPoints: [
            { x: 100, y: 300, fixed: true }, // P0 (dummy start point)
            { x: 100, y: 300, fixed: true }, // P0
            { x: 250, y: 100 }, // P1
            { x: 400, y: 300 }, // P2
            { x: 550, y: 100 }, // P3
            { x: 700, y: 300, fixed: true }, // P4
            { x: 700, y: 300, fixed: true }, // P4 (dummy end point)
        ],
        showWeights: false,
        drawCurve: (ctx, p, maxT) => {
            const numSegments = p.length - 2;
            const totalT = maxT * numSegments;

            // Move to start
            if (numSegments > 0) {
                const i = 0;
                const t = 0;
                const b0 = 0.5 * Math.pow(1 - t, 2);
                const b1 = 0.5 + t - t * t;
                const b2 = 0.5 * t * t;
                ctx.moveTo(
                    b0 * p[i].x + b1 * p[i + 1].x + b2 * p[i + 2].x,
                    b0 * p[i].y + b1 * p[i + 1].y + b2 * p[i + 2].y
                );
            }

            for (let i = 0; i < numSegments; i++) {
                let segmentMax = 0;
                if (i < Math.floor(totalT)) {
                    segmentMax = 1;
                } else if (i === Math.floor(totalT)) {
                    segmentMax = totalT - i;
                } else {
                    break;
                }

                for (let t = 0; t <= segmentMax; t += 0.01) {
                    const b0 = 0.5 * Math.pow(1 - t, 2);
                    const b1 = 0.5 + t - t * t;
                    const b2 = 0.5 * t * t;
                    const x = b0 * p[i].x + b1 * p[i + 1].x + b2 * p[i + 2].x;
                    const y = b0 * p[i].y + b1 * p[i + 1].y + b2 * p[i + 2].y;
                    ctx.lineTo(x, y);
                }
                // Ensure end point of segment/partial segment is drawn
                const t = segmentMax;
                const b0 = 0.5 * Math.pow(1 - t, 2);
                const b1 = 0.5 + t - t * t;
                const b2 = 0.5 * t * t;
                const x = b0 * p[i].x + b1 * p[i + 1].x + b2 * p[i + 2].x;
                const y = b0 * p[i].y + b1 * p[i + 1].y + b2 * p[i + 2].y;
                ctx.lineTo(x, y);
            }
        },
        drawExtras: (ctx, p, maxT) => {
            const checkbox = document.getElementById('bsplineConstruction') as HTMLInputElement;
            if (!checkbox || !checkbox.checked) return;

            const numSegments = p.length - 2;
            if (numSegments < 1) return;

            const totalT = maxT * numSegments;
            let i = Math.floor(totalT);
            let t = totalT - i;

            if (i >= numSegments) {
                i = numSegments - 1;
                t = 1;
            }

            // The active control points for this segment
            const p0 = p[i];
            const p1 = p[i + 1];
            const p2 = p[i + 2];

            // Geometric construction for Quadratic B-Spline
            const m1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
            const m2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

            // Interpolate on the legs of the "hat" formed by M1-P1-M2
            const q0 = { x: (1 - t) * m1.x + t * p1.x, y: (1 - t) * m1.y + t * p1.y };
            const q1 = { x: (1 - t) * p1.x + t * m2.x, y: (1 - t) * p1.y + t * m2.y };

            // Final point on curve
            const final = { x: (1 - t) * q0.x + t * q1.x, y: (1 - t) * q0.y + t * q1.y };

            ctx.save();

            // Draw construction lines
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);

            // Level 1: M1 -> P1 -> M2
            ctx.strokeStyle = '#88ffcc';
            ctx.beginPath();
            ctx.moveTo(m1.x, m1.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.lineTo(m2.x, m2.y);
            ctx.stroke();

            // Level 2: Q0 -> Q1
            ctx.strokeStyle = '#b0ffdd';
            ctx.beginPath();
            ctx.moveTo(q0.x, q0.y);
            ctx.lineTo(q1.x, q1.y);
            ctx.stroke();

            // Draw points
            ctx.setLineDash([]);
            const drawPoint = (pt: Point, color: string, r = 4) => {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
                ctx.fill();
            };

            drawPoint(m1, '#88ffcc');
            drawPoint(m2, '#88ffcc');
            drawPoint(q0, '#b0ffdd', 5);
            drawPoint(q1, '#b0ffdd', 5);

            // Final point
            drawPoint(final, '#fff', 6);

            ctx.restore();
        }
    });
}


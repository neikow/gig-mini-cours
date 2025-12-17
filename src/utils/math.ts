// Math utilities for geometric curves

import { Point } from '../types';

// Factorial with caching
const factorialCache: { [key: number]: number } = {};

export function factorial(n: number): number {
    if (n in factorialCache) return factorialCache[n];
    if (n <= 1) return 1;
    const result = n * factorial(n - 1);
    factorialCache[n] = result;
    return result;
}

export function binomialCoefficient(n: number, k: number): number {
    return factorial(n) / (factorial(k) * factorial(n - k));
}

// De Casteljau algorithm for N points - returns point on curve at parameter t
export function deCasteljau(points: Point[], t: number): Point {
    if (points.length === 1) return points[0];
    const newPoints: Point[] = [];
    for (let i = 0; i < points.length - 1; i++) {
        newPoints.push({
            x: (1 - t) * points[i].x + t * points[i + 1].x,
            y: (1 - t) * points[i].y + t * points[i + 1].y
        });
    }
    return deCasteljau(newPoints, t);
}

// Get all intermediate levels from de Casteljau (for construction visualization)
export function deCasteljauLevels(points: Point[], t: number): Point[][] {
    const levels: Point[][] = [points.slice()];
    let current = points;
    while (current.length > 1) {
        const next: Point[] = [];
        for (let i = 0; i < current.length - 1; i++) {
            next.push({
                x: (1 - t) * current[i].x + t * current[i + 1].x,
                y: (1 - t) * current[i].y + t * current[i + 1].y
            });
        }
        levels.push(next);
        current = next;
    }
    return levels;
}

// Rational de Casteljau for NURBS - returns all intermediate levels
export function rationalDeCasteljauLevels(points: Point[], t: number): Point[][] {
    // Convert to homogeneous coordinates (wx, wy, w)
    const homogeneous = points.map(p => ({
        x: p.x * (p.w ?? 1),
        y: p.y * (p.w ?? 1),
        w: p.w ?? 1
    }));

    const levels: Point[][] = [points.map(p => ({ x: p.x, y: p.y, w: p.w ?? 1 }))];
    let current = homogeneous;

    while (current.length > 1) {
        const next: { x: number; y: number; w: number }[] = [];
        for (let i = 0; i < current.length - 1; i++) {
            // Linear interpolation in homogeneous coordinates
            const wx = (1 - t) * current[i].x + t * current[i + 1].x;
            const wy = (1 - t) * current[i].y + t * current[i + 1].y;
            const w = (1 - t) * current[i].w + t * current[i + 1].w;
            next.push({ x: wx, y: wy, w });
        }
        // Convert back to Cartesian for visualization
        levels.push(next.map(p => ({ x: p.x / p.w, y: p.y / p.w, w: p.w })));
        current = next;
    }

    return levels;
}


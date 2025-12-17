// Shared types for geometric curves

export interface Point {
    x: number;
    y: number;
    w?: number;
    fixed?: boolean;
}

export interface CanvasConfig {
    baseWidth: number;
    baseHeight: number;
    aspectRatio: number;
}

export const DEFAULT_CANVAS_CONFIG: CanvasConfig = {
    baseWidth: 800,
    baseHeight: 500,
    aspectRatio: 800 / 500
};


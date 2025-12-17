// Main entry point - Geometric Curves Presentation

import 'reveal.js/dist/reveal.css';
import 'reveal.js/dist/theme/black.css';
import './style.css';
import Reveal from 'reveal.js';

// Import curve initializers
import { initBezierCurve } from './curves/bezier';
import { initBSplineCurve } from './curves/bspline';
import { initNurbsCurve } from './curves/nurbs';
import { initBezierSurface } from './surfaces/bezierSurface';

// Initialize Reveal.js presentation
Reveal.initialize({
    hash: true,
    controls: true,
    progress: true,
    center: true,
    transition: 'fade',
    touch: false,
});

// Initialize all curve visualizations
initBezierCurve();
initBezierSurface();
initBSplineCurve();
initNurbsCurve();


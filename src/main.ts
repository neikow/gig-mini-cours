import 'reveal.js/dist/reveal.css';
import 'reveal.js/dist/theme/black.css';
import './style.css';
import Reveal from 'reveal.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';

Reveal.initialize({
    hash: true,
    controls: true,
    progress: true,
    center: true,
    transition: 'fade'
});

const width = 800;
const height = 500;

interface Point {
    x: number;
    y: number;
    w?: number;
    fixed?: boolean;
}

function initInteractive2DCanvas(
    id: string,
    idSliderT: string,
    idToggleConstruction: string | null,
    idPointsEditor: string | null,
    color: string,
    initialPoints: Point[],
    showWeights: boolean,
    drawCurve: (ctx: CanvasRenderingContext2D, p: Point[], maxT: number) => void,
    drawExtras?: (ctx: CanvasRenderingContext2D, p: Point[], maxT: number) => void
) {
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

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

    const slider = document.getElementById(idSliderT) as HTMLInputElement;
    if (slider) {
        slider.addEventListener('input', e => {
            maxT = parseFloat((e.target as HTMLInputElement).value);
            render();
        });
    }

    if (idToggleConstruction) {
        const toggle = document.getElementById(idToggleConstruction) as HTMLInputElement;
        if (toggle) {
            toggle.addEventListener('change', () => {
                render();
            });
        }
    }

    // Points Editor
    const pointsEditorContainer = idPointsEditor ? document.getElementById(idPointsEditor) : null;

    function updatePointsEditor() {
        if (!pointsEditorContainer) return;

        pointsEditorContainer.innerHTML = '';
        pointsEditorContainer.style.setProperty('--point-color', color);

        const header = document.createElement('h3');
        header.textContent = 'Points';
        pointsEditorContainer.appendChild(header);

        points.forEach((point, index) => {
            const item = document.createElement('div');
            item.className = 'point-item' + (point.fixed ? ' fixed' : '');
            item.style.setProperty('--point-color', point.fixed ? '#666' : color);

            // Header with label and delete button
            const headerDiv = document.createElement('div');
            headerDiv.className = 'point-header';

            const label = document.createElement('span');
            label.className = 'point-label';
            label.textContent = `P${index}`;
            headerDiv.appendChild(label);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-delete';
            deleteBtn.innerHTML = '×';
            deleteBtn.disabled = point.fixed || points.length <= 2;
            deleteBtn.addEventListener('click', () => {
                if (!point.fixed && points.length > 2) {
                    points.splice(index, 1);
                    render();
                    updatePointsEditor();
                }
            });
            headerDiv.appendChild(deleteBtn);
            item.appendChild(headerDiv);

            // Coordinates
            const coordsDiv = document.createElement('div');
            coordsDiv.className = 'point-coords';

            // X coordinate
            const xGroup = document.createElement('div');
            xGroup.className = 'coord-group';
            const xLabel = document.createElement('label');
            xLabel.textContent = 'x:';
            const xInput = document.createElement('input');
            xInput.type = 'number';
            xInput.value = Math.round(point.x).toString();
            xInput.disabled = !!point.fixed;
            xInput.addEventListener('change', (e) => {
                point.x = parseFloat((e.target as HTMLInputElement).value) || 0;
                render();
            });
            xGroup.appendChild(xLabel);
            xGroup.appendChild(xInput);
            coordsDiv.appendChild(xGroup);

            // Y coordinate
            const yGroup = document.createElement('div');
            yGroup.className = 'coord-group';
            const yLabel = document.createElement('label');
            yLabel.textContent = 'y:';
            const yInput = document.createElement('input');
            yInput.type = 'number';
            yInput.value = Math.round(point.y).toString();
            yInput.disabled = !!point.fixed;
            yInput.addEventListener('change', (e) => {
                point.y = parseFloat((e.target as HTMLInputElement).value) || 0;
                render();
            });
            yGroup.appendChild(yLabel);
            yGroup.appendChild(yInput);
            coordsDiv.appendChild(yGroup);

            item.appendChild(coordsDiv);

            // Weight (if applicable)
            if (showWeights && point.w !== undefined) {
                const weightGroup = document.createElement('div');
                weightGroup.className = 'weight-group';

                const wLabel = document.createElement('label');
                wLabel.textContent = 'w:';
                weightGroup.appendChild(wLabel);

                const wInput = document.createElement('input');
                wInput.type = 'number';
                wInput.min = '0.1';
                wInput.max = '100';
                wInput.step = '0.1';
                wInput.value = point.w.toString();
                wInput.disabled = !!point.fixed;

                wInput.addEventListener('change', (e) => {
                    const newW = parseFloat((e.target as HTMLInputElement).value) || 1;
                    point.w = Math.max(0.1, newW);
                    render();
                });

                weightGroup.appendChild(wInput);
                item.appendChild(weightGroup);
            }

            pointsEditorContainer.appendChild(item);
        });

        // Add point button
        const addBtn = document.createElement('button');
        addBtn.className = 'btn-add';
        addBtn.textContent = '+ Add Point';
        addBtn.addEventListener('click', () => {
            // Insert point in the middle
            const midIdx = Math.floor(points.length / 2);
            const p1 = points[midIdx - 1] || points[0];
            const p2 = points[midIdx] || points[points.length - 1];
            const newPoint: Point = {
                x: (p1.x + p2.x) / 2,
                y: (p1.y + p2.y) / 2
            };
            if (showWeights) {
                newPoint.w = 1;
            }
            points.splice(midIdx, 0, newPoint);
            render();
            updatePointsEditor();
        });
        pointsEditorContainer.appendChild(addBtn);
    }

    function render() {
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);

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
        points.forEach(p => {
            if (p.fixed) {
                ctx.fillStyle = '#888';
            } else {
              ctx.fillStyle = color;
            }
            ctx.beginPath();
            if (p.w !== undefined) {
                // Draw weight indicator for NURBS points
                const r = 4 + Math.min(Math.max(p.w, 1), 5); // weight affects size
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            } else {
              ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
            }
            ctx.fill();
        });

        // Update points editor display
        updatePointsEditor();
    }
    render();
}

// Helper: de Casteljau algorithm for N points - returns point on curve at parameter t
function deCasteljau(points: Point[], t: number): Point {
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

// Helper: get all intermediate levels from de Casteljau (for construction visualization)
function deCasteljauLevels(points: Point[], t: number): Point[][] {
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

// 1. Bezier Curve (Generalized for N points)
initInteractive2DCanvas('bezierCanvas', 'bezierCanvasT', 'bezierConstruction', 'bezierPoints', '#ff3b3b', [
        {x: 100, y: 400}, {x: 200, y: 100}, {x: 600, y: 100}, {x: 700, y: 400}
    ], false, (ctx, p, maxT) => {
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
    (ctx, p, t) => {
        const checkbox = document.getElementById('bezierConstruction') as HTMLInputElement;
        if (!checkbox || !checkbox.checked) return;
        if (p.length < 2) return;

        const levels = deCasteljauLevels(p, t);

        // Color gradient for levels (from red to orange to yellow)
        const levelColors = [
            '#ff8888', '#ffaa88', '#ffcc88', '#ffdd88', '#ffee88', '#ffffaa'
        ];
        const pointColors = [
            '#ffbbbb', '#ffd0b0', '#ffe0c0', '#fff0d0', '#ffffe0', '#ffffff'
        ];

        ctx.save();
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);

        // Draw construction lines for each intermediate level (skip level 0 - original points)
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

        // Draw final point on curve (last level has exactly 1 point)
        if (levels.length > 1) {
            const finalPt = levels[levels.length - 1][0];
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(finalPt.x, finalPt.y, 6, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    });

// 2. Bezier Surface (3D visualization using Three.js)
// Generalized NxM control point grid with proper Bezier tensor product surface
(function(){
    // Control point grid (rows x cols) - can be any size >= 2x2
    // Each point has x, y (horizontal plane) and z (height)
    let gridRows = 4;
    let gridCols = 4;

    // Generate initial control points in a grid pattern with some height variation
    function generateInitialGrid(rows: number, cols: number): THREE.Vector3[][] {
        const grid: THREE.Vector3[][] = [];
        const spacing = 100;
        const offsetX = -(cols - 1) * spacing / 2;
        const offsetY = -(rows - 1) * spacing / 2;

        for (let i = 0; i < rows; i++) {
            const row: THREE.Vector3[] = [];
            for (let j = 0; j < cols; j++) {
                const x = offsetX + j * spacing;
                const y = offsetY + i * spacing;
                // Create interesting height variation
                const z = 50 * Math.sin((i / (rows - 1)) * Math.PI) * Math.sin((j / (cols - 1)) * Math.PI);
                row.push(new THREE.Vector3(x, z, y)); // y is up in Three.js
            }
            grid.push(row);
        }
        return grid;
    }

    // De Casteljau for 1D array of Vector3
    function deCasteljau3D(points: THREE.Vector3[], t: number): THREE.Vector3 {
        if (points.length === 1) return points[0].clone();
        const newPoints: THREE.Vector3[] = [];
        for (let i = 0; i < points.length - 1; i++) {
            newPoints.push(new THREE.Vector3().lerpVectors(points[i], points[i + 1], t));
        }
        return deCasteljau3D(newPoints, t);
    }

    // Get all intermediate levels for construction visualization
    function deCasteljauLevels3D(points: THREE.Vector3[], t: number): THREE.Vector3[][] {
        const levels: THREE.Vector3[][] = [points.map(p => p.clone())];
        let current = points;
        while (current.length > 1) {
            const next: THREE.Vector3[] = [];
            for (let i = 0; i < current.length - 1; i++) {
                next.push(new THREE.Vector3().lerpVectors(current[i], current[i + 1], t));
            }
            levels.push(next);
            current = next;
        }
        return levels;
    }

    // Evaluate Bezier surface at (u, v) using tensor product
    function evaluateSurface(grid: THREE.Vector3[][], u: number, v: number): THREE.Vector3 {
        // First, evaluate along each row at parameter u
        const columnPoints: THREE.Vector3[] = [];
        for (let i = 0; i < grid.length; i++) {
            columnPoints.push(deCasteljau3D(grid[i], u));
        }
        // Then evaluate along the resulting column at parameter v
        return deCasteljau3D(columnPoints, v);
    }

    function initBezierSurface3D(containerId: string, sliderId: string, sliderVId: string, controlsId: string) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const width = 800;
        const height = 500;

        // Create controls widget
        const controlsContainer = document.getElementById(controlsId);
        let wireframeEnabled = false;
        let controlNetEnabled = true;
        let constructionEnabled = true;

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111111);
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
        camera.position.set(300, 300, 400);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        container.appendChild(renderer.domElement);

        const orbitControls = new OrbitControls(camera, renderer.domElement);
        orbitControls.enableDamping = true;
        orbitControls.target.set(0, 0, 0);

        // Lights
        const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.8);
        scene.add(hemi);
        const dir = new THREE.DirectionalLight(0xffffff, 0.6);
        dir.position.set(200, 500, 200);
        scene.add(dir);

        // Control point grid
        let controlGrid = generateInitialGrid(gridRows, gridCols);

        // Control net visualization group
        const controlGroup = new THREE.Group();
        scene.add(controlGroup);

        const matPoint = new THREE.MeshStandardMaterial({ color: 0xffde38 });
        const matPointHover = new THREE.MeshStandardMaterial({ color: 0xffff88 });
        const sphGeom = new THREE.SphereGeometry(8, 12, 12);

        // Create control point spheres and track them for dragging
        let controlSpheres: THREE.Mesh[] = [];
        let sphereToGridIndex = new Map<THREE.Mesh, { row: number; col: number }>();
        let dragControls: DragControls | null = null;

        function rebuildControlPoints() {
            // Remove old spheres from scene and control group
            controlSpheres.forEach(s => {
                controlGroup.remove(s);
                s.geometry.dispose();
            });
            controlSpheres = [];
            sphereToGridIndex.clear();

            // Dispose old drag controls
            if (dragControls) {
                dragControls.dispose();
            }

            // Create new spheres
            for (let i = 0; i < gridRows; i++) {
                for (let j = 0; j < gridCols; j++) {
                    const m = new THREE.Mesh(sphGeom, matPoint.clone());
                    m.position.copy(controlGrid[i][j]);
                    controlGroup.add(m);
                    controlSpheres.push(m);
                    sphereToGridIndex.set(m, { row: i, col: j });
                }
            }

            // Create new drag controls
            dragControls = new DragControls(controlSpheres, camera, renderer.domElement);

            dragControls.addEventListener('dragstart', (event) => {
                orbitControls.enabled = false;
                const mesh = event.object as THREE.Mesh;
                mesh.material = matPointHover.clone();
            });

            dragControls.addEventListener('drag', (event) => {
                const mesh = event.object as THREE.Mesh;
                const gridIdx = sphereToGridIndex.get(mesh);
                if (gridIdx) {
                    controlGrid[gridIdx.row][gridIdx.col].copy(mesh.position);
                    updateControlNet();
                    rebuildSurface();
                    updateIsoCurves(currentU, currentV);
                    updateConstruction(currentU, currentV);
                }
            });

            dragControls.addEventListener('dragend', (event) => {
                orbitControls.enabled = true;
                const mesh = event.object as THREE.Mesh;
                mesh.material = matPoint.clone();
            });

            dragControls.addEventListener('hoveron', (event) => {
                const mesh = event.object as THREE.Mesh;
                mesh.material = matPointHover.clone();
                renderer.domElement.style.cursor = 'grab';
            });

            dragControls.addEventListener('hoveroff', (event) => {
                const mesh = event.object as THREE.Mesh;
                mesh.material = matPoint.clone();
                renderer.domElement.style.cursor = 'auto';
            });
        }

        // Function to regenerate everything when grid size changes
        function regenerateGrid(newRows: number, newCols: number) {
            gridRows = Math.max(2, Math.min(8, newRows));
            gridCols = Math.max(2, Math.min(8, newCols));
            controlGrid = generateInitialGrid(gridRows, gridCols);
            rebuildControlPoints();
            updateControlNet();
            rebuildSurface();
            updateIsoCurves(currentU, currentV);
            updateConstruction(currentU, currentV);
            createControlsWidget(); // Refresh the widget to show new values
        }

        function createControlsWidget() {
            if (!controlsContainer) return;
            controlsContainer.innerHTML = '';

            const header = document.createElement('h3');
            header.textContent = 'Contrôles';
            controlsContainer.appendChild(header);

            // Grid size section
            const gridSection = document.createElement('div');
            gridSection.className = 'control-section';

            const gridLabel = document.createElement('div');
            gridLabel.className = 'section-label';
            gridLabel.textContent = 'Taille de la grille';
            gridSection.appendChild(gridLabel);

            // Rows control
            const rowsItem = document.createElement('div');
            rowsItem.className = 'grid-size-control';
            const rowsLabel = document.createElement('label');
            rowsLabel.textContent = 'Lignes:';
            const rowsInput = document.createElement('input');
            rowsInput.type = 'number';
            rowsInput.min = '2';
            rowsInput.max = '8';
            rowsInput.value = gridRows.toString();
            rowsInput.addEventListener('change', (e) => {
                const newRows = parseInt((e.target as HTMLInputElement).value) || 2;
                regenerateGrid(newRows, gridCols);
            });
            rowsItem.appendChild(rowsLabel);
            rowsItem.appendChild(rowsInput);
            gridSection.appendChild(rowsItem);

            // Cols control
            const colsItem = document.createElement('div');
            colsItem.className = 'grid-size-control';
            const colsLabel = document.createElement('label');
            colsLabel.textContent = 'Colonnes:';
            const colsInput = document.createElement('input');
            colsInput.type = 'number';
            colsInput.min = '2';
            colsInput.max = '8';
            colsInput.value = gridCols.toString();
            colsInput.addEventListener('change', (e) => {
                const newCols = parseInt((e.target as HTMLInputElement).value) || 2;
                regenerateGrid(gridRows, newCols);
            });
            colsItem.appendChild(colsLabel);
            colsItem.appendChild(colsInput);
            gridSection.appendChild(colsItem);

            // Degree info
            const degreeInfo = document.createElement('div');
            degreeInfo.className = 'info-item';
            degreeInfo.textContent = `Degré: ${gridRows - 1} × ${gridCols - 1}`;
            gridSection.appendChild(degreeInfo);

            controlsContainer.appendChild(gridSection);

            // Display options section
            const displaySection = document.createElement('div');
            displaySection.className = 'control-section';

            const displayLabel = document.createElement('div');
            displayLabel.className = 'section-label';
            displayLabel.textContent = 'Affichage';
            displaySection.appendChild(displayLabel);

            // Wireframe toggle
            const wireframeItem = document.createElement('label');
            wireframeItem.className = 'control-item';
            const wireframeCheck = document.createElement('input');
            wireframeCheck.type = 'checkbox';
            wireframeCheck.id = 'surfaceWireframe';
            wireframeCheck.checked = wireframeEnabled;
            wireframeCheck.addEventListener('change', (e) => {
                wireframeEnabled = (e.target as HTMLInputElement).checked;
                if (surfaceMesh) {
                    (surfaceMesh.material as THREE.MeshStandardMaterial).wireframe = wireframeEnabled;
                }
            });
            wireframeItem.appendChild(wireframeCheck);
            wireframeItem.appendChild(document.createTextNode(' Wireframe'));
            displaySection.appendChild(wireframeItem);

            // Control net toggle
            const controlNetItem = document.createElement('label');
            controlNetItem.className = 'control-item';
            const controlNetCheck = document.createElement('input');
            controlNetCheck.type = 'checkbox';
            controlNetCheck.id = 'surfaceControlNet';
            controlNetCheck.checked = controlNetEnabled;
            controlNetCheck.addEventListener('change', (e) => {
                controlNetEnabled = (e.target as HTMLInputElement).checked;
                controlGroup.visible = controlNetEnabled;
            });
            controlNetItem.appendChild(controlNetCheck);
            controlNetItem.appendChild(document.createTextNode(' Points de contrôle'));
            displaySection.appendChild(controlNetItem);

            // Construction toggle
            const constructionItem = document.createElement('label');
            constructionItem.className = 'control-item';
            const constructionCheck = document.createElement('input');
            constructionCheck.type = 'checkbox';
            constructionCheck.id = 'surfaceConstruction';
            constructionCheck.checked = constructionEnabled;
            constructionCheck.addEventListener('change', (e) => {
                constructionEnabled = (e.target as HTMLInputElement).checked;
                updateConstruction(currentU, currentV);
            });
            constructionItem.appendChild(constructionCheck);
            constructionItem.appendChild(document.createTextNode(' Construction'));
            displaySection.appendChild(constructionItem);

            controlsContainer.appendChild(displaySection);

            // Parameters section
            const paramsSection = document.createElement('div');
            paramsSection.className = 'control-section';

            const paramsLabel = document.createElement('div');
            paramsLabel.className = 'section-label';
            paramsLabel.textContent = 'Paramètres';
            paramsSection.appendChild(paramsLabel);

            // U value display
            const uItem = document.createElement('div');
            uItem.className = 'param-item';
            uItem.innerHTML = `<span class="param-label">u:</span><span id="uValueDisplay" class="param-value">${currentU.toFixed(2)}</span>`;
            paramsSection.appendChild(uItem);

            // V value display
            const vItem = document.createElement('div');
            vItem.className = 'param-item';
            vItem.innerHTML = `<span class="param-label">v:</span><span id="vValueDisplay" class="param-value">${currentV.toFixed(2)}</span>`;
            paramsSection.appendChild(vItem);

            controlsContainer.appendChild(paramsSection);
        }

        function updateParamDisplay() {
            const uDisplay = document.getElementById('uValueDisplay');
            const vDisplay = document.getElementById('vValueDisplay');
            if (uDisplay) uDisplay.textContent = currentU.toFixed(2);
            if (vDisplay) vDisplay.textContent = currentV.toFixed(2);
        }

        // Initialize control points
        rebuildControlPoints();

        // Create control net lines
        const netMat = new THREE.LineBasicMaterial({ color: 0x888888 });
        function updateControlNet() {
            // Remove old lines (keep only the control point spheres)
            const sphereSet = new Set(controlSpheres);
            controlGroup.children = controlGroup.children.filter(c => sphereSet.has(c as THREE.Mesh));

            // Horizontal lines
            for (let i = 0; i < gridRows; i++) {
                const pts = controlGrid[i].map(p => p.clone());
                const geom = new THREE.BufferGeometry().setFromPoints(pts);
                controlGroup.add(new THREE.Line(geom, netMat));
            }
            // Vertical lines
            for (let j = 0; j < gridCols; j++) {
                const pts: THREE.Vector3[] = [];
                for (let i = 0; i < gridRows; i++) {
                    pts.push(controlGrid[i][j].clone());
                }
                const geom = new THREE.BufferGeometry().setFromPoints(pts);
                controlGroup.add(new THREE.Line(geom, netMat));
            }
        }
        updateControlNet();
        scene.add(controlGroup);

        // Surface mesh builder
        const seg = 32;
        function buildSurfaceMesh(): THREE.BufferGeometry {
            const geom = new THREE.BufferGeometry();
            const positions: number[] = [];
            const uvs: number[] = [];

            for (let i = 0; i <= seg; i++) {
                const v = i / seg;
                for (let j = 0; j <= seg; j++) {
                    const u = j / seg;
                    const pt = evaluateSurface(controlGrid, u, v);
                    positions.push(pt.x, pt.y, pt.z);
                    uvs.push(u, v);
                }
            }

            const indices: number[] = [];
            for (let i = 0; i < seg; i++) {
                for (let j = 0; j < seg; j++) {
                    const a = i * (seg + 1) + j;
                    const b = (i + 1) * (seg + 1) + j;
                    const c = (i + 1) * (seg + 1) + j + 1;
                    const d = i * (seg + 1) + j + 1;
                    indices.push(a, b, d);
                    indices.push(b, c, d);
                }
            }

            geom.setIndex(indices);
            geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            geom.computeVertexNormals();
            return geom;
        }

        let surfaceMesh: THREE.Mesh | null = null;
        const mat = new THREE.MeshStandardMaterial({
            color: 0x3377cc,
            metalness: 0.1,
            roughness: 0.6,
            side: THREE.DoubleSide
        });

        function rebuildSurface() {
            if (surfaceMesh) {
                scene.remove(surfaceMesh);
                surfaceMesh.geometry.dispose();
            }
            const g = buildSurfaceMesh();
            surfaceMesh = new THREE.Mesh(g, mat.clone());
            (surfaceMesh.material as THREE.MeshStandardMaterial).wireframe = wireframeEnabled;
            scene.add(surfaceMesh);
        }
        rebuildSurface();

        // Construction visualization group
        const constructionGroup = new THREE.Group();
        scene.add(constructionGroup);

        // Isoparametric curves
        let isoLineU: THREE.Line | null = null;
        let isoLineV: THREE.Line | null = null;

        function buildIsoCurve(param: number, isU: boolean, color: number): THREE.Line {
            const pts: THREE.Vector3[] = [];
            const steps = 100;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const pt = isU ? evaluateSurface(controlGrid, param, t) : evaluateSurface(controlGrid, t, param);
                pts.push(pt);
            }
            const geom = new THREE.BufferGeometry().setFromPoints(pts);
            const matl = new THREE.LineBasicMaterial({ color, linewidth: 2 });
            return new THREE.Line(geom, matl);
        }

        function updateConstruction(u: number, v: number) {
            // Clear previous construction
            while (constructionGroup.children.length > 0) {
                const child = constructionGroup.children[0];
                constructionGroup.remove(child);
                if (child instanceof THREE.Line) child.geometry.dispose();
                if (child instanceof THREE.Mesh) child.geometry.dispose();
            }

            if (!constructionEnabled) return;

            // Colors for construction levels
            const levelColors = [0xff8888, 0xffaa88, 0xffcc88, 0xffee88];
            const pointGeom = new THREE.SphereGeometry(4, 8, 8);

            // Step 1: Evaluate each row at u, showing intermediate points
            const rowResults: THREE.Vector3[] = [];
            for (let i = 0; i < gridRows; i++) {
                const levels = deCasteljauLevels3D(controlGrid[i], u);

                // Draw intermediate construction lines for this row
                for (let lvl = 1; lvl < levels.length; lvl++) {
                    const pts = levels[lvl];
                    if (pts.length > 1) {
                        const geom = new THREE.BufferGeometry().setFromPoints(pts);
                        const lineMat = new THREE.LineBasicMaterial({
                            color: levelColors[Math.min(lvl - 1, levelColors.length - 1)],
                            transparent: true,
                            opacity: 0.6
                        });
                        constructionGroup.add(new THREE.Line(geom, lineMat));
                    }
                    // Draw intermediate points
                    for (const pt of pts) {
                        const sphere = new THREE.Mesh(pointGeom, new THREE.MeshBasicMaterial({
                            color: levelColors[Math.min(lvl - 1, levelColors.length - 1)]
                        }));
                        sphere.position.copy(pt);
                        sphere.scale.setScalar(0.5 + lvl * 0.2);
                        constructionGroup.add(sphere);
                    }
                }
                rowResults.push(levels[levels.length - 1][0]);
            }

            // Draw the column of intermediate row results
            if (rowResults.length > 1) {
                const geom = new THREE.BufferGeometry().setFromPoints(rowResults);
                const lineMat = new THREE.LineBasicMaterial({ color: 0x88ff88, linewidth: 2 });
                constructionGroup.add(new THREE.Line(geom, lineMat));

                // Mark row result points
                for (const pt of rowResults) {
                    const sphere = new THREE.Mesh(pointGeom, new THREE.MeshBasicMaterial({ color: 0x88ff88 }));
                    sphere.position.copy(pt);
                    constructionGroup.add(sphere);
                }
            }

            // Step 2: Evaluate the column at v
            const colLevels = deCasteljauLevels3D(rowResults, v);
            for (let lvl = 1; lvl < colLevels.length; lvl++) {
                const pts = colLevels[lvl];
                if (pts.length > 1) {
                    const geom = new THREE.BufferGeometry().setFromPoints(pts);
                    const lineMat = new THREE.LineBasicMaterial({
                        color: 0x88ffff,
                        transparent: true,
                        opacity: 0.8
                    });
                    constructionGroup.add(new THREE.Line(geom, lineMat));
                }
                for (const pt of pts) {
                    const sphere = new THREE.Mesh(pointGeom, new THREE.MeshBasicMaterial({ color: 0x88ffff }));
                    sphere.position.copy(pt);
                    sphere.scale.setScalar(0.7 + lvl * 0.3);
                    constructionGroup.add(sphere);
                }
            }

            // Final point on surface
            const finalPt = colLevels[colLevels.length - 1][0];
            const finalSphere = new THREE.Mesh(
                new THREE.SphereGeometry(6, 12, 12),
                new THREE.MeshBasicMaterial({ color: 0xffffff })
            );
            finalSphere.position.copy(finalPt);
            constructionGroup.add(finalSphere);
        }

        function updateIsoCurves(u: number, v: number) {
            if (isoLineU) {
                scene.remove(isoLineU);
                isoLineU.geometry.dispose();
            }
            if (isoLineV) {
                scene.remove(isoLineV);
                isoLineV.geometry.dispose();
            }
            isoLineU = buildIsoCurve(u, true, 0xff6666);  // Red for constant u
            isoLineV = buildIsoCurve(v, false, 0x66ff66); // Green for constant v
            scene.add(isoLineU);
            scene.add(isoLineV);
        }

        // Initial state
        let currentU = 0.5;
        let currentV = 0.5;

        // Create controls widget
        createControlsWidget();

        updateIsoCurves(currentU, currentV);
        updateConstruction(currentU, currentV);

        // Slider events
        document.getElementById(sliderId)?.addEventListener('input', e => {
            currentU = parseFloat((e.target as HTMLInputElement).value);
            updateIsoCurves(currentU, currentV);
            updateConstruction(currentU, currentV);
            updateParamDisplay();
        });

        document.getElementById(sliderVId)?.addEventListener('input', e => {
            currentV = parseFloat((e.target as HTMLInputElement).value);
            updateIsoCurves(currentU, currentV);
            updateConstruction(currentU, currentV);
            updateParamDisplay();
        });

        // Resize handler
        function onResize() {
            const w = container?.clientWidth || 800;
            const h = container?.clientHeight || 500;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        }
        window.addEventListener('resize', onResize);

        // Animation loop
        function animate() {
            requestAnimationFrame(animate);
            orbitControls.update();
            renderer.render(scene, camera);
        }
        animate();
    }

    initBezierSurface3D('surface3d', 'surfaceCanvasU', 'surfaceCanvasV', 'surfaceControls');
})();

// 3. B-Splines (Quadratic)
initInteractive2DCanvas('bsplineCanvas', 'bsplineCanvasT', 'bsplineConstruction', 'bsplinePoints', '#38ffaf', [
  {x: 100, y: 300, fixed: true}, // P0 (dummy start point)
  {x: 100, y: 300, fixed: true}, // P0
  {x: 250, y: 100}, // P1
  {x: 400, y: 300}, // P2
  {x: 550, y: 100}, // P3
  {x: 700, y: 300, fixed: true}, // P4
  {x: 700, y: 300, fixed: true}, // P4 (dummy end point)
], false, (ctx, p, maxT) => {
    const numSegments = p.length - 2;
    const totalT = maxT * numSegments;

    // Move to start
    if (numSegments > 0) {
        const i = 0;
        const t = 0;
        const b0 = 0.5 * Math.pow(1-t, 2);
        const b1 = 0.5 + t - t*t;
        const b2 = 0.5 * t*t;
        ctx.moveTo(b0*p[i].x + b1*p[i+1].x + b2*p[i+2].x, b0*p[i].y + b1*p[i+1].y + b2*p[i+2].y);
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
            const b0 = 0.5 * Math.pow(1-t, 2);
            const b1 = 0.5 + t - t*t;
            const b2 = 0.5 * t*t;
            const x = b0*p[i].x + b1*p[i+1].x + b2*p[i+2].x;
            const y = b0*p[i].y + b1*p[i+1].y + b2*p[i+2].y;
            ctx.lineTo(x, y);
        }
        // Ensure end point of segment/partial segment is drawn
        const t = segmentMax;
        const b0 = 0.5 * Math.pow(1-t, 2);
        const b1 = 0.5 + t - t*t;
        const b2 = 0.5 * t*t;
        const x = b0*p[i].x + b1*p[i+1].x + b2*p[i+2].x;
        const y = b0*p[i].y + b1*p[i+1].y + b2*p[i+2].y;
        ctx.lineTo(x, y);
    }
}, (ctx, p, maxT) => {
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
  const p1 = p[i+1];
  const p2 = p[i+2];

  // Geometric construction for Quadratic B-Spline:
  // The curve segment goes from the midpoint of (P0, P1) to the midpoint of (P1, P2).
  const m1 = { x: (p0.x + p1.x)/2, y: (p0.y + p1.y)/2 };
  const m2 = { x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2 };

  // Interpolate on the legs of the "hat" formed by M1-P1-M2
  const q0 = { x: (1-t)*m1.x + t*p1.x, y: (1-t)*m1.y + t*p1.y };
  const q1 = { x: (1-t)*p1.x + t*m2.x, y: (1-t)*p1.y + t*m2.y };

  // Final point on curve
  const final = { x: (1-t)*q0.x + t*q1.x, y: (1-t)*q0.y + t*q1.y };

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
  const drawPoint = (pt: Point, color: string, r=4) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, r, 0, Math.PI*2);
    ctx.fill();
  };

  drawPoint(m1, '#88ffcc');
  drawPoint(m2, '#88ffcc');
  drawPoint(q0, '#b0ffdd', 5);
  drawPoint(q1, '#b0ffdd', 5);

  // Final point
  drawPoint(final, '#fff', 6);

  ctx.restore();
});

function getFactorialCached(): (n: number) => number {
  const cache: {[key: number]: number} = {};
  return function factorial(n: number): number {
      if (n in cache) return cache[n];
      if (n <= 1) return 1;
      const result = n * factorial(n - 1);
      cache[n] = result;
      return result;
  }
}

const factorial = getFactorialCached();

function binomialCoefficient(n: number, k: number): number {
  return factorial(n) / (factorial(k) * factorial(n - k));
}

// 4. NURBS (Rational Bezier Example)
const nurbsPts = [
  {x: 150, y: 400, w: 1},
  {x: 300, y: 50, w: 8},
  {x: 500, y: 80, w: 3},
  {x: 650, y: 400, w: 1}
];
initInteractive2DCanvas('nurbsCanvas', 'nurbsCanvasT', null, 'nurbsPoints', '#38b6ff', nurbsPts, true, (ctx, p, maxT) => {
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
      // Bernstein basis: B(i,n) = C(n,i) * (1-t)^(n-i) * t^i
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
});

// Bezier Surface (3D) implementation

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import { DEFAULT_CANVAS_CONFIG } from '../types';

// Control point grid (rows x cols) - can be any size >= 2x2
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
    const columnPoints: THREE.Vector3[] = [];
    for (let i = 0; i < grid.length; i++) {
        columnPoints.push(deCasteljau3D(grid[i], u));
    }
    return deCasteljau3D(columnPoints, v);
}

export function initBezierSurface(): void {
    const containerId = 'surface3d';
    const sliderId = 'surfaceCanvasU';
    const sliderVId = 'surfaceCanvasV';
    const controlsId = 'surfaceControls';

    const container = document.getElementById(containerId);
    if (!container) return;

    // Fixed sizing for reveal.js
    const width = DEFAULT_CANVAS_CONFIG.baseWidth;
    const height = DEFAULT_CANVAS_CONFIG.baseHeight;

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

    // Forward declarations
    let currentU = 0.5;
    let currentV = 0.5;

    function rebuildControlPoints() {
        controlSpheres.forEach(s => {
            controlGroup.remove(s);
            s.geometry.dispose();
        });
        controlSpheres = [];
        sphereToGridIndex.clear();

        if (dragControls) {
            dragControls.dispose();
        }

        for (let i = 0; i < gridRows; i++) {
            for (let j = 0; j < gridCols; j++) {
                const m = new THREE.Mesh(sphGeom, matPoint.clone());
                m.position.copy(controlGrid[i][j]);
                controlGroup.add(m);
                controlSpheres.push(m);
                sphereToGridIndex.set(m, { row: i, col: j });
            }
        }

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

    function regenerateGrid(newRows: number, newCols: number) {
        gridRows = Math.max(2, Math.min(8, newRows));
        gridCols = Math.max(2, Math.min(8, newCols));
        controlGrid = generateInitialGrid(gridRows, gridCols);
        rebuildControlPoints();
        updateControlNet();
        rebuildSurface();
        updateIsoCurves(currentU, currentV);
        updateConstruction(currentU, currentV);
        createControlsWidget();
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
        const sphereSet = new Set(controlSpheres);
        controlGroup.children = controlGroup.children.filter(c => sphereSet.has(c as THREE.Mesh));

        for (let i = 0; i < gridRows; i++) {
            const pts = controlGrid[i].map(p => p.clone());
            const geom = new THREE.BufferGeometry().setFromPoints(pts);
            controlGroup.add(new THREE.Line(geom, netMat));
        }
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
        while (constructionGroup.children.length > 0) {
            const child = constructionGroup.children[0];
            constructionGroup.remove(child);
            if ((child as THREE.Line).geometry) (child as THREE.Line).geometry.dispose();
        }

        if (!constructionEnabled) return;

        const levelColors = [0xff8888, 0xffaa88, 0xffcc88, 0xffee88];
        const pointGeom = new THREE.SphereGeometry(4, 8, 8);

        const rowResults: THREE.Vector3[] = [];
        for (let i = 0; i < gridRows; i++) {
            const levels = deCasteljauLevels3D(controlGrid[i], u);

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

        if (rowResults.length > 1) {
            const geom = new THREE.BufferGeometry().setFromPoints(rowResults);
            const lineMat = new THREE.LineBasicMaterial({ color: 0x88ff88, linewidth: 2 });
            constructionGroup.add(new THREE.Line(geom, lineMat));

            for (const pt of rowResults) {
                const sphere = new THREE.Mesh(pointGeom, new THREE.MeshBasicMaterial({ color: 0x88ff88 }));
                sphere.position.copy(pt);
                constructionGroup.add(sphere);
            }
        }

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
        isoLineU = buildIsoCurve(u, true, 0xff6666);
        isoLineV = buildIsoCurve(v, false, 0x66ff66);
        scene.add(isoLineU);
        scene.add(isoLineV);
    }

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
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
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


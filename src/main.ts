import 'reveal.js/dist/reveal.css';
import 'reveal.js/dist/theme/black.css';
import './style.css';
import Reveal from 'reveal.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

Reveal.initialize({
    hash: true,
    controls: false,
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
        header.textContent = 'Control Points';
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

                const wRange = document.createElement('input');
                wRange.type = 'range';
                wRange.min = '0.1';
                wRange.max = '10';
                wRange.step = '0.1';
                wRange.value = point.w.toString();
                wRange.disabled = !!point.fixed;

                const wValue = document.createElement('span');
                wValue.className = 'weight-value';
                wValue.textContent = point.w.toFixed(1);

                wRange.addEventListener('input', (e) => {
                    const newW = parseFloat((e.target as HTMLInputElement).value);
                    point.w = newW;
                    wValue.textContent = newW.toFixed(1);
                    render();
                });

                weightGroup.appendChild(wRange);
                weightGroup.appendChild(wValue);
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

// 1. Bezier Curve
initInteractive2DCanvas('bezierCanvas', 'bezierCanvasT', 'bezierConstruction', 'bezierPoints', '#ff3b3b', [
        {x: 100, y: 400}, {x: 200, y: 100}, {x: 600, y: 100}, {x: 700, y: 400}
    ], false, (ctx, p, maxT) => {
        ctx.moveTo(p[0].x, p[0].y);
        for (let t = 0; t <= maxT; t += 0.01) {
            const x = Math.pow(1-t,3)*p[0].x + 3*Math.pow(1-t,2)*t*p[1].x + 3*(1-t)*t*t*p[2].x + t*t*t*p[3].x;
            const y = Math.pow(1-t,3)*p[0].y + 3*Math.pow(1-t,2)*t*p[1].y + 3*(1-t)*t*t*p[2].y + t*t*t*p[3].y;
            ctx.lineTo(x, y);
        }
    },
    (ctx, p, t) => {
        const checkbox = document.getElementById('bezierConstruction') as HTMLInputElement;
        if (!checkbox || !checkbox.checked) return;

        // Level 1
        const p01 = { x: (1-t)*p[0].x + t*p[1].x, y: (1-t)*p[0].y + t*p[1].y };
        const p12 = { x: (1-t)*p[1].x + t*p[2].x, y: (1-t)*p[1].y + t*p[2].y };
        const p23 = { x: (1-t)*p[2].x + t*p[3].x, y: (1-t)*p[2].y + t*p[3].y };

        // Level 2
        const p012 = { x: (1-t)*p01.x + t*p12.x, y: (1-t)*p01.y + t*p12.y };
        const p123 = { x: (1-t)*p12.x + t*p23.x, y: (1-t)*p12.y + t*p23.y };

        // Level 3 (point on curve)
        const p0123 = { x: (1-t)*p012.x + t*p123.x, y: (1-t)*p012.y + t*p123.y };

        // draw level 1 lines
        ctx.save();
        ctx.strokeStyle = '#ff8888';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4,3]);
        ctx.beginPath();
        ctx.moveTo(p01.x, p01.y);
        ctx.lineTo(p12.x, p12.y);
        ctx.lineTo(p23.x, p23.y);
        ctx.stroke();

        // draw level 2 lines
        ctx.strokeStyle = '#ffb38b';
        ctx.beginPath();
        ctx.moveTo(p012.x, p012.y);
        ctx.lineTo(p123.x, p123.y);
        ctx.stroke();

        // draw points for each intermediate
        ctx.setLineDash([]);
        const drawPoint = (pt: Point, color: string, r=5) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, r, 0, Math.PI*2);
            ctx.fill();
        };
        drawPoint(p01, '#ffbbbb', 4);
        drawPoint(p12, '#ffbbbb', 4);
        drawPoint(p23, '#ffbbbb', 4);
        drawPoint(p012, '#ffd7b0', 5);
        drawPoint(p123, '#ffd7b0', 5);

        // final point on curve
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(p0123.x, p0123.y, 6, 0, Math.PI*2);
        ctx.fill();

        ctx.restore();
    });

// 2. Bezier Surface (3D visualization using Three.js)
(function(){
    // initial control points (2D coordinates mapped into 3D plane)
    const ctrl = [
        {x: 300, y: 150}, {x: 500, y: 150}, {x: 250, y: 350}, {x: 550, y: 350}
    ];

    function initBezierSurface3D(containerId: string, sliderId: string, wireframeId: string, controlNetId: string, controlPoints: Point[]) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 500;

        // scene, camera, renderer
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111111);
        const camera = new THREE.PerspectiveCamera(45, width/height, 0.1, 2000);
        camera.position.set(0, 200, 600);

        const renderer = new THREE.WebGLRenderer({antialias: true});
        renderer.setSize(width, height);
        container.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        // lights
        const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.8);
        scene.add(hemi);
        const dir = new THREE.DirectionalLight(0xffffff, 0.6);
        dir.position.set(0, 500, 200);
        scene.add(dir);

        // create 3D control points from 2D input, centered
        const p00 = new THREE.Vector3(controlPoints[0].x - width/2, -controlPoints[0].y + height/2, 0);
        const p10 = new THREE.Vector3(controlPoints[1].x - width/2, -controlPoints[1].y + height/2, 0);
        const p01 = new THREE.Vector3(controlPoints[2].x - width/2, -controlPoints[2].y + height/2, 0);
        const p11 = new THREE.Vector3(controlPoints[3].x - width/2, -controlPoints[3].y + height/2, 0);

        // control net group (points + connecting lines)
        const controlGroup = new THREE.Group();
        const matPoint = new THREE.MeshStandardMaterial({color: 0xffde38});
        const sphGeom = new THREE.SphereGeometry(8, 12, 12);
        [p00,p10,p01,p11].forEach(p => {
            const m = new THREE.Mesh(sphGeom, matPoint);
            m.position.copy(p);
            controlGroup.add(m);
        });
        const netGeom = new THREE.BufferGeometry().setFromPoints([p00,p10,p11,p01,p00]);
        const netMat = new THREE.LineBasicMaterial({color:0x888888});
        const net = new THREE.Line(netGeom, netMat);
        controlGroup.add(net);
        scene.add(controlGroup);

        // surface mesh (bilinear patch sampling) builder
        const seg = 48;
        function buildSurfaceMesh() {
            const geom = new THREE.BufferGeometry();
            const positions = [];
            const uvs = [];

            function p(u: number, v: number){
                // bilinear interpolation on 2x2 control grid
                const a = new THREE.Vector3().copy(p00).multiplyScalar((1-u)*(1-v));
                const b = new THREE.Vector3().copy(p10).multiplyScalar(u*(1-v));
                const c = new THREE.Vector3().copy(p01).multiplyScalar((1-u)*v);
                const d = new THREE.Vector3().copy(p11).multiplyScalar(u*v);
                return new THREE.Vector3().addVectors(a, b).add(c).add(d);
            }

            for(let i=0;i<=seg;i++){
                const u = i/seg;
                for(let j=0;j<=seg;j++){
                    const v = j/seg;
                    const q = p(u,v);
                    positions.push(q.x, q.y, q.z);
                    uvs.push(u,v);
                }
            }

            const indices = [];
            for(let i=0;i<seg;i++){
                for(let j=0;j<seg;j++){
                    const a = i*(seg+1)+j;
                    const b = (i+1)*(seg+1)+j;
                    const c = (i+1)*(seg+1)+j+1;
                    const d = i*(seg+1)+j+1;
                    indices.push(a,b,d);
                    indices.push(b,c,d);
                }
            }

            geom.setIndex(indices);
            geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            geom.computeVertexNormals();
            return geom;
        }

        let surfaceMesh: THREE.Mesh | null = null;
        const mat = new THREE.MeshStandardMaterial({color:0x3377cc, metalness:0.1, roughness:0.6, side:THREE.DoubleSide});
        function rebuild(){
            if(surfaceMesh){
                scene.remove(surfaceMesh);
                surfaceMesh.geometry.dispose();
            }
            const g = buildSurfaceMesh();
            surfaceMesh = new THREE.Mesh(g, mat.clone());
            const wireframeCheck = document.getElementById(wireframeId) as HTMLInputElement;
            (surfaceMesh.material as THREE.MeshStandardMaterial).wireframe = !!wireframeCheck?.checked;
            scene.add(surfaceMesh);
        }

        rebuild();

        // isoparametric curve at parameter t (v constant)
        let isoLine: THREE.Line | null = null;
        function buildIsoLine(t: number) {
            const pts = [];
            const steps = 200;
            for(let i=0;i<=steps;i++){
                const u = i/steps;
                const a = new THREE.Vector3().copy(p00).multiplyScalar((1-u)*(1-t));
                const b = new THREE.Vector3().copy(p10).multiplyScalar(u*(1-t));
                const c = new THREE.Vector3().copy(p01).multiplyScalar((1-u)*t);
                const d = new THREE.Vector3().copy(p11).multiplyScalar(u*t);
                const q = new THREE.Vector3().addVectors(a,b).add(c).add(d);
                pts.push(q);
            }
            const g = new THREE.BufferGeometry().setFromPoints(pts);
            const matl = new THREE.LineBasicMaterial({color:0xffffff});
            return new THREE.Line(g, matl);
        }

        function updateIso(t: number){
            if(isoLine) scene.remove(isoLine);
            isoLine = buildIsoLine(t);
            scene.add(isoLine);
        }

        // initial iso curve
        updateIso(0.5);

        // UI events
        document.getElementById(wireframeId)?.addEventListener('change', e => {
            if(surfaceMesh) (surfaceMesh.material as THREE.MeshStandardMaterial).wireframe = (e.target as HTMLInputElement).checked;
        });
        document.getElementById(controlNetId)?.addEventListener('change', e => {
            controlGroup.visible = (e.target as HTMLInputElement).checked;
        });
        document.getElementById(sliderId)?.addEventListener('input', e => {
            const t = parseFloat((e.target as HTMLInputElement).value);
            updateIso(t);
        });

        // resize and render loop
        function onResize(){
            const w = container?.clientWidth || 800;
            const h = container?.clientHeight || 500;
            camera.aspect = w/h;
            camera.updateProjectionMatrix();
            renderer.setSize(w,h);
        }
        window.addEventListener('resize', onResize);

        function animate(){
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }
        animate();
    }

    initBezierSurface3D('surface3d', 'surfaceCanvasT', 'surfaceWireframe', 'surfaceControlNet', ctrl);
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

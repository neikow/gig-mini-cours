// Points editor widget for 2D canvases

import { Point } from '../types';

export interface PointsEditorConfig {
    container: HTMLElement;
    color: string;
    showWeights: boolean;
    onPointsChanged: () => void;
}

export function createPointsEditor(
    config: PointsEditorConfig,
    points: Point[]
): void {
    const { container, color, showWeights, onPointsChanged } = config;

    container.innerHTML = '';
    container.style.setProperty('--point-color', color);

    const header = document.createElement('h3');
    header.textContent = 'Points';
    container.appendChild(header);

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
                onPointsChanged();
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
            onPointsChanged();
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
            onPointsChanged();
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
                onPointsChanged();
            });

            weightGroup.appendChild(wInput);
            item.appendChild(weightGroup);
        }

        container.appendChild(item);
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
        onPointsChanged();
    });
    container.appendChild(addBtn);
}


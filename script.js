const canvas = document.getElementById('drawing-canvas');
const graphCanvas = document.getElementById('graph-canvas');
const addLinkButton = document.getElementById('add-link-button');
const generateButton = document.getElementById('generate-button');
const clearCanvasButton = document.getElementById("clear-canvas");
const linksGroup = document.getElementById('links-group');
const labelsGroup = document.getElementById('labels-group');
const connectionsGroup = document.getElementById('connections-group');
const connectionsList = document.getElementById("connections");
const inputLabel = document.getElementById('input-label');
const snapIndicator = document.getElementById('snap-indicator');
const loadJsonButton = document.getElementById('load-json'); // Get the load button
const jsonFile = document.getElementById('json-file');      // Get the file input

let links = [];
let selectedLinkType = null;
let connections = new Set();
let draggedJoint = null;
let draggedLink = null;
let isDraggingLink = false;
let simulation;
// Store edge labels, keyed by the connection string
let edgeLabels = new Map();
let nextNodeId = 1; // Keep track of next available node ID.
let scaleX, scaleY, translateX, translateY;
scaleX = 1;
scaleY = 1;
translateX = 0;
translateY = 0;

const linkTypes = [
    { type: 'binary', points: 2 },
    { type: 'ternary', points: 3 },
    { type: 'quaternary', points: 4 },
    { type: 'pentanary', points: 5 },
    { type: 'hexanary', points: 6 }
];

function generateLinkOptions() {
    const linkOptionsContainer = document.getElementById('link-options');
    linkOptionsContainer.innerHTML = ''; // Clear existing options

    linkTypes.forEach(linkType => {
        const option = document.createElement('div');
        option.classList.add('link-option');
        if (selectedLinkType === linkType.type) {
            option.classList.add('selected');
        }
        option.innerHTML = `<svg class="link-icon" viewBox="0 0 50 50">${generateLinkIcon(linkType.type)}</svg> ${linkType.type}`;
        option.addEventListener('click', () => {
            selectedLinkType = linkType.type;
            generateLinkOptions();  // Re-render to update selection
            addLinkButton.disabled = false;
        });
        linkOptionsContainer.appendChild(option);
    });
}

function generateLinkIcon(type) {
    const radius = 15;
    const center = 25;

    switch (type) {
        case 'binary':
            return `<line x1="${center - radius}" y1="${center}" x2="${center + radius}" y2="${center}" stroke="#34495e" stroke-width="3"/>
                    <circle cx="${center - radius}" cy="${center}" r="4" fill="#34495e" />
                    <circle cx="${center + radius}" cy="${center}" r="4" fill="#34495e" />`;
        case 'ternary':
            return generatePolygon(3, radius, center, center);
        case 'quaternary':
            return generatePolygon(4, radius, center, center);
        case 'pentanary':
            return generatePolygon(5, radius, center, center);
        case 'hexanary':
            return generatePolygon(6, radius, center, center);
        default:
            return '';
    }
}

function generatePolygon(sides, radius, centerX, centerY) {
    let points = "";
    for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
        const x = radius * Math.cos(angle) + centerX;
        const y = radius * Math.sin(angle) + centerY;
        points += `${x},${y} `;
    }

    // Add circles at vertices
    let circles = "";
    for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
        const x = radius * Math.cos(angle) + centerX;
        const y = radius * Math.sin(angle) + centerY;
        circles += `<circle cx="${x}" cy="${y}" r="3" fill="#34495e" />`;
    }

    return `<polygon points="${points.trim()}" stroke="#34495e" stroke-width="3" fill="#ecf0f1" stroke-linejoin="round"/> ${circles}`;

}

function addLink() {
    if (!selectedLinkType) return;

    const centerX = canvas.clientWidth / 2;
    const centerY = canvas.clientHeight / 2;
    const radius = 50;
    const newId = nextNodeId++;  // Get the next available ID *before* adding the link and increment.
    const link = {
        id: newId,
        type: selectedLinkType,
        points: generatePoints(selectedLinkType, centerX, centerY, radius),
        label: inputLabel.value || `${newId}`,
    };
    links.push(link);
    inputLabel.value = "";
    renderCanvas();
    generateButton.disabled = false;
}


function generatePoints(type, centerX, centerY, radius) {
    const points = [];
    const numPoints = linkTypes.find(t => t.type === type).points;

    for (let i = 0; i < numPoints; i++) {
        const angle = (i * 2 * Math.PI) / numPoints;
        const x = centerX + radius * Math.cos(angle) + (Math.random() * 20 - 10);
        const y = centerY + radius * Math.sin(angle) + (Math.random() * 20 - 10);
        points.push({ x, y });
    }
    return points;
}


function getLinkCenter(link) {
    if (link.points.length === 2) {
        return {
            x: (link.points[0].x + link.points[1].x) / 2,
            y: (link.points[0].y + link.points[1].y) / 2
        };
    } else {
        let sumX = 0;
        let sumY = 0;
        for (const point of link.points) {
            sumX += point.x;
            sumY += point.y;
        }
        return {
            x: sumX / link.points.length,
            y: sumY / link.points.length,
        };
    }
}

function renderCanvas() {
// This function draws the links and labels on the canvas.
// It iterates through the `links` array and creates SVG elements for each link and its label.
// The type of link determines whether a line or polygon is drawn.
// Labels are centered on the link and have a background rectangle for better visibility.
function renderCanvas() {
    linksGroup.innerHTML = '';
    labelsGroup.innerHTML = '';
    connectionsGroup.innerHTML = '';

    links.forEach((link, linkIndex) => {
        let linkElement;
        if (link.type === 'binary') {
            linkElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            linkElement.setAttribute('x1', link.points[0].x);
            linkElement.setAttribute('y1', link.points[0].y);
            linkElement.setAttribute('x2', link.points[1].x);
            linkElement.setAttribute('y2', link.points[1].y);
            linkElement.setAttribute('stroke', '#34495e');
            linkElement.setAttribute('stroke-width', '3');
        } else {
            linkElement = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            const pointsString = link.points.map(p => `${p.x},${p.y}`).join(' ');
            linkElement.setAttribute('points', pointsString);
            linkElement.setAttribute('stroke', '#34495e');
            linkElement.setAttribute('stroke-width', '3');
            linkElement.setAttribute('fill', '#ecf0f1');
            linkElement.setAttribute("stroke-linejoin", "round");
        }

        linkElement.classList.add('link');
        linkElement.dataset.linkIndex = linkIndex.toString();
        linkElement.addEventListener('click', handleDeleteLink);
        linksGroup.appendChild(linkElement);

        link.points.forEach((point, pointIndex) => {
            const joint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            joint.setAttribute('cx', point.x);
            joint.setAttribute('cy', point.y);
            joint.setAttribute('r', '7');
            joint.setAttribute('fill', '#fff');
            joint.setAttribute('stroke', isConnected(linkIndex, pointIndex) ? '#3498db' : '#34495e');
            joint.setAttribute('stroke-width', '2');
            joint.classList.add('joint');
            joint.dataset.linkIndex = linkIndex.toString();
            joint.dataset.pointIndex = pointIndex.toString();
            linksGroup.appendChild(joint);
        });

        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        const center = getLinkCenter(link);
        label.setAttribute('x', center.x);
        label.setAttribute('y', center.y);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('dominant-baseline', 'middle');
        label.setAttribute('font-size', '0.9em');
        label.textContent = link.label || `${link.id}`; // Use link.id for display
        label.classList.add('link-label');
        label.dataset.linkIndex = linkIndex.toString();

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        const padding = 5;
        rect.setAttribute('rx', 4);
        rect.setAttribute('ry', 4);
        rect.setAttribute('x', center.x - (label.getBBox().width / 2) - padding);
        rect.setAttribute('y', center.y - (label.getBBox().height / 2) - padding);
        rect.setAttribute('width', label.getBBox().width + 2 * padding);
        rect.setAttribute('height', label.getBBox().height + 2 * padding);
        rect.setAttribute('fill', 'rgba(255, 255, 255, 0.75)');
        rect.setAttribute('stroke', 'transparent');
        rect.classList.add('link-label-bg');
        rect.dataset.linkIndex = linkIndex.toString();
        labelsGroup.appendChild(rect);
        labelsGroup.appendChild(label);


        label.addEventListener('click', (e) => {
            startEditingLabel(linkIndex, center.x, center.y);
            e.stopPropagation();
        });

    });
    updateConnectionsList();
    setupDragging();
}
    linksGroup.innerHTML = '';
    labelsGroup.innerHTML = '';
    connectionsGroup.innerHTML = '';

    links.forEach((link, linkIndex) => {
        let linkElement;
        if (link.type === 'binary') {
            linkElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            linkElement.setAttribute('x1', link.points[0].x);
            linkElement.setAttribute('y1', link.points[0].y);
            linkElement.setAttribute('x2', link.points[1].x);
            linkElement.setAttribute('y2', link.points[1].y);
            linkElement.setAttribute('stroke', '#34495e');
            linkElement.setAttribute('stroke-width', '3');
        } else {
            linkElement = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            const pointsString = link.points.map(p => `${p.x},${p.y}`).join(' ');
            linkElement.setAttribute('points', pointsString);
            linkElement.setAttribute('stroke', '#34495e');
            linkElement.setAttribute('stroke-width', '3');
            linkElement.setAttribute('fill', '#ecf0f1');
            linkElement.setAttribute("stroke-linejoin", "round");
        }

        linkElement.classList.add('link');
        linkElement.dataset.linkIndex = linkIndex.toString();
        linkElement.addEventListener('click', handleDeleteLink);
        linksGroup.appendChild(linkElement);

        link.points.forEach((point, pointIndex) => {
            const joint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            joint.setAttribute('cx', point.x);
            joint.setAttribute('cy', point.y);
            joint.setAttribute('r', '7');
            joint.setAttribute('fill', '#fff');
            joint.setAttribute('stroke', isConnected(linkIndex, pointIndex) ? '#3498db' : '#34495e');
            joint.setAttribute('stroke-width', '2');
            joint.classList.add('joint');
            joint.dataset.linkIndex = linkIndex.toString();
            joint.dataset.pointIndex = pointIndex.toString();
            linksGroup.appendChild(joint);
        });

        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        const center = getLinkCenter(link);
        label.setAttribute('x', center.x);
        label.setAttribute('y', center.y);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('dominant-baseline', 'middle');
        label.setAttribute('font-size', '0.9em');
        label.textContent = link.label || `${link.id}`; // Use link.id for display
        label.classList.add('link-label');
        label.dataset.linkIndex = linkIndex.toString();

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        const padding = 5;
        rect.setAttribute('rx', 4);
        rect.setAttribute('ry', 4);
        rect.setAttribute('x', center.x - (label.getBBox().width / 2) - padding);
        rect.setAttribute('y', center.y - (label.getBBox().height / 2) - padding);
        rect.setAttribute('width', label.getBBox().width + 2 * padding);
        rect.setAttribute('height', label.getBBox().height + 2 * padding);
        rect.setAttribute('fill', 'rgba(255, 255, 255, 0.75)');
        rect.setAttribute('stroke', 'transparent');
        rect.classList.add('link-label-bg');
        rect.dataset.linkIndex = linkIndex.toString();
        labelsGroup.appendChild(rect);
        labelsGroup.appendChild(label);


        label.addEventListener('click', (e) => {
            startEditingLabel(linkIndex, center.x, center.y);
            e.stopPropagation();
        });

    });
    updateConnectionsList();
    setupDragging();
}

function handleDeleteLink(event) {
    // This function 
    if (!event.ctrlKey && !event.metaKey) return;

    const linkIndex = parseInt(event.currentTarget.dataset.linkIndex);
    if (isNaN(linkIndex)) return;

    // 1. Remove connections associated with the link.
    const connectionsToRemove = [];
    connections.forEach(conn => {
        const { link1, link2 } = parseConnection(conn);
        if (link1 === linkIndex || link2 === linkIndex) {
            connectionsToRemove.push(conn);
        }
    });
    connectionsToRemove.forEach(conn => {
        connections.delete(conn);
        edgeLabels.delete(formatConnectionForEdgeLabel(parseConnection(conn).link1, parseConnection(conn).link2));
    });

    // 2. Remove the link itself.
    const removedLink = links.splice(linkIndex, 1)[0]; // Remove and get the removed link

    // 3. Re-index links AND update data-link-index attributes.
    links.forEach((link, newIndex) => {
        link.id = newIndex + 1;
        // Update data-link-index on the link element itself
        const linkElement = document.querySelector(`.link[data-link-index="${linkIndex}"]`); //target the original index
        if (linkElement) {
            linkElement.dataset.linkIndex = newIndex.toString();
        }

        // Update data-link-index on joints
        const jointElements = document.querySelectorAll(`.joint[data-link-index="${linkIndex}"]`); //target the original index
        jointElements.forEach(joint => {
            joint.dataset.linkIndex = newIndex.toString();
        });


        // Update data-link-index on labels and their backgrounds
        const labelElement = document.querySelector(`.link-label[data-link-index="${linkIndex}"]`); //target the original index
        if (labelElement) {
            labelElement.dataset.linkIndex = newIndex.toString();
        }
        const rectElement = document.querySelector(`.link-label-bg[data-link-index="${linkIndex}"]`); //target the original index
        if (rectElement) {
            rectElement.dataset.linkIndex = newIndex.toString();
        }
    });


    // 4. Update connections to reflect new link indices.
    const updatedConnections = new Set();
    connections.forEach(conn => {
        let { link1, joint1, link2, joint2 } = parseConnection(conn);

        // Adjust link indices if they were affected by the deletion.
        if (link1 > linkIndex) link1--;
        if (link2 > linkIndex) link2--;

        updatedConnections.add(formatConnection(link1, joint1, link2, joint2));
    });
    connections = updatedConnections;

    // 5. Update edge labels based on updated connections.
    const updatedEdgeLabels = new Map();
    connections.forEach(conn => {
        const { link1, link2 } = parseConnection(conn);
        const oldLabel = edgeLabels.get(formatConnectionForEdgeLabel(
            link1 >= linkIndex ? link1 + 1 : link1, // Use pre-update indices
            link2 >= linkIndex ? link2 + 1 : link2  // Use pre-update indices
        ));
        if (oldLabel) { // Only copy if it existed before
            updatedEdgeLabels.set(formatConnectionForEdgeLabel(link1, link2), oldLabel);
        }
    });

    edgeLabels = updatedEdgeLabels;
    // Adjust nextNodeId if the removed link had the highest ID.
    if (removedLink.id >= nextNodeId) {
        nextNodeId = removedLink.id; // This makes sure that there is no gap
    }

    // 6. Re-render and update.
    renderCanvas();
    updateConnectionsList();
    generateGraph();
}

function isConnected(linkIndex, pointIndex) {
    const pointId = `${linkIndex}-${pointIndex}`;
    for (let conn of connections) {
        if (conn.startsWith(pointId + ":") || conn.endsWith(":" + pointId)) {
            return true;
        }
    }
    return false;
}


function startEditingLabel(linkIndex, x, y) {
    // This function is used for editing in-place labels on links.  
    // It creates an input element, places it over the existing label, 
    // and updates the link's label when the input loses focus or the 
    // Enter key is pressed.
    const input = document.createElement("input");
    input.type = "text";
    input.value = links[linkIndex].label || '';
    input.style.position = 'absolute';
    input.style.left = `${x - 50}px`;
    input.style.top = `${y - 15}px`;
    input.style.width = '100px';
    input.style.font = "0.9em 'Helvetica', 'Roboto', sans-serif";
    input.style.padding = "3px 6px";
    input.style.border = "1px solid #3498db";
    input.style.background = "rgba(255,255,255,0.75)";
    input.style.borderRadius = "4px";

    document.body.appendChild(input);
    input.focus();

    input.onblur = () => {
        links[linkIndex].label = input.value;
        document.body.removeChild(input);
        renderCanvas();
    }
    input.onkeydown = (e) => {
        if (e.key === "Enter") {
            links[linkIndex].label = input.value;
            document.body.removeChild(input);
            renderCanvas();
        }
    }
}

function setupDragging() {
    interact('.joint')
        .draggable({
            inertia: true,
            modifiers: [
                interact.modifiers.restrict({
                    restriction: 'parent',
                    endOnly: true
                })
            ],
            autoScroll: true,
            listeners: {
                start(event) {
                    event.target.classList.add('dragging');
                    draggedJoint = event.target;
                    isDraggingLink = false;
                },
                move(event) {
                    if (isDraggingLink) return;

                    const target = event.target;
                    const linkIndex = parseInt(target.dataset.linkIndex);
                    const pointIndex = parseInt(target.dataset.pointIndex);

                    let x = parseFloat(target.getAttribute('cx')) + event.dx;
                    let y = parseFloat(target.getAttribute('cy')) + event.dy;

                    links[linkIndex].points[pointIndex] = { x, y };
                    updateConnectedJoints(linkIndex, pointIndex, x, y);

                    target.setAttribute('cx', x);
                    target.setAttribute('cy', y);
                    updateLinkPosition(linkIndex);
                    renderCanvas();
                    checkForSnap(event);

                },
                end(event) {
                    event.target.classList.remove('dragging');
                    snapToClosestJoint(event)
                    hideSnapIndicator();
                    renderCanvas();
                    draggedJoint = null;

                }
            }
        });
    interact(".link")
        .draggable({
            inertia: true,
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: 'parent',
                    endOnly: true
                })
            ],
            autoScroll: true,
            listeners: {
                start(event) {
                    const target = event.target;
                    const linkIndex = parseInt(target.dataset.linkIndex);
                    draggedLink = links[linkIndex];
                    isDraggingLink = true;

                },
                move(event) {
                    if (!draggedLink) return;

                    const dx = event.dx;
                    const dy = event.dy;

                    draggedLink.points.forEach(point => {
                        point.x += dx;
                        point.y += dy;
                    });

                    updateLinkPosition(draggedLink);
                    draggedLink.points.forEach((_, pointIndex) => {
                        //updateConnectedJoints(draggedLink.id - 1, pointIndex, draggedLink.points[pointIndex].x, draggedLink.points[pointIndex].y); // Use draggedLink.id - 1  REMOVED
                        updateConnectedJoints(draggedLink, pointIndex, draggedLink.points[pointIndex].x, draggedLink.points[pointIndex].y);
                    });

                    renderCanvas();

                },
                end(event) {
                    draggedLink = null;
                    isDraggingLink = false;
                }
            }
        })
}

function updateConnectedJoints(linkIndex, pointIndex, x, y) {
    //Changed linkIndex to be an object
    if (typeof linkIndex === 'object') {
        linkIndex = links.indexOf(linkIndex);
    }
    for (let conn of connections) {
        const { link1, joint1, link2, joint2 } = parseConnection(conn);
        // Ensure link indices are numbers before comparison
        const numLink1 = Number(link1);
        const numLink2 = Number(link2);
        const numLinkIndex = Number(linkIndex);

        if (numLink1 === numLinkIndex && joint1 === pointIndex) {
            if (links[numLink2]) { // Check if link exists
                links[numLink2].points[joint2] = { x, y };
                const otherJoint = document.querySelector(`.joint[data-link-index="${numLink2}"][data-point-index="${joint2}"]`);
                if (otherJoint) {
                    otherJoint.setAttribute('cx', x);
                    otherJoint.setAttribute('cy', y);
                }
            }
        } else if (numLink2 === numLinkIndex && joint2 === pointIndex) {
            if (links[numLink1]) { // Check if link exists

                links[numLink1].points[joint1] = { x, y };
                const otherJoint = document.querySelector(`.joint[data-link-index="${numLink1}"][data-point-index="${joint1}"]`);
                if (otherJoint) {
                    otherJoint.setAttribute('cx', x);
                    otherJoint.setAttribute('cy', y);
                }
            }
        }
    }
}

function updateLinkPosition(linkIndex) {
    //Changed linkIndex to be an object
    if (typeof linkIndex === 'object') {
        linkIndex = links.indexOf(linkIndex);
    }
    const link = links[linkIndex]; // Directly access by index
    if (!link) return;

    if (link.type === "binary") {
        const line = document.querySelector(`.link[data-link-index="${linkIndex}"]`);
        if (line) {
            line.setAttribute('x1', link.points[0].x);
            line.setAttribute('y1', link.points[0].y);
            line.setAttribute('x2', link.points[1].x);
            line.setAttribute('y2', link.points[1].y);
        }

    } else {
        const polygon = document.querySelector(`.link[data-link-index="${linkIndex}"]`);
        if (polygon) {
            const pointsString = link.points.map(p => `${p.x},${p.y}`).join(' ');
            polygon.setAttribute('points', pointsString);
        }
    }

    const label = document.querySelector(`.link-label[data-link-index="${linkIndex}"]`);
    const rect = document.querySelector(`.link-label-bg[data-link-index="${linkIndex}"]`);
    if (label && rect) {
        const center = getLinkCenter(link);
        label.setAttribute('x', center.x);
        label.setAttribute('y', center.y);
        const padding = 5;
        rect.setAttribute('x', center.x - (label.getBBox().width / 2) - padding);
        rect.setAttribute('y', center.y - (label.getBBox().height / 2) - padding);
        rect.setAttribute('width', label.getBBox().width + 2 * padding);
        rect.setAttribute('height', label.getBBox().height + 2 * padding);
    }
}



function checkForSnap(event) {
    if (!draggedJoint) return;

    const linkIndex = parseInt(draggedJoint.dataset.linkIndex);
    const pointIndex = parseInt(draggedJoint.dataset.pointIndex);


    let closestJoint = null;
    let minDistance = Infinity;
    const SNAP_DISTANCE = 20;

    const draggedX = parseFloat(draggedJoint.getAttribute('cx'));
    const draggedY = parseFloat(draggedJoint.getAttribute('cy'));

    for (let i = 0; i < links.length; i++) {
        if (i === linkIndex) continue;
        for (let j = 0; j < links[i].points.length; j++) {
            const otherJoint = document.querySelector(`.joint[data-link-index="${i}"][data-point-index="${j}"]`);
            if (!otherJoint) continue;

            const otherX = parseFloat(otherJoint.getAttribute('cx'));
            const otherY = parseFloat(otherJoint.getAttribute('cy'));

            const distance = Math.sqrt((draggedX - otherX) ** 2 + (draggedY - otherY) ** 2);

            if (distance < minDistance && distance <= SNAP_DISTANCE) {
                const newConnection = formatConnection(linkIndex, pointIndex, i, j);
                if (!connections.has(newConnection)) {
                    minDistance = distance;
                    closestJoint = { linkIndex: i, pointIndex: j, element: otherJoint };
                }

            }
        }
    }
    if (closestJoint) {
        const rect = canvas.getBoundingClientRect();
        showSnapIndicator(
            closestJoint.element.getAttribute('cx'),
            closestJoint.element.getAttribute('cy')
        );

    } else {
        hideSnapIndicator();
    }
}

function showSnapIndicator(x, y) {
    snapIndicator.style.left = `${x}px`;
    snapIndicator.style.top = `${y}px`;
    snapIndicator.classList.add('active');
}

function hideSnapIndicator() {
    snapIndicator.classList.remove('active');
}

function snapToClosestJoint(event) {
    if (!draggedJoint) return;

    const linkIndex = parseInt(draggedJoint.dataset.linkIndex);
    const pointIndex = parseInt(draggedJoint.dataset.pointIndex);
    let closestJoint = null;
    let minDistance = Infinity;
    const SNAP_DISTANCE = 20;

    const draggedX = parseFloat(draggedJoint.getAttribute('cx'));
    const draggedY = parseFloat(draggedJoint.getAttribute('cy'));

    for (let i = 0; i < links.length; i++) {
        if (i === linkIndex) continue;
        for (let j = 0; j < links[i].points.length; j++) {
            const otherJoint = document.querySelector(`.joint[data-link-index="${i}"][data-point-index="${j}"]`);
            if (!otherJoint) continue;

            const otherX = parseFloat(otherJoint.getAttribute('cx'));
            const otherY = parseFloat(otherJoint.getAttribute('cy'));

            const distance = Math.sqrt((draggedX - otherX) ** 2 + (draggedY - otherY) ** 2);

            if (distance < minDistance && distance <= SNAP_DISTANCE) {
                const newConnection = formatConnection(linkIndex, pointIndex, i, j);
                if (!connections.has(newConnection)) {
                    minDistance = distance;
                    closestJoint = { linkIndex: i, pointIndex: j, element: otherJoint };
                }
            }
        }
    }

    if (closestJoint) {
        links[linkIndex].points[pointIndex].x = links[closestJoint.linkIndex].points[closestJoint.pointIndex].x;
        links[linkIndex].points[pointIndex].y = links[closestJoint.linkIndex].points[closestJoint.pointIndex].y;

        // Add the connection and its label
        const newConnection = formatConnection(linkIndex, pointIndex, closestJoint.linkIndex, closestJoint.pointIndex);
        connections.add(newConnection);
        // Find next available label
        let labelCounter = 0;
        while (Array.from(edgeLabels.values()).includes(String.fromCharCode(97 + labelCounter))) {
            labelCounter++;
        }
        // Use formatConnectionForEdgeLabel to create the key:
        edgeLabels.set(formatConnectionForEdgeLabel(linkIndex, closestJoint.linkIndex), String.fromCharCode(97 + labelCounter));


        updateConnectedJoints(linkIndex, pointIndex, links[closestJoint.linkIndex].points[closestJoint.pointIndex].x, links[closestJoint.linkIndex].points[closestJoint.pointIndex].y);
        renderCanvas();
    }
}

function formatConnection(linkIndex1, pointIndex1, linkIndex2, pointIndex2) {

    const [minLink, minJoint, maxLink, maxJoint] = linkIndex1 < linkIndex2 ?
        [linkIndex1, pointIndex1, linkIndex2, pointIndex2] :
        [linkIndex2, pointIndex2, linkIndex1, pointIndex1];
    return `${minLink}-${minJoint}:${maxLink}-${maxJoint}`;
}

function parseConnection(connectionString) {
    const [part1, part2] = connectionString.split(':');
    const [link1, joint1] = part1.split('-').map(Number);
    const [link2, joint2] = part2.split('-').map(Number);
    return { link1, joint1, link2, joint2 };
}

function updateConnectionsList() {
    connectionsList.innerHTML = '';
    if (connections.size === 0) {
        const listItem = document.createElement('li');
        listItem.textContent = "No connections yet.";
        connectionsList.appendChild(listItem);
    } else {
        const sortedConnections = Array.from(connections).sort();
        sortedConnections.forEach(conn => {
            const listItem = document.createElement('li');
            const { link1, joint1, link2, joint2 } = parseConnection(conn);
            const edgeLabel = edgeLabels.get(formatConnectionForEdgeLabel(link1, link2));
            // Use link1 + 1 and link2 + 1 for display, as link indices are 0-based
            listItem.textContent = `(${links[link1].id}, ${links[link2].id}, '${edgeLabel}')`;

            const deleteButton = document.createElement('button');
            deleteButton.classList.add("delete-connection-button");
            deleteButton.textContent = 'x';
            deleteButton.onclick = () => {
                connections.delete(conn);
                edgeLabels.delete(formatConnectionForEdgeLabel(link1, link2));
                renderCanvas();
                updateConnectionsList();
                generateGraph();
            };
            listItem.appendChild(deleteButton);
            connectionsList.appendChild(listItem);
        });
    }
}

function generateGraph() {
    // This function is called when the user clicks the "Generate Graph" button.
    generateSpringGraph();
}


function generateSpringGraph() {
    while (graphCanvas.firstChild) {
        graphCanvas.removeChild(graphCanvas.firstChild);
    }

    const vertices = links.map((link) => ({ id: link.id })); // Use link.id
    const edges = [];

    for (let conn of connections) {
        const { link1, joint1, link2, joint2 } = parseConnection(conn);
        // Use link IDs directly in edges
        const edgeExists = edges.some(
            (edge) =>
            (edge.source === links[link1].id && edge.target === links[link2].id) ||
            (edge.source === links[link2].id && edge.target === links[link1].id)
        );

        if (!edgeExists) {
            // Use the links ids, not the indexes.
            edges.push({ source: links[link1].id, target: links[link2].id });
        }
    }

    const graphWidth = graphCanvas.clientWidth;
    const graphHeight = graphCanvas.clientHeight;

    if (simulation) {
        simulation.stop();
    }
    simulation = d3.forceSimulation(vertices)
        .force("link", d3.forceLink(edges).id(d => d.id).distance(100))  // Use d.id here
        .force("charge", d3.forceManyBody().strength(-500))
        .force("center", d3.forceCenter(graphWidth / 2, graphHeight / 2))
        .on("tick", ticked);

    const edge = d3.select(graphCanvas)
        .selectAll(".edge")
        .data(edges)
        .join("line")
        .attr("class", "edge")
        .attr("stroke", "#34495e")
        .attr("stroke-width", 2)
        .on('click', handleD3EdgeDelete);

    const edgeLabelGroup = d3.select(graphCanvas)
        .selectAll(".edge-label-group")
        .data(edges)
        .join("g")
        .attr("class", "edge-label-group");

    edgeLabelGroup.append("rect")
        .attr("class", "edge-label-bg")
        .attr("fill", "rgba(255, 255, 255, 0.75)")
        .attr("rx", 4)
        .attr("ry", 4);

    edgeLabelGroup.append("text")
        .attr("class", "edge-label")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", "0.9em")
        .attr("fill", "#34495e")
        .text(d => {
            // Find the correct edge label using link IDs
            const edgeKey = formatConnectionForEdgeLabel(
                links.findIndex(link => link.id === d.source.id),
                links.findIndex(link => link.id === d.target.id)
            );
            return edgeLabels.get(edgeKey) || '';
        });

    const node = d3.select(graphCanvas)
        .selectAll(".node")
        .data(vertices)
        .join("g")
        .attr("class", "node")
        .call(d3.drag()  // Add drag behavior to nodes
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    node.append("circle")
        .attr("r", 20)
        .attr("fill", "#34495e");


    const nodeLabel = node.append("g")
        .attr("class", "node-label");

    nodeLabel.append("rect").attr("class", "spring");

    nodeLabel.append("text")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", "0.9em")
        .attr('class', 'spring')
        .text(d => links.find(l => l.id === d.id)?.label || `${d.id}`); // Use link.id

    function ticked() {
        edge
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        edgeLabelGroup.attr("transform", d => `translate(${(d.source.x + d.target.x)/ 2}, ${(d.source.y + d.target.y) / 2})`);

                edgeLabelGroup.select(".edge-label-bg")
            .each(function (d) {
                const textElement = d3.select(this.parentNode).select(".edge-label");
                const bbox = textElement.node().getBBox();
                const padding = 3;
                d3.select(this)
                    .attr("x", - bbox.width / 2 - padding)
                    .attr("y", - bbox.height / 2 - padding)
                    .attr("width", bbox.width + 2 * padding)
                    .attr("height", bbox.height + 2 * padding);
            });

        node
            .attr("transform", d => `translate(${d.x}, ${d.y})`);

        nodeLabel.select("rect")
            .each(function (d) {
                const textElement = d3.select(this.parentNode).select("text");
                const bbox = textElement.node().getBBox();
                const padding = 5;
                d3.select(this)
                    .attr("x", - bbox.width / 2 - padding)
                    .attr("y", - bbox.height / 2 - padding)
                    .attr("width", bbox.width + 2 * padding)
                    .attr("height", bbox.height + 2 * padding)
                    .attr("rx", 4)
                    .attr("ry", 4);
            });

        node.attr("transform", function (d) {
            const radius = parseFloat(d3.select(this).select("circle").attr("r"));
            d.x = Math.max(radius, Math.min(graphWidth - radius, d.x));
            d.y = Math.max(radius, Math.min(graphHeight - radius, d.y));
            return "translate(" + d.x + "," + d.y + ")";
        });
    }

    // Drag event handlers for D3 nodes
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}
function formatConnectionForEdgeLabel(link1, link2) {
    const minLink = Math.min(link1, link2);
    const maxLink = Math.max(link1, link2);
    return `${minLink}-${maxLink}`;
}


function handleD3EdgeDelete(event, d) {
    const from = d.source.id; // Use IDs
    const to = d.target.id;   // Use IDs

    if (event.ctrlKey || event.metaKey) {
        const connectionsToRemove = [];

        for (let conn of connections) {
            const { link1, joint1, link2, joint2 } = parseConnection(conn);
            // Compare using link indices, not IDs
            if ((links[link1].id === from && links[link2].id === to) || (links[link1].id === to && links[link2].id === from)) {
                connectionsToRemove.push(conn);
            }
        }
        connectionsToRemove.forEach(conn => {
            const { link1, link2 } = parseConnection(conn);
            connections.delete(conn);
            // Delete using link indices
            edgeLabels.delete(formatConnectionForEdgeLabel(link1, link2));
        });


        renderCanvas();
        generateGraph();
    }
}


clearCanvasButton.addEventListener("click", () => {
    links = [];
    connections.clear();
    edgeLabels.clear();
    generateButton.disabled = true;
    nextNodeId = 1; // Reset node ID counter.
    renderCanvas();
    while (graphCanvas.firstChild) {
        graphCanvas.removeChild(graphCanvas.firstChild);
    }
    if (simulation) {
        simulation.stop();
        simulation = null;
    }

    // Reset the file input element
    jsonFile.value = ''; // Clear the file input
});

addLinkButton.addEventListener('click', addLink);
generateButton.addEventListener('click', generateGraph);

document.addEventListener('keydown', (event) => {
    if (event.key === 'Delete' && draggedJoint) {
        const linkIndex = parseInt(draggedJoint.dataset.linkIndex);
        const pointIndex = parseInt(draggedJoint.dataset.pointIndex);

        const connectionsCopy = new Set(connections);
        connectionsCopy.forEach(conn => {
            const { link1, joint1, link2, joint2 } = parseConnection(conn);
            if ((link1 === linkIndex && joint1 === pointIndex) || (link2 === linkIndex && joint2 === pointIndex)) {
                connections.delete(conn);
                edgeLabels.delete(formatConnectionForEdgeLabel(link1, link2));
            }
        });
        draggedJoint = null;
        renderCanvas();
        updateConnectionsList();
        generateGraph();

    }

});

// --- JSON Loading Logic (Integration) ---
loadJsonButton.addEventListener('click', () => {
    jsonFile.click(); // Trigger file input
});

jsonFile.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                loadJsonData(data); // Call the new function
            } catch (error) {
                console.error("Error parsing JSON:", error);
                alert("Error parsing JSON file.  Please ensure the file is valid.");
            }
        };
        reader.readAsText(file);
    }
});

function loadJsonData(data) {
    // Clear existing data
    links = [];
    connections.clear();
    edgeLabels.clear();
    nextNodeId = 1;

    // 1.  Load Links (with ID handling and vertex reordering for polygons)
    if (data.links && Array.isArray(data.links)) {
        data.links.forEach(linkData => {
            // Create a copy of the points array
            let points = linkData.points.map(p => ({ x: p.x, y: p.y }));

            let link = {
                id: linkData.id,
                type: linkData.type,
                points: points,
                label: linkData.label || `${linkData.id}`
            };

            // For links with more than 2 points (i.e., polygons), sort vertices clockwise
            if (link.points.length > 2) {
                // Compute the centroid of the polygon
                let sumX = 0, sumY = 0;
                link.points.forEach(pt => {
                    sumX += pt.x;
                    sumY += pt.y;
                });
                const centroid = { x: sumX / link.points.length, y: sumY / link.points.length };

                // Create an array with original index, point, and angle (relative to centroid)
                let pointsWithAngle = link.points.map((pt, idx) => {
                    let angle = Math.atan2(pt.y - centroid.y, pt.x - centroid.x);
                    return { point: pt, originalIndex: idx, angle: angle };
                });

                // Sort in descending order of angle to achieve clockwise ordering
                pointsWithAngle.sort((a, b) => b.angle - a.angle);

                // Build new sorted points array and record mapping from original index to new index
                let newPoints = [];
                let vertexMap = [];
                pointsWithAngle.forEach((obj, newIdx) => {
                    newPoints.push(obj.point);
                    vertexMap[obj.originalIndex] = newIdx;
                });

                // Replace the points array with the sorted version
                link.points = newPoints;

                // Temporarily store the vertex map on the link
                link.vertexMap = vertexMap;
            }

            links.push(link);
            if (linkData.id >= nextNodeId) {
                nextNodeId = linkData.id + 1;
            }
        });
    }

    // 2. Load Connections, updating joint indices where vertex reordering was applied
    if (data.connections && Array.isArray(data.connections)) {
      connections = new Set(data.connections.map(c => {
          let link1Index = links.findIndex(l => l.id === c.link1);
          let link2Index = links.findIndex(l => l.id === c.link2);

          // Use vertexMap to get the new joint index, or the JSON value if no map.
          let joint1 = c.joint1;
          let joint2 = c.joint2;
          if (link1Index >= 0 && links[link1Index].vertexMap) {
              joint1 = links[link1Index].vertexMap[c.joint1];
          }
          if (link2Index >= 0 && links[link2Index].vertexMap) {
              joint2 = links[link2Index].vertexMap[c.joint2];
          }

          return formatConnection(link1Index, joint1, link2Index, joint2);
      }));
    }
    // 3. Load Edge Labels (if provided) or generate
    if (data.edgeLabels) {
        const correctedEdgeLabels = new Map();
        for (const key in data.edgeLabels) {
            if (data.edgeLabels.hasOwnProperty(key)) {
                const value = data.edgeLabels[key];
                if (typeof key === 'string') {
                    const parts = key.split('-');
                    if (parts.length === 2) {
                        // Valid linkIndex-linkIndex key
                        correctedEdgeLabels.set(key, value);
                    } else {
                        try {
                            // Might be a full connection string; try parsing
                            const { link1, link2 } = parseConnection(key);
                            // Convert from ids to indexes
                            const link1Index = links.findIndex(l => l.id === link1);
                            const link2Index = links.findIndex(l => l.id === link2);
                            correctedEdgeLabels.set(formatConnectionForEdgeLabel(link1Index, link2Index), value);
                        } catch (err) {
                            console.warn("Skipping invalid edge label key: ", key);
                        }
                    }
                }
            }
        }
        edgeLabels = correctedEdgeLabels;
    } else if (data.connections && Array.isArray(data.connections)) {
        // Generate edge labels if none were provided in JSON
        data.connections.forEach(c => {
            const link1Index = links.findIndex(l => l.id == c.link1);
            const link2Index = links.findIndex(l => l.id === c.link2);

              let joint1 = c.joint1;
              let joint2 = c.joint2;
              if (link1Index >= 0 && links[link1Index].vertexMap) {
                  joint1 = links[link1Index].vertexMap[c.joint1];
              }
              if (link2Index >= 0 && links[link2Index].vertexMap) {
                  joint2 = links[link2Index].vertexMap[c.joint2];
              }

            let labelCounter = 0;
            while (Array.from(edgeLabels.values()).includes(String.fromCharCode(97 + labelCounter))) {
                labelCounter++;
            }
            edgeLabels.set(formatConnectionForEdgeLabel(link1Index, link2Index), String.fromCharCode(97 + labelCounter));
        });
    }

    // Optional: Remove the temporary vertexMap
    links.forEach(link => {
        if (link.vertexMap) {
            delete link.vertexMap;
        }
    });

    // 4. Calculate Scaling and Translation
    calculateScaleAndTranslation();

    // 5.  Adjust points to pixel coordinates AFTER scaling.
    links.forEach(link => {
        link.points = link.points.map(p => abstractToPixel(p.x, p.y));
    });

    // 6. Render and Update
    renderCanvas();
    updateConnectionsList(); // Update the connections list display
    generateButton.disabled = links.length === 0;
    generateGraph(); // Generate the graph representation.
}

function calculateScaleAndTranslation() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    //IMPORTANT: Iterate through the ORIGINAL, abstract points, NOT pixel points.
    if (links.length === 0) {
        scaleX = 1;
        scaleY = 1;
        translateX = canvas.clientWidth / 2;
        translateY = canvas.clientHeight / 2;
        return;
    }

    links.forEach(link => {
        link.points.forEach(p => {
            //Use original points
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);

        });
    });

    const margin = 50;
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;
    const abstractWidth = maxX - minX;
    const abstractHeight = maxY - minY;

    scaleX = (canvasWidth - 2 * margin) / (abstractWidth === 0 ? 1 : abstractWidth);
    scaleY = (canvasHeight - 2 * margin) / (abstractHeight === 0 ? 1 : abstractHeight);

    const scale = Math.min(scaleX, scaleY);
    scaleX = scale;
    scaleY = scale;

    translateX = (canvasWidth / 2) - ((minX + maxX) / 2) * scaleX;
    translateY = (canvasHeight / 2) - ((minY + maxY) / 2) * scaleY;
}

function abstractToPixel(x, y) {
    return {
        x: x * scaleX + translateX,
        y: y * scaleY + translateY
    };
}
generateLinkOptions();
renderCanvas();
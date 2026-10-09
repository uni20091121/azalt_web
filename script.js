
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const mount = document.getElementById('scene');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#050914');

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
camera.up.set(0, 0, 1);
camera.position.set(3.6, -4.7, 3.0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(mount.clientWidth, mount.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
mount.appendChild(renderer.domElement);

// Camera controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0.42);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 2.4;
controls.maxDistance = 8;
controls.maxPolarAngle = Math.PI * 0.92;

// Lighting
scene.add(new THREE.AmbientLight(0x9bbbe8, 1.15));

const keyLight = new THREE.PointLight(0x78baff, 2.0, 12);
keyLight.position.set(2, -2, 3);
scene.add(keyLight);

// Groups for toggling the axes and labels
const axisGroup = new THREE.Group();
const labelGroup = new THREE.Group();

scene.add(axisGroup, labelGroup);

// ============================================================
// LINE HELPERS
// ============================================================

function line(
  points,
  color,
  opacity = 1,
  width = 1,
  dashed = false,
  parent = scene
) {
  const geometry = new THREE.BufferGeometry().setFromPoints(
    points.map(p => new THREE.Vector3(...p))
  );

  const material = dashed
    ? new THREE.LineDashedMaterial({
        color,
        transparent: true,
        opacity,
        dashSize: 0.045,
        gapSize: 0.025
      })
    : new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        linewidth: width
      });

  const obj = new THREE.Line(geometry, material);

  if (dashed) {
    obj.computeLineDistances();
  }

  parent.add(obj);
  return obj;
}

function circlePoints(radius, z, count = 240) {
  return Array.from({ length: count + 1 }, (_, i) => {
    const a = i / count * Math.PI * 2;

    return [
      radius * Math.cos(a),
      radius * Math.sin(a),
      z
    ];
  });
}

// ============================================================
// CELESTIAL SPHERE — UPPER HEMISPHERE
// ============================================================

{
  const vertices = [];
  const indices = [];

  const rows = 42;
  const cols = 120;
  const radius = 1;

  for (let i = 0; i <= rows; i++) {
    const phi = (i / rows) * Math.PI / 2;

    for (let j = 0; j <= cols; j++) {
      const theta = (j / cols) * Math.PI * 2;

      vertices.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );
    }
  }

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j;
      const b = a + cols + 1;

      indices.push(
        a, b, a + 1,
        b, b + 1, a + 1
      );
    }
  }

  const geo = new THREE.BufferGeometry();

  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3)
  );

  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.MeshBasicMaterial({
    color: 0x78aaff,
    transparent: true,
    opacity: 0.075,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  scene.add(new THREE.Mesh(geo, mat));
}

// ============================================================
// HORIZON DISK AND RINGS
// ============================================================

{
  const geo = new THREE.CircleGeometry(1, 160);

  const mat = new THREE.MeshBasicMaterial({
    color: 0x4de0c1,
    transparent: true,
    opacity: 0.035,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const disk = new THREE.Mesh(geo, mat);
  disk.position.z = 0.001;

  scene.add(disk);
}

line(circlePoints(1, 0), 0x8fc9ff, 0.7, 1.5);
line(circlePoints(1, 0), 0x65bfff, 0.09, 4);
line(circlePoints(1, 0.006), 0x4de0c1, 0.8, 1.3);

// ============================================================
// COORDINATE AXES
// X = EAST, Y = NORTH, Z = ZENITH
// ============================================================

line(
  [[-1.45, 0, 0], [1.45, 0, 0]],
  0xff5555, 0.9, 2, false, axisGroup
);

line(
  [[0, -1.45, 0], [0, 1.45, 0]],
  0x55dd88, 0.9, 2, false, axisGroup
);

line(
  [[0, 0, 0], [0, 0, 1]],
  0x5599ff, 0.95, 2, false, axisGroup
);

// ============================================================
// TEXT LABELS
// ============================================================

function makeTextSprite(text, color, size = 52) {
  const canvas = document.createElement('canvas');

  canvas.width = 256;
  canvas.height = 96;

  const ctx = canvas.getContext('2d');

  ctx.font = `700 ${size}px Manrope, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.fillStyle = color;

  ctx.fillText(text, 128, 48);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false
  });

  const sprite = new THREE.Sprite(material);

  sprite.scale.set(
    text.length > 5 ? 0.68 : 0.25,
    0.095,
    1
  );

  labelGroup.add(sprite);

  return sprite;
}

const directionLabels = [
  {
    text: 'E',
    pos: [1.57, 0, 0.03],
    color: '#55dd88'
  },
  {
    text: 'W',
    pos: [-1.57, 0, 0.03],
    color: '#55dd88'
  },
  {
    text: 'N',
    pos: [0, 1.57, 0.03],
    color: '#55dd88'
  },
  {
    text: 'S',
    pos: [0, -1.57, 0.03],
    color: '#55dd88'
  },
  {
    text: 'ZENITH',
    pos: [0, 0, 1.13],
    color: '#80bfff'
  }
].map(item => {
  const sprite = makeTextSprite(
    item.text,
    item.color,
    item.text === 'ZENITH' ? 35 : 52
  );

  sprite.position.set(...item.pos);

  return sprite;
});

// ============================================================
// GLOW TEXTURE AND GLOWING POINTS
// ============================================================

function makeGlowTexture(color) {
  const c = document.createElement('canvas');

  c.width = c.height = 128;

  const ctx = c.getContext('2d');

  const g = ctx.createRadialGradient(
    64, 64, 1,
    64, 64, 64
  );

  g.addColorStop(0, color);
  g.addColorStop(0.18, color + 'bb');
  g.addColorStop(0.48, color + '35');
  g.addColorStop(1, color + '00');

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);

  return new THREE.CanvasTexture(c);
}

function glowingPoint(color, size, opacity) {
  const material = new THREE.SpriteMaterial({
    map: makeGlowTexture(color),
    color: 0xffffff,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const sprite = new THREE.Sprite(material);

  sprite.scale.set(size, size, 1);
  scene.add(sprite);

  return sprite;
}

// ============================================================
// ZENITH MARKER
// Zenith is the point directly above the observer: (0, 0, 1)
// ============================================================

const zenithGlow = glowingPoint('#5599ff', 0.38, 0.8);
zenithGlow.position.set(0, 0, 1);

const zenithCore = new THREE.Mesh(
  new THREE.SphereGeometry(0.022, 20, 20),
  new THREE.MeshBasicMaterial({
    color: '#b9dcff'
  })
);

zenithCore.position.set(0, 0, 1);
scene.add(zenithCore);

// ============================================================
// STAR: GLOW LAYERS AND STAR-SHAPED SPRITE
// ============================================================

const starOuter = glowingPoint('#ffbd38', 0.75, 0.52);
const starMiddle = glowingPoint('#ffd84d', 0.43, 0.68);
const starInner = glowingPoint('#ffe680', 0.23, 0.8);

const starCanvas = document.createElement('canvas');

starCanvas.width = starCanvas.height = 128;

{
  const ctx = starCanvas.getContext('2d');

  ctx.translate(64, 64);

  ctx.shadowColor = '#fff0a0';
  ctx.shadowBlur = 18;

  ctx.fillStyle = '#fff4a3';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;

  ctx.beginPath();

  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 43 : 19;
    const a = -Math.PI / 2 + i * Math.PI / 5;

    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

const starSprite = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(starCanvas),
    transparent: true,
    depthTest: false
  })
);

starSprite.scale.set(0.18, 0.18, 1);
scene.add(starSprite);

// ============================================================
// DYNAMIC LINES AND ANGLE ARCS
// ============================================================

const projection = line(
  [[0, 0, 0], [0, 0, 0]],
  0xffd84d, 0.78, 1, true
);

const azimuthLine = line(
  [[0, 0, 0], [0, 0, 0]],
  0xff9f43, 0.95, 2
);

const positionVector = line(
  [[0, 0, 0], [0, 0, 0]],
  0xffffff, 0.7, 1, true
);

const azimuthArc = line(
  [[0, 0, 0], [0, 0, 0]],
  0xff9f43, 0.9, 2
);

const altitudeArc = line(
  [[0, 0, 0], [0, 0, 0]],
  0xffdd55, 0.95, 2
);

// Replace a line's geometry as the sliders change
function replaceLine(obj, points) {
  obj.geometry.dispose();

  obj.geometry = new THREE.BufferGeometry().setFromPoints(
    points.map(p => new THREE.Vector3(...p))
  );

  if (obj.material.isLineDashedMaterial) {
    obj.computeLineDistances();
  }
}

let currentAz = Math.PI / 4;

// Create points for the azimuth and altitude arcs
function arcPoints(radius, start, end, plane, count = 80) {
  const pts = [];

  for (let i = 0; i <= count; i++) {
    const a = start + (end - start) * i / count;

    if (plane === 'xy') {
      pts.push([
        radius * Math.cos(a),
        radius * Math.sin(a),
        0.008
      ]);
    } else {
      pts.push([
        radius * Math.cos(a) * Math.cos(currentAz),
        radius * Math.cos(a) * Math.sin(currentAz),
        radius * Math.sin(a)
      ]);
    }
  }

  return pts;
}

// ============================================================
// UPDATE STAR POSITION FROM ALTITUDE AND AZIMUTH
// ============================================================

function updatePosition() {
  const az = Number(
    document.getElementById('azimuth').value
  );

  const alt = Number(
    document.getElementById('altitude').value
  );

  currentAz = THREE.MathUtils.degToRad(az);

  const a = currentAz;
  const h = THREE.MathUtils.degToRad(alt);

  // Unit sphere coordinates:
  // x = cos(altitude) cos(azimuth)
  // y = cos(altitude) sin(azimuth)
  // z = sin(altitude)

  const x = Math.cos(h) * Math.cos(a);
  const y = Math.cos(h) * Math.sin(a);
  const z = Math.sin(h);

  const p = [x, y, z];

  // Move all star glow layers together
  for (const sprite of [
    starOuter,
    starMiddle,
    starInner,
    starSprite
  ]) {
    sprite.position.set(x, y, z);
  }

  // Vertical projection from star to the horizon plane
  replaceLine(projection, [
    p,
    [x, y, 0]
  ]);

  // Azimuth line on the horizon plane
  replaceLine(azimuthLine, [
    [0, 0, 0.008],
    [x, y, 0.008]
  ]);

  // Position vector from observer to star
  replaceLine(positionVector, [
    [0, 0, 0],
    p
  ]);

  // Azimuth arc in the XY plane
  replaceLine(
    azimuthArc,
    arcPoints(0.22, 0, a, 'xy')
  );

  // Altitude arc in the vertical plane containing the star
  replaceLine(
    altitudeArc,
    arcPoints(0.22, 0, h, 'xz')
  );

  // Update numerical readouts
  document.getElementById('azValue').textContent = `${az}°`;
  document.getElementById('altValue').textContent = `${alt}°`;

  document.getElementById('azOut').textContent = `${az}°`;
  document.getElementById('altOut').textContent = `${alt}°`;
}

// ============================================================
// INTERFACE EVENTS
// ============================================================

document.getElementById('azimuth').addEventListener(
  'input',
  updatePosition
);

document.getElementById('altitude').addEventListener(
  'input',
  updatePosition
);

// Reset both sliders to 45 degrees
document.getElementById('reset').addEventListener(
  'click',
  () => {
    document.getElementById('azimuth').value = 45;
    document.getElementById('altitude').value = 45;

    updatePosition();
  }
);

// Toggle all coordinate axes together
document.getElementById('axesToggle').addEventListener(
  'change',
  event => {
    axisGroup.visible = event.target.checked;
  }
);

// Toggle all direction labels, including the zenith label
document.getElementById('labelsToggle').addEventListener(
  'change',
  event => {
    labelGroup.visible = event.target.checked;
  }
);

// ============================================================
// RESPONSIVE CANVAS
// ============================================================

function resize() {
  const w = mount.clientWidth;
  const h = mount.clientHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  renderer.setSize(w, h);
}

new ResizeObserver(resize).observe(mount);

// Initialize the star position
updatePosition();

// ============================================================
// ANIMATION LOOP
// ============================================================

function animate() {
  requestAnimationFrame(animate);

  controls.update();
  renderer.render(scene, camera);
}

animate();
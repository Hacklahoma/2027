// A painted person placed in the live water scene.
// The painting is a flat card standing at the waterline, turned to face the
// camera. Everything around it is real: it reflects in the water, and the boat
// in its hands is a real light that pools on the water and flickers with the fleet.
import * as THREE from 'three';

export function addPaintedPerson(api, {
  url, x = -1, z = 1.3, height = 1.05,
  size = [1052, 1179],          // the cut-out image, in pixels
  boatPx = [688, 874],          // where the glowing boat is in the image
} = {}) {
  const [iw, ih] = size;
  const width = (height * iw) / ih;

  const tex = new THREE.TextureLoader().load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  const uniforms = {
    map: { value: tex }, uMirror: api.shared.uMirror, uFlicker: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, side: THREE.DoubleSide,
    vertexShader: /* glsl */`varying vec2 vUv; varying float vY; void main(){ vUv = uv; vY = (modelMatrix*vec4(position,1.)).y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D map; uniform float uMirror, uFlicker; varying vec2 vUv; varying float vY;
      void main(){
        vec4 c = texture2D(map, vUv);
        if (c.a < .02) discard;
        // the warm, candle-lit parts of the painting breathe with the flame
        float warm = smoothstep(.04, .5, c.r - c.b);
        vec3 col = c.rgb * (1. + warm * (uFlicker - 1.) * 1.4);
        col *= mix(.5, 1., smoothstep(0., .07, abs(vY)));   // wet and darker right where the body meets the water
        if (uMirror > .5) col *= .5;       // the reflection is darker than the figure
        gl_FragColor = vec4(col, c.a);
      }`,
  });

  const geo = new THREE.PlaneGeometry(width, height);
  geo.translate(0, height / 2, 0);         // the bottom edge of the painting is the waterline
  const card = new THREE.Mesh(geo, mat);
  card.position.y = -0.045;                // sink the straight cut below the surface: the water hides it
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.add(card);
  api.scene.add(group);

  // the boat in their hands: a real (invisible) boat from the fleet, so it lights the water
  const boat = api.addBoat({ s: 0.1, keep: true, power: 1.25 });
  boat.mesh.visible = false;
  boat.mesh.raycast = () => {};            // not clickable: it's the painting's light, not a boat you can see
  const local = new THREE.Vector3((boatPx[0] / iw - 0.5) * width, (1 - boatPx[1] / ih) * height - 0.045, 0.02);
  boat.follow = (b) => {
    b.group.position.copy(local).applyMatrix4(group.matrixWorld);
    b.onWater = 0.55;
  };

  // a soft glow around their boat, so the painted light and the scene's light are one
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,214,150,0.9)'); grd.addColorStop(0.25, 'rgba(255,166,62,0.45)'); grd.addColorStop(1, 'rgba(255,140,40,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const glowTex = new THREE.CanvasTexture(c); glowTex.colorSpace = THREE.SRGBColorSpace;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.scale.setScalar(height * 0.42);
  api.scene.add(glow);

  // each frame: turn the card to face the camera (upright), and let the glow flicker with the flame
  api.tickers.push(() => {
    const cam = api.camera.position;
    group.rotation.y = Math.atan2(cam.x - group.position.x, cam.z - group.position.z);
    group.updateMatrixWorld();
    glow.position.copy(boat.group.position);
    const f = boat.glow ? boat.glow / 1.25 : 1;
    glow.material.opacity = 0.55 * f;
    uniforms.uFlicker.value = 0.9 + 0.2 * f;
  });

  return { group, boat };
}

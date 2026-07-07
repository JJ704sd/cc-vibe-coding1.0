import * as THREE from 'three';

/**
 * Recursively dispose a material AND every texture it references.
 *
 * `Material.dispose()` does NOT release textures attached via `.map`,
 * `.normalMap`, `.emissiveMap`, `.aoMap`, `.roughnessMap`, etc. Those
 * textures own independent GPU resources (see `WebGLTextures` internal
 * table) and must be disposed explicitly, otherwise the WebGL texture
 * table grows unbounded across mount/unmount cycles — this is the
 * leak BUG-012 tracks.
 *
 * Three.js attaches texture properties by name on the material instance,
 * so enumerating own keys with `Object.keys(mat)` and duck-type checking
 * the `isTexture` flag (which every Three.js Texture carries) catches
 * every map slot without hardcoding the property list.
 */
export const disposeMaterialDeep = (
  mat: THREE.Material | readonly THREE.Material[] | undefined | null,
): void => {
  if (!mat) return;
  const list = Array.isArray(mat) ? mat : [mat];
  for (const m of list) {
    if (!m) continue;
    for (const key of Object.keys(m)) {
      const value = (m as unknown as Record<string, unknown>)[key];
      if (
        value &&
        typeof value === 'object' &&
        (value as { isTexture?: boolean }).isTexture === true
      ) {
        (value as THREE.Texture).dispose();
      }
    }
    m.dispose();
  }
};

/**
 * Dispose a Mesh's geometry + material(s) (with textures) and detach
 * it from its parent. Tolerates meshes without geometry/material or
 * meshes that were never attached — the goal is to be safe in cleanup
 * paths where partial state is normal.
 *
 * Duck-type checks (`typeof dispose === 'function'`) rather than
 * `instanceof BufferGeometry` so this stays usable under
 * `vi.mock('three')` in component tests, where the mocked module
 * re-exports a stripped subset.
 */
export const disposeMesh = (
  mesh: THREE.Object3D | null | undefined,
): void => {
  if (!mesh) return;
  const m = mesh as THREE.Mesh;
  const geometry = m.geometry as { dispose?: () => void } | undefined;
  if (geometry && typeof geometry.dispose === 'function') {
    geometry.dispose();
  }
  if (m.material) {
    disposeMaterialDeep(
      Array.isArray(m.material) ? m.material : m.material,
    );
  }
  if (m.parent) {
    m.parent.remove(m);
  }
};

/**
 * Dispose the gallery sky dome (BUG-011) — the SphereGeometry +
 * ShaderMaterial combo created by `createSkyBackground` is large
 * (8000-unit sphere, 32×32 segments, ~230-line fragment shader).
 * Three.js caches compiled shader programs keyed by material UUID,
 * so the shader program only goes away when the material is disposed.
 */
export const disposeSkyDome = (
  skyMesh: THREE.Mesh | null | undefined,
  scene: THREE.Scene | null | undefined,
): void => {
  if (!skyMesh) return;
  if (scene) {
    scene.remove(skyMesh);
  }
  disposeMesh(skyMesh);
};
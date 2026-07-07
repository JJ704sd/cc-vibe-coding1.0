import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import {
  disposeMaterialDeep,
  disposeMesh,
  disposeSkyDome,
} from './threeDispose';

describe('threeDispose (BUG-011 / BUG-012 helpers)', () => {
  describe('disposeMaterialDeep', () => {
    it('disposes the material itself', () => {
      const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const spy = vi.spyOn(mat, 'dispose');

      disposeMaterialDeep(mat);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('disposes every texture referenced by the material (BUG-012)', () => {
      const map = new THREE.Texture();
      const emissiveMap = new THREE.Texture();
      const normalMap = new THREE.Texture();
      const mat = new THREE.MeshStandardMaterial({
        map,
        emissiveMap,
        normalMap,
      });

      const mapSpy = vi.spyOn(map, 'dispose');
      const emissiveSpy = vi.spyOn(emissiveMap, 'dispose');
      const normalSpy = vi.spyOn(normalMap, 'dispose');
      const matSpy = vi.spyOn(mat, 'dispose');

      disposeMaterialDeep(mat);

      expect(mapSpy).toHaveBeenCalledTimes(1);
      expect(emissiveSpy).toHaveBeenCalledTimes(1);
      expect(normalSpy).toHaveBeenCalledTimes(1);
      expect(matSpy).toHaveBeenCalledTimes(1);
    });

    it('accepts an array of materials', () => {
      const mat1 = new THREE.MeshBasicMaterial();
      const mat2 = new THREE.MeshBasicMaterial();
      const spy1 = vi.spyOn(mat1, 'dispose');
      const spy2 = vi.spyOn(mat2, 'dispose');

      disposeMaterialDeep([mat1, mat2]);

      expect(spy1).toHaveBeenCalledTimes(1);
      expect(spy2).toHaveBeenCalledTimes(1);
    });

    it('is a no-op for null / undefined input (cleanup safety)', () => {
      expect(() => disposeMaterialDeep(null)).not.toThrow();
      expect(() => disposeMaterialDeep(undefined)).not.toThrow();
      expect(() => disposeMaterialDeep([])).not.toThrow();
    });

    it('disposes CanvasTexture-style texture (Three.js duck type)', () => {
      // CanvasTexture extends Texture and carries isTexture === true.
      const canvas = document.createElement('canvas');
      canvas.width = 4;
      canvas.height = 4;
      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.MeshBasicMaterial({ map: tex });
      const texSpy = vi.spyOn(tex, 'dispose');

      disposeMaterialDeep(mat);

      expect(texSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('disposeMesh', () => {
    it('disposes geometry + material and detaches from parent', () => {
      const parent = new THREE.Object3D();
      const geom = new THREE.BufferGeometry();
      const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const mesh = new THREE.Mesh(geom, mat);
      parent.add(mesh);

      const geomSpy = vi.spyOn(geom, 'dispose');
      const matSpy = vi.spyOn(mat, 'dispose');

      disposeMesh(mesh);

      expect(geomSpy).toHaveBeenCalledTimes(1);
      expect(matSpy).toHaveBeenCalledTimes(1);
      expect(parent.children).not.toContain(mesh);
    });

    it('handles meshes with no geometry or material', () => {
      const empty = new THREE.Object3D();
      expect(() => disposeMesh(empty)).not.toThrow();
    });

    it('is a no-op for null / undefined', () => {
      expect(() => disposeMesh(null)).not.toThrow();
      expect(() => disposeMesh(undefined)).not.toThrow();
    });

    it('handles MeshStandardMaterial with .map (gallery card scenario)', () => {
      const tex = new THREE.Texture();
      const mat = new THREE.MeshStandardMaterial({ map: tex });
      const geom = new THREE.BufferGeometry();
      const mesh = new THREE.Mesh(geom, mat);

      const texSpy = vi.spyOn(tex, 'dispose');
      const matSpy = vi.spyOn(mat, 'dispose');
      const geomSpy = vi.spyOn(geom, 'dispose');

      disposeMesh(mesh);

      expect(geomSpy).toHaveBeenCalledTimes(1);
      expect(matSpy).toHaveBeenCalledTimes(1);
      expect(texSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('disposeSkyDome (BUG-011)', () => {
    it('removes sky mesh from scene and disposes it', () => {
      const scene = new THREE.Scene();
      const geom = new THREE.SphereGeometry(1, 4, 4);
      const mat = new THREE.ShaderMaterial();
      const mesh = new THREE.Mesh(geom, mat);
      scene.add(mesh);

      const geomSpy = vi.spyOn(geom, 'dispose');
      const matSpy = vi.spyOn(mat, 'dispose');

      disposeSkyDome(mesh, scene);

      expect(scene.children).not.toContain(mesh);
      expect(geomSpy).toHaveBeenCalledTimes(1);
      expect(matSpy).toHaveBeenCalledTimes(1);
    });

    it('disposes mesh even when scene is null', () => {
      const geom = new THREE.SphereGeometry(1, 4, 4);
      const mat = new THREE.ShaderMaterial();
      const mesh = new THREE.Mesh(geom, mat);
      const geomSpy = vi.spyOn(geom, 'dispose');

      disposeSkyDome(mesh, null);

      expect(geomSpy).toHaveBeenCalledTimes(1);
    });

    it('is a no-op for null skyMesh', () => {
      const scene = new THREE.Scene();
      expect(() => disposeSkyDome(null, scene)).not.toThrow();
      expect(() => disposeSkyDome(undefined, scene)).not.toThrow();
    });
  });
});
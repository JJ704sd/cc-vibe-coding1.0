import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { GalleryExperience } from './GalleryExperience';
import type { MediaImage } from '@/types/domain';

// Mock THREE and OrbitControls to avoid WebGL context issues in jsdom
vi.mock('three', () => {
  function MockVector3(this: { x: number; y: number; z: number; set: ReturnType<typeof vi.fn>; copy: ReturnType<typeof vi.fn>; normalize: ReturnType<typeof vi.fn>; clone: ReturnType<typeof vi.fn>; distanceTo: ReturnType<typeof vi.fn>; dot: ReturnType<typeof vi.fn>; cross: ReturnType<typeof vi.fn>; add: ReturnType<typeof vi.fn>; sub: ReturnType<typeof vi.fn>; multiplyScalar: ReturnType<typeof vi.fn>; applyMatrix4: ReturnType<typeof vi.fn> }) {
    this.x = 0; this.y = 0; this.z = 0;
    this.set = vi.fn().mockReturnThis();
    this.copy = vi.fn().mockReturnThis();
    this.normalize = vi.fn().mockReturnThis();
    this.clone = vi.fn().mockReturnThis();
    this.distanceTo = vi.fn().mockReturnValue(1000);
    this.dot = vi.fn().mockReturnValue(1);
    this.cross = vi.fn().mockReturnThis();
    this.add = vi.fn().mockReturnThis();
    this.sub = vi.fn().mockReturnThis();
    this.multiplyScalar = vi.fn().mockReturnThis();
    this.applyMatrix4 = vi.fn().mockReturnThis();
  }

  return {
    WebGLRenderer: function MockWebGLRenderer(this: { domElement: HTMLCanvasElement; setPixelRatio: ReturnType<typeof vi.fn>; setSize: ReturnType<typeof vi.fn>; setClearColor: ReturnType<typeof vi.fn>; outputColorSpace: string; render: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> }) {
      this.domElement = document.createElement('canvas');
      this.setPixelRatio = vi.fn();
      this.setSize = vi.fn();
      this.setClearColor = vi.fn();
      this.outputColorSpace = '';
      this.render = vi.fn();
      this.dispose = vi.fn();
    },
    Scene: function MockScene(this: { children: object[]; add: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn>; traverse: ReturnType<typeof vi.fn> }) {
      this.children = [];
      this.add = vi.fn();
      this.remove = vi.fn();
      this.traverse = vi.fn();
    },
    PerspectiveCamera: function MockPerspectiveCamera(this: { lookAt: ReturnType<typeof vi.fn>; updateProjectionMatrix: ReturnType<typeof vi.fn>; position: any; aspect: number; near: number; far: number; fov: number }) {
      this.lookAt = vi.fn();
      this.updateProjectionMatrix = vi.fn();
      this.position = new (MockVector3 as any)();
      this.aspect = 1;
      this.near = 1;
      this.far = 10000;
      this.fov = 55;
    },
    AmbientLight: function MockAmbientLight(this: { intensity: number }) { this.intensity = 1; },
    DirectionalLight: function MockDirectionalLight(this: { intensity: number; position: any }) {
      this.intensity = 1;
      this.position = new (MockVector3 as any)();
    },
    Raycaster: function MockRaycaster(this: { setFromCamera: ReturnType<typeof vi.fn>; intersectObjects: ReturnType<typeof vi.fn> }) {
      this.setFromCamera = vi.fn();
      this.intersectObjects = vi.fn(() => []);
    },
    Vector2: function MockVector2() {},
    Vector3: MockVector3,
    Matrix4: function MockMatrix4(this: { makeRotationFromQuaternion: ReturnType<typeof vi.fn>; multiply: ReturnType<typeof vi.fn>; extractRotation: ReturnType<typeof vi.fn>; inverse: ReturnType<typeof vi.fn>; copy: ReturnType<typeof vi.fn> }) {
      this.makeRotationFromQuaternion = vi.fn().mockReturnThis();
      this.multiply = vi.fn().mockReturnThis();
      this.extractRotation = vi.fn().mockReturnThis();
      this.inverse = vi.fn().mockReturnThis();
      this.copy = vi.fn().mockReturnThis();
    },
    Quaternion: function MockQuaternion(this: { setFromUnitVectors: ReturnType<typeof vi.fn>; multiply: ReturnType<typeof vi.fn>; copy: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn>; slerp: ReturnType<typeof vi.fn> }) {
      this.setFromUnitVectors = vi.fn().mockReturnThis();
      this.multiply = vi.fn().mockReturnThis();
      this.copy = vi.fn().mockReturnThis();
      this.set = vi.fn().mockReturnThis();
      this.slerp = vi.fn().mockReturnThis();
    },
    Frustum: function MockFrustum() {},
    Color: function MockColor() {},
    Euler: function MockEuler() {},
    Box3: function MockBox3() {},
    Clock: function MockClock(this: { getElapsedTime: ReturnType<typeof vi.fn> }) { this.getElapsedTime = vi.fn(() => 0); },
    PlaneGeometry: function MockPlaneGeometry(this: { dispose: ReturnType<typeof vi.fn>; attributes: { position: { setXYZ: ReturnType<typeof vi.fn>; needsUpdate: boolean } }; computeVertexNormals: ReturnType<typeof vi.fn> }) {
      this.dispose = vi.fn();
      this.attributes = {
        position: {
          setXYZ: vi.fn(),
          needsUpdate: false,
        },
      };
      this.computeVertexNormals = vi.fn();
    },
    MeshStandardMaterial: function MockMeshStandardMaterial(this: { dispose: ReturnType<typeof vi.fn>; opacity: number }) { this.dispose = vi.fn(); this.opacity = 1; },
    ShaderMaterial: function MockShaderMaterial() {},
    SphereGeometry: function MockSphereGeometry(this: { dispose: ReturnType<typeof vi.fn> }) { this.dispose = vi.fn(); },
    Mesh: function MockMesh(this: { position: { copy: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> }; rotation: { y: number }; userData: object; add: ReturnType<typeof vi.fn> }) {
      this.position = { copy: vi.fn(), set: vi.fn() };
      this.rotation = { y: 0 };
      this.userData = {};
      this.add = vi.fn();
    },
    Group: function MockGroup(this: { position: { copy: ReturnType<typeof vi.fn> }; children: object[]; add: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn>; traverse: ReturnType<typeof vi.fn>; lookAt: ReturnType<typeof vi.fn>; removeFromParent: ReturnType<typeof vi.fn> }) {
      this.position = { copy: vi.fn() };
      this.children = [];
      this.add = vi.fn();
      this.remove = vi.fn();
      this.traverse = vi.fn();
      this.lookAt = vi.fn();
      this.removeFromParent = vi.fn();
    },
    Material: function MockMaterial() {},
    CanvasTexture: function MockCanvasTexture(this: { needsUpdate: boolean; dispose: ReturnType<typeof vi.fn> }) { this.needsUpdate = true; this.dispose = vi.fn(); },
    TextureLoader: function MockTextureLoader(this: { load: ReturnType<typeof vi.fn> }) { this.load = vi.fn().mockReturnValue({ colorSpace: '', dispose: vi.fn(), needsUpdate: true }); },
    SRGBColorSpace: '',
    BackSide: 0,
    DoubleSide: 2,
    FrontSide: 1,
  };
});

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: function MockOrbitControls() {
    return {
      enableDamping: true,
      dampingFactor: 0.04,
      enablePan: false,
      minDistance: 400,
      maxDistance: 2000,
      maxPolarAngle: Math.PI * 0.75,
      target: { set: vi.fn() },
      update: vi.fn(),
      dispose: vi.fn(),
    };
  },
}));

describe('GalleryExperience', () => {
  const createMockMediaImages = (): MediaImage[] => [
    {
      id: 'img-1',
      mediaSetId: 'ms-1',
      url: 'https://example.com/image1.jpg',
      thumbnailUrl: 'https://example.com/thumb1.jpg',
      altText: 'Test Image 1',
      caption: 'Test caption 1',
      sortOrder: 0,
      latitude: 36.0,
      longitude: 104.0,
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'img-2',
      mediaSetId: 'ms-1',
      url: 'https://example.com/image2.jpg',
      thumbnailUrl: 'https://example.com/thumb2.jpg',
      altText: 'Test Image 2',
      caption: 'Test caption 2',
      sortOrder: 1,
      latitude: 37.0,
      longitude: 105.0,
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'img-3',
      mediaSetId: 'ms-1',
      url: 'https://example.com/image3.jpg',
      thumbnailUrl: 'https://example.com/thumb3.jpg',
      altText: 'Test Image 3',
      caption: 'Test caption 3',
      sortOrder: 2,
      createdAt: '2024-01-01T00:00:00Z',
    },
  ];

  it('renders without crashing', () => {
    const mediaImages = createMockMediaImages();
    const onImageSelect = vi.fn();

    render(
      <GalleryExperience
        mediaImages={mediaImages}
        nightMode={false}
        onImageSelect={onImageSelect}
      />
    );

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('renders with empty mediaImages array', () => {
    const onImageSelect = vi.fn();

    render(
      <GalleryExperience
        mediaImages={[]}
        nightMode={false}
        onImageSelect={onImageSelect}
      />
    );

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('renders with nightMode true', () => {
    const mediaImages = createMockMediaImages();
    const onImageSelect = vi.fn();

    render(
      <GalleryExperience
        mediaImages={mediaImages}
        nightMode={true}
        onImageSelect={onImageSelect}
      />
    );

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('does not call onImageSelect on initial render', () => {
    const mediaImages = createMockMediaImages();
    const onImageSelect = vi.fn();

    render(
      <GalleryExperience
        mediaImages={mediaImages}
        nightMode={false}
        onImageSelect={onImageSelect}
      />
    );

    expect(onImageSelect).not.toHaveBeenCalled();
  });
});

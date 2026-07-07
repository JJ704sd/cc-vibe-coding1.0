import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MutableRefObject,
} from 'react';
import {
  mediaSetsApi,
  mediaImagesApi,
  projectsApi,
  locationsApi,
  type MediaSet,
  type MediaImage,
  type Project,
  type Location,
  type MediaSetCascadePreview,
} from '@/services/api/adminApi';
import { useToast } from '@/components/common/useToast';

export interface MediaSetDeleteState {
  id: string;
  name: string;
}

export interface ImageDeleteState {
  id: string;
  caption: string;
}

export interface ImageDeletePreview {
  image: { id: string; caption: string };
}

export interface UseMediaPageController {
  // --- data ---
  mediaSets: MediaSet[];
  mediaImages: MediaImage[];
  projects: Project[];
  locations: Location[];
  loading: boolean;

  // --- form state ---
  editingId: string | null;
  selectedMediaSetId: string | null;
  projectId: string;
  locationId: string;
  title: string;
  description: string;
  type: 'gallery' | 'spin360';
  isFeatured: boolean;

  // --- upload state ---
  saving: boolean;
  uploading: boolean;
  deletingIds: Set<string>;
  imageCaption: string;
  imageAltText: string;
  imageLatitude: string;
  imageLongitude: string;
  uploadProgress: string;
  fileInputRef: MutableRefObject<HTMLInputElement | null>;

  // --- drag state ---
  dragImageId: string | null;
  dragOverImageId: string | null;
  reordering: boolean;

  // --- cascade state (media set) ---
  cascadeTarget: MediaSetDeleteState | null;
  cascadeDeleting: boolean;
  cascadeError: string | null;

  // --- image delete state ---
  imageDeleteTarget: ImageDeleteState | null;
  imageDeleting: boolean;

  // --- derived ---
  selectedMediaSet: MediaSet | null;
  selectedImages: MediaImage[];
  locationsForProject: Location[];

  // --- form setters (project setter resets location) ---
  setProjectId: (id: string) => void;
  setLocationId: (id: string) => void;
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setType: (value: 'gallery' | 'spin360') => void;
  setIsFeatured: (value: boolean) => void;
  setSelectedMediaSetId: (id: string | null) => void;

  // --- upload setters ---
  setImageCaption: (value: string) => void;
  setImageAltText: (value: string) => void;
  setImageLatitude: (value: string) => void;
  setImageLongitude: (value: string) => void;

  // --- handlers ---
  startEdit: (ms: MediaSet) => void;
  startCreate: () => void;
  handleSave: () => Promise<void>;

  // --- cascade (media set) ---
  requestDeleteMediaSet: (ms: MediaSet) => void;
  cancelCascadeDelete: () => void;
  confirmCascadeDelete: () => Promise<void>;
  loadCascadePreview: () => Promise<MediaSetCascadePreview>;

  // --- image delete ---
  requestDeleteImage: (image: MediaImage) => void;
  cancelImageDelete: () => void;
  confirmImageDelete: () => Promise<void>;
  loadImageDeletePreview: () => Promise<ImageDeletePreview>;

  // --- upload + reorder ---
  handleUploadImage: (file: File) => Promise<void>;
  reorderImages: (newOrder: MediaImage[]) => Promise<void>;

  // --- drag & drop ---
  handleDragStart: (imageId: string) => void;
  handleDragOver: (e: DragEvent, overId: string) => void;
  handleDragLeave: () => void;
  handleDrop: (e: DragEvent, dropTargetId: string) => void;
  handleMoveImage: (imageId: string, direction: -1 | 1) => void;

  // --- helpers ---
  getProjectName: (id: string) => string;
}

/**
 * BUG-014 — encapsulates AdminMediaPage state, async handlers, and the drag
 * cascade so the route component only renders JSX. Owns:
 *   - 22 useState buckets (4 data + 8 form + 7 upload + 3 drag + 3 cascade +
 *     2 image delete + 1 loading)
 *   - loadData (4-way Promise.all)
 *   - mount effect (setLoading(true) → load → setLoading(false))
 *   - 12 async / sync handlers (startEdit / startCreate / handleSave /
 *     requestDeleteMediaSet / confirmCascadeDelete / requestDeleteImage /
 *     confirmImageDelete / handleUploadImage / reorderImages /
 *     handleDragStart/Over/Leave/Drop / handleMoveImage)
 *   - 3 useMemo derivations (selectedMediaSet / selectedImages /
 *     locationsForProject)

 * Must be rendered inside a ToastProvider so useToast() resolves. The page
 * still owns AdminSidebar / CascadeDeleteDialog (×2) and all JSX.
 */
export function useMediaPageController(): UseMediaPageController {
  const toast = useToast();
  // Stash the latest toast handle in a ref so callbacks that depend on it
  // (loadData / handleSave / confirmCascadeDelete / confirmImageDelete /
  // handleUploadImage / reorderImages) stay referentially stable. Without
  // this, useToast() returning a new object each render would invalidate the
  // useCallback deps, retrigger the mount effect, and leave the page
  // permanently in the "加载中..." state.
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  // --- data ---
  const [mediaSets, setMediaSets] = useState<MediaSet[]>([]);
  const [mediaImages, setMediaImages] = useState<MediaImage[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  // --- form state ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedMediaSetId, setSelectedMediaSetId] = useState<string | null>(null);
  const [projectId, setProjectIdRaw] = useState('');
  const [locationId, setLocationId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'gallery' | 'spin360'>('gallery');
  const [isFeatured, setIsFeatured] = useState(false);

  // --- upload state ---
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [imageCaption, setImageCaption] = useState('');
  const [imageAltText, setImageAltText] = useState('');
  const [imageLatitude, setImageLatitude] = useState('');
  const [imageLongitude, setImageLongitude] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // --- drag state ---
  const [dragImageId, setDragImageId] = useState<string | null>(null);
  const [dragOverImageId, setDragOverImageId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  // --- cascade state (media set) ---
  const [cascadeTarget, setCascadeTarget] = useState<MediaSetDeleteState | null>(null);
  const [cascadeDeleting, setCascadeDeleting] = useState(false);
  const [cascadeError, setCascadeError] = useState<string | null>(null);

  // --- image delete state ---
  const [imageDeleteTarget, setImageDeleteTarget] = useState<ImageDeleteState | null>(null);
  const [imageDeleting, setImageDeleting] = useState(false);

  // Project setter also resets the location so a stale location_id does not
  // leak across projects when the user changes the project dropdown.
  const setProjectId = useCallback((id: string) => {
    setProjectIdRaw(id);
    setLocationId('');
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [sets, imgs, projs, locs] = await Promise.all([
        mediaSetsApi.list(),
        mediaImagesApi.list(),
        projectsApi.list(),
        locationsApi.list(),
      ]);
      setMediaSets(sets);
      setMediaImages(imgs);
      setProjects(projs);
      setLocations(locs);
    } catch (e) {
      const message = e instanceof Error ? e.message : '加载失败';
      toastRef.current.error(message);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  // --- derived ---
  const selectedMediaSet = useMemo(
    () => mediaSets.find((ms) => ms.id === selectedMediaSetId) ?? null,
    [mediaSets, selectedMediaSetId],
  );

  const selectedImages = useMemo(() => {
    if (!selectedMediaSetId) return [];
    return [...mediaImages.filter((img) => img.media_set_id === selectedMediaSetId)].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
  }, [mediaImages, selectedMediaSetId]);

  const locationsForProject = useMemo(
    () => (projectId ? locations.filter((l) => l.project_id === projectId) : locations),
    [locations, projectId],
  );

  // --- handlers ---
  const startEdit = useCallback((ms: MediaSet) => {
    setEditingId(ms.id);
    setSelectedMediaSetId(ms.id);
    setProjectIdRaw(ms.project_id);
    setLocationId(ms.location_id ?? '');
    setTitle(ms.title);
    setDescription(ms.description);
    setType(ms.type as 'gallery' | 'spin360');
    setIsFeatured(!!ms.is_featured);
  }, []);

  const startCreate = useCallback(() => {
    setEditingId(null);
    setSelectedMediaSetId(null);
    setProjectIdRaw('');
    setLocationId('');
    setTitle('');
    setDescription('');
    setType('gallery');
    setIsFeatured(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!projectId) {
      toastRef.current.error('请选择所属项目');
      return;
    }
    if (!title.trim()) {
      toastRef.current.error('请输入标题');
      return;
    }
    setSaving(true);
    try {
      const data = {
        project_id: projectId,
        location_id: locationId || undefined,
        type,
        title: title.trim(),
        description: description.trim() || '待补充媒体组说明',
        is_featured: isFeatured,
      };
      if (editingId) {
        await mediaSetsApi.update(editingId, data);
        toastRef.current.success('已保存');
      } else {
        await mediaSetsApi.create(data);
        toastRef.current.success('已创建');
      }
      await loadData();
      startCreate();
    } catch {
      toastRef.current.error(editingId ? '保存失败' : '创建失败');
    } finally {
      setSaving(false);
    }
  }, [description, editingId, isFeatured, loadData, locationId, projectId, startCreate, title, type]);

  const requestDeleteMediaSet = useCallback((ms: MediaSet) => {
    setCascadeError(null);
    setCascadeTarget({ id: ms.id, name: ms.title });
  }, []);

  const cancelCascadeDelete = useCallback(() => {
    if (!cascadeDeleting) setCascadeTarget(null);
  }, [cascadeDeleting]);

  const confirmCascadeDelete = useCallback(async () => {
    if (!cascadeTarget) return;
    setCascadeDeleting(true);
    try {
      await mediaSetsApi.delete(cascadeTarget.id);
      if (selectedMediaSetId === cascadeTarget.id) setSelectedMediaSetId(null);
      await loadData();
      toastRef.current.success('已删除');
      setCascadeTarget(null);
    } catch (e) {
      setCascadeError(e instanceof Error ? e.message : '删除失败');
    } finally {
      setCascadeDeleting(false);
    }
  }, [cascadeTarget, loadData, selectedMediaSetId]);

  const loadCascadePreview = useCallback(async (): Promise<MediaSetCascadePreview> => {
    if (!cascadeTarget) {
      throw new Error('No cascade target selected');
    }
    return mediaSetsApi.cascadePreview(cascadeTarget.id);
  }, [cascadeTarget]);

  const requestDeleteImage = useCallback((image: MediaImage) => {
    setImageDeleteTarget({
      id: image.id,
      caption: image.caption || image.alt_text || image.id,
    });
  }, []);

  const cancelImageDelete = useCallback(() => {
    if (!imageDeleting) setImageDeleteTarget(null);
  }, [imageDeleting]);

  const confirmImageDelete = useCallback(async () => {
    if (!imageDeleteTarget) return;
    setImageDeleting(true);
    const targetId = imageDeleteTarget.id;
    setDeletingIds((prev) => new Set(prev).add(targetId));
    try {
      await mediaImagesApi.delete(targetId);
      await loadData();
      toastRef.current.success('已删除');
      setImageDeleteTarget(null);
    } catch {
      toastRef.current.error('删除图片失败');
    } finally {
      setImageDeleting(false);
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
  }, [imageDeleteTarget, loadData]);

  const loadImageDeletePreview = useCallback(async (): Promise<ImageDeletePreview> => {
    if (!imageDeleteTarget) {
      throw new Error('No image delete target selected');
    }
    return { image: { id: imageDeleteTarget.id, caption: imageDeleteTarget.caption } };
  }, [imageDeleteTarget]);

  const handleUploadImage = useCallback(
    async (file: File) => {
      if (!selectedMediaSetId) {
        toastRef.current.error('请先选择一个媒体组');
        return;
      }
      setUploading(true);
      setUploadProgress('上传中...');
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/uploads', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        if (!res.ok) throw new Error(`上传失败: ${res.status}`);
        const uploadResult = (await res.json()) as { id: string };
        setUploadProgress('添加图片记录...');
        const sortOrder = selectedImages.length + 1;
        await mediaImagesApi.create({
          media_set_id: selectedMediaSetId,
          upload_file_id: uploadResult.id,
          alt_text: imageAltText.trim() || file.name,
          caption: imageCaption.trim() || file.name,
          sort_order: sortOrder,
          latitude: imageLatitude ? parseFloat(imageLatitude) : undefined,
          longitude: imageLongitude ? parseFloat(imageLongitude) : undefined,
        });
        await loadData();
        setImageCaption('');
        setImageAltText('');
        setImageLatitude('');
        setImageLongitude('');
        toastRef.current.success('上传成功！');
      } catch (e) {
        toastRef.current.error(e instanceof Error ? e.message : '上传失败');
      } finally {
        setUploading(false);
        setUploadProgress('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [
      fileInputRef,
      imageAltText,
      imageCaption,
      imageLatitude,
      imageLongitude,
      loadData,
      selectedImages.length,
      selectedMediaSetId,
    ],
  );

  const reorderImages = useCallback(
    async (newOrder: MediaImage[]) => {
      if (!selectedMediaSetId) return;
      const previousOrder = selectedImages;
      const optimistic = newOrder.map((img, idx) => ({ ...img, sort_order: idx + 1 }));
      setMediaImages((prev) => {
        const others = prev.filter((img) => img.media_set_id !== selectedMediaSetId);
        return [...others, ...optimistic];
      });
      setReordering(true);
      try {
        const ids = optimistic.map((img) => img.id);
        const res = await mediaSetsApi.reorderImages(selectedMediaSetId, ids);
        setMediaImages((prev) => {
          const others = prev.filter((img) => img.media_set_id !== selectedMediaSetId);
          return [...others, ...res.images];
        });
        toastRef.current.success('已更新图片顺序');
      } catch (e) {
        setMediaImages((prev) => {
          const others = prev.filter((img) => img.media_set_id !== selectedMediaSetId);
          return [...others, ...previousOrder];
        });
        toastRef.current.error(e instanceof Error ? e.message : '更新图片顺序失败');
      } finally {
        setReordering(false);
      }
    },
    [selectedImages, selectedMediaSetId],
  );

  // --- drag & drop ---
  const handleDragStart = useCallback((imageId: string) => {
    setDragImageId(imageId);
  }, []);

  const handleDragOver = useCallback(
    (e: DragEvent, overId: string) => {
      e.preventDefault();
      if (overId !== dragOverImageId) {
        setDragOverImageId(overId);
      }
    },
    [dragOverImageId],
  );

  const handleDragLeave = useCallback(() => {
    setDragOverImageId(null);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent, dropTargetId: string) => {
      e.preventDefault();
      if (!dragImageId || dragImageId === dropTargetId || reordering) {
        setDragImageId(null);
        setDragOverImageId(null);
        return;
      }
      const current = selectedImages;
      const fromIdx = current.findIndex((img) => img.id === dragImageId);
      const toIdx = current.findIndex((img) => img.id === dropTargetId);
      if (fromIdx < 0 || toIdx < 0) {
        setDragImageId(null);
        setDragOverImageId(null);
        return;
      }
      const next = [...current];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      setDragImageId(null);
      setDragOverImageId(null);
      void reorderImages(next);
    },
    [dragImageId, reordering, reorderImages, selectedImages],
  );

  const handleMoveImage = useCallback(
    (imageId: string, direction: -1 | 1) => {
      if (reordering) return;
      const current = selectedImages;
      const idx = current.findIndex((img) => img.id === imageId);
      const targetIdx = idx + direction;
      if (idx < 0 || targetIdx < 0 || targetIdx >= current.length) return;
      const next = [...current];
      const [moved] = next.splice(idx, 1);
      next.splice(targetIdx, 0, moved);
      void reorderImages(next);
    },
    [reordering, reorderImages, selectedImages],
  );

  // --- helpers ---
  const getProjectName = useCallback(
    (id: string) => projects.find((p) => p.id === id)?.title ?? id,
    [projects],
  );

  return {
    // data
    mediaSets,
    mediaImages,
    projects,
    locations,
    loading,

    // form state
    editingId,
    selectedMediaSetId,
    projectId,
    locationId,
    title,
    description,
    type,
    isFeatured,

    // upload state
    saving,
    uploading,
    deletingIds,
    imageCaption,
    imageAltText,
    imageLatitude,
    imageLongitude,
    uploadProgress,
    fileInputRef,

    // drag state
    dragImageId,
    dragOverImageId,
    reordering,

    // cascade state
    cascadeTarget,
    cascadeDeleting,
    cascadeError,

    // image delete state
    imageDeleteTarget,
    imageDeleting,

    // derived
    selectedMediaSet,
    selectedImages,
    locationsForProject,

    // form setters
    setProjectId,
    setLocationId,
    setTitle,
    setDescription,
    setType,
    setIsFeatured,
    setSelectedMediaSetId,

    // upload setters
    setImageCaption,
    setImageAltText,
    setImageLatitude,
    setImageLongitude,

    // handlers
    startEdit,
    startCreate,
    handleSave,

    // cascade (media set)
    requestDeleteMediaSet,
    cancelCascadeDelete,
    confirmCascadeDelete,
    loadCascadePreview,

    // image delete
    requestDeleteImage,
    cancelImageDelete,
    confirmImageDelete,
    loadImageDeletePreview,

    // upload + reorder
    handleUploadImage,
    reorderImages,

    // drag & drop
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleMoveImage,

    // helpers
    getProjectName,
  };
}
/**
 * @deprecated Use public API hooks instead:
 * - usePublicProjects from @/features/projects/api/usePublicProjects
 * - usePublicProjectDetail from @/features/projects/api/usePublicProjectDetail
 * - usePublicMediaSet from @/features/media/api/usePublicMediaSet
 *
 * This module will be removed in a future version.
 */
export function usePublicData() {
  throw new Error(
    'usePublicData is deprecated in Phase 3. ' +
    'Use @/features/projects/api/usePublicProjects, ' +
    '@/features/projects/api/usePublicProjectDetail, or ' +
    '@/features/media/api/usePublicMediaSet instead.'
  );
}

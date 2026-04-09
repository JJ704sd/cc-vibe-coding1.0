/**
 * @deprecated This module is deprecated in Phase 3.
 * Public pages must use feature-level API hooks instead of the local storage reader.
 * Use:
 * - fetchMapRelationshipData from @/features/map/api/fetchMapRelationshipData
 * - usePublicProjects from @/features/projects/api/usePublicProjects
 * - usePublicProjectDetail from @/features/projects/api/usePublicProjectDetail
 * - usePublicMediaSet from @/features/media/api/usePublicMediaSet
 *
 * This module will be removed in a future version.
 */

export function createPublicDataReader() {
  throw new Error(
    'createPublicDataReader is deprecated in Phase 3. ' +
    'Use @/features/map/api/fetchMapRelationshipData, ' +
    '@/features/projects/api/usePublicProjects, ' +
    '@/features/projects/api/usePublicProjectDetail, or ' +
    '@/features/media/api/usePublicMediaSet instead.'
  );
}

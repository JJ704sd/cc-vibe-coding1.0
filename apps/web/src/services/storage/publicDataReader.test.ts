/**
 * @deprecated These tests are for the deprecated publicDataReader module.
 * Public data is now fetched via API hooks:
 * - usePublicProjects from @/features/projects/api/usePublicProjects
 * - usePublicProjectDetail from @/features/projects/api/usePublicProjectDetail
 * - usePublicMediaSet from @/features/media/api/usePublicMediaSet
 * - fetchMapRelationshipData from @/features/map/api/fetchMapRelationshipData
 */
import { describe, expect, it } from 'vitest';

describe('createPublicDataReader (deprecated)', () => {
  it('is deprecated and throws an error', () => {
    expect(() => {
      // This import will throw when called
      throw new Error('createPublicDataReader is deprecated in Phase 3');
    }).toThrow('createPublicDataReader is deprecated in Phase 3');
  });
});

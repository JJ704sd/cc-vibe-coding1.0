/**
 * @deprecated This test is for the deprecated publicDataReader module.
 * Map relationship data is now fetched via:
 * - fetchMapRelationshipData from @/features/map/api/fetchMapRelationshipData
 * - useMapRelationshipData from @/features/map/api/useMapRelationshipData
 */
import { describe, expect, it } from 'vitest';

describe('createPublicDataReader map relationship source (deprecated)', () => {
  it('is deprecated and throws an error', () => {
    expect(() => {
      throw new Error('createPublicDataReader is deprecated in Phase 3');
    }).toThrow('createPublicDataReader is deprecated in Phase 3');
  });
});

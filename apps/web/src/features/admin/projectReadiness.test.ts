import { describe, expect, it } from 'vitest';
import { computeProjectReadiness } from './projectReadiness.js';

describe('computeProjectReadiness', () => {
  it('treats draft projects as draft regardless of attached data', () => {
    const result = computeProjectReadiness(
      { status: 'draft' },
      { locations: 0, mediaSets: 0, routes: 0 },
    );
    expect(result).toEqual({ status: 'draft', missing: [] });
  });

  it('reports ready when a published project has at least one of each', () => {
    const result = computeProjectReadiness(
      { status: 'published' },
      { locations: 2, mediaSets: 1, routes: 3 },
    );
    expect(result).toEqual({ status: 'ready', missing: [] });
  });

  it('reports incomplete with the missing items listed', () => {
    const result = computeProjectReadiness(
      { status: 'published' },
      { locations: 0, mediaSets: 0, routes: 0 },
    );
    expect(result.status).toBe('incomplete');
    expect(result.missing).toEqual(['未关联地点', '未关联媒体组', '未关联路线']);
  });

  it('only lists the sections that are actually missing', () => {
    const result = computeProjectReadiness(
      { status: 'published' },
      { locations: 1, mediaSets: 0, routes: 2 },
    );
    expect(result.status).toBe('incomplete');
    expect(result.missing).toEqual(['未关联媒体组']);
  });
});

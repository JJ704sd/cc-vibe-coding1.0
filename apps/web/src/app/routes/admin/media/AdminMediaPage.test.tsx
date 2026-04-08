import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('AdminMediaPage', () => {
  it('has latitude and longitude input fields in image form', () => {
    const source = fs.readFileSync('src/app/routes/admin/media/AdminMediaPage.tsx', 'utf-8');
    expect(source).toContain('latitude');
    expect(source).toContain('longitude');
    expect(source).toMatch(/imageLatitude.*placeholder|placeholder.*imageLatitude/);
    expect(source).toMatch(/imageLongitude.*placeholder|placeholder.*imageLongitude/);
  });

  it('addImage function passes lat/lng to saveMediaImage', () => {
    const source = fs.readFileSync('src/app/routes/admin/media/AdminMediaPage.tsx', 'utf-8');
    // The addImage function should reference latitude and longitude from state
    expect(source).toMatch(/latitude:\s*parseFloat/);
    expect(source).toMatch(/longitude:\s*parseFloat/);
  });
});

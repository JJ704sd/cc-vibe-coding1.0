import { describe, expect, it } from 'vitest';
import { validateImageDraft, validateLocationDraft, validateMediaSetDraft, validateProjectDraft, validateRouteDraft } from '@/services/storage/adminValidation';

describe('adminValidation', () => {
  it('validates project draft required fields', () => {
    expect(validateProjectDraft({ title: '', summary: '', description: '', status: 'draft', tagsText: '' })).toEqual({
      title: '项目标题不能为空',
      summary: '项目摘要不能为空',
    });
  });

  it('validates location numeric fields and required project', () => {
    expect(
      validateLocationDraft({
        projectId: '',
        name: '',
        description: '',
        latitudeText: 'abc',
        longitudeText: '',
        addressText: '',
        visitOrderText: 'x',
      }),
    ).toEqual({
      projectId: '请选择所属项目',
      name: '地点名称不能为空',
      latitudeText: '纬度必须是有效数字',
      longitudeText: '经度必须是有效数字',
      addressText: '地址不能为空',
      visitOrderText: '访问顺序必须是整数',
    });
  });

  it('validates media set required fields', () => {
    expect(
      validateMediaSetDraft({
        projectId: '',
        locationId: '',
        type: 'gallery',
        title: '',
        description: '',
        isFeatured: false,
      }),
    ).toEqual({
      projectId: '请选择所属项目',
      title: '媒体组标题不能为空',
    });
  });

  it('validates route draft required fields', () => {
    expect(
      validateRouteDraft({
        projectId: '',
        name: '',
        description: '',
        locationIdsText: '',
        lineStyle: 'solid',
        color: '',
        isFeatured: false,
      }),
    ).toEqual({
      projectId: '请选择所属项目',
      name: '轨迹名称不能为空',
      locationIdsText: '请至少填写一个地点 ID',
      color: '轨迹颜色不能为空',
    });
  });

  it('validates image draft for media image creation', () => {
    expect(validateImageDraft({ caption: '', url: 'bad-url' })).toEqual({
      caption: '图片标题不能为空',
      url: '图片 URL 必须以 http:// 或 https:// 开头，或留空使用占位图',
    });
  });
});

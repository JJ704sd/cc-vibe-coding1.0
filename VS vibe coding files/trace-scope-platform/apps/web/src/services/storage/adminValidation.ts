import type { LocationDraft, MediaSetDraft, ProjectDraft, RouteDraft } from '@/services/storage/adminEditorDrafts';

export type ValidationErrors<T extends string> = Partial<Record<T, string>>;

function isBlank(value: string) {
  return value.trim().length === 0;
}

function isValidUrl(value: string) {
  return /^https?:\/\//.test(value);
}

export function validateProjectDraft(draft: ProjectDraft): ValidationErrors<keyof ProjectDraft> {
  const errors: ValidationErrors<keyof ProjectDraft> = {};
  if (isBlank(draft.title)) {
    errors.title = '项目标题不能为空';
  }
  if (isBlank(draft.summary)) {
    errors.summary = '项目摘要不能为空';
  }
  return errors;
}

export function validateLocationDraft(draft: LocationDraft): ValidationErrors<keyof LocationDraft> {
  const errors: ValidationErrors<keyof LocationDraft> = {};
  if (isBlank(draft.projectId)) {
    errors.projectId = '请选择所属项目';
  }
  if (isBlank(draft.name)) {
    errors.name = '地点名称不能为空';
  }
  if (Number.isNaN(Number(draft.latitudeText)) || isBlank(draft.latitudeText)) {
    errors.latitudeText = '纬度必须是有效数字';
  }
  if (Number.isNaN(Number(draft.longitudeText)) || isBlank(draft.longitudeText)) {
    errors.longitudeText = '经度必须是有效数字';
  }
  if (isBlank(draft.addressText)) {
    errors.addressText = '地址不能为空';
  }
  if (draft.visitOrderText.trim() && !/^\d+$/.test(draft.visitOrderText.trim())) {
    errors.visitOrderText = '访问顺序必须是整数';
  }
  return errors;
}

export function validateMediaSetDraft(draft: MediaSetDraft): ValidationErrors<keyof MediaSetDraft> {
  const errors: ValidationErrors<keyof MediaSetDraft> = {};
  if (isBlank(draft.projectId)) {
    errors.projectId = '请选择所属项目';
  }
  if (isBlank(draft.title)) {
    errors.title = '媒体组标题不能为空';
  }
  return errors;
}

export function validateRouteDraft(draft: RouteDraft): ValidationErrors<keyof RouteDraft> {
  const errors: ValidationErrors<keyof RouteDraft> = {};
  if (isBlank(draft.projectId)) {
    errors.projectId = '请选择所属项目';
  }
  if (isBlank(draft.name)) {
    errors.name = '轨迹名称不能为空';
  }
  if (isBlank(draft.locationIdsText)) {
    errors.locationIdsText = '请至少填写一个地点 ID';
  }
  if (isBlank(draft.color)) {
    errors.color = '轨迹颜色不能为空';
  }
  return errors;
}

export function validateImageDraft(draft: { caption: string; url: string }): ValidationErrors<'caption' | 'url'> {
  const errors: ValidationErrors<'caption' | 'url'> = {};
  if (isBlank(draft.caption)) {
    errors.caption = '图片标题不能为空';
  }
  if (draft.url.trim() && !isValidUrl(draft.url.trim())) {
    errors.url = '图片 URL 必须以 http:// 或 https:// 开头，或留空使用占位图';
  }
  return errors;
}

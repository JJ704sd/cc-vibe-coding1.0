---
name: trace-scope-project-guardrails
description: Use when modifying Trace Scope Platform pages, data flow, or component boundaries and there is risk of breaking the project's core entity relationships, media separation, or prototype-stage architecture assumptions.
---

# Trace Scope Project Guardrails

## Overview
Trace Scope is a spatial narrative frontend prototype with an art-portfolio-style public experience.
The main risk is breaking entity boundaries, over-expanding the architecture, or flattening domain-specific behavior into generic UI code.

## When to Use
- Adding or changing public pages
- Editing admin CRUD flows
- Refactoring page, component, hook, or storage boundaries
- Touching media, location, route, or project rendering
- Introducing new view models for gallery or map presentation

## Core Constraints
- Core chain is `Project -> Location -> MediaSet / Route`
- `MediaImage` must belong to a `MediaSet`
- `spin360` and `gallery` stay as separate viewers
- Route pages should compose UI, not own deep business logic
- Do not treat current browser storage as a real backend
- Do not casually add new top-level core entities
- Do not turn public-facing pages into generic SaaS dashboard layouts

## Project Facts
- Shared domain types live in `apps/web/src/types/domain.ts`
- Seed/mock content lives in `apps/web/src/services/api/mock-data.ts`
- Admin persistence lives in `apps/web/src/services/storage/adminDataStore.ts`
- Public read access is built through `apps/web/src/services/storage/publicDataReader.ts`
- The 3D homepage entry is driven by `apps/web/src/app/routes/gallery/GalleryHome.tsx`
- The immersive scene logic is driven by `apps/web/src/components/gallery/GalleryScene.tsx`
- The current map page is still partially placeholder-oriented, not a finished GIS layer

## Good Changes
- Add a view-model layer for gallery presentation without changing domain meaning
- Improve visual hierarchy while preserving narrative structure
- Keep route files thin and move reusable logic downward
- Add validation, state handling, and clearer empty states
- Improve admin flows while keeping the storage model honest

## Bad Changes
- Merge `spin360` and `gallery` into one mega viewer
- Add new top-level entities because a page feels inconvenient
- Move heavy business logic into route files
- Pretend the current storage layer is already a real API/data backend
- Replace art-direction language with generic platform copy
- Break `Project`, `Location`, `MediaSet`, and `Route` ownership boundaries

## Review Questions
- Did entity relationships remain intact?
- Did the change preserve the difference between platform entities and presentation models?
- Did the page become clearer without becoming more generic?
- Did route files stay light?
- Did the change respect the current prototype-stage scope?

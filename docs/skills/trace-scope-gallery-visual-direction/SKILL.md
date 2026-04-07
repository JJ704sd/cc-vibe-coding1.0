---
name: trace-scope-gallery-visual-direction
description: Use when redesigning Trace Scope gallery-facing pages, overlays, loader flows, or artwork presentation and visual choices need to stay aligned with the project's immersive exhibition direction.
---

# Trace Scope Gallery Visual Direction

## Overview
The gallery layer should feel like entering a curated exhibition, not browsing a product dashboard.
The main risk is letting utility chrome, platform terminology, or noisy controls overpower atmosphere and artwork presence.

## When to Use
- Updating `GalleryHome`
- Changing the gallery modal or future about modal
- Revising typography, overlays, loader timing, or scene atmosphere
- Reworking artwork cards, labels, or scene composition
- Adjusting public-facing copy on gallery-oriented pages

## Visual Rules
- Prefer atmosphere and restraint over dense UI chrome
- Typography should feel editorial, not default app UI
- Metadata hierarchy should support artwork viewing first
- Navigation should stay minimal on the homepage
- Motion should feel calm, cinematic, and intentional
- Overlay information should stay light and secondary
- Public pages should emphasize spatial narrative, not admin structure

## Project Facts
- Homepage shell lives in `apps/web/src/app/routes/gallery/GalleryHome.tsx`
- The 3D scene lives in `apps/web/src/components/gallery/GalleryScene.tsx`
- Shared glass, typography, and token styles live in `apps/web/src/styles/index.css`
- Current gallery direction is also described in `docs/gallery-reference-improvements.md`
- Public-facing pages still coexist with platform-oriented data structures, so visual hierarchy must compensate

## Prefer
- Large image-first presentation
- Subtle ambient guidance
- Strong type hierarchy
- Calm spacing and restrained control surfaces
- Distinct but coherent day/night mood shifts
- Exhibition-like labels and copy

## Avoid
- Platform-heavy labels on the homepage
- Dense admin-like control bars
- Loud button clusters in the main visual field
- Equal visual weight for every element
- Generic card-grid thinking when the experience should feel curated
- Random style mixing without a clear art direction

## Review Questions
- Does this feel like entering a curated space?
- Is the artwork or media the first visual priority?
- Are copy and controls secondary to atmosphere?
- Does motion support the mood rather than announce itself?
- Would this still read as an exhibition experience if the data became richer later?

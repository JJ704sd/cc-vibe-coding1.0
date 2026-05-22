# Gallery Reference Improvements

## Goal

Bring the current gallery homepage closer to the reference project's immersive art-portfolio experience while keeping the existing platform structure maintainable.

## Summary

The current project already has a usable foundation:

- a 3D gallery scene
- a timed loader and intro transition
- a modal detail view
- day/night-aware sky rendering

What it still lacks is the reference project's stronger exhibition-like narrative layer:

- dedicated artwork-facing data modeling
- a more immersive homepage shell
- a distinct about experience
- lighter, more atmospheric overlay information
- tighter choreography between loading, intro, and scene handoff

## Must Have

### 1. Make the homepage feel like a portfolio, not a platform dashboard

Current issue:

- `apps/web/src/app/routes/gallery/GalleryHome.tsx` still presents search, project navigation, and admin entry as primary UI.

Recommendation:

- reduce homepage chrome
- keep only brand, minimal navigation, copyright, and ambient guidance
- move platform-oriented controls out of the main visual focus

Expected outcome:

- the first impression becomes "art exhibition entry" instead of "content management platform"

### 2. Add a dedicated About experience

Current issue:

- there is no equivalent to the reference project's artist-introduction layer

Recommendation:

- create a dedicated `AboutModal` component
- make it open from the site name or brand area
- use a dual-panel glass layout inspired by the reference
- support both desktop and mobile variants

Expected outcome:

- the homepage gains author identity and atmosphere, not just content browsing

### 3. Introduce an artwork-facing view model

Current issue:

- the gallery scene currently consumes platform entities such as `Project`, `MediaSet`, and `Location`

Recommendation:

- create a view-layer model for gallery presentation, for example `ArtworkCard`
- suggested fields:
  - `title`
  - `year`
  - `medium`
  - `dimensions`
  - `coverImage`
  - `description`
  - `detailImages`

Expected outcome:

- the scene, overlays, and modal can be designed around exhibition needs without being tightly coupled to platform data shapes

### 4. Reframe the 3D scene as an artwork wall

Current issue:

- the current scene behaves more like a 3D project browser than a curated artwork field

Recommendation:

- make card spacing more intentional and gallery-like
- refine camera motion to feel calmer and more cinematic
- keep card fronts and backs closer to art-label presentation than product-card presentation

Expected outcome:

- the scene feels curated rather than programmatic

### 5. Rework the detail modal into an artwork viewer

Current issue:

- `apps/web/src/components/gallery/GalleryModal.tsx` still reads like a project information popup

Recommendation:

- prioritize the large artwork image
- make title, year, medium, and dimensions the main metadata
- demote or remove platform-style tags and structural metadata from the visual hierarchy

Expected outcome:

- modal content aligns with an art-portfolio experience

## Strongly Recommended

### 1. Add a lightweight overlay information layer

Current issue:

- the reference project uses an overlay layer to create subtle hover information and ambient feedback

Recommendation:

- add a lightweight overlay layer for hover states
- use it for artwork titles, soft guidance, or transient metadata
- disable or simplify it on mobile

Expected outcome:

- the homepage gains atmosphere without relying only on the 3D layer

### 2. Unify loading, intro, and scene choreography

Current issue:

- the loader is improved, but still behaves as a separate component more than a fully staged sequence

Recommendation:

- treat loading, camera intro, and first interactive state as one visual sequence
- coordinate timings so the user perceives one continuous opening movement

Expected outcome:

- the opening feels authored rather than assembled from separate behaviors

### 3. Unify homepage copy and labels

Current issue:

- visible wording still mixes platform language with portfolio language

Recommendation:

- replace platform-facing labels on the homepage with gallery-facing language
- keep admin-oriented wording away from the main visual layer

Expected outcome:

- the homepage tone becomes coherent

### 4. Extract homepage-specific visual tokens

Current issue:

- homepage appearance is still heavily driven by inline styles and general-purpose tokens

Recommendation:

- add a homepage/gallery-specific token group, for example:
  - `--gallery-sky`
  - `--gallery-glass`
  - `--gallery-text-soft`
  - `--gallery-accent`

Expected outcome:

- future refinements become easier and more consistent

## Optional Enhancements

### 1. Make night mode more distinct

Recommendation:

- differentiate not just the sky color, but also:
  - about modal glass tint
  - title contrast
  - overlay brightness
  - starfield intensity

### 2. Refine ambient artwork drift

Recommendation:

- introduce more subtle variation in drift speed, vertical movement, and idle rotation
- reduce any remaining "procedural" feeling

### 3. Support a real artwork asset pipeline

Recommendation:

- move toward a dedicated asset structure similar to:
  - `artworks.json`
  - `artworks/thumbs/`
  - original artwork directory

Expected outcome:

- the project becomes easier to maintain as a real portfolio site

## Recommended Implementation Order

1. Make the homepage less platform-oriented
2. Introduce an artwork-facing view model
3. Rework the gallery modal
4. Add `AboutModal`
5. Add overlay information layer
6. Unify loader and intro choreography

## Candidate File Targets

- `apps/web/src/app/routes/gallery/GalleryHome.tsx`
- `apps/web/src/components/gallery/GalleryScene.tsx`
- `apps/web/src/components/gallery/GalleryModal.tsx`
- `apps/web/src/components/site/PublicLayout.tsx`
- new file: `apps/web/src/components/gallery/AboutModal.tsx`
- new file or section for gallery-specific tokens in `apps/web/src/styles/index.css`

## Notes

- The current codebase should not be turned into a verbatim copy of the reference.
- The right goal is to borrow its strengths:
  - immersion
  - pacing
  - identity
  - restraint
- The existing platform structure should remain understandable and maintainable.

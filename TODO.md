# Remove 3D Globe Component from Travel Page

## Plan Execution Steps:
- [x] Remove Globe import from TravelPage.tsx
- [x] Remove Globe component from JSX in TravelPage.tsx
- [x] Remove the entire sidebar section containing the Globe
- [x] Update grid layout to remove the column that held the Globe
- [ ] Verify the layout looks correct after changes
- [ ] Test that travel page functionality still works

## Changes Made:
- Removed `import { Globe } from "../components/Globe";` from TravelPage.tsx
- Removed the entire "Map View" sidebar section
- Updated grid layout from `grid-cols-1 lg:grid-cols-3` to `grid-cols-1` for results section
- Removed the `lg:col-span-2` and `lg:col-span-1` classes since sidebar is gone

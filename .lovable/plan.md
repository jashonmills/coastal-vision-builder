## Plan

1. **Add tap/click behavior to the mobile/tablet panorama images**
   - Turn each panorama preview into a button while keeping the same stacked layout shown in your screenshot.
   - Add clear accessibility labels so tapping a panorama opens that specific view.

2. **Create a mobile-friendly interactive panorama viewer**
   - When a panorama is tapped, open it in a full-screen overlay instead of leaving it as a static image.
   - Use a scroll/pan interaction so the wide panorama can be explored naturally on a phone in portrait mode.
   - Keep the image height sized for portrait screens, with horizontal drag/scroll available inside the viewer rather than widening the whole page.
   - Include close, previous, and next controls so visitors can move through all four panoramas.

3. **Keep desktop unchanged**
   - Desktop will continue using the existing embedded 360 tour.
   - The new interactive raw panorama viewer will only apply below the desktop breakpoint, matching the current mobile/tablet panorama stack.

4. **Prevent horizontal page overflow**
   - Ensure the overlay locks page scrolling while open.
   - Constrain the panorama viewer to the viewport width and safe-area spacing so it works cleanly on mobile browsers.

5. **Verify on a phone-sized viewport**
   - Check that the page still shows the mobile panorama stack.
   - Check that tapping a panorama opens the full-screen interactive viewer and does not create horizontal scrolling on the page.
import type { Occurrence, ScreenshotEvidence } from "../shared/evidence.js";
export function highlightBounds(
  occurrence: Occurrence,
  screenshot?: ScreenshotEvidence,
) {
  const element = occurrence.element;
  if (
    !element ||
    element.alignment !== "reliable" ||
    !screenshot?.pixelWidth ||
    !screenshot.pixelHeight ||
    !screenshot.height
  )
    return;
  if (
    screenshot.id !== occurrence.screenshotId ||
    screenshot.width !== element.viewport.width ||
    screenshot.scrollX !== element.viewport.scrollX ||
    screenshot.scrollY !== element.viewport.scrollY
  )
    return;
  const left =
    element.rect.x + (screenshot.fullPage ? element.viewport.scrollX : 0);
  const top =
    element.rect.y + (screenshot.fullPage ? element.viewport.scrollY : 0);
  const cssHeight = screenshot.fullPage
    ? screenshot.pixelHeight / (screenshot.pixelWidth / screenshot.width)
    : screenshot.height;
  const x = Math.max(0, left),
    y = Math.max(0, top),
    right = Math.min(screenshot.width, left + element.rect.width),
    bottom = Math.min(cssHeight, top + element.rect.height);
  if (right <= x || bottom <= y) return;
  return {
    left: (x / screenshot.width) * 100,
    top: (y / cssHeight) * 100,
    width: ((right - x) / screenshot.width) * 100,
    height: ((bottom - y) / cssHeight) * 100,
  };
}

# png-visual-compare

Compares two PNG images pixel by pixel and reports how many pixels differ, standalone or through test-framework matchers.

## Language

**Baseline**:
The stored, approved image that a received image is expected to match.
_Avoid_: Expected snapshot, golden, reference image

**Received image**:
The image under test, whether a browser screenshot or any other PNG.
_Avoid_: Actual, screenshot (when meaning the compared input)

**Diff image**:
The rendered PNG that visualises where the received image and the baseline differ.
_Avoid_: Diff file, delta

**Mismatched pixels**:
The count of pixels that differ after normalisation; zero means the images match.
_Avoid_: Diff count, pixel diff

**Excluded area**:
A rectangle, given in pixel coordinates, painted a solid colour on both images so it always matches.
_Avoid_: Mask, ignore region

**Extended area**:
The padding added to an image to reach the common canvas size when the two images differ in size; wherever it overlaps real content in the other image, it counts as mismatched pixels.
_Avoid_: Size-difference fill

## Flagged ambiguities

- "Snapshot" names only the matcher API (`toMatchPngSnapshot`) and a framework's storage mechanism, never the image itself: use **Baseline**.
- Playwright's "mask" hides regions chosen by DOM locator; an **Excluded area** is chosen by pixel coordinates. They are not interchangeable.

# png-visual-compare

This library compares two PNG images pixel by pixel and returns the count of different pixels. Use it standalone or with test-framework matchers.

## Terms

**Baseline**:
The stored, approved image that a received image must match.
_Do not use_: Expected snapshot, golden, reference image

**Received image**:
The PNG image under test.
_Do not use_: Actual, screenshot (when you mean the compared input)

**Diff image**:
The output PNG that shows where the received image and the baseline differ.
_Do not use_: Diff file, delta

**Mismatched pixels**:
The count of pixels that differ after normalization. Zero means that the images match.
_Do not use_: Diff count, pixel diff

**Excluded area**:
A rectangle in pixel coordinates that the library paints with one solid color on both images. Excluded areas always match.
_Do not use_: Mask, ignore region

**Extended area**:
The padding that the library adds when two images have different dimensions. Where this padding overlaps content in the other image, the library counts those pixels as mismatched.
_Do not use_: Size-difference fill

## Rules for Terms

- Use **Snapshot** only for the matcher API (`toMatchPngSnapshot`) and the framework storage mechanism. Use **Baseline** for the stored image.
- Playwright `mask` hides regions by DOM locator. An **Excluded area** uses pixel coordinates. Do not use these terms interchangeably.

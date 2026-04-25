/** Defines a rectangular region of an image by its top-left and bottom-right pixel coordinates (inclusive). All coordinates must be finite integers. `x1 <= x2`, `y1 <= y2`. Reversed coordinates are rejected at runtime — they are not auto-normalized. */
export type Area = {
    /** X coordinate of the left edge (pixels from left). */
    x1: number;
    /** Y coordinate of the top edge (pixels from top). */
    y1: number;
    /** X coordinate of the right edge (pixels from left, inclusive). */
    x2: number;
    /** Y coordinate of the bottom edge (pixels from top, inclusive). */
    y2: number;
};

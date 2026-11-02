/** Wheel, touch and mouse input: the reader is steering the scroll by hand. */
export const POINTER_EVENTS = ['wheel', 'touchstart', 'pointerdown'] as const;

/** Pointer input plus keys, which can also scroll the page. */
export const READER_EVENTS = [...POINTER_EVENTS, 'keydown'] as const;

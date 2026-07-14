/**
 * Every on-screen string in the film lives here. Edit copy in this file only.
 * The closing line variants are real options; card2 points at the chosen one.
 */

export const COPY = {
  quote: {
    text: '“If I have seen further, it is by standing on the shoulders of Giants.”',
    attribution: '— Isaac Newton, letter to Robert Hooke, 5 February 1675',
  },

  captions: {
    newton1: 'Newton stood on Galileo.',
    newton2: 'And Kepler. And Barrow.',
    wrights: 'The Wrights stood on Newton.',
    lilienthal: 'Lilienthal’s numbers were wrong. They built a wind tunnel and fixed them.',
    nasa: 'NASA stood on the Wrights.',
    armstrong: 'Armstrong carried a piece of their wing to the Moon.',
    card1: 'Every giant stood on someone.',
    card2: 'Your AI shouldn’t stand alone.',
  },

  /** Alternate closers, swappable via captions.card2 above. */
  card2Variants: [
    'Your AI shouldn’t stand alone.',
    'Your AI has nothing to stand on.',
    'AI has no giants yet.',
    'Give it something to stand on.',
  ],

  /** Placeholder wordmark until the brand is confirmed. */
  logo: 'Layer2',
} as const;

export type CaptionKey = keyof typeof COPY.captions;

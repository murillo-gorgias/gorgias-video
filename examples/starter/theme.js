/**
 * Colours, fonts and the copy that is not typed (typed copy lives in timeline.js).
 * Gorgias colours come from the brand:core skill. Re-read them there before a real video.
 */

export const COLOR = {
  paper: '#FCFAF8',
  cream: '#F8F5F1',
  white: '#FFFFFF',
  ink: '#1B1A19',
  head: '#252423',
  body: '#363433',
  text: '#5F5C59',
  mute: '#8E8985',
  border: '#E8E2DC',
  faded: '#F0EBE5',
  rule: '#DFD9D3',
  coral: '#FB6B4B',
  coralSoft: '#FFB5A5',
  onInk: '#FCFAF8',
  onInkMuted: '#C0BBB5',
  success: '#289E43',
  successSoft: '#E1FFE8',
};

export const FONT = {
  display: '"Feature Deck", Georgia, serif',
  sans: '"Inter Variable", Inter, system-ui, sans-serif',
  mono: '"Red Hat Mono", ui-monospace, monospace',
};

/** Placeholder copy. Replace it with the brief's words. Invented, never real customer data. */
export const COPY = {
  hookLines: ['Your support team,', 'one step ahead.'],
  /** The word in the hook that gets the coral underline. Must appear in hookLines[1]. */
  hookAccent: 'ahead.',
  windowTitle: 'Tickets',
  placeholder: 'Describe what to do…',
  button: 'Run',
  status: 'Tagging tickets',
  statusDone: 'Done',
  rows: [
    {title: 'Where is my order #4821?', tag: 'late-delivery'},
    {title: 'Tracking has not moved in 4 days', tag: 'late-delivery'},
    {title: 'Package still says in transit', tag: 'late-delivery'},
  ],
  close: 'Try it in minutes.',
};

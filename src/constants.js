// ── Social Roles ──────────────────────────────────────────────

export const ROLE_COLORS = {
  'Core Influencer':   '#43B878',
  'Polarizing Figure': '#f0b030',
  'Rejection Risk':    '#e05a4a',
  'Isolation Risk':    '#9090ff',
}

// Short CSS key used on .rtag class names
export const ROLE_KEYS = {
  'Core Influencer':   'inf',
  'Polarizing Figure': 'pol',
  'Rejection Risk':    'rej',
  'Isolation Risk':    'iso',
}

// ── Administrations ──────────────────────────────────────────

// Short — dropdown option labels in coach reports
export const ADMIN_LABELS_SHORT = {
  1: 'Admin 1 — Start',
  2: 'Admin 2 — Mid',
  3: 'Admin 3 — End',
}

// Standard — athlete-facing screens (intake, confirm)
export const ADMIN_LABELS = {
  1: 'Administration 1 — Start of Season',
  2: 'Administration 2 — Mid Season',
  3: 'Administration 3 — End of Season',
}

// Full — coach reports, includes question set
export const ADMIN_LABELS_FULL = {
  1: 'Administration 1 — Start of Season (Set 1)',
  2: 'Administration 2 — Mid Season (Set 2)',
  3: 'Administration 3 — End of Season (Set 1)',
}

// Rich objects — admin social map panel
export const ADMIN_INFO = {
  1: { label: 'Administration 1', sub: 'Start of Season', set: 'Question Set 1' },
  2: { label: 'Administration 2', sub: 'Mid Season',      set: 'Question Set 2' },
  3: { label: 'Administration 3', sub: 'End of Season',   set: 'Question Set 1' },
}

/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#18322F',
    tint: '#137C71',

    // Core surfaces
    background: '#F3F7F5',
    foreground: '#18322F',

    // Cards / elevated surfaces
    card: '#FFFFFF',
    cardForeground: '#18322F',

    // Primary action color (buttons, links, active states)
    primary: '#137C71',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#E5EEEA',
    secondaryForeground: '#23423D',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#E9F0ED',
    mutedForeground: '#6B817B',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#DCEFE9',
    accentForeground: '#155C52',

    // Destructive actions (delete, error states)
    destructive: '#C24C4C',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#D8E4DF',
    input: '#FBFDFC',
    scrim: '#1325218C',
  },

  dark: {
    text: '#E5F0ED',
    tint: '#65C8B5',
    background: '#101B19',
    foreground: '#E5F0ED',
    card: '#182623',
    cardForeground: '#E5F0ED',
    primary: '#65C8B5',
    primaryForeground: '#0D211D',
    secondary: '#253632',
    secondaryForeground: '#E5F0ED',
    muted: '#202F2B',
    mutedForeground: '#9CB1AA',
    accent: '#27413B',
    accentForeground: '#BCEADE',
    destructive: '#E27B75',
    destructiveForeground: '#241212',
    border: '#30433D',
    input: '#1A2925',
    scrim: '#000000A8',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 18,
};

export default colors;

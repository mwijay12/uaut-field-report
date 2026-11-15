// Where the content file lives. The sign-in screen lets these be changed (under
// "Repository"), which is what to do after the repository is renamed.

export const DEFAULTS = {
  repo: 'mwijay12/uaut-field-report',
  branch: 'main',
  file: 'motion-lab/content/site.json',
};

// Signed in for at most eight hours, and signed out after thirty minutes with
// no key pressed or button clicked. The same limits as the main site's admin.
export const SESSION = { longest: 8 * 60 * 60 * 1000, idle: 30 * 60 * 1000 };

export const TOKEN_PAGE = 'https://github.com/settings/personal-access-tokens/new';

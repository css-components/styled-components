// @flow

declare var SC_DISABLE_SPEEDY: ?boolean;
declare var __VERSION__: string;

export const SC_ATTR: string =
  (typeof process !== 'undefined' && (process.env.REACT_APP_SC_ATTR || process.env.SC_ATTR)) ||
  'data-styled';

export const SC_CLASS_PREFIX: string =
  (typeof process !== 'undefined' && (process.env.REACT_APP_SC_CLASS_PREFIX || process.env.SC_CLASS_PREFIX)) ||
  '';

export const SC_ATTR_ACTIVE = 'active';
export const SC_ATTR_VERSION = 'data-styled-version';
export const SC_VERSION = __VERSION__;
export const SPLITTER = '/*!sc*/\n';

export const IS_BROWSER = typeof window !== 'undefined' && 'HTMLElement' in window;

export const DISABLE_SPEEDY =
  Boolean(typeof SC_DISABLE_SPEEDY === 'boolean'
    ? SC_DISABLE_SPEEDY
    : (typeof process !== 'undefined' && typeof process.env.REACT_APP_SC_DISABLE_SPEEDY !== 'undefined' && process.env.REACT_APP_SC_DISABLE_SPEEDY !== ''
      ? process.env.REACT_APP_SC_DISABLE_SPEEDY === 'false' ? false : process.env.REACT_APP_SC_DISABLE_SPEEDY
      : (typeof process !== 'undefined' && typeof process.env.SC_DISABLE_SPEEDY !== 'undefined' && process.env.SC_DISABLE_SPEEDY !== ''
        ? process.env.SC_DISABLE_SPEEDY === 'false' ? false : process.env.SC_DISABLE_SPEEDY
        : process.env.NODE_ENV !== 'production'
      )
    ));

// Shared empty execution context when generating static styles
export const STATIC_EXECUTION_CONTEXT = {};

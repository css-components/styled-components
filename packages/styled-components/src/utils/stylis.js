import { compile, middleware, prefixer, RULESET, serialize, stringify } from 'stylis';
import { type Stringifier } from '../types';
import { EMPTY_ARRAY, EMPTY_OBJECT } from './empties';
import throwStyledError from './error';
import { phash, SEED } from './hash';

const COMMENT_REGEX = /^\s*\/\/.*$/gm;
const COMPLEX_SELECTOR_PREFIX = [':', '[', '.', '#'];

type StylisInstanceConstructorArgs = {
  options?: { prefix?: boolean },
  plugins?: Array<Function>,
};

export default function createStylisInstance({
  options = EMPTY_OBJECT,
  plugins = EMPTY_ARRAY,
}: StylisInstanceConstructorArgs = EMPTY_OBJECT) {
  let _componentId: string;
  let _selector: string;
  let _selectorRegexp: RegExp;
  let _consecutiveSelfRefRegExp: RegExp;

  const selfReferenceReplacer = (match, offset, string) => {
    if (
      // do not replace the first occurrence if it is complex (has a modifier)
      (offset === 0 ? COMPLEX_SELECTOR_PREFIX.indexOf(string[_selector.length]) === -1 : true) &&
      // no consecutive self refs (.b.b); that is a precedence boost and treated differently
      !string.match(_consecutiveSelfRefRegExp)
    ) {
      return `.${_componentId}`;
    }

    return match;
  };

  /**
   * When writing a style like
   *
   * & + & {
   *   color: red;
   * }
   *
   * The second ampersand should be a reference to the static component class. stylis
   * has no knowledge of static class so we have to intelligently replace the base selector.
   *
   * https://github.com/thysultan/stylis.js/tree/v4.0.2#abstract-syntax-structure
   */
  const selfReferenceReplacementPlugin = element => {
    if (element.type === RULESET && element.value.includes('&')) {
      element.props[0] = element.props[0].replace(_selectorRegexp, selfReferenceReplacer);
    }
  };

  function stringifyRules(css, selector = '', prefix = '', componentId = '&'): Stringifier {
    let flatCSS = css.replace(COMMENT_REGEX, '');

    // stylis has no concept of state to be passed to plugins
    // but since JS is single-threaded, we can rely on that to ensure
    // these properties stay in sync with the current stylis run
    _componentId = componentId;
    _selector = selector;
    _selectorRegexp = new RegExp(`\\${_selector}\\b`, 'g');
    _consecutiveSelfRefRegExp = new RegExp(`(\\${_selector}\\b){2,}`);

    const middlewares = plugins.slice();

    if (options.prefix || options.prefix === undefined) {
      middlewares.push(prefixer);
    }

    middlewares.push(selfReferenceReplacementPlugin, stringify);

    return serialize(
      compile(prefix || selector ? `${prefix} ${selector} { ${flatCSS} }` : flatCSS),
      middleware(middlewares)
    );
  }

  stringifyRules.hash = plugins.length
    ? plugins
        .reduce((acc, plugin) => {
          if (!plugin.name) {
            throwStyledError(15);
          }

          return phash(acc, plugin.name);
        }, SEED)
        .toString()
    : '';

  return stringifyRules;
}

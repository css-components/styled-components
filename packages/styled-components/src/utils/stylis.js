import Stylis from '@emotion/stylis';
import _insertRulePlugin from 'stylis-rule-sheet';
import { type Stringifier } from '../types';
import { EMPTY_ARRAY, EMPTY_OBJECT } from './empties';
import { hash, phash } from './hash';

const COMMENT_REGEX = /^\s*\/\/.*$/gm;

type StylisInstanceConstructorArgs = {
  options?: Object,
  plugins?: Array<Function>,
};

export default function createStylisInstance({
  options = EMPTY_OBJECT,
  plugins = EMPTY_ARRAY,
}: StylisInstanceConstructorArgs = EMPTY_OBJECT) {
  const stylis = new Stylis(options);

  // Wrap `insertRulePlugin to build a list of rules,
  // and then make our own plugin to return the rules. This
  // makes it easier to hook into the existing SSR architecture

  let parsingRules = [];

  // eslint-disable-next-line consistent-return
  const returnRulesPlugin = context => {
    if (context === -2) {
      const parsedRules = parsingRules;
      parsingRules = [];
      return parsedRules;
    }
  };

  const parseRulesPlugin = _insertRulePlugin(rule => {
    parsingRules.push(rule);
  });

  let _componentId: string;
  let _selector: string;
  let _selectorRegexp: RegExp;

  const selfReferenceReplacer = (match, offset, string) => {
    if (
      // the first self-ref is always untouched
      offset > 0 &&
      // there should be at least two self-refs to do a replacement (.b > .b)
      string.slice(0, offset).indexOf(_selector) !== -1 &&
      // no consecutive self refs (.b.b); that is a precedence boost and treated differently
      string.slice(offset - _selector.length, offset) !== _selector
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
   * https://github.com/thysultan/stylis.js#plugins <- more info about the context phase values
   * "2" means this plugin is taking effect at the very end after all other processing is complete
   */
  const selfReferenceReplacementPlugin = (context, _, selectors) => {
    if (context === 2 && selectors.length && selectors[0].lastIndexOf(_selector) > 0) {
      // eslint-disable-next-line no-param-reassign
      selectors[0] = selectors[0].replace(_selectorRegexp, selfReferenceReplacer);
    }
  };

  stylis.use([...plugins, selfReferenceReplacementPlugin, parseRulesPlugin, returnRulesPlugin]);

  function stringifyRules(css, selector, prefix, componentId = '&'): Stringifier {
    const flatCSS = css.replace(COMMENT_REGEX, '');
    const cssStr = selector && prefix ? `${prefix} ${selector} { ${flatCSS} }` : flatCSS;

    // stylis has no concept of state to be passed to plugins
    // but since JS is single=threaded, we can rely on that to ensure
    // these properties stay in sync with the current stylis run
    _componentId = componentId;
    _selector = selector;
    _selectorRegexp = new RegExp(`\\${_selector}\\b`, 'g');

    return stylis(prefix || !selector ? '' : selector, cssStr);
  }

  // hashing the function bodies is suboptimal, but some plugins
  // are anonymous functions so there is no name to use as a token
  stringifyRules.hash = plugins
    .reduce((acc, plugin) => {
      if (process.env.NODE_ENV !== 'production' && !plugin.name) {
        console.warn(
          '[styled-components] A stylis plugin has been supplied that is not named. We need a name for each plugin to be able to prevent styling collisions between different stylis configurations within the same app. Before you pass your plugin to <StyleSheetManager stylisPlugins={[]}>, please make sure each plugin is uniquely-named (Object.defineProperty(importedPlugin, "name", { value: "some-unique-name" });).'
        );
      }

      const target = plugin.name || plugin.toString();

      return !acc ? hash(target) : phash(acc, target);
    }, '')
    .toString();

  return stringifyRules;
}

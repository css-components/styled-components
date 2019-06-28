// @flow

import flatten from '../utils/flatten';
import { hash, phash } from '../utils/hasher';
import generateName from '../utils/generateAlphabeticName';
import isStaticRules from '../utils/isStaticRules';
import StyleSheet from '../sheet';

import type { RuleSet } from '../types';

/*
 ComponentStyle is all the CSS-specific stuff, not
 the React-specific stuff.
 */
export default class ComponentStyle {
  baseHash: number;

  componentId: string;

  isStatic: boolean;

  rules: RuleSet;

  staticRulesId: string;

  constructor(rules: RuleSet, componentId: string) {
    this.rules = rules;
    this.staticRulesId = '';
    this.isStatic = process.env.NODE_ENV === 'production' && isStaticRules(rules);
    this.componentId = componentId;
    this.baseHash = hash(componentId);

    // NOTE: This registers the componentId, which ensures a consistent order
    // for this component's styles compared to others
    StyleSheet.registerId(componentId);
  }

  /*
   * Flattens a rule set into valid CSS
   * Hashes it, wraps the whole chunk in a .hash1234 {}
   * Returns the hash to be injected on render()
   * */
  generateAndInjectStyles(executionContext: Object, styleSheet: StyleSheet) {
    const { componentId } = this;

    if (this.isStatic) {
      if (this.staticRulesId && styleSheet.hasNameForId(componentId, this.staticRulesId)) {
        return this.staticRulesId;
      }

      const cssStatic = flatten(this.rules, executionContext, styleSheet).join('');
      const name = generateName(phash(this.baseHash, cssStatic) >>> 0);

      if (!styleSheet.hasNameForId(componentId, name)) {
        const cssStaticFormatted = styleSheet.options.stringifier(
          cssStatic,
          `.${name}`,
          undefined,
          componentId
        );

        styleSheet.insertRules(componentId, name, cssStaticFormatted);
      }

      this.staticRulesId = name;

      return name;
    } else {
      const { length } = this.rules;

      let dynamicHash = this.baseHash;
      let i = 0;
      let css = '';

      for (i = 0; i < length; i++) {
        const partRule = this.rules[i];
        if (typeof partRule === 'string') {
          css += partRule;

          if (process.env.NODE_ENV !== 'production') dynamicHash = phash(dynamicHash, partRule + i);
        } else {
          const partChunk = flatten(partRule, executionContext, styleSheet);
          const partString = Array.isArray(partChunk) ? partChunk.join('') : partChunk;
          dynamicHash = phash(dynamicHash, partString + i);
          css += partString;
        }
      }

      const name = generateName(dynamicHash >>> 0);

      if (!styleSheet.hasNameForId(componentId, name)) {
        const cssFormatted = styleSheet.options.stringifier(
          css,
          `.${name}`,
          undefined,
          componentId
        );
        styleSheet.insertRules(componentId, name, cssFormatted);
      }

      return name;
    }
  }
}

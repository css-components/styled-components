// @flow
import hashStr from '../vendor/glamor/hash'

import type {
  RuleSet,
  NameGenerator,
  Flattener,
  Stringifier,
  Interpolation,
} from '../types'
import StyleSheet from './StyleSheet'
import { IS_BROWSER } from '../constants'
import isStyledComponent from '../utils/isStyledComponent'

const areStylesCacheable = IS_BROWSER

const isStaticRules = (rules: RuleSet, attrs?: Object): boolean => {
  for (let i = 0; i < rules.length; i += 1) {
    const rule = rules[i]

    // recursive case
    if (Array.isArray(rule) && !isStaticRules(rule)) {
      return false
    } else if (typeof rule === 'function' && !isStyledComponent(rule)) {
      // functions are allowed to be static if they're just being
      // used to get the classname of a nested styled component
      return false
    }
  }

  if (attrs !== undefined) {
    // eslint-disable-next-line guard-for-in, no-restricted-syntax
    for (const key in attrs) {
      const value = attrs[key]
      if (typeof value === 'function') {
        return false
      }
    }
  }

  return true
}

const isHRMEnabled =
  typeof module !== 'undefined' &&
  module.hot &&
  process.env.NODE_ENV !== 'production'

/*
 ComponentStyle is all the CSS-specific stuff, not
 the React-specific stuff.
 */
export default (
  nameGenerator: NameGenerator,
  flatten: Flattener,
  stringifyRules: Stringifier
) => {
  /* combines hashStr (murmurhash) and nameGenerator for convenience */
  const generateRuleHash = (str: string) => nameGenerator(hashStr(str))

  class ComponentStyle {
    rules: RuleSet
    componentId: string
    isStatic: boolean
    lastClassName: string | void
    cssCache: { [className: string]: Array<Interpolation> }

    constructor(rules: RuleSet, attrs?: Object, componentId: string) {
      this.rules = rules
      this.isStatic = !isHRMEnabled && isStaticRules(rules, attrs)
      this.componentId = componentId
      this.cssCache = {}

      if (!StyleSheet.master.hasId(componentId)) {
        const placeholder =
          process.env.NODE_ENV !== 'production' ? [`.${componentId} {}`] : []

        StyleSheet.master.deferredInject(componentId, placeholder)
      }
    }

    /*
     * Flattens a rule set into valid CSS
     * Hashes it, wraps the whole chunk in a .hash1234 {}
     * Returns the hash to be injected on render()
     * */
    generateClassName(executionContext: Object, styleSheet: StyleSheet) {
      const { isStatic, componentId, lastClassName } = this
      if (
        areStylesCacheable &&
        isStatic &&
        lastClassName !== undefined &&
        styleSheet.hasNameForId(componentId, lastClassName)
      ) {
        return lastClassName
      }

      const flatCSS = flatten(this.rules, executionContext)
      const name = generateRuleHash(this.componentId + flatCSS.join(''))

      this.cssCache[name] = flatCSS
      this.lastClassName = name
      return name
    }

    /*
     * Injects a rule set into styleSheet
     * */
    injectStyles(name: string, styleSheet: StyleSheet) {
      const { componentId } = this

      if (!styleSheet.hasNameForId(componentId, name)) {
        const flatCSS = this.cssCache[name]
        const css = stringifyRules(flatCSS, `.${name}`)
        styleSheet.inject(this.componentId, css, name)
      }
    }

    static generateName(str: string): string {
      return generateRuleHash(str)
    }
  }

  return ComponentStyle
}

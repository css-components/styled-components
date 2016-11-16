// @flow
import hashStr from 'glamor/lib/hash'

import type { RuleSet, NameGenerator } from '../types'
import flatten from '../utils/flatten'
import parse from '../vendor/postcss-safe-parser/parse'
import postcssNested from '../vendor/postcss-nested'
import autoprefix from '../utils/autoprefix'
import styleSheet from './StyleSheet'


function safeDisplayName(displayName: string) {
  const newDisplayName = displayName
    .replace(/[[\].#*$><+~=|^:(),"'`]/g, '-') // Replace all possible CSS selectors
    .replace(/--+/g, '-') // Replace multiple -- with single -

  return newDisplayName
}

/*
 ComponentStyle is all the CSS-specific stuff, not
 the React-specific stuff.
 */
export default (nameGenerator: NameGenerator) => {
  const inserted = {}

  class ComponentStyle {
    rules: RuleSet
    insertedRule: Object

    constructor(rules: RuleSet) {
      this.rules = rules
      if (!styleSheet.injected) styleSheet.inject()
      this.insertedRule = styleSheet.insert('')
    }

    /*
     * Flattens a rule set into valid CSS
     * Hashes it, wraps the whole chunk in a ._hashName {}
     * Parses that with PostCSS then runs PostCSS-Nested on it
     * Returns the hash to be injected on render()
     * */
    generateAndInjectStyles(executionContext: Object) {
      const flatCSS = flatten(this.rules, executionContext).join('')
        .replace(/^\s*\/\/.*$/gm, '') // replace JS comments

      const classSuffix = process.env.NODE_ENV !== 'production'
       ? `-${safeDisplayName(executionContext.displayName)}`
       : ''

      const hash = hashStr(flatCSS)
      const hashSuffixed = `${hash}${classSuffix}`

      if (!inserted[hashSuffixed]) {
        const selector = `${nameGenerator(hash)}${classSuffix}`

        inserted[hashSuffixed] = selector
        const root = parse(`.${selector} { ${flatCSS} }`)
        postcssNested(root)
        autoprefix(root)
        this.insertedRule.appendRule(root.toResult().css)
      }
      return inserted[hashSuffixed]
    }
  }

  return ComponentStyle
}

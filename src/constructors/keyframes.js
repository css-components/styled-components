// @flow
import css from './css';
import generateAlphabeticName from '../utils/generateAlphabeticName';
import stringifyRules from '../utils/stringifyRules';
// $FlowFixMe
import hashStr from '../vendor/glamor/hash';
import Keyframes from '../models/Keyframes';

import { errorKeyFramesInNative } from '../utils/error';
import isReactNative from '../utils/isReactNative';
import type { Interpolation, Styles } from '../types';

const replaceWhitespace = (str: string): string => str.replace(/\s|\\n/g, '');

export default function keyframes(
  strings: Styles,
  ...interpolations: Array<Interpolation>
): Keyframes {
  /* Warning if you've used keyframes on React Native */
  if (process.env.NODE_ENV !== 'production' && isReactNative) {
    errorKeyFramesInNative();
  }

  const rules = css(strings, ...interpolations);

  const name = generateAlphabeticName(hashStr(replaceWhitespace(JSON.stringify(rules))));

  return new Keyframes(name, stringifyRules(rules, name, '@keyframes'));
}

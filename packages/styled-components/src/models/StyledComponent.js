// @flow
import validAttr from '@emotion/is-prop-valid';
import React, {
  createElement,
  useRef,
  useContext,
  useState,
  type AbstractComponent,
  type Ref,
} from 'react';
import ComponentStyle from './ComponentStyle';
import createWarnTooManyClasses from '../utils/createWarnTooManyClasses';
import determineTheme from '../utils/determineTheme';
import escape from '../utils/escape';
import generateDisplayName from '../utils/generateDisplayName';
import getComponentName from '../utils/getComponentName';
import hoist from '../utils/hoist';
import isFunction from '../utils/isFunction';
import isTag from '../utils/isTag';
import isDerivedReactComponent from '../utils/isDerivedReactComponent';
import isStyledComponent from '../utils/isStyledComponent';
import once from '../utils/once';
import StyleSheet from './StyleSheet';
import { ThemeContext } from './ThemeProvider';
import { useStyleSheet } from './StyleSheetManager';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '../utils/empties';
import useCheckClassNameUsage from '../utils/useCheckClassNameUsage';

import type { Attrs, RuleSet, Target } from '../types';

/* global $Call */

const identifiers = {};

/* We depend on components having unique IDs */
function generateId(_ComponentStyle: Function, _displayName: string, parentComponentId: string) {
  const displayName = typeof _displayName !== 'string' ? 'sc' : escape(_displayName);

  /**
   * This ensures uniqueness if two components happen to share
   * the same displayName.
   */
  const nr = (identifiers[displayName] || 0) + 1;
  identifiers[displayName] = nr;

  const componentId = `${displayName}-${_ComponentStyle.generateName(displayName + nr)}`;

  return parentComponentId ? `${parentComponentId}-${componentId}` : componentId;
}

function buildExecutionContext(theme: ?Object, props: Object, attrs: Attrs, styledAttrs, utils) {
  const context = { ...props, theme };

  if (!attrs.length) return context;

  styledAttrs.current = {};

  attrs.forEach(attrDef => {
    let resolvedAttrDef = attrDef;
    let attrDefWasFn = false;
    let attr;
    let key;

    if (isFunction(resolvedAttrDef)) {
      resolvedAttrDef = resolvedAttrDef(context);
      attrDefWasFn = true;
    }

    /* eslint-disable guard-for-in */
    for (key in resolvedAttrDef) {
      attr = resolvedAttrDef[key];

      if (!attrDefWasFn) {
        if (isFunction(attr) && !isDerivedReactComponent(attr) && !isStyledComponent(attr)) {
          if (process.env.NODE_ENV !== 'production') {
            utils.warnAttrsFnObjectKeyDeprecated(key, props.forwardedComponent.displayName);
          }

          attr = attr(context);

          if (process.env.NODE_ENV !== 'production' && React.isValidElement(attr)) {
            utils.warnNonStyledComponentAttrsObjectKey(key, props.forwardedComponent.displayName);
          }
        }
      }

      styledAttrs.current[key] = attr;
      context[key] = attr;
    }
    /* eslint-enable */
  });

  return context;
}

interface StyledComponentWrapperProperties {
  attrs: Array<Object>;
  componentStyle: ComponentStyle;
  foldedComponentIds: Array<string>;
  target: Target;
  styledComponentId: string;
  warnTooManyClasses: $Call<typeof createWarnTooManyClasses, string>;
}

type StyledComponentWrapper<Config, Instance> = AbstractComponent<Config, Instance> &
  StyledComponentWrapperProperties;

type StyledComponentProps<Config, Instance> = {
  forwardedComponent: StyledComponentWrapper<Config, Instance>,
  forwardedRef: Ref<Instance>,
  [string]: any,
};

function generateAndInjectStyles(
  theme: any,
  props: StyledComponentProps<*, *>,
  styleSheet: StyleSheet,
  styledAttrs,
  utils
) {
  const { attrs, componentStyle, warnTooManyClasses } = props.forwardedComponent;

  // statically styled-components don't need to build an execution context object,
  // and shouldn't be increasing the number of class names
  if (componentStyle.isStatic && !attrs.length) {
    return componentStyle.generateAndInjectStyles(EMPTY_OBJECT, styleSheet);
  }

  const className = componentStyle.generateAndInjectStyles(
    buildExecutionContext(theme, props, attrs, styledAttrs, utils),
    styleSheet
  );

  if (process.env.NODE_ENV !== 'production' && warnTooManyClasses) {
    warnTooManyClasses(className);
  }

  return className;
}

function developmentDeprecationWarningsFactory() {
  return {
    warnInnerRef: once((displayName: ?string) =>
      // eslint-disable-next-line no-console
      console.warn(
        `The "innerRef" API has been removed in styled-components v4 in favor of React 16 ref forwarding, use "ref" instead like a typical component. "innerRef" was detected on component "${displayName}".`
      )
    ),
    warnAttrsFnObjectKeyDeprecated: once(
      (key: string, displayName: string): void =>
        // eslint-disable-next-line no-console
        console.warn(
          `Functions as object-form attrs({}) keys are now deprecated and will be removed in a future version of styled-components. Switch to the new attrs(props => ({})) syntax instead for easier and more powerful composition. The attrs key in question is "${key}" on component "${displayName}".`
        )
    ),
    warnNonStyledComponentAttrsObjectKey: once(
      (key: string, displayName: string): void =>
        // eslint-disable-next-line no-console
        console.warn(
          `It looks like you've used a non styled-component as the value for the "${key}" prop in an object-form attrs constructor of "${displayName}".\n` +
            'You should use the new function-form attrs constructor which avoids this issue: attrs(props => ({ yourStuff }))\n' +
            "To continue using the deprecated object syntax, you'll need to wrap your component prop in a function to make it available inside the styled component (you'll still get the deprecation warning though.)\n" +
            `For example, { ${key}: () => InnerComponent } instead of { ${key}: InnerComponent }`
        )
    ),
  };
}

function useDevelopmentDeprecationWarnings(): $Call<typeof developmentDeprecationWarningsFactory> {
  return useState(developmentDeprecationWarningsFactory)[0];
}

const useDeprecationWarnings =
  process.env.NODE_ENV !== 'production'
    ? useDevelopmentDeprecationWarnings
    : // NOTE: return value must only be accessed in non-production, of course
      // $FlowFixMe
      (() => {}: typeof useDevelopmentDeprecationWarnings);

function StyledComponent(props: StyledComponentProps<*, *>) {
  // NOTE: this has to be called unconditionally due to the rules of hooks
  // it will just do nothing if it's not an in-browser development build
  useCheckClassNameUsage();

  const styleSheet = useStyleSheet();
  const theme = useContext(ThemeContext);
  const attrs = useRef({});
  const utils = useDeprecationWarnings();

  const {
    componentStyle,
    // $FlowFixMe
    defaultProps,
    displayName,
    foldedComponentIds,
    styledComponentId,
    target,
  } = props.forwardedComponent;

  let generatedClassName;
  if (componentStyle.isStatic) {
    generatedClassName = generateAndInjectStyles(EMPTY_OBJECT, props, styleSheet, attrs, utils);
  } else if (theme !== undefined) {
    generatedClassName = generateAndInjectStyles(
      determineTheme(props, theme, defaultProps),
      props,
      styleSheet,
      attrs,
      utils
    );
  } else {
    generatedClassName = generateAndInjectStyles(
      // eslint-disable-next-line react/prop-types
      props.theme || EMPTY_OBJECT,
      props,
      styleSheet,
      attrs,
      utils
    );
  }

  const elementToBeCreated = props.as || attrs.current.as || target;
  const isTargetTag = isTag(elementToBeCreated);

  const propsForElement = {};
  const computedProps = { ...attrs.current, ...props };

  let key;
  // eslint-disable-next-line guard-for-in
  for (key in computedProps) {
    if (process.env.NODE_ENV !== 'production' && key === 'innerRef' && isTargetTag) {
      utils.warnInnerRef(displayName);
    }

    if (key === 'forwardedComponent' || key === 'as') continue;
    else if (key === 'forwardedRef') propsForElement.ref = computedProps[key];
    else if (!isTargetTag || validAttr(key)) {
      // Don't pass through non HTML tags through to HTML elements
      propsForElement[key] = computedProps[key];
    }
  }

  if (props.style && attrs.current.style) {
    propsForElement.style = { ...attrs.current.style, ...props.style };
  }

  propsForElement.className = Array.prototype
    .concat(
      foldedComponentIds,
      props.className,
      styledComponentId,
      attrs.current.className,
      generatedClassName
    )
    .filter(Boolean)
    .join(' ');

  return createElement(elementToBeCreated, propsForElement);
}

export default function createStyledComponent(
  target: Target | StyledComponentWrapper<*, *>,
  options: Object,
  rules: RuleSet
) {
  const isTargetStyledComp = isStyledComponent(target);
  const isClass = !isTag(target);

  const {
    displayName = generateDisplayName(target),
    componentId = generateId(ComponentStyle, options.displayName, options.parentComponentId),
    ParentComponent = StyledComponent,
    attrs = EMPTY_ARRAY,
  } = options;

  const styledComponentId =
    options.displayName && options.componentId
      ? `${escape(options.displayName)}-${options.componentId}`
      : options.componentId || componentId;

  // fold the underlying StyledComponent attrs up (implicit extend)
  const finalAttrs =
    // $FlowFixMe
    isTargetStyledComp && target.attrs
      ? Array.prototype.concat(target.attrs, attrs).filter(Boolean)
      : attrs;

  const componentStyle = new ComponentStyle(
    isTargetStyledComp
      ? // fold the underlying StyledComponent rules up (implicit extend)
        // $FlowFixMe
        target.componentStyle.rules.concat(rules)
      : rules,
    finalAttrs,
    styledComponentId
  );

  // TODO: it might be better to inline the definition of function StyledComponent in here,
  // closing over the WrappedStyledComponent value, instead of using this anonymous wrapper.
  // This would allow us to completely flatten the render tree to only take up a single node
  // per styled component, and also stop overwriting forwardedComponent or forwardedRef in user props.
  //
  // If the code gets big we can always just refactor it into a custom hook and call from the inlined wrapper.
  // wait a minute... 💡
  /**
   * forwardRef creates a new interim component, which we'll take advantage of
   * instead of extending ParentComponent to create _another_ interim class
   */
  // $FlowFixMe this is a forced cast to merge it StyledComponentWrapperProperties
  const WrappedStyledComponent: StyledComponentWrapper<*, *> = React.forwardRef((props, ref) => (
    <ParentComponent {...props} forwardedComponent={WrappedStyledComponent} forwardedRef={ref} />
  ));

  WrappedStyledComponent.attrs = finalAttrs;
  WrappedStyledComponent.componentStyle = componentStyle;
  WrappedStyledComponent.displayName = displayName;

  WrappedStyledComponent.foldedComponentIds = isTargetStyledComp
    ? // $FlowFixMe
      Array.prototype.concat(target.foldedComponentIds, target.styledComponentId)
    : EMPTY_ARRAY;

  WrappedStyledComponent.styledComponentId = styledComponentId;

  // fold the underlying StyledComponent target up since we folded the styles
  WrappedStyledComponent.target = isTargetStyledComp
    ? // $FlowFixMe
      target.target
    : target;

  // $FlowFixMe
  WrappedStyledComponent.withComponent = function withComponent(tag: Target) {
    const { componentId: previousComponentId, ...optionsToCopy } = options;

    const newComponentId =
      previousComponentId &&
      `${previousComponentId}-${isTag(tag) ? tag : escape(getComponentName(tag))}`;

    const newOptions = {
      ...optionsToCopy,
      attrs: finalAttrs,
      componentId: newComponentId,
      ParentComponent,
    };

    return createStyledComponent(tag, newOptions, rules);
  };

  if (process.env.NODE_ENV !== 'production') {
    WrappedStyledComponent.warnTooManyClasses = createWarnTooManyClasses(displayName);
  }

  // $FlowFixMe
  WrappedStyledComponent.toString = () => `.${WrappedStyledComponent.styledComponentId}`;

  if (isClass) {
    hoist(WrappedStyledComponent, target, {
      // all SC-specific things should not be hoisted
      attrs: true,
      componentStyle: true,
      displayName: true,
      foldedComponentIds: true,
      styledComponentId: true,
      target: true,
      withComponent: true,
    });
  }

  return WrappedStyledComponent;
}

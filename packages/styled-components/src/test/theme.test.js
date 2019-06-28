// @flow
import React, { Component } from 'react';
import { renderIntoDocument } from 'react-dom/test-utils';
import TestRenderer from 'react-test-renderer';

import { resetStyled, expectCSSMatches } from './utils';
import ThemeProvider from '../models/ThemeProvider';
import withTheme from '../hoc/withTheme';

let styled;

describe('theming', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    styled = resetStyled();
  });

  it('should inject props.theme into a styled component', () => {
    const Comp = styled.div`
      color: ${props => props.theme.color};
    `;
    const theme = { color: 'black' };
    TestRenderer.create(
      <ThemeProvider theme={theme}>
        <Comp />
      </ThemeProvider>
    );
    expectCSSMatches(`.b { color:${theme.color}; }`);
  });

  it('should inject props.theme into a styled component multiple levels deep', () => {
    const Comp = styled.div`
      color: ${props => props.theme.color};
    `;
    const theme = { color: 'black' };
    TestRenderer.create(
      <ThemeProvider theme={theme}>
        <div>
          <div>
            <Comp />
          </div>
        </div>
      </ThemeProvider>
    );
    expectCSSMatches(`.b { color:${theme.color}; }`);
  });

  it('should properly allow a component to fallback to its default props when a theme is not provided', () => {
    const Comp1 = styled.div`
      color: ${props => props.theme.test.color};
    `;

    Comp1.defaultProps = {
      theme: {
        test: {
          color: 'purple',
        },
      },
    };
    TestRenderer.create(
      <div>
        <Comp1 />
      </div>
    );
    expectCSSMatches(`.b { color:purple; }`);
  });

  // https://github.com/styled-components/styled-components/issues/344
  it('should use ThemeProvider theme instead of defaultProps theme', () => {
    const Comp1 = styled.div`
      color: ${props => props.theme.test.color};
    `;

    Comp1.defaultProps = {
      theme: {
        test: {
          color: 'purple',
        },
      },
    };
    const theme = { test: { color: 'green' } };

    TestRenderer.create(
      <ThemeProvider theme={theme}>
        <Comp1 />
      </ThemeProvider>
    );
    expectCSSMatches(`.b { color:green; }`);
  });

  it('should properly allow a component to override the theme with a prop even if it is equal to defaultProps theme', () => {
    const Comp1 = styled.div`
      color: ${props => props.theme.test.color};
    `;

    Comp1.defaultProps = {
      theme: {
        test: {
          color: 'purple',
        },
      },
    };
    const theme = { test: { color: 'green' } };

    TestRenderer.create(
      <ThemeProvider theme={theme}>
        <Comp1 theme={{ test: { color: 'purple' } }} />
      </ThemeProvider>
    );
    expectCSSMatches(`.b { color:purple; }`);
  });

  it('should properly allow a component to override the theme with a prop', () => {
    const Comp = styled.div`
      color: ${props => props.theme.color};
    `;

    const theme = {
      color: 'purple',
    };

    TestRenderer.create(
      <div>
        <ThemeProvider theme={theme}>
          <Comp theme={{ color: 'red' }} />
        </ThemeProvider>
      </div>
    );
    expectCSSMatches(`.b { color:red; }`);
  });

  it('should only inject props.theme into styled components within its child component tree', () => {
    const Comp1 = styled.div`
      color: ${props => props.theme.color};
    `;
    const Comp2 = styled.div`
      background: ${props => props.theme.color};
    `;

    const theme = { color: 'black' };
    TestRenderer.create(
      <div>
        <ThemeProvider theme={theme}>
          <div>
            <Comp1 />
          </div>
        </ThemeProvider>
        <Comp2 />
      </div>
    );
    expectCSSMatches(`.c { color:${theme.color}; }`);
  });

  it('should inject props.theme into all styled components within the child component tree', () => {
    const Comp1 = styled.div`
      color: ${props => props.theme.color};
    `;
    const Comp2 = styled.div`
      background: ${props => props.theme.color};
    `;
    const theme = { color: 'black' };
    TestRenderer.create(
      <ThemeProvider theme={theme}>
        <div>
          <div>
            <Comp1 />
          </div>
          <Comp2 />
        </div>
      </ThemeProvider>
    );
    expectCSSMatches(`.c { color:${theme.color}; } .d { background:${theme.color}; }`);
  });

  it('should inject new CSS when the theme changes', () => {
    const Comp = styled.div`
      color: ${props => props.theme.color};
    `;
    const originalTheme = { color: 'black' };
    const newTheme = { color: 'blue' };
    let theme = originalTheme;
    // Force render the component
    const renderComp = () => {
      TestRenderer.create(
        <ThemeProvider theme={theme}>
          <Comp />
        </ThemeProvider>
      );
    };
    renderComp();
    const initialCSS = expectCSSMatches(`.b { color:${theme.color}; }`);
    // Change the theme
    theme = newTheme;
    renderComp();
    expectCSSMatches(`${initialCSS} .c { color:${newTheme.color}; }`);
  });

  it('should properly render with the same theme from default props on re-render', () => {
    const Comp1 = styled.div`
      color: ${props => props.theme.color};
    `;

    Comp1.defaultProps = {
      theme: {
        color: 'purple',
      },
    };

    const jsx = <Comp1 />;

    const wrapper = TestRenderer.create(jsx);
    expectCSSMatches(`.b { color:purple; }`);

    wrapper.update(jsx);
    expectCSSMatches(`.b { color:purple; }`);
  });

  it('should properly update style if theme is changed', () => {
    const Comp1 = styled.div`
      color: ${props => props.theme.color};
    `;

    const wrapper = TestRenderer.create(
      <ThemeProvider
        theme={{
          color: 'purple',
        }}
      >
        <Comp1 />
      </ThemeProvider>
    );
    expectCSSMatches(`.b { color:purple; }`);

    wrapper.update(
      <ThemeProvider
        theme={{
          color: 'pink',
        }}
      >
        <Comp1 />
      </ThemeProvider>
    );
    expectCSSMatches(`.b { color:purple; } .c { color:pink; }`);
  });

  it('should properly update style if props used in styles is changed', () => {
    const Comp1 = styled.div`
      color: ${props => props.theme.color};
      z-index: ${props => props.zIndex}px;
    `;

    Comp1.defaultProps = {
      zIndex: 0,
    };

    const wrapper = TestRenderer.create(
      <ThemeProvider
        theme={{
          color: 'purple',
        }}
      >
        <Comp1 />
      </ThemeProvider>
    );
    let expectedStyles = `.b { color:purple; z-index:0px; }`;
    expectCSSMatches(expectedStyles);

    wrapper.update(
      <ThemeProvider
        theme={{
          color: 'pink',
        }}
      >
        <Comp1 />
      </ThemeProvider>
    );
    expectedStyles = `${expectedStyles} .c { color:pink; z-index:0px; }`;
    expectCSSMatches(expectedStyles);

    Comp1.defaultProps.zIndex = 1;
    wrapper.update(
      <ThemeProvider
        theme={{
          color: 'pink',
        }}
      >
        <Comp1 />
      </ThemeProvider>
    );
    expectCSSMatches(`${expectedStyles} .d { color:pink; z-index:1px; }`);
  });

  it('should change the classnames when the theme changes', () => {
    const Comp = styled.div`
      color: ${props => props.theme.color};
    `;

    const originalTheme = { color: 'black' };
    const newTheme = { color: 'blue' };

    const Theme = ({ theme }) => (
      <ThemeProvider theme={theme}>
        <Comp someProps={theme} />
      </ThemeProvider>
    );

    const wrapper = TestRenderer.create(<Theme theme={originalTheme} />);

    expectCSSMatches(`.b { color:${originalTheme.color}; }`);
    expect(wrapper.root.findByType('div').props.className).toBe('sc-a b');

    // Change theme
    wrapper.update(Theme({ theme: newTheme }));

    expectCSSMatches(`.b { color:${originalTheme.color}; } .c { color:${newTheme.color}; }`);

    expect(wrapper.root.findByType('div').props.className).toBe('sc-a c');
  });

  it('should inject props.theme into a component that uses withTheme hoc', () => {
    const originalTheme = { color: 'black' };

    const MyDiv = ({ theme }) => <div>{theme.color}</div>;
    const MyDivWithTheme = withTheme(MyDiv);

    const wrapper = TestRenderer.create(
      <ThemeProvider theme={originalTheme}>
        <MyDivWithTheme />
      </ThemeProvider>
    );

    expect(wrapper.root.findByType('div').props.children).toBe('black');
  });

  it('should properly update theme prop on hoc component when theme is changed', () => {
    const MyDiv = ({ theme }) => <div>{theme.color}</div>;
    const MyDivWithTheme = withTheme(MyDiv);

    const originalTheme = { color: 'black' };
    const newTheme = { color: 'blue' };

    const Theme = ({ theme }) => (
      <ThemeProvider theme={theme}>
        <MyDivWithTheme />
      </ThemeProvider>
    );

    const wrapper = TestRenderer.create(<Theme key="a" theme={originalTheme} />);
    expect(wrapper.root.findByType('div').props.children).toBe('black');

    // Change theme
    wrapper.update(<Theme key="a" theme={newTheme} />);

    expect(wrapper.root.findByType('div').props.children).toBe('blue');
  });

  // https://github.com/styled-components/styled-components/issues/445
  it('should use ThemeProvider theme instead of defaultProps theme after initial render', () => {
    const Text = styled.div`
      color: ${props => props.theme.color};
    `;

    Text.defaultProps = {
      theme: {
        color: 'purple',
      },
    };

    const Theme = props => (
      <ThemeProvider theme={{ color: 'green' }}>
        <Text {...props} />
      </ThemeProvider>
    );

    const wrapper = TestRenderer.create(<Theme key="a" prop="foo" />);
    expectCSSMatches('.b { color:green; } ');

    wrapper.update(<Theme key="a" prop="bar" />);
    expectCSSMatches('.b { color:green; } ');
  });

  // https://github.com/styled-components/styled-components/issues/596
  it('should hoist static properties when using withTheme', () => {
    class MyComponent extends Component<*, *> {
      static myStaticProperty: boolean = true;
    }

    const MyComponentWithTheme = withTheme(MyComponent);

    expect(MyComponentWithTheme.myStaticProperty).toBe(true);
  });

  it('should only pass the theme prop', () => {
    class Comp extends Component<*, *> {
      render() {
        return <div />;
      }
    }

    const CompWithTheme = withTheme(Comp);

    const wrapper = TestRenderer.create(
      <ThemeProvider theme={{}}>
        <CompWithTheme />
      </ThemeProvider>
    );

    const inner = wrapper.root.findByType(Comp);

    expect(Object.keys(inner.props).length).toEqual(1);
    expect(inner.props).toEqual({ theme: {} });
  });

  it('should forward refs', () => {
    class Comp extends Component<*, *> {
      render() {
        return <div {...this.props} />;
      }
    }

    const CompWithTheme = withTheme(Comp);
    const ref = React.createRef();

    renderIntoDocument(
      <ThemeProvider theme={{}}>
        <CompWithTheme ref={ref} />
      </ThemeProvider>
    );

    expect(ref.current).toBeInstanceOf(Comp);
  });

  // https://github.com/styled-components/styled-components/issues/1130
  it('should not break without a ThemeProvider if it has a defaultTheme', () => {
    const MyDiv = ({ theme }) => <div>{theme.color}</div>;
    const MyDivWithTheme = withTheme(MyDiv);
    const theme = { color: 'red' };
    const newTheme = { color: 'blue' };

    const consoleWarn = console.warn;

    jest
      .spyOn(console, 'warn')
      .mockImplementation(msg =>
        !msg.includes('You are not using a ThemeProvider') ? consoleWarn(msg) : null
      );

    MyDivWithTheme.defaultProps = { theme };

    const wrapper = TestRenderer.create(<MyDivWithTheme />);

    expect(wrapper.root.findByType('div').props.children).toBe('red');

    // Change theme
    MyDivWithTheme.defaultProps = { theme: newTheme };

    // Change theme
    wrapper.update(<MyDivWithTheme />);

    expect(wrapper.root.findByType('div').props.children).toBe('blue');
  });

  // https://github.com/styled-components/styled-components/issues/1776
  it('should allow module objects to be passed as themes', () => {
    const theme = {
      borderRadius: '2px',
      palette: {
        black: '#000',
        white: '#fff',
        // Flow has limited support for Symbols and computed properties;
        // see <https://github.com/facebook/flow/issues/3258>.
        // $FlowFixMe
        [Symbol.toStringTag]: 'Module',
      },
      // Flow has limited support for Symbols and computed properties;
      // see <https://github.com/facebook/flow/issues/3258>.
      // $FlowFixMe
      [Symbol.toStringTag]: 'Module',
    };

    const Comp1 = styled.div`
      background-color: ${({ theme }) => theme.palette.white};
      color: ${({ theme }) => theme.palette.black};
    `;

    expect(() => {
      TestRenderer.create(
        <ThemeProvider theme={theme}>
          <Comp1 />
        </ThemeProvider>
      );
    }).not.toThrow('plain object');

    expectCSSMatches(`.b {background-color:${theme.palette.white};color:${theme.palette.black};}`);
  });

  it('should allow other complex objects to be passed as themes', () => {
    class Theme {
      borderRadius: string;

      constructor(borderRadius) {
        this.borderRadius = borderRadius;
      }
    }

    const theme = new Theme('2px');

    const Comp1 = styled.div`
      border-radius: ${({ theme }) => theme.borderRadius};
    `;

    TestRenderer.create(
      <ThemeProvider theme={theme}>
        <Comp1 />
      </ThemeProvider>
    );

    expectCSSMatches(`.b {border-radius:${theme.borderRadius};}`);
  });

  it('should not allow the theme to be null', () => {
    expect(() => {
      // HACK: work around the problem without changing the snapshots
      // these tests need to be changed to use error boundaries instead
      const mock = jest.spyOn(console, 'error').mockImplementation(() => {});
      TestRenderer.create(
        // $FlowInvalidInputTest
        <ThemeProvider theme={null}>
          <div />
        </ThemeProvider>
      );
      expect(mock).toHaveBeenCalledTimes(1);
    }).toThrowErrorMatchingSnapshot();
  });

  it('should not allow the theme to be an array', () => {
    expect(() => {
      // HACK: work around the problem without changing the snapshots
      // these tests need to be changed to use error boundaries instead
      const mock = jest.spyOn(console, 'error').mockImplementation(() => {});
      TestRenderer.create(
        // $FlowInvalidInputTest
        <ThemeProvider theme={['a', 'b', 'c']}>
          <div />
        </ThemeProvider>
      );
      expect(mock).toHaveBeenCalledTimes(1);
    }).toThrowErrorMatchingSnapshot();
  });

  it('should not allow the theme to be a non-object', () => {
    expect(() => {
      // HACK: work around the problem without changing the snapshots
      // these tests need to be changed to use error boundaries instead
      const mock = jest.spyOn(console, 'error').mockImplementation(() => {});
      TestRenderer.create(
        // $FlowInvalidInputTest
        <ThemeProvider theme={42}>
          <div />
        </ThemeProvider>
      );
      expect(mock).toHaveBeenCalledTimes(1);
    }).toThrowErrorMatchingSnapshot();
  });

  it('should warn when trying to access theme in interpolations without a provided theme', () => {
    const Comp = styled.div`
      color: ${props => props.theme.color};
    `;

    TestRenderer.create(<Comp />);
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error.mock.calls[0][0]).toMatchInlineSnapshot(
      `"Component styled.div (.sc-a) uses \\"props.theme\\" in its styles but no theme was provided via prop or ThemeProvider."`
    );

    /* eslint-disable dot-notation */
    const Comp2 = styled.div`
      color: ${props => props.theme['color']};
    `;
    /* eslint-enable dot-notation */

    const wrapper = TestRenderer.create(<Comp2 />);
    expect(console.error).toHaveBeenCalledTimes(2);
    expect(console.error.mock.calls[1][0]).toMatchInlineSnapshot(
      `"Component styled.div (.sc-c) uses \\"props.theme\\" in its styles but no theme was provided via prop or ThemeProvider."`
    );

    // should only error once
    wrapper.update(<Comp2>Hi</Comp2>);
    expect(console.error).toHaveBeenCalledTimes(2);
  });
});

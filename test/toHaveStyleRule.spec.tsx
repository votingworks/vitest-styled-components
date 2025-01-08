import { render } from '@testing-library/react';
import React from 'react';
import { css, styled, ThemeProvider } from 'styled-components';
import { expect, test } from 'vitest';
import { Options, Value } from '../src/toHaveStyleRule.js';

function rendered(component: React.ReactNode) {
  return render(component).container.firstChild;
}

function assertHasStyleRule(component: React.ReactNode, property: string, value: Value, options?: Options) {
  expect(rendered(component)).toHaveStyleRule(property, value, options);
}

function assertDoesNotHaveStyleRule(component: React.ReactNode, property: string, value?: Value) {
  expect(rendered(component)).not.toHaveStyleRule(property, value);
}

test('null', () => {
  expect(null).not.toHaveStyleRule('a', 'b');
});

test('non-styled', () => {
  assertDoesNotHaveStyleRule(<div />, 'a', 'b');
});

test('message when rules not found', () => {
  expect(() => assertHasStyleRule(<div />, 'color', 'black'))
    .toThrowError('No style rules found on passed element');
});

test('message when rules not found using options', () => {
  const Button = styled.button`
    color: red;
  `;

  assertHasStyleRule(<Button />, 'color', 'red');
  expect(() =>
    assertHasStyleRule(<Button />, 'color', 'red', {
      media: '(max-width:640px)',
      modifier: ':hover',
    })
  ).toThrowError('No style rules found on passed element using options');
});

test('message when property not found', () => {
  const Button = styled.button`
    color: red;
  `;

  expect(() => assertHasStyleRule(<Button />, 'background-color', 'black'))
    .toThrowError(`Property 'background-color' not found in style rules`);
});

test('message when value does not match', () => {
  const Wrapper = styled.section`
    background: orange;
  `;

  expect(() => {
    assertHasStyleRule(<Wrapper />, 'background', 'red');
  }).toThrowError(`Value mismatch for property 'background'`);
});

test('non existing', () => {
  expect(() => {
    expect(render(<div />)).toHaveStyleRule('background', 'papayawhip');
  }).toThrowError('No style rules found on passed element');
});

test('basic', () => {
  const Wrapper = styled.section`
    padding: 4em;
    background: papayawhip;
  `;

  assertHasStyleRule(<Wrapper />, 'background', 'papayawhip');
});

test('regex', () => {
  const Wrapper = styled.section`
    padding: 4em;
    background: papayawhip;
  `;

  assertHasStyleRule(<Wrapper />, 'background', /^p/);
});

test('complex string', () => {
  const Wrapper = styled.section`
    border: 1px solid rgba(0, 0, 0, 0.125);
  `;

  assertHasStyleRule(<Wrapper />, 'border', '1px solid rgba(0,0,0,0.125)');
});

test('undefined', () => {
  const Button = styled.button`
    cursor: ${({ disabled }) => !disabled && 'pointer'};
    opacity: ${({ disabled }) => disabled && '.65'};
  `;

  assertHasStyleRule(<Button />, 'opacity', undefined);
  assertHasStyleRule(<Button />, 'cursor', 'pointer');
  assertHasStyleRule(<Button disabled />, 'opacity', '.65');
  assertHasStyleRule(<Button disabled />, 'cursor', undefined);
});

test('negated ".not" modifier with no value', () => {
  const Button = styled.button`
    opacity: ${({ disabled }) => disabled && '.65'};
  `;

  assertDoesNotHaveStyleRule(<Button />, 'opacity');
  assertHasStyleRule(<Button disabled />, 'opacity', '.65');
});

test('negated ".not" modifier with value', () => {
  const Button = styled.button`
    opacity: 0.65;
  `;

  assertDoesNotHaveStyleRule(<Button />, 'opacity', '0.50');
  assertDoesNotHaveStyleRule(<Button />, 'opacity', '');
  assertDoesNotHaveStyleRule(<Button />, 'opacity', null);
  assertDoesNotHaveStyleRule(<Button />, 'opacity', false);
  expect(() => {
    assertHasStyleRule(<Button />, 'opacity', undefined);
  }).toThrowError();
});

test('negated ".not" modifier fails when rule present with no value being asserted', () => {
  const Button = styled.button`
    opacity: 0.65;
  `;

  assertHasStyleRule(<Button />, 'opacity', '0.65');
  expect(() => {
    assertDoesNotHaveStyleRule(<Button />, 'opacity');
  }).toThrowError();
});

test('asymmetric matchers', () => {
  const Button = styled.button<{ $transparent?: boolean }>`
    border: 0.1em solid ${({ $transparent }) => ($transparent ? 'transparent' : 'black')};
  `;

  assertHasStyleRule(<Button />, 'border', expect.any(String));
  assertHasStyleRule(<Button />, 'border', expect.stringMatching('solid'));
  assertHasStyleRule(<Button />, 'border', expect.stringMatching(/^0.1em/));
  assertHasStyleRule(<Button />, 'border', expect.stringContaining('black'));
  assertDoesNotHaveStyleRule(<Button $transparent />, 'border', expect.stringContaining('black'));
  assertHasStyleRule(<Button $transparent />, 'border', expect.stringContaining('transparent'));
  assertDoesNotHaveStyleRule(<Button />, 'color', expect.any(String));
  assertDoesNotHaveStyleRule(<Button />, 'color', expect.anything());
});

test('any component', () => {
  const Link = ({ className, children }: {
    className?: string;
    children?: React.ReactNode;
  }) => <a className={className}>{children}</a>;

  const StyledLink = styled(Link)`
    color: palevioletred;
    font-weight: bold;
  `;

  assertHasStyleRule(<StyledLink>Styled, exciting Link</StyledLink>, 'color', 'palevioletred');
});

test('styled child', () => {
  const Parent = styled.div`
    color: red;
  `;

  const StyledChild = styled(Parent)`
    padding: 0;
  `;

  assertHasStyleRule(<StyledChild />, 'color', 'red');
});

test('theming', () => {
  const Button = styled.button<{ theme: { main: string } }>`
    font-size: 1em;
    margin: 1em;
    padding: 0.25em 1em;
    border-radius: 3px;

    color: ${(props) => props.theme.main};
    border: 2px solid ${(props) => props.theme.main};
  `;

  Button.defaultProps = {
    theme: {
      main: 'palevioletred',
    },
  };

  const theme = {
    main: 'mediumseagreen',
  };

  assertHasStyleRule(<Button>Normal</Button>, 'color', 'palevioletred');

  const component = (
    <ThemeProvider theme={theme}>
      <Button>Themed</Button>
    </ThemeProvider>
  );

  assertHasStyleRule(component, 'color', 'mediumseagreen');
});

test('at rules', () => {
  const Wrapper = styled.section`
    color: red;
    @media (max-width: 640px) {
      color: green;
    }
    @media (min-width: 200px) and (max-width: 640px) {
      color: blue;
    }
    @media (min-width: 576px) and (max-width: 767.98px) {
      color: red;
    }
    @media (min-width: calc(768px + 1px)) and (max-width:calc(1024px + 1px)) {
      color: purple;
    }
  `;

  assertHasStyleRule(<Wrapper />, 'color', 'red');
  assertHasStyleRule(<Wrapper />, 'color', 'green', {
    media: '(max-width:640px)',
  });
  assertHasStyleRule(<Wrapper />, 'color', 'green', {
    media: '(max-width: 640px)',
  });
  assertHasStyleRule(<Wrapper />, 'color', 'blue', {
    media: '(min-width:200px) and (max-width:640px)',
  });
  assertHasStyleRule(<Wrapper />, 'color', 'blue', {
    media: '(min-width: 200px) and (max-width: 640px)',
  });
  assertHasStyleRule(<Wrapper />, 'color', 'blue', {
    media: '(min-width: 200px) and (max-width:640px)',
  });
  assertHasStyleRule(<Wrapper />, 'color', 'blue', {
    media: '(min-width:200px) and (max-width: 640px)',
  });
  assertHasStyleRule(<Wrapper />, 'color', 'red', {
    media: '(min-width: 576px) and (max-width: 767.98px)',
  });
  assertHasStyleRule(<Wrapper />, 'color', 'purple', {
    media: '(min-width: calc(768px + 1px)) and (max-width:calc(1024px + 1px))',
  });
});

test('selector modifiers', () => {
  const Link = styled.a`
    color: white;

    &:hover {
      color: blue;
    }
    &::after {
      color: red;
    }
    &[href*='somelink.com'] {
      color: green;
    }
    > div {
      color: yellow;
    }
    span {
      color: purple;
    }
    .child {
      color: orange;
    }
    &.self {
      color: black;
    }

    .one,
    .two {
      color: olive;
    }

    ~ div {
      &.one,
      &.two {
        color: pink;
      }
    }

    + div {
      .one,
      .two {
        color: salmon;
      }
    }

    .parent & {
      color: red;
    }

    && {
      color: fuchsia;
    }

    &&& {
      color: olive;
    }

    & & {
      color: deepskyblue;
    }
  `;

  assertHasStyleRule(<Link />, 'color', 'white');
  assertHasStyleRule(<Link />, 'color', 'blue', { modifier: ':hover' });
  assertHasStyleRule(<Link />, 'color', 'red', { modifier: '::after' });
  assertHasStyleRule(<Link />, 'color', 'green', { modifier: "[href*='somelink.com']" });
  assertHasStyleRule(<Link />, 'color', 'yellow', { modifier: '> div' });
  assertHasStyleRule(<Link />, 'color', 'purple', { modifier: 'span' });
  assertHasStyleRule(<Link />, 'color', 'purple', { modifier: ' span' });
  assertHasStyleRule(<Link />, 'color', 'orange', { modifier: '.child' });
  assertHasStyleRule(<Link />, 'color', 'orange', { modifier: ' .child' });
  assertHasStyleRule(<Link />, 'color', 'black', { modifier: '&.self' });
  assertHasStyleRule(<Link />, 'color', 'olive', { modifier: '.one' });
  assertHasStyleRule(<Link />, 'color', 'olive', { modifier: '.two' });
  assertHasStyleRule(<Link />, 'color', 'pink', { modifier: '~ div.one' });
  assertHasStyleRule(<Link />, 'color', 'salmon', { modifier: '+ div .two' });
  assertHasStyleRule(<Link />, 'color', 'red', { modifier: '.parent &' });
  assertHasStyleRule(<Link />, 'color', 'fuchsia', { modifier: '&&' });
  assertHasStyleRule(<Link />, 'color', 'olive', { modifier: '&&&' });
  assertHasStyleRule(<Link />, 'color', 'deepskyblue', { modifier: '& &' });
});

test('component modifiers', () => {
  const Text = styled.span`
    color: grey;
  `;

  const Link = styled.a`
    color: white;

    ${Text} {
      color: blue;
    }

    > ${Text} span {
      color: green;
    }

    ${Text} & {
      color: purple;
    }
  `;

  assertHasStyleRule(<Link />, 'color', 'white');
  assertHasStyleRule(<Text />, 'color', 'grey');
  assertHasStyleRule(
    <Link>
      <Text />
    </Link>,
    'color',
    'blue',
    { modifier: css`${Text}` }
  );
  assertHasStyleRule(
    <Link>
      <Text />
    </Link>,
    'color',
    'green',
    { modifier: css`> ${Text} span` }
  );
  assertHasStyleRule(
    <Link>
      <Text />
    </Link>,
    'color',
    'purple',
    { modifier: css`${Text} &` }
  );
});

test('nested', () => {
  const Wrapper = styled.section`
    padding: 4em;
    background: papayawhip;
  `;

  const MyComponent = () => <Wrapper />;

  assertHasStyleRule(<MyComponent />, 'background', 'papayawhip');
});

test('nested with styling', () => {
  const Wrapper = styled.section`
    background: papayawhip;
  `;
  const Children = styled.span`
    background: gray;
  `;
  const MyComponent = ({ className, children }: { className?: string; children?: React.ReactNode }) => (
    <Wrapper className={className}>{children}</Wrapper>
  );
  const MyStyledComponent = styled(MyComponent)`
    color: red;
  `;
  const ParentComponent = ({ className }: { className?: string }) => (
    <MyStyledComponent className={className}>
      <Children className='test-class' />
    </MyStyledComponent>
  );

  assertHasStyleRule(<MyStyledComponent />, 'color', 'red');
  assertHasStyleRule(<MyStyledComponent className='test-class' />, 'color', 'red');
  expect(render(<ParentComponent />).container.firstChild?.firstChild).toHaveStyleRule('background', 'gray');
});

test('empty children', () => {
  const Wrapper = styled.section`
    padding: 4em;
    background: papayawhip;
  `;

  Wrapper.defaultProps = {
    children: '',
  };

  assertHasStyleRule(<Wrapper />, 'background', 'papayawhip');
});

test('custom display name prefix', () => {
  const Text = styled.span.withConfig({ displayName: 'Text__sc' })`
    color: red;
  `;
  const Comp = styled(Text).withConfig({ displayName: 'Comp__Sub-sc' })`
    background: papayawhip;
  `;
  assertHasStyleRule(<Comp />, 'background', 'papayawhip');
  assertHasStyleRule(<Comp />, 'color', 'red');
});

test('supports snake case display name prefix', () => {
  const Text = styled.span`
    color: blue;
  `;
  Text.styledComponentId = `test-case-${Text.styledComponentId}`;

  assertHasStyleRule(<Text />, 'color', 'blue');
});

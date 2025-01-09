# Vitest Styled Components

A set of utilities for testing [Styled Components](https://github.com/styled-components/styled-components) with [Vitest](https://vitest.dev/).
This package improves the snapshot testing experience and provides a brand new matcher to make expectations on the style rules.

This repository was forked from [jest-styled-components](https://github.com/styled-components/jest-styled-components) and adapted to work with Vitest. The original package used the MIT license, but this one uses GPL-3.0.

# Quick Start

## Installation

```sh
npm install --dev vitest-styled-components
```

## Usage

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  setupFiles: ['test/setup.ts'],
});

// test/setup.ts
import { beforeEach, expect } from 'vitest';
import {
  buildToHaveStyleRule,
  resetStyleSheet,
  type ToHaveStyleRuleMatchers,
} from 'vitest-styled-components';

beforeEach(resetStyleSheet);
expect.extend({ toHaveStyleRule: buildToHaveStyleRule(expect) });

declare module 'vitest' {
  interface Assertion<T = any> extends ToHaveStyleRuleMatchers {}
  interface AsymmetricMatchersContaining extends ToHaveStyleRuleMatchers {}
}

// src/component.test.ts
import { render } from '@testing-library/react';
import React from 'react';
import styled from 'styled-components';

const Button = styled.button`
  color: red;
`;

test('it works', () => {
  const element = render(<Button />).container.firstChild;
  expect(element).toHaveStyleRule('color', 'red');
});
```

The `toHaveStyleRule` matcher is useful to test if a given rule is applied to a
component. The first argument is the expected property, the second is the
expected value which can be a String, RegExp, Vitest asymmetric matcher or
`undefined`. When used with a negated ".not" modifier the second argument is
optional and can be omitted.

```ts
const Button = styled.button`
  color: red;
  border: 0.05em solid ${props => props.transparent ? 'transparent' : 'black'};
  cursor: ${props => !props.disabled && 'pointer'};
  opacity: ${props => props.disabled && '.65'};
`;

test('it applies default styles', () => {
  const element = render(<Button />).container.firstChild;
  expect(element).toHaveStyleRule('color', 'red');
  expect(element).toHaveStyleRule('border', '0.05em solid black');
  expect(element).toHaveStyleRule('cursor', 'pointer');
  expect(element).not.toHaveStyleRule('opacity'); // equivalent of the following two
  expect(element).not.toHaveStyleRule('opacity', expect.any(String));
  expect(element).toHaveStyleRule('opacity', undefined);
});

test('it applies styles according to passed props', () => {
  const element = render(<Button disabled transparent />).container.firstChild;
  expect(element).toHaveStyleRule(
    'border',
    expect.stringContaining('transparent')
  );
  expect(element).toHaveStyleRule('cursor', undefined);
  expect(element).toHaveStyleRule('opacity', '.65');
});
```

The matcher supports an optional third `options` parameter which makes it possible to search for rules nested within an [At-rule](https://developer.mozilla.org/en/docs/Web/CSS/At-rule) (see [media](https://developer.mozilla.org/en-US/docs/Web/CSS/@media) and [supports](https://developer.mozilla.org/en-US/docs/Web/CSS/@supports)) or to add modifiers to the class selector.

```ts
const Button = styled.button`
  @media (max-width: 640px) {
    &:hover {
      color: red;
    }
  }
`;

test('it works', () => {
  const element = render(<Button />).container.firstChild;
  expect(element).toHaveStyleRule('color', 'red', {
    media: '(max-width:640px)',
    modifier: ':hover',
  });
});
```

If a rule is nested within another styled-component, the `modifier` option can
be used with the [`css`](https://www.styled-components.com/docs/api#css) helper
to target the nested rule.

```ts
const Button = styled.button`
  color: red;
`;

const ButtonList = styled.div`
  display: flex;

  ${Button} {
    flex: 1 0 auto;
  }
`;

import { css } from 'styled-components';

test('nested buttons are flexed', () => {
  const element = render(
    <ButtonList>
      <Button />
    </ButtonList>
  ).container.firstChild;
  expect(element).toHaveStyleRule('flex', '1 0 auto', {
    modifier: css`${Button}`,
  });
});
```

You can take a similar approach when you have classNames that override styles

```ts
const Button = styled.button`
  background-color: red;
  
  &.override {
    background-color: blue;
  }
`;
const element =
  render(<Button className='override'>I am a button!</Button>).container
    .firstChild;

expect(element).toHaveStyleRule('background-color', 'blue', {
  modifier: '&.override',
});
```

It checks the style rules applied to the root component it receives, therefore
to make assertions on components further in the tree they must be provided
separately.

> Note: for `@testing-library/react`, you'll need to pass the first child to check the top-level component's style. To check the styles of deeper components, you can use one of the `getBy*` methods to find the element (e.g. `expect(getByTestId('styled-button')).toHaveStyleRule('color', 'blue')`)

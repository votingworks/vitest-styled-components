// TODO: replace @adobe/css-tools with css-tree
import css, { type CssStylesheetAST } from '@adobe/css-tools';
import * as cssTree from 'css-tree';
import * as assert from 'node:assert';
import { __PRIVATE__, ServerStyleSheet } from 'styled-components';
import type { ExpectStatic } from 'vitest';
import { Value } from './toHaveStyleRule.js';

if (!__PRIVATE__) {
  throw new Error('Could neither find styled-components secret internals');
}

// @ts-ignore - `mainSheet` is the new API, `masterSheet` is the old one
const { mainSheet, masterSheet } = __PRIVATE__;

const sheet = mainSheet || masterSheet;

const isServer = () => typeof document === 'undefined';

export function resetStyleSheet() {
  if (!isServer()) {
    const scStyles = document.querySelectorAll('style[data-styled-version]');
    for (const item of scStyles) {
      item.parentElement?.removeChild(item);
    }
  }

  sheet.gs = {};
  sheet.names = new Map();
  sheet.clearTag();
}

/**
 * Compare two CSS property values for equality.
 *
 * @example
 *
 * ```ts
 * areCssValuesEqual('1px solid red', '1px solid red');            // true
 * areCssValuesEqual('1px solid red', '1px solid blue');           // false
 * areCssValuesEqual('rgba(0, 0, 0, 0.5)', 'rgba(0,0,0,0.5)'); // true
 * ```
 */
export function areCssValuesEqual(a: string, b: string): boolean {
  return areCssRulesEqual(`* { prop: ${a}; }`, `* { prop: ${b}; }`);
}

/**
 * Compare two CSS media queries for equality.
 *
 * @example
 *
 * ```ts
 * areCssMediaQueriesEqual('(min-width: 100px)', '(min-width: 100px)'); // true
 * areCssMediaQueriesEqual('(min-width: 100px)', '(min-width: 200px)'); // false
 * ```
 */
export function areCssMediaQueriesEqual(a: string, b: string): boolean {
  return areCssRulesEqual(`@media ${a} {}`, `@media ${b} {}`);
}

/**
 * Compare two CSS supports queries for equality.
 *
 * @example
 *
 * ```ts
 * areCssSupportsEqual('(display: grid)', '(display: grid)'); // true
 * areCssSupportsEqual('(display: grid)', '(display: flex)'); // false
 * ```
 */
export function areCssSupportsEqual(a: string, b: string): boolean {
  return areCssRulesEqual(`@supports ${a} {}`, `@supports ${b} {}`);
}

function areCssRulesEqual(a: string, b: string): boolean {
  const astA = cssTree.parse(a, { parseValue: true });
  const astB = cssTree.parse(b, { parseValue: true });
  try {
    assert.deepEqual(astA, astB);
    return true;
  } catch (error) {
    return false;
  }
}

const getHTML = () => (isServer() ? new ServerStyleSheet().getStyleTags() : sheet.toString());

const extract = (regex: RegExp): string => {
  let style = '';
  let matches: RegExpExecArray | null;

  const html = getHTML();
  while ((matches = regex.exec(html)) !== null) {
    style += `${matches[1]} `;
  }

  return style.trim();
};

const getStyle = () => extract(/^(?!data-styled\.g\d+.*?\n)(.*)?\n/gm);
export const getCSS = (): CssStylesheetAST => css.parse(getStyle());

export const getHashes = () => {
  const hashes = new Set();

  for (const [mainHash, childHashSet] of sheet.names) {
    hashes.add(mainHash);

    for (const childHash of childHashSet) hashes.add(childHash);
  }

  return Array.from(hashes);
};

export function buildReturnMessage(
  pass: boolean,
  property: string,
  received: unknown,
  expected: Value,
): () => string {
  return () =>
    `${(
      !received && !pass
        ? `Property '${property}' not found in style rules`
        : `Value mismatch for property '${property}'`
    )}\n\n`
    + 'Expected\n'
    + `  ${(`${property}: ${expected}`)}\n`
    + 'Received:\n'
    + `  ${(`${property}: ${received}`)}`;
}

export function matcherTest(expect: ExpectStatic, received: unknown, expected: Value, isNot: boolean): boolean {
  // when negating, assert on existence of the style, rather than the value
  if (isNot && expected === undefined) {
    return received !== undefined;
  }

  try {
    const matcher = expected instanceof RegExp ? expect.stringMatching(expected) : expected;

    if (typeof received === 'string' && typeof matcher === 'string') {
      return areCssValuesEqual(received, matcher);
    }

    expect(received).toEqual(matcher);
    return true;
  } catch (error) {
    return false;
  }
}

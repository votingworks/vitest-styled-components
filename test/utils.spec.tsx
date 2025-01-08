import { render } from '@testing-library/react';
import React from 'react';
import { __PRIVATE__, styled } from 'styled-components';
import { expect, test } from 'vitest';
import { getHashes, resetStyleSheet } from '../src/utils.js';

// @ts-ignore
const { mainSheet, masterSheet } = __PRIVATE__;
const sheet = mainSheet || masterSheet;

test('extracts hashes', () => {
  sheet.names = new Map([
    ['sc-1', new Set(['a'])],
    ['sc-2', new Set(['b', 'c'])],
    ['sc-3', new Set(['d', 'e'])],
  ]);

  expect(getHashes()).toEqual(['sc-1', 'a', 'sc-2', 'b', 'c', 'sc-3', 'd', 'e']);
});

test('resets style sheets', () => {
  const Component = styled.div`
    background-color: orange;
  `;

  render(<Component />);

  expect(
    document.querySelectorAll('style[data-styled-version]').length
  ).not.toBe(0);
  expect(sheet.names.size).not.toBe(0);

  resetStyleSheet();

  expect(
    document.querySelectorAll('style[data-styled-version]').length
  ).toBe(0);
  expect(sheet.names.size).toBe(0);
});

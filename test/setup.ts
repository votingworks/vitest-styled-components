import { beforeEach, expect } from 'vitest';
import { buildToHaveStyleRule, resetStyleSheet } from '../src/index.js';

beforeEach(resetStyleSheet);
expect.extend({ toHaveStyleRule: buildToHaveStyleRule(expect) });

import { ToHaveStyleRuleMatchers } from '../src/toHaveStyleRule.js';

declare module 'vitest' {
  interface Assertion<T = any> extends ToHaveStyleRuleMatchers {}
  interface AsymmetricMatchersContaining extends ToHaveStyleRuleMatchers {}
}

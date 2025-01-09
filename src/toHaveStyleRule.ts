import { CssAtRuleAST, CssDeclarationAST, CssStylesheetAST, CssTypes } from '@adobe/css-tools';
import type * as sc from 'styled-components';
import type { ExpectStatic } from 'vitest';
import { areCssMediaQueriesEqual, areCssSupportsEqual, buildReturnMessage, getCSS, matcherTest } from './utils.js';

export type Value = string | RegExp | boolean | null | undefined;

export interface Options {
  media?: string;
  modifier?: string | sc.RuleSet;
  supports?: string;
}

interface NormalizedOptions {
  media?: string;
  modifier?: string;
  supports?: string;
}

export type ToHaveStyleRuleMatcher = (
  element: Element,
  property: string,
  expected?: Value,
  options?: Options,
) => { pass: boolean; message: () => string };

const isStyledClass = (className: string): boolean => /(_|-)+sc-.+|^sc-/.test(className);

const getClassNames = (received?: Element): string[] => {
  return received?.classList ? Array.from(received.classList) : [];
};

function hasAtRule(options: Options): boolean {
  return Boolean(options.media || options.supports);
}

function getAtRules(ast: CssStylesheetAST, options: Options) {
  let rules = ast.stylesheet.rules;
  const { media, supports } = options;

  if (media) {
    rules = rules.filter((rule) => rule.type === CssTypes.media && areCssMediaQueriesEqual(rule.media, media));
  }

  if (supports) {
    rules = rules.filter((rule) => rule.type === CssTypes.supports && areCssSupportsEqual(rule.supports, supports));
  }

  return rules;
}

/** stylis v4 renders descendant selectors without a trailing space sometimes which trips up detection */
function removeSpaceAfterSelector(input: string): string {
  return input.replace(/([>~+]) +/g, '$1');
}

function normalizeQuotations(input: string): string {
  return input.replace(/['"]/g, '"');
}

function getModifiedClassName(className: string, staticClassName: string, modifier = ''): string {
  const classNameSelector = `.${className}`;
  let prefix = '';

  modifier = modifier.trim();
  if (modifier.includes('&')) {
    modifier = modifier
      // & combined with other selectors and not a precedence boost should be replaced with the static className, but the first instance should be the dynamic className
      .replace(/(&[^&]+?)&/g, `$1.${staticClassName}`)
      .replace(/&/g, classNameSelector);
  } else {
    prefix += classNameSelector;
  }
  const first = modifier[0];
  if (first !== ':' && first !== '[') {
    prefix += ' ';
  }

  return `${prefix}${modifier}`.trim();
}

function hasClassNames(
  classNames: readonly string[],
  selectors: readonly string[],
  options: NormalizedOptions,
): boolean {
  const staticClassNames = classNames.filter((x) => isStyledClass(x));

  return classNames.some((className) =>
    staticClassNames.some((staticClassName) =>
      selectors.map(removeSpaceAfterSelector).includes(
        removeSpaceAfterSelector(
          normalizeQuotations(
            getModifiedClassName(className, staticClassName, options.modifier).replace(/['"]/g, '"')
          )
        )
      )
    )
  );
}

function getRules(ast: CssStylesheetAST, classNames: readonly string[], options: NormalizedOptions) {
  if (hasAtRule(options)) {
    return getAtRules(ast, options);
  }

  return ast.stylesheet.rules
    .filter((rule) => rule.type === CssTypes.rule)
    .filter((rule) =>
      'selectors' in rule && hasClassNames(classNames, rule.selectors.map(normalizeQuotations), options)
    );
}

function handleMissingRules(options: Options) {
  return ({
    pass: false,
    message: () =>
      `No style rules found on passed element${
        Object.keys(options).length ? ` using options:\n${JSON.stringify(options)}` : ''
      }`,
  });
}

function getDeclaration(rule: CssAtRuleAST, property: string): CssDeclarationAST | undefined {
  switch (rule.type) {
    case CssTypes.rule:
      return rule.declarations
        .filter((declaration): declaration is CssDeclarationAST => declaration.type === CssTypes.declaration)
        .filter((declaration) => declaration.property === property)
        .pop();

    case CssTypes.supports:
    case CssTypes.media: {
      for (const subrule of rule.rules) {
        const declaration = getDeclaration(subrule, property);
        if (declaration) {
          return declaration;
        }
      }
      break;
    }
  }
}

function getDeclarations(rules: readonly CssAtRuleAST[], property: string) {
  return rules.reduce<CssDeclarationAST[]>((acc, rule) => {
    const declaration = getDeclaration(rule, property);
    return declaration ? [...acc, declaration] : acc;
  }, []);
}

function normalizeOptions(options: Options): NormalizedOptions {
  return {
    ...options,
    modifier: Array.isArray(options.modifier) ? options.modifier.join('') : options.modifier,
  };
}

export interface ToHaveStyleRuleMatchers {
  toHaveStyleRule: Parameters<ToHaveStyleRuleMatcher> extends [unknown, ...infer R] ? (...args: R) => void : never;
}

/**
 * Builds the `toHaveStyleRule` matcher given an `expect` function.
 */
export function buildToHaveStyleRule(expect: ExpectStatic): ToHaveStyleRuleMatcher {
  return function(this: { isNot: boolean }, element, property, expected, options = {}) {
    const classNames = getClassNames(element);
    const ast = getCSS();
    const normalizedOptions = normalizeOptions(options);
    const rules = getRules(ast, classNames, normalizedOptions);

    if (!rules.length) {
      return handleMissingRules(normalizedOptions);
    }

    const declarations = getDeclarations(rules, property);
    const received = declarations.pop()?.value;
    const pass = matcherTest(expect, received, expected, this.isNot);

    return {
      pass,
      message: buildReturnMessage(pass, property, received, expected),
    };
  };
}

import type { BuildResult, ParsedToken, Plugin } from '@cobalt-ui/core';

export interface Options {
  /** output file (default: "./tokens/index.ts") */
  filename?: string;
  /** modify values */
  transformValue?: (token: ParsedToken) => string;
}

export default function ts(options?: Options): Plugin {
  let fileName = options?.filename || './index.ts';
  let transformer = options?.transformValue;

  function printTokensExport(schemaTokens: ParsedToken[]): string {
    let code = 'export const tokens = ';

    // objectify
    const tokens: Record<string, any> = {};
    for (const token of schemaTokens) {
      const groups = token.id.split('.');
      const localID = groups.pop() as string;
      let lastToken = tokens;
      for (const group of groups) {
        if (!tokens[group]) tokens[group] = {};
        lastToken = tokens[group];
      }
      lastToken[localID] = transformer ? transformer(token) : token.value;
    }

    code += JSON.stringify(tokens, undefined, 2);
    code += ';\n';
    return code;
  }

  function printModesExport(schemaTokens: ParsedToken[]): string {
    let code = 'export const modes = ';

    // objectify
    let tokens: Record<string, any> = {};
    for (const token of schemaTokens) {
      if (!token.mode) continue;
      const groups = token.id.split('.');
      const localID = groups.pop() as string;
      let lastToken = tokens;
      for (const group of groups) {
        if (!tokens[group]) tokens[group] = {};
        lastToken = tokens[group];
      }
      lastToken[localID] = {};
      for (const [k, v] of Object.entries(token.mode)) {
        lastToken[localID][k] = transformer ? transformer(token) : v;
      }
    }

    code += JSON.stringify(tokens, undefined, 2);
    code += ';\n';
    return code;
  }

  function printAltFunction(): string {
    return `/** Get alternate values */
export function getAlt<T = string>(tokenID: keyof TokensFlat, mode: string): T {
  let defaultVal = tokens;
  let altVal = modes;
  for (const next of tokenID.split('.')) {
    defaultVal = defaultVal[next];
    if (altVal[next] !== undefined) altVal = altVal[next];
  }
  return (altVal && altVal[mode]) || defaultVal;
}`;
  }

  return {
    name: '@cobalt-ui/plugin-ts',
    async build({ schema }): Promise<BuildResult[]> {
      let code = [printTokensExport(schema.tokens), printModesExport(schema.tokens), printAltFunction()];
      return [
        {
          fileName,
          contents: code.join('\n\n'),
        },
      ];
    },
  };
}

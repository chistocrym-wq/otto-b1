// Isolated source-module tests: no network, no real Netlify/Supabase credentials.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

export function sourceLoader(root, globals = {}, mocks = {}) {
  const context = vm.createContext({
    console, Request, Response, Headers, URL, URLSearchParams, Buffer,
    setTimeout, clearTimeout, structuredClone, ...globals,
  });
  const modules = new Map();
  async function evaluate(module) {
    if (module.status === 'unlinked') await module.link((s, p) => resolve(s, p.identifier));
    if (module.status !== 'evaluated') await module.evaluate();
    return module;
  }
  async function synthetic(key, values) {
    if (!modules.has(key)) modules.set(key, new vm.SyntheticModule(Object.keys(values), function () {
      for (const [name, value] of Object.entries(values)) this.setExport(name, value);
    }, { context, identifier: key }));
    return modules.get(key);
  }
  async function resolve(specifier, parent) {
    if (Object.hasOwn(mocks, specifier)) return synthetic(specifier, mocks[specifier]);
    if (specifier.startsWith('node:')) return synthetic(specifier, await import(specifier));
    let file = specifier.startsWith('@/') ? path.join(root, 'src', specifier.slice(2))
      : path.resolve(parent ? path.dirname(parent) : root, specifier);
    if (!path.extname(file)) {
      for (const ext of ['.ts', '.tsx', '.js']) {
        if (await fs.stat(file + ext).catch(() => null)) { file += ext; break; }
      }
    }
    if (modules.has(file)) return modules.get(file);
    let source = await fs.readFile(file, 'utf8');
    if (/\.tsx?$/u.test(file)) source = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
      fileName: file,
    }).outputText;
    const module = new vm.SourceTextModule(source, {
      context, identifier: file,
      importModuleDynamically: async (s, p) => evaluate(await resolve(s, p.identifier)),
    });
    modules.set(file, module);
    return module;
  }
  return {
    context,
    async load(file) {
      const module = await resolve(path.resolve(root, file));
      return (await evaluate(module)).namespace;
    },
  };
}

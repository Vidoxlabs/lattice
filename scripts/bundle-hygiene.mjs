import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// The framework bundle embeds the absolute project path into the generated
// Worker manifest. It is inert at runtime but must not leave the build machine,
// and a checkout can live under any root in a folder with any name, so the path
// comes from the working directory rather than from a pattern.

const NEUTRAL_URL_ROOT = 'file:///lattice';
const NEUTRAL_PATH_ROOT = '/lattice';

/**
 * Every generated Worker module under a directory, including the framework's
 * chunk directory.
 * @param {string} directory
 * @returns {{ name: string, path: string, source: string }[]}
 */
export function bundleModules(directory, prefix = '') {
  const modules = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) modules.push(...bundleModules(path, `${prefix}${entry.name}/`));
    else if (entry.name.endsWith('.mjs')) modules.push({ name: `${prefix}${entry.name}`, path, source: readFileSync(path, 'utf8') });
  }
  return modules;
}

/**
 * The substitutions that remove a project root from generated text: the encoded
 * `file://` URL form first, then the plain path, so a URL is not half-rewritten.
 * @param {string} projectRoot an absolute path with no trailing separator
 * @returns {[string, string][]}
 */
export function projectRootForms(projectRoot) {
  if (projectRoot.length < 2) return [];
  return [
    [pathToFileURL(projectRoot).href, NEUTRAL_URL_ROOT],
    [`file://${projectRoot}`, NEUTRAL_URL_ROOT],
    [projectRoot, NEUTRAL_PATH_ROOT]
  ];
}

/**
 * Rewrite the project root out of every generated Worker module and fail if an
 * occurrence survives. Returns the modules that changed.
 * @param {{ directory: string, projectRoot: string }} options
 * @returns {string[]} the rewritten module names
 */
export function sanitizeWorkerBundle({ directory, projectRoot }) {
  const root = projectRoot.replace(/[\\/]+$/, '');
  const forms = projectRootForms(root);
  const rewritten = [];
  for (const module of bundleModules(directory)) {
    let source = module.source;
    for (const [from, to] of forms) source = source.split(from).join(to);
    if (source.includes(root)) {
      throw new Error(`${directory}/${module.name} still embeds the project root after sanitizing.`);
    }
    if (source !== module.source) {
      writeFileSync(module.path, source);
      rewritten.push(module.name);
    }
  }
  return rewritten;
}

const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const compiled = ts.transpileModule(fs.readFileSync('supabase/functions/_shared/emailDesign.ts', 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exportsObject = {};
vm.runInNewContext(compiled, {exports: exportsObject});
module.exports = exportsObject;

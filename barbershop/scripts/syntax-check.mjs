// Verifica APENAS sintaxe (não tipos/imports) de cada arquivo .ts/.tsx,
// usando ts.transpileModule — que não precisa resolver módulos externos.
// Isso é o que dá para rodar sem `npm install` neste ambiente sandbox.
import ts from "/home/claude/.npm-global/lib/node_modules/typescript/lib/typescript.js";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "src");
let fileCount = 0;
let errorCount = 0;

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      checkFile(full);
    }
  }
}

function checkFile(filePath) {
  fileCount++;
  const source = readFileSync(filePath, "utf-8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.Preserve,
      esModuleInterop: true,
    },
    reportDiagnostics: true,
    fileName: filePath,
  });

  const syntacticErrors = (result.diagnostics ?? []).filter(
    (d) => d.category === ts.DiagnosticCategory.Error
  );

  if (syntacticErrors.length > 0) {
    errorCount += syntacticErrors.length;
    console.log(`\n✗ ${path.relative(process.cwd(), filePath)}`);
    for (const diag of syntacticErrors) {
      const message = ts.flattenDiagnosticMessageText(diag.messageText, "\n");
      if (diag.file && diag.start !== undefined) {
        const { line, character } = diag.file.getLineAndCharacterOfPosition(diag.start);
        console.log(`  linha ${line + 1}, col ${character + 1}: ${message}`);
      } else {
        console.log(`  ${message}`);
      }
    }
  }
}

walk(ROOT);

console.log(`\n${"=".repeat(50)}`);
console.log(`Arquivos verificados: ${fileCount}`);
console.log(`Erros de sintaxe encontrados: ${errorCount}`);
console.log(`${"=".repeat(50)}`);

process.exit(errorCount > 0 ? 1 : 0);

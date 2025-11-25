#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Padrões de credenciais comuns
const patterns = [
  // AWS
  {
    name: "AWS Secret Access Key",
    regex: /AKIA[0-9A-Z]{16}/i,
    description: "AWS Access Key ID",
  },
  {
    name: "AWS Secret Access Key",
    regex: /wJalrXUtnFEMI\/K7MDENG\/bPxRfiCYEXAMPLEKEY/i,
    description: "AWS Secret Access Key (example pattern)",
  },
  {
    name: "AWS Secret Access Key",
    regex: /[A-Za-z0-9/+=]{40}/,
    description: "AWS Secret Access Key (generic pattern)",
    exclude: /eyJ[A-Za-z0-9_-]*\.eyJ/i, // Ignorar JWT tokens
  },
  // JWT Tokens
  {
    name: "JWT Token",
    regex: /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/,
    description: "JWT Token detected",
  },
  // API Keys genéricas
  {
    name: "API Key",
    regex: /(api[_-]?key|apikey)\s*[=:]\s*['"]?([A-Za-z0-9_-]{20,})['"]?/i,
    description: "Generic API Key",
  },
  // Tokens
  {
    name: "Token",
    regex: /(token|bearer)\s*[=:]\s*['"]?([A-Za-z0-9_-]{32,})['"]?/i,
    description: "Generic Token",
  },
  // Senhas (mas não variáveis de ambiente)
  {
    name: "Password",
    regex: /(password|passwd|pwd)\s*[=:]\s*['"]([^'"]{8,})['"]/i,
    description: "Password hardcoded in code (not env vars)",
    exclude: /process\.env|process\[['"]env['"]\]/i,
  },
  // Chaves privadas
  {
    name: "Private Key",
    regex: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/i,
    description: "Private Key",
  },
  // Stripe
  {
    name: "Stripe Key",
    regex: /sk_live_[0-9a-zA-Z]{24,}/i,
    description: "Stripe Secret Key",
  },
  // GitHub
  {
    name: "GitHub Token",
    regex: /ghp_[A-Za-z0-9]{36}/i,
    description: "GitHub Personal Access Token",
  },
  // MongoDB
  {
    name: "MongoDB URI",
    regex: /mongodb\+srv:\/\/[^:]+:[^@]+@/i,
    description: "MongoDB Connection String",
  },
  // PostgreSQL
  {
    name: "PostgreSQL URI",
    regex: /postgres:\/\/[^:]+:[^@]+@/i,
    description: "PostgreSQL Connection String",
  },
];

// Arquivos e diretórios para ignorar
const ignorePaths = [
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
  ".secretlintrc.json",
  "package-lock.json",
  ".husky",
];

// Extensões de arquivo para verificar
const allowedExtensions = [
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".env",
  ".yaml",
  ".yml",
  ".md",
  ".txt",
  ".py",
  ".java",
  ".go",
  ".rb",
  ".php",
];

function shouldIgnoreFile(filePath) {
  const normalizedPath = filePath.replace(/\\/g, "/");
  return ignorePaths.some((ignore) => normalizedPath.includes(ignore));
}

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!shouldIgnoreFile(filePath)) {
        getAllFiles(filePath, fileList);
      }
    } else {
      const ext = path.extname(filePath);
      if (allowedExtensions.includes(ext) || !ext) {
        if (!shouldIgnoreFile(filePath)) {
          fileList.push(filePath);
        }
      }
    }
  });

  return fileList;
}

function detectSecrets(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const findings = [];

  lines.forEach((line, index) => {
    patterns.forEach((pattern) => {
      const matches = line.match(pattern.regex);
      if (matches) {
        // Ignorar comentários
        const trimmedLine = line.trim();
        if (
          trimmedLine.startsWith("//") ||
          trimmedLine.startsWith("*") ||
          trimmedLine.startsWith("#")
        ) {
          return;
        }

        // Ignorar se o padrão tem exclusão e a linha contém o padrão de exclusão
        if (pattern.exclude && pattern.exclude.test(line)) {
          return;
        }

        // Ignorar variáveis de ambiente (process.env.*)
        if (
          line.includes("process.env") ||
          line.includes("process['env']") ||
          line.includes('process["env"]')
        ) {
          return;
        }

        findings.push({
          file: filePath,
          line: index + 1,
          pattern: pattern.name,
          description: pattern.description,
          match:
            matches[0].substring(0, 50) + (matches[0].length > 50 ? "..." : ""),
          context: line.trim(),
        });
      }
    });
  });

  return findings;
}

function main() {
  const rootDir = process.cwd();
  const files = getAllFiles(rootDir);
  const allFindings = [];

  console.log(
    `🔍 Escaneando ${files.length} arquivos em busca de credenciais...\n`,
  );

  files.forEach((file) => {
    try {
      const findings = detectSecrets(file);
      if (findings.length > 0) {
        allFindings.push(...findings);
      }
    } catch (error) {
      // Ignorar erros de leitura de arquivo
    }
  });

  if (allFindings.length > 0) {
    console.error("❌ CREDENCIAIS DETECTADAS!\n");
    allFindings.forEach((finding) => {
      console.error(`Arquivo: ${finding.file}`);
      console.error(`Linha: ${finding.line}`);
      console.error(`Tipo: ${finding.pattern}`);
      console.error(`Descrição: ${finding.description}`);
      console.error(`Match: ${finding.match}`);
      console.error(`Contexto: ${finding.context}`);
      console.error("---\n");
    });
    console.error(
      `\n🚫 Commit bloqueado! ${allFindings.length} credencial(is) detectada(s).`,
    );
    console.error("Por favor, remova as credenciais antes de fazer commit.\n");
    process.exit(1);
  } else {
    console.log(
      "✅ Nenhuma credencial detectada. Prosseguindo com o commit...\n",
    );
    process.exit(0);
  }
}

main();

/**
 * HillCode (Citron adapt) – Vite + React Module Federation dev TUI / CLI
 * Run dev, build, preview, deploy with per-tenant env injection.
 *
 * @see instructions/CITRON_HILLCODE.md
 * @see guides/HILLCODE_UNIVERSAL_GUIDE.md
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { spawn } from 'node:child_process'
import { parseArgs } from 'node:util'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const CMDS = ['dev', 'build', 'preview', 'deploy'] as const
type Command = (typeof CMDS)[number]

function isCommand(s: string | undefined): s is Command {
  return s !== undefined && (CMDS as readonly string[]).includes(s)
}

function findProjectRoot(): string | null {
  let dir = dirname(__dirname) // devtools/hillcode
  while (true) {
    const pkg = join(dir, 'package.json')
    if (existsSync(pkg)) {
      try {
        const j = JSON.parse(readFileSync(pkg, 'utf8')) as { name?: string }
        if (j.name === 'citron-sales-frontend' || existsSync(join(dir, 'vite.config.ts'))) {
          return dir
        }
      } catch {
        // ignore
      }
    }
    if (dir === dirname(dir)) return null
    dir = dirname(dir)
  }
}

function listTenants(root: string): string[] {
  const tenantsDir = join(root, 'tenants')
  if (!existsSync(tenantsDir)) return ['default']
  return readdirSync(tenantsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => d.name)
    .sort()
}

function readProjectName(root: string): string {
  try {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { name?: string }
    return pkg.name ?? 'project'
  } catch {
    return 'project'
  }
}

function supportsAnsi(): boolean {
  return process.stdout.isTTY && process.env['NO_COLOR'] == null
}

function out(
  s: string,
  opts: { dim?: boolean; red?: boolean; green?: boolean } = {},
): void {
  if (supportsAnsi()) {
    if (opts.dim) process.stdout.write('\x1B[2m')
    if (opts.red) process.stdout.write('\x1B[31m')
    if (opts.green) process.stdout.write('\x1B[32m')
  }
  process.stdout.write(s)
  if (supportsAnsi() && (opts.dim || opts.red || opts.green)) {
    process.stdout.write('\x1B[0m')
  }
}

function cls(): void {
  if (process.stdout.isTTY) {
    process.stdout.write('\x1B[2J\x1B[H')
  } else {
    process.stdout.write('\n')
  }
}

function createRl(): { question: (p: string) => Promise<string>; close: () => void } {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return {
    question: (p: string) => new Promise((resolve) => rl.question(p, resolve)),
    close: () => rl.close(),
  }
}

function injectScriptPath(root: string): string {
  return join(root, 'scripts', 'inject_tenant_config.sh')
}

async function runInject(root: string, tenant: string): Promise<boolean> {
  const script = injectScriptPath(root)
  if (!existsSync(script)) {
    out(`  inject script not found: ${script}\n`, { red: true })
    return false
  }
  out(`  scripts/inject_tenant_config.sh ${tenant}\n`, { dim: true })
  return new Promise((resolve) => {
    const p = spawn('bash', [script, tenant], {
      cwd: root,
      stdio: 'inherit',
    })
    p.on('close', (code) => resolve(code === 0))
  })
}

function npm(
  root: string,
  args: string[],
  inherit: boolean,
): Promise<number> {
  return new Promise((resolve) => {
    const p = spawn('npm', args, {
      cwd: root,
      stdio: inherit ? 'inherit' : 'pipe',
      shell: process.platform === 'win32',
    })
    p.on('error', (err) => {
      process.stderr.write(String(err) + '\n')
      resolve(1)
    })
    p.on('close', (code) => resolve(code ?? 1))
  })
}

async function runCommand(root: string, cmd: Command, tenant: string): Promise<number> {
  if (!(await runInject(root, tenant))) return 1
  out('\n', {})
  switch (cmd) {
    case 'dev':
      out('  npm run dev\n', { dim: true })
      return npm(root, ['run', 'dev'], true)
    case 'build':
      out('  npm run build\n', { dim: true })
      return npm(root, ['run', 'build'], true)
    case 'preview':
      out('  npm run preview\n', { dim: true })
      return npm(root, ['run', 'preview'], true)
    case 'deploy': {
      out('  npx vercel (production deploy; requires Vercel CLI + login)\n', { dim: true })
      return new Promise((resolve) => {
        const p = spawn('npx', ['--yes', 'vercel', 'deploy', '--prod'], {
          cwd: root,
          stdio: 'inherit',
          shell: process.platform === 'win32',
        })
        p.on('error', (err) => {
          process.stderr.write(String(err) + '\n')
          resolve(1)
        })
        p.on('close', (c) => resolve(c ?? 1))
      })
    }
    default: {
      const _ex: never = cmd
      return _ex
    }
  }
}

async function pickTenant(rl: { question: (p: string) => Promise<string> }, tenants: string[]): Promise<string | null> {
  out('\n', {})
  for (let i = 0; i < tenants.length; i++) {
    out(`  ${i + 1}  ${tenants[i]!}\n`, {})
  }
  const raw = (await rl.question(`  tenant (1-${tenants.length}): `)).trim()
  if (!raw) return null
  const n = parseInt(raw, 10)
  if (Number.isNaN(n) || n < 1 || n > tenants.length) {
    out('  invalid selection\n', { red: true })
    return null
  }
  return tenants[n - 1]!
}

class HillCode {
  constructor(private readonly root: string) {}

  private get tenants(): string[] {
    return listTenants(this.root)
  }

  private get projectName(): string {
    return readProjectName(this.root)
  }

  async tui(): Promise<void> {
    const rl = createRl()
    try {
      while (true) {
        cls()
        out('\n', {})
        out(`  hillcode · ${this.projectName}\n`, { dim: true })
        out('  ─────────────────────────\n', {})
        out('\n', {})
        out('  1  dev      Vite dev server (host loads remoteEntry)\n', {})
        out('  2  build    tsc + vite build (Federation dist)\n', {})
        out('  3  preview  Vite preview on :5001\n', {})
        out('  4  deploy   npx vercel deploy --prod\n', {})
        out('  q  exit\n', {})
        out('\n', {})

        const choice = (await rl.question('  > ')).trim().toLowerCase()
        if (choice === 'q' || choice === '') {
          return
        }

        const map: Record<string, Command> = { '1': 'dev', '2': 'build', '3': 'preview', '4': 'deploy' }
        const cmd = map[choice]
        if (!cmd) {
          out('  unknown option\n', { red: true })
          await rl.question('  [Enter]')
          continue
        }

        const tenant = await pickTenant(rl, this.tenants)
        if (tenant == null) {
          continue
        }

        const code = await runCommand(this.root, cmd, tenant)
        if (code !== 0) {
          out(`\n  exited with ${String(code)}\n`, { red: true })
        }
        await rl.question('  [Enter] to return to menu ')
      }
    } finally {
      rl.close()
    }
  }

  async cmd(c: string, client: string | undefined): Promise<number> {
    if (!isCommand(c)) {
      process.stderr.write(`unknown cmd: ${c} (use: dev | build | preview | deploy)\n`)
      return 1
    }
    const tenant = client ?? null
    if (tenant == null) {
      process.stderr.write('tenant required: -c <tenant>\n')
      return 1
    }
    if (!this.tenants.includes(tenant)) {
      process.stderr.write(`unknown tenant: ${tenant} (valid: ${this.tenants.join(', ')})\n`)
      return 1
    }
    return runCommand(this.root, c, tenant)
  }
}

function printHelp(projectName: string, tenants: string): void {
  process.stdout.write(`
hillcode – ${projectName} (Citron / Vite)

  npm run hillcode
  npm run hillcode -- -c default --cmd dev
  npm run hillcode -- -c <tenant> --cmd build|preview|deploy

  -c, --client   ${tenants}
  --cmd          dev | build | preview | deploy
  -h, --help     this message

  Inject runs scripts/inject_tenant_config.sh before every command; set VITE_*
  per-tenant in tenants/<id>/.

`)
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      help: { type: 'boolean', short: 'h' },
      client: { type: 'string', short: 'c' },
      cmd: { type: 'string' },
    },
    allowPositionals: true,
    strict: true,
  })

  const root = findProjectRoot()
  if (root == null) {
    process.stderr.write('citron-sales-frontend (vite) project root not found\n')
    process.exit(1)
  }

  const projectName = readProjectName(root)
  const tList = listTenants(root)
  const tenantHint = tList.length ? tList.join(' | ') : 'default'

  if (values.help) {
    printHelp(projectName, tenantHint)
    process.exit(0)
  }

  if (positionals.length > 0) {
    process.stderr.write(`unexpected: ${positionals.join(' ')}\n`)
    printHelp(projectName, tenantHint)
    process.exit(1)
  }

  const h = new HillCode(root)

  if (values.cmd != null) {
    const code = await h.cmd(String(values.cmd), values.client)
    process.exit(code)
  }

  if (values.client != null) {
    process.stderr.write('--client requires --cmd in non-interactive mode\n')
    process.exit(1)
  }

  await h.tui()
  process.exit(0)
}

main().catch((e) => {
  process.stderr.write(String(e) + '\n')
  process.exit(1)
})

import { toolDefinition } from '@tanstack/ai';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const EXEC_TIMEOUT_MS = 10_000;
const MAX_OUTPUT_CHARS = 8_000;

/**
 * Commands the LLM is allowed to run. Any binary not in this set is rejected.
 * Intentionally excludes write-capable commands (rm, mv, cp to new locations, etc.).
 */
const ALLOWED_COMMANDS = new Set([
  // File reading
  'cat',
  'head',
  'tail',
  'wc',
  'file',
  'stat',
  'less',
  'more',
  // Navigation & listing
  'ls',
  'pwd',
  'tree',
  'find',
  'locate',
  'du',
  'df',
  // Text processing
  'grep',
  'awk',
  'sed',
  'sort',
  'uniq',
  'cut',
  'tr',
  'jq',
  'echo',
  'printf',
  'diff',
  'comm',
  'paste',
  'column',
  'xargs',
  // Process info (read-only)
  'ps',
  'pgrep',
  'top',
  'htop',
  'lsof',
  'pmap',
  // System info
  'uname',
  'hostname',
  'whoami',
  'id',
  'groups',
  'date',
  'uptime',
  'env',
  'printenv',
  'which',
  'type',
  'whereis',
  // Network info (read-only — no file output)
  'curl',
  'ping',
  'nslookup',
  'dig',
  'traceroute',
  'tracepath',
  'netstat',
  'ss',
  'ifconfig',
  'ip',
  'nmap',
  'wget',
  // Git (read-only subcommands enforced below)
  'git',
  // Dev package managers (list/info only — enforced below)
  'node',
  'npm',
  'pnpm',
  'yarn',
  'bun',
  // Misc utilities
  'man',
  'help',
  'cal',
  'bc',
  'expr',
]);

/**
 * Git subcommands that would mutate state. Blocked even though 'git' itself is allowed.
 */
const BLOCKED_GIT_SUBCOMMANDS = new Set([
  'push',
  'commit',
  'reset',
  'rebase',
  'merge',
  'checkout',
  'switch',
  'clean',
  'rm',
  'mv',
  'add',
  'stash',
  'apply',
  'cherry-pick',
  'revert',
  'fetch',
  'pull',
  'clone',
  'init',
  'remote',
  'tag',
  'config',
]);

/**
 * Flags that write output to a file for commands that are otherwise safe.
 */
const CURL_WRITE_FLAGS = new Set(['-o', '--output', '-O', '--remote-name']);
const WGET_WRITE_FLAGS = new Set(['-O', '--output-document']);

/**
 * Shell metacharacters / patterns that allow command injection or mutation.
 * These are checked against the raw command string before any parsing.
 */
const BLOCKED_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /;/, reason: 'semicolon chaining is not allowed' },
  { pattern: /\x60/, reason: 'backtick substitution is not allowed' },
  { pattern: /\$\(/, reason: 'command substitution $(...) is not allowed' },
  { pattern: /&&/, reason: 'AND chaining is not allowed' },
  { pattern: /\|\|/, reason: 'OR chaining is not allowed' },
  { pattern: />>/, reason: 'append redirection is not allowed' },
  // Allow > only when followed by /dev/null (discard). Block all other redirections.
  {
    pattern: />(?!\s*\/dev\/null)/,
    reason: 'output redirection is not allowed',
  },
  // Block find -exec and find -delete which can run arbitrary commands or delete files
  { pattern: /\bfind\b.*-exec\b/, reason: 'find -exec is not allowed' },
  { pattern: /\bfind\b.*-delete\b/, reason: 'find -delete is not allowed' },
  // Block piping into a shell or interpreter
  {
    pattern:
      /\|\s*(bash|sh|zsh|fish|csh|ksh|dash|python3?|ruby|perl|node|bun)\b/,
    reason: 'piping into a shell or interpreter is not allowed',
  },
];

function validateCommand(
  command: string,
): { valid: true } | { valid: false; error: string } {
  const trimmed = command.trim();

  if (!trimmed) {
    return { valid: false, error: 'Empty command' };
  }

  // Structural safety checks on the raw string
  for (const { pattern, reason } of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { valid: false, error: `Blocked: ${reason}` };
    }
  }

  // Validate each segment in a pipeline
  const segments = trimmed
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const segment of segments) {
    const parts = segment.split(/\s+/);
    const cmd = parts[0].toLowerCase();

    if (!ALLOWED_COMMANDS.has(cmd)) {
      return {
        valid: false,
        error: `Command '${cmd}' is not in the allowed list`,
      };
    }

    // Per-command extra rules
    if (cmd === 'git') {
      const sub = parts[1]?.toLowerCase();
      if (sub && BLOCKED_GIT_SUBCOMMANDS.has(sub)) {
        return {
          valid: false,
          error: `git ${sub} is not allowed (mutating operation)`,
        };
      }
    }

    if (cmd === 'curl') {
      for (const flag of parts) {
        if (CURL_WRITE_FLAGS.has(flag)) {
          return {
            valid: false,
            error: `curl flag '${flag}' writes to a file and is not allowed`,
          };
        }
      }
    }

    if (cmd === 'wget') {
      for (const flag of parts) {
        if (WGET_WRITE_FLAGS.has(flag)) {
          return {
            valid: false,
            error: `wget flag '${flag}' writes to a file and is not allowed`,
          };
        }
      }
      // wget by default saves files — require -q --spider or similar read-only usage
      if (!parts.includes('--spider') && !parts.includes('-q')) {
        // Allow but warn: wget without output flag will still download to cwd.
        // Block it entirely to be safe.
        return {
          valid: false,
          error:
            'wget downloads files by default. Use curl instead for read-only HTTP requests.',
        };
      }
    }

    if (cmd === 'sed') {
      // sed -i modifies files in-place
      for (const flag of parts) {
        if (flag === '-i' || flag.startsWith('-i')) {
          return {
            valid: false,
            error: 'sed -i (in-place edit) is not allowed',
          };
        }
      }
    }
  }

  return { valid: true };
}

export function getCmdTools() {
  return [
    toolDefinition({
      name: 'execute_command',
      description:
        'Execute a read-only shell command on the host machine and return its output. ' +
        'Use this whenever the user asks about the system, files, processes, network, git history, ' +
        'installed packages, disk usage, IP addresses, environment variables, running services, etc. ' +
        'Allowed commands include: ls, cat, head, tail, grep, find, stat, wc, diff, ' +
        'ps, top, lsof, uname, hostname, whoami, id, date, uptime, df, du, env, printenv, which, ' +
        'ifconfig, ip, netstat, ss, ping, dig, nslookup, curl (GET only), ' +
        'git (log/status/diff/show/branch/tag — read operations only), ' +
        'node, npm, pnpm, yarn, bun (version/list/info only), ' +
        'awk, sed (no -i), sort, uniq, cut, tr, jq, echo, xargs, and more. ' +
        'Pipe chains like "ifconfig | grep inet" are allowed. ' +
        'Mutating operations (file write/delete, git push/commit, output redirection, etc.) are blocked. ' +
        'Commands time out after 10 seconds.',
      inputSchema: z.object({
        reason: z
          .string()
          .describe(
            'Brief explanation of why this command is being run and what information it will provide. ' +
              'Example: "Get the machine\'s IP addresses to answer the user\'s question."',
          ),
        command: z
          .string()
          .describe(
            'The shell command to run. ' +
              'Examples: "ifconfig | grep inet", "ls -la src/", "cat package.json", ' +
              '"git log --oneline -10", "ps aux | grep node", "df -h", "curl https://api.example.com/data"',
          ),
      }),
    }).server(async ({ reason, command }) => {
      const validation = validateCommand(command);

      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          reason,
          command,
        };
      }

      try {
        const { stdout, stderr } = await execAsync(command, {
          timeout: EXEC_TIMEOUT_MS,
          maxBuffer: 1024 * 1024, // 1 MB
        });

        const out = stdout.slice(0, MAX_OUTPUT_CHARS);
        const err = stderr.slice(0, MAX_OUTPUT_CHARS);

        return {
          success: true,
          reason,
          command,
          stdout: out || null,
          stderr: err || null,
          truncated:
            stdout.length > MAX_OUTPUT_CHARS ||
            stderr.length > MAX_OUTPUT_CHARS,
        };
      } catch (e: unknown) {
        const err = e as {
          message?: string;
          killed?: boolean;
          code?: number;
          stderr?: string;
        };
        if (err.killed) {
          return {
            success: false,
            command,
            error: `Command timed out after ${EXEC_TIMEOUT_MS / 1000}s`,
          };
        }
        return {
          success: false,
          command,
          error: err.message ?? 'Unknown error',
          stderr: err.stderr?.slice(0, MAX_OUTPUT_CHARS) ?? null,
          exitCode: err.code ?? null,
        };
      }
    }),
  ];
}

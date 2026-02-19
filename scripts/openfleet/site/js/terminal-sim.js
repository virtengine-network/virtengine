/* ═══════════════════════════════════════════════════════════════════════════
   OpenFleet Terminal Simulator
   Uses jQuery Terminal for a rich interactive + auto-demo terminal
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Color helpers ───────────────────────────────────────────────────── */
  const C = {
    cyan: (t) => `[[;#00d4ff;]${t}]`,
    green: (t) => `[[;#10b981;]${t}]`,
    amber: (t) => `[[;#f59e0b;]${t}]`,
    red: (t) => `[[;#ef4444;]${t}]`,
    purple: (t) => `[[;#a78bfa;]${t}]`,
    pink: (t) => `[[;#ec4899;]${t}]`,
    dim: (t) => `[[;#64748b;]${t}]`,
    bold: (t) => `[[b;#f1f5f9;]${t}]`,
    white: (t) => `[[;#e2e8f0;]${t}]`,
  };

  /* ── Fake log lines for the auto-demo ────────────────────────────────── */
  const DEMO_SEQUENCE = [
    { cmd: 'openfleet', delay: 600 },
    { log: '', delay: 100 },
    { log: `  ${C.cyan('⚡')} ${C.bold('OpenFleet')} ${C.dim('v0.26.2')}`, delay: 80 },
    { log: `  ${C.dim('Autonomous AI Fleet Supervisor')}`, delay: 80 },
    { log: '', delay: 200 },
    { log: `${C.dim('[')}${C.cyan('INFO')}${C.dim(']')}  Loading config from .env + openfleet.config.json`, delay: 120 },
    { log: `${C.dim('[')}${C.cyan('INFO')}${C.dim(']')}  Project: ${C.bold('virtengine')} | Repo: virtengine/virtengine`, delay: 140 },
    { log: `${C.dim('[')}${C.cyan('INFO')}${C.dim(']')}  Executor pool initialized:`, delay: 100 },
    { log: `${C.dim('         ├─')} ${C.purple('copilot-claude')} ${C.dim('(Claude Opus 4.6, weight: 50, role: primary)')}`, delay: 80 },
    { log: `${C.dim('         └─')} ${C.purple('codex-default')}  ${C.dim('(Codex o4-mini, weight: 50, role: backup)')}`, delay: 80 },
    { log: `${C.dim('[')}${C.cyan('INFO')}${C.dim(']')}  Kanban backend: ${C.green('github')} (sync: bidirectional)`, delay: 120 },
    { log: `${C.dim('[')}${C.cyan('INFO')}${C.dim(']')}  Telegram bot connected ${C.dim('(@VirtEngineFleetBot)')}`, delay: 150 },
    { log: `${C.dim('[')}${C.cyan('INFO')}${C.dim(']')}  Shared state: ${C.green('enabled')} (heartbeat: 60s, stale: 5min)`, delay: 120 },
    { log: `${C.dim('[')}${C.cyan('INFO')}${C.dim(']')}  Starting supervisor loop... ${C.green('●')}`, delay: 400 },
    { log: '', delay: 200 },
    { log: `${C.dim('[')}${C.amber('TASK')}${C.dim(']')}  ${C.bold('#42')} feat(market): add order expiry → ${C.purple('copilot-claude')}`, delay: 600 },
    { log: `${C.dim('[')}${C.amber('TASK')}${C.dim(']')}  ${C.bold('#43')} fix(veid): token validation  → ${C.purple('codex-default')}`, delay: 500 },
    { log: `${C.dim('[')}${C.amber('TASK')}${C.dim(']')}  ${C.bold('#44')} refactor(escrow): batch settle → ${C.purple('copilot-claude')}`, delay: 400 },
    { log: '', delay: 300 },
    { log: `${C.dim('[')}${C.green(' OK ')}${C.dim(']')}  ${C.bold('#43')} PR #188 created — CI running...`, delay: 800 },
    { log: `${C.dim('[')}${C.green(' OK ')}${C.dim(']')}  ${C.bold('#42')} PR #187 created — CI running...`, delay: 600 },
    { log: `${C.dim('[')}${C.green('  ✓ ')}${C.dim(']')}  ${C.bold('#43')} PR #188 — ${C.green('all checks passed')}`, delay: 1000 },
    { log: `${C.dim('[')}${C.cyan('MERGE')}${C.dim(']')} ${C.bold('#43')} PR #188 merged to main ${C.green('✓')}`, delay: 400 },
    { log: `${C.dim('[')}${C.green('  ✓ ')}${C.dim(']')}  ${C.bold('#42')} PR #187 — ${C.green('all checks passed')}`, delay: 800 },
    { log: `${C.dim('[')}${C.cyan('MERGE')}${C.dim(']')} ${C.bold('#42')} PR #187 merged to main ${C.green('✓')}`, delay: 400 },
    { log: `${C.dim('[')}${C.green(' OK ')}${C.dim(']')}  ${C.bold('#44')} PR #189 created — CI running...`, delay: 500 },
    { log: '', delay: 200 },
    { log: `${C.dim('[')}${C.cyan('INFO')}${C.dim(']')}  Fleet status: ${C.green('3 completed')}, ${C.amber('0 failed')}, ${C.dim('0 retried')}`, delay: 100 },
    { log: `${C.dim('[')}${C.cyan('INFO')}${C.dim(']')}  Next poll in 60s...`, delay: 100 },
  ];

  /* ── Fake command responses ──────────────────────────────────────────── */
  const COMMANDS = {
    help: () => [
      '',
      `  ${C.bold('OpenFleet')} ${C.dim('v0.26.2')} — Available Commands`,
      '',
      `  ${C.cyan('openfleet')}              Start the supervisor`,
      `  ${C.cyan('openfleet --setup')}      Run interactive setup wizard`,
      `  ${C.cyan('openfleet --doctor')}     Validate configuration`,
      `  ${C.cyan('openfleet --status')}     Show fleet status`,
      `  ${C.cyan('openfleet --tasks')}      List current tasks`,
      `  ${C.cyan('openfleet --agents')}     Show agent pool`,
      `  ${C.cyan('openfleet --daemon')}     Run as background daemon`,
      `  ${C.cyan('openfleet --shell')}      Interactive shell mode`,
      `  ${C.cyan('openfleet --version')}    Show version`,
      '',
      `  ${C.dim('Type any command to try it out.')}`,
      '',
    ],
    'openfleet --version': () => [
      `@virtengine/openfleet v0.26.2`,
    ],
    '--version': () => COMMANDS['openfleet --version'](),
    version: () => COMMANDS['openfleet --version'](),
    'openfleet --status': () => [
      '',
      `  ${C.bold('Fleet Status')}  ${C.green('● RUNNING')}`,
      '',
      `  ${C.dim('Uptime:')}        2h 34m 12s`,
      `  ${C.dim('Executor Mode:')} internal`,
      `  ${C.dim('Board:')}         github (bidirectional sync)`,
      `  ${C.dim('Max Parallel:')}  6`,
      '',
      `  ${C.bold('Executors')}`,
      `  ${C.dim('  ├─')} ${C.purple('copilot-claude')}  ${C.green('active')}  ${C.dim('load: 67%  tasks: 8  avg: 12m')}`,
      `  ${C.dim('  └─')} ${C.purple('codex-default')}   ${C.green('active')}  ${C.dim('load: 42%  tasks: 5  avg: 18m')}`,
      '',
      `  ${C.bold('Today')}`,
      `  ${C.dim('  Tasks completed:')} ${C.green('13')}`,
      `  ${C.dim('  PRs merged:')}      ${C.green('11')}`,
      `  ${C.dim('  PRs pending:')}     ${C.amber('2')}`,
      `  ${C.dim('  Failures:')}        ${C.red('1')} ${C.dim('(auto-retried)')}`,
      '',
    ],
    '--status': () => COMMANDS['openfleet --status'](),
    status: () => COMMANDS['openfleet --status'](),
    'openfleet --tasks': () => [
      '',
      `  ${C.bold('Active Tasks')}`,
      '',
      `  ${C.dim('#')}   ${C.dim('STATUS')}     ${C.dim('TITLE')}                            ${C.dim('AGENT')}`,
      `  ${C.bold('42')}  ${C.green('merged')}     feat(market): add order expiry       copilot-claude`,
      `  ${C.bold('43')}  ${C.green('merged')}     fix(veid): token validation          codex-default`,
      `  ${C.bold('44')}  ${C.amber('in-review')}  refactor(escrow): batch settle       copilot-claude`,
      `  ${C.bold('45')}  ${C.purple('working')}    feat(hpc): gpu resource metering     codex-default`,
      `  ${C.bold('46')}  ${C.dim('queued')}     docs: update provider guide           —`,
      '',
    ],
    '--tasks': () => COMMANDS['openfleet --tasks'](),
    tasks: () => COMMANDS['openfleet --tasks'](),
    'openfleet --agents': () => [
      '',
      `  ${C.bold('Agent Pool')}`,
      '',
      `  ${C.purple('copilot-claude')}  ${C.dim('|')} Claude Opus 4.6 via Copilot ${C.dim('|')} weight: 50 ${C.dim('|')} role: primary`,
      `  ${C.dim('  ├─ Status:')}  ${C.green('active')}`,
      `  ${C.dim('  ├─ Session:')} sk-...7f3a`,
      `  ${C.dim('  └─ Uptime:')}  2h 34m`,
      '',
      `  ${C.purple('codex-default')}   ${C.dim('|')} Codex o4-mini            ${C.dim('|')} weight: 50 ${C.dim('|')} role: backup`,
      `  ${C.dim('  ├─ Status:')}  ${C.green('active')}`,
      `  ${C.dim('  ├─ Session:')} cx-...a91b`,
      `  ${C.dim('  └─ Uptime:')}  2h 34m`,
      '',
    ],
    '--agents': () => COMMANDS['openfleet --agents'](),
    agents: () => COMMANDS['openfleet --agents'](),
    'openfleet --doctor': () => [
      '',
      `  ${C.bold('Config Doctor')} ${C.dim('— checking your setup...')}`,
      '',
      `  ${C.green('✓')} .env file found`,
      `  ${C.green('✓')} openfleet.config.json valid`,
      `  ${C.green('✓')} GitHub CLI authenticated`,
      `  ${C.green('✓')} Telegram bot token valid`,
      `  ${C.green('✓')} Executor pool configured (2 executors)`,
      `  ${C.green('✓')} Kanban backend reachable (github)`,
      `  ${C.green('✓')} Shared state persistence writable`,
      '',
      `  ${C.green('All checks passed.')} Your setup is ready.`,
      '',
    ],
    '--doctor': () => COMMANDS['openfleet --doctor'](),
    doctor: () => COMMANDS['openfleet --doctor'](),
    clear: () => '__CLEAR__',
    ls: () => [
      `${C.cyan('cli.mjs')}  ${C.cyan('monitor.mjs')}  ${C.cyan('config.mjs')}  ${C.cyan('setup.mjs')}  ${C.dim('.env')}  ${C.dim('package.json')}`,
    ],
    pwd: () => [`/home/user/virtengine/scripts/openfleet`],
    whoami: () => [`openfleet-agent`],
    'cat .env': () => [
      `${C.dim('PROJECT_NAME=')}${C.green('virtengine')}`,
      `${C.dim('KANBAN_BACKEND=')}${C.green('github')}`,
      `${C.dim('EXECUTOR_MODE=')}${C.green('internal')}`,
      `${C.dim('MAX_PARALLEL=')}${C.green('6')}`,
      `${C.dim('...')}`,
    ],
    neofetch: () => [
      '',
      `  ${C.cyan('   ___  _____ ')}   ${C.bold('openfleet')}@virtengine`,
      `  ${C.cyan('  / _ \\|  ___|')}   ${C.dim('─────────────────────')}`,
      `  ${C.cyan(' | | | | |_   ')}   ${C.dim('OS:')}      Linux x86_64`,
      `  ${C.cyan(' | |_| |  _|  ')}   ${C.dim('Runtime:')} Node.js 22.0`,
      `  ${C.cyan('  \\___/|_|    ')}   ${C.dim('Agents:')}  2 active`,
      `  ${C.cyan('              ')}   ${C.dim('Uptime:')}  2h 34m`,
      `  ${C.cyan('  openfleet   ')}   ${C.dim('Tasks:')}   13 completed`,
      '',
    ],
  };

  /* ── Initialize terminal ─────────────────────────────────────────────── */
  window.initOpenFleetTerminal = function (selector, options = {}) {
    const { autoDemo = true, greeting = true } = options;

    const term = $(selector).terminal(
      function (command) {
        command = command.trim();
        if (!command) return;

        // Check for exact match first
        let handler = COMMANDS[command] || COMMANDS[command.toLowerCase()];

        // Try prefix matching
        if (!handler) {
          const key = Object.keys(COMMANDS).find(
            (k) => command.toLowerCase() === k || command.toLowerCase().startsWith('openfleet ' + k.replace('openfleet ', ''))
          );
          if (key) handler = COMMANDS[key];
        }

        if (handler) {
          const result = handler();
          if (result === '__CLEAR__') {
            this.clear();
            return;
          }
          result.forEach((line) => this.echo(line));
        } else {
          this.echo(
            `${C.dim('command not found:')} ${C.red(command)}`
          );
          this.echo(
            `${C.dim('Try')} ${C.cyan('help')} ${C.dim('to see available commands.')}`
          );
        }
      },
      {
        greetings: false,
        prompt: `${C.cyan('❯')} `,
        name: 'openfleet-demo',
        height: 420,
        outputLimit: 300,
        checkArity: false,
        completion: Object.keys(COMMANDS),
        keymap: {},
      }
    );

    if (greeting) {
      term.echo('');
      term.echo(`  ${C.dim('┌──────────────────────────────────────────────────┐')}`);
      term.echo(`  ${C.dim('│')}  ${C.cyan('⚡')} ${C.bold('OpenFleet Interactive Demo')}                    ${C.dim('│')}`);
      term.echo(`  ${C.dim('│')}  ${C.dim('Type')} ${C.cyan('help')} ${C.dim('for commands, or watch the auto-demo')}  ${C.dim('│')}`);
      term.echo(`  ${C.dim('└──────────────────────────────────────────────────┘')}`);
      term.echo('');
    }

    /* ── Auto-demo (types commands + shows logs) ───────────────────────── */
    if (autoDemo) {
      let demoRunning = true;
      let demoTimeout = null;

      // Stop demo on user interaction
      const stopDemo = () => {
        if (!demoRunning) return;
        demoRunning = false;
        if (demoTimeout) clearTimeout(demoTimeout);
        term.echo('');
        term.echo(
          `${C.dim('Demo paused — terminal is now interactive. Type')} ${C.cyan('help')} ${C.dim('to explore.')}`
        );
        term.echo('');
      };

      term.on('keydown', stopDemo);

      function runDemo(idx) {
        if (!demoRunning || idx >= DEMO_SEQUENCE.length) {
          if (demoRunning) {
            term.echo('');
            term.echo(
              `${C.dim('Demo complete — terminal is now interactive. Type')} ${C.cyan('help')} ${C.dim('to explore.')}`
            );
            term.echo('');
            demoRunning = false;
          }
          return;
        }

        const step = DEMO_SEQUENCE[idx];
        demoTimeout = setTimeout(() => {
          if (!demoRunning) return;

          if (step.cmd) {
            // Simulate typing a command
            term.exec(step.cmd, false);
          } else if (step.log !== undefined) {
            term.echo(step.log);
          }

          runDemo(idx + 1);
        }, step.delay || 200);
      }

      // Start demo after a brief pause
      setTimeout(() => {
        if (demoRunning) runDemo(0);
      }, 1200);
    }

    return term;
  };
})();

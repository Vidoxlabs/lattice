import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { parse } from 'yaml';

const DIRECTORY = '.github/workflows';

/**
 * Every workflow in the repository, parsed, with its raw text for the lines a
 * parser drops (an action's version comment).
 * @returns {Map<string, { workflow: any, source: string }>}
 */
function workflows() {
  const files = readdirSync(DIRECTORY).filter((name) => /\.ya?ml$/.test(name)).sort();
  return new Map(files.map((name) => {
    const source = readFileSync(join(DIRECTORY, name), 'utf8');
    return [name, { workflow: parse(source), source }];
  }));
}

function triggers(workflow) {
  const value = workflow.on ?? workflow.true;
  if (typeof value === 'string') return { [value]: null };
  if (Array.isArray(value)) return Object.fromEntries(value.map((entry) => [entry, null]));
  return value;
}

const loaded = workflows();

test('the workflow set is exactly the five this deployment relies on', () => {
  assert.deepEqual([...loaded.keys()], ['check.yml', 'codeql.yml', 'deploy.yml', 'live-smoke.yml', 'snapshot-refresh.yml']);
});

test('every job has a timeout and least-privilege permissions', () => {
  const allowed = { contents: ['read', 'write'], 'security-events': ['write'], 'pull-requests': ['write'], actions: ['read'] };
  for (const [name, { workflow }] of loaded) {
    assert.ok(workflow.permissions, `${name}: permissions must be stated, not inherited`);
    for (const [scope, level] of Object.entries(workflow.permissions)) {
      assert.ok(allowed[scope]?.includes(level), `${name}: ${scope}: ${level} is not a level this deployment uses`);
    }
    for (const [jobName, job] of Object.entries(workflow.jobs)) {
      assert.equal(typeof job['timeout-minutes'], 'number', `${name}:${jobName} needs a timeout`);
      assert.ok(job['timeout-minutes'] <= 20, `${name}:${jobName} exceeds the twenty-minute ceiling`);
      assert.equal(job['runs-on'], 'ubuntu-latest', `${name}:${jobName} must name its runner`);
    }
  }
});

test('every action is pinned to a full commit with a version comment beside it', () => {
  for (const [name, { source }] of loaded) {
    const lines = source.split('\n').filter((line) => /^\s*(?:- )?uses:/.test(line));
    // The live smoke needs nothing but curl, so it legitimately uses no action.
    if (name === 'live-smoke.yml') assert.deepEqual(lines, [], 'the live smoke keeps to the runner shell');
    else assert.ok(lines.length > 0, `${name}: no actions found`);
    for (const line of lines) {
      const pinned = /^\s*(?:- )?uses:\s+([\w.-]+\/[\w./-]+)@([0-9a-f]{40})\s+#\s*(v\d+(?:\.\d+)*)\s*$/.exec(line);
      assert.ok(pinned, `${name}: an action is not pinned to a full commit with a version comment: ${line.trim()}`);
    }
  }
});

test('check runs on every push and pull request', () => {
  const { workflow } = loaded.get('check.yml');
  const on = triggers(workflow);
  assert.ok('push' in on, 'a push triggers the check');
  assert.ok('pull_request' in on, 'a pull request triggers the check');
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  const steps = workflow.jobs.check.steps;
  // The browser stage installs its own engines: a separate install step would
  // let two builds take different paths to the same stage.
  assert.equal(steps.some((step) => String(step.run ?? '').includes('playwright install')), false);
  const artifact = steps.find((step) => String(step.uses ?? '').startsWith('actions/upload-artifact'));
  assert.ok(artifact, 'the verified output is uploaded for the deploy job');
  assert.equal(artifact.if, "github.event_name == 'push' && github.ref == 'refs/heads/main'");
  assert.equal(artifact.with.name, 'lattice-dist');
});

test('deploy follows a successful check on main and stays inert without a token', () => {
  const { workflow, source } = loaded.get('deploy.yml');
  const on = triggers(workflow);
  assert.deepEqual(on.workflow_run.workflows, ['check']);
  assert.deepEqual(on.workflow_run.types, ['completed']);
  assert.deepEqual(on.workflow_run.branches, ['main']);
  assert.deepEqual(workflow.permissions, { contents: 'read', actions: 'read' });
  const deploy = workflow.jobs.deploy;
  assert.match(deploy.if, /conclusion == 'success'/);
  assert.match(deploy.if, /event == 'push'/);
  assert.match(source, /if \[ -z "\$\{CLOUDFLARE_API_TOKEN\}" \]/, 'an absent token skips the deploy instead of failing or publishing');
  assert.match(source, /npx wrangler deploy --config dist\/server\/wrangler\.json/, 'the host-entry configuration is deployed');
});

test('the snapshot refresh opens a draft pull request and never pushes to main', () => {
  const { workflow } = loaded.get('snapshot-refresh.yml');
  const on = triggers(workflow);
  assert.ok('schedule' in on, 'a weekly schedule triggers the refresh');
  assert.ok('workflow_dispatch' in on, 'a manual run is possible');
  assert.deepEqual(workflow.permissions, { contents: 'write', 'pull-requests': 'write' });
  const job = workflow.jobs.refresh;
  const script = job.steps.map((step) => String(step.run ?? '')).join('\n');
  assert.match(script, /GITHUB_READ_TOKEN="\$\{READ_TOKEN:-\$WORKFLOW_TOKEN\}"/, 'a dedicated token is used when present, the workflow token otherwise');
  assert.match(script, /git push origin "\$branch"/);
  assert.doesNotMatch(script, /git push[^\n]*\bmain\b/, 'the refresh never pushes to the default branch');
  assert.match(script, /gh pr create --draft/);
  assert.match(script, /--title "chore: refresh the status snapshot"/);
});

test('live smoke is gated, covers every published surface and never prompts the model', () => {
  const { workflow, source } = loaded.get('live-smoke.yml');
  const on = triggers(workflow);
  assert.ok('workflow_dispatch' in on);
  assert.ok('schedule' in on, 'the six-hourly schedule is present');
  assert.deepEqual(on.push.branches, ['main'], 'a push to main runs the smoke after the deploy');
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  const job = workflow.jobs.smoke;
  assert.equal(job.if, "vars.LIVE_SMOKE_ENABLED == 'true'", 'the variable is the switch');
  const script = job.steps.map((step) => String(step.run ?? '')).join('\n');
  const pathLine = script.split('\n').find((line) => line.includes('for path in '));
  assert.ok(pathLine, 'the check walks a list of published paths');
  const checked = pathLine.split('for path in ')[1].split(';')[0].trim().split(/\s+/);
  assert.deepEqual(checked, ['/', '/vivarium', '/docs', '/repositories', '/robots.txt', '/sitemap.xml', '/llms.txt', '/api/status']);
  assert.match(script, /content-security-policy/);
  assert.match(script, /includeSubDomains/, 'a subdomain pin is refused');
  assert.match(script, /www\.vidoxlabs\.com vidoxlabs\.dev www\.vidoxlabs\.dev/, 'all three alternate hosts are checked');
  assert.match(source, /'origin: https:\/\/example\.invalid'/, 'the chat check comes from a foreign origin');
  assert.match(script, /--data '\{"messages":\[\]\}'/, 'the chat check sends no question');
  assert.match(source, /for attempt in \$\(seq 1 12\)/, 'a push waits for the deploy to finish');
});

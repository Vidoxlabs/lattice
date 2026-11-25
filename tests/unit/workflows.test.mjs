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

test('every checkout keeps no credentials in the workspace', () => {
  let checkouts = 0;
  for (const [name, { workflow }] of loaded) {
    for (const [jobName, job] of Object.entries(workflow.jobs)) {
      for (const step of job.steps) {
        if (!String(step.uses ?? '').startsWith('actions/checkout')) continue;
        checkouts += 1;
        assert.equal(step.with?.['persist-credentials'], false, `${name}:${jobName} leaves the token in the checkout`);
      }
    }
  }
  assert.ok(checkouts >= 4, 'every workflow that checks out declares it');
});

test('check runs on every push, pull request, the daily schedule and a docs dispatch', () => {
  const { workflow } = loaded.get('check.yml');
  const on = triggers(workflow);
  assert.ok('push' in on, 'a push triggers the check');
  assert.ok('pull_request' in on, 'a pull request triggers the check');
  assert.deepEqual(on.schedule, [{ cron: '15 6 * * *' }], 'the site rebuilds once a day');
  assert.ok('workflow_dispatch' in on, 'a manual run is possible');
  assert.deepEqual(on.repository_dispatch, { types: ['docs-sync'] }, 'the docs sync arrives as a dispatch');
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  const steps = workflow.jobs.check.steps;
  const build = steps.find((step) => step.run === 'npm run check');
  assert.deepEqual(build?.env, { CI: '1', GITHUB_READ_TOKEN: '${{ secrets.GITHUB_TOKEN }}' }, 'the build gets the browser switch and the read-only workflow token, and nothing else');
  // The browser stage installs its own engines: a separate install step would
  // let two builds take different paths to the same stage.
  assert.equal(steps.some((step) => String(step.run ?? '').includes('playwright install')), false);
  const artifact = steps.find((step) => String(step.uses ?? '').startsWith('actions/upload-artifact'));
  assert.ok(artifact, 'the verified output is uploaded for the deploy job');
  assert.equal(artifact.if, "github.ref == 'refs/heads/main'", 'only a default-branch run offers its output');
  assert.equal(artifact.with.name, 'lattice-dist');
  assert.equal(artifact.with.path, 'dist');
});

test('deploy follows a successful default-branch check from any trigger, in the production environment', () => {
  const { workflow, source } = loaded.get('deploy.yml');
  const on = triggers(workflow);
  assert.deepEqual(on.workflow_run.workflows, ['check']);
  assert.deepEqual(on.workflow_run.types, ['completed']);
  assert.deepEqual(on.workflow_run.branches, ['main']);
  assert.deepEqual(workflow.permissions, { contents: 'read', actions: 'read' });
  const deploy = workflow.jobs.deploy;
  assert.equal(deploy.environment?.name, 'production', 'the deploy secrets live in a limited environment');
  assert.match(deploy.if, /conclusion == 'success'/);
  assert.match(deploy.if, /head_branch == 'main'/);
  for (const event of ['push', 'schedule', 'workflow_dispatch', 'repository_dispatch']) {
    assert.ok(deploy.if.includes(`"${event}"`), `a ${event} check can deploy`);
  }
  assert.match(source, /if \[ -z "\$\{CLOUDFLARE_API_TOKEN\}" \] \|\| \[ -z "\$\{CLOUDFLARE_ACCOUNT_ID\}" \]/, 'both secrets are required, and an absent one skips instead of publishing');
  assert.match(source, /secrets\.CLOUDFLARE_ACCOUNT_ID/);
  assert.doesNotMatch(source, /vars\.CLOUDFLARE_ACCOUNT_ID/, 'the account identifier is a secret, never a variable');
  assert.match(source, /npx wrangler deploy --config dist\/server\/wrangler\.json/, 'the host-entry configuration is deployed');
  const download = deploy.steps.find((step) => String(step.uses ?? '').startsWith('actions/download-artifact'));
  assert.ok(download, 'the deploy job downloads the verified artifact');
  assert.equal(download.with.name, 'lattice-dist', 'the artifact is the one the check run uploaded');
  // upload-artifact stores the contents of a single directory at the artifact
  // root, so the download path is what decides whether dist/server exists.
  const upload = loaded.get('check.yml').workflow.jobs.check.steps.find((step) => String(step.uses ?? '').startsWith('actions/upload-artifact'));
  assert.equal(download.with.path, upload.with.path, 'the artifact lands where the upload directory put it');
  const guard = deploy.steps.map((step) => String(step.run ?? '')).join('\n');
  assert.match(guard, /test -f dist\/server\/wrangler\.json/, 'the deploy configuration is checked for before deploying');
  assert.match(guard, /test -d dist\/client/, 'the static assets are checked for before deploying');
  assert.match(guard, /::error::/, 'a missing piece fails with a readable message');
});

test('the documentation repository notifies the site with a dispatch, and no deploy hook exists', () => {
  for (const [name, { source }] of loaded) {
    assert.doesNotMatch(source, /LATTICE_DEPLOY_HOOK_URL/, `${name} must not carry a deploy hook`);
    assert.doesNotMatch(source, /deploy[_-]hook/i, `${name} must not call a deploy hook`);
  }
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
  assert.match(script, /gh auth setup-git/, 'the push authenticates in its own step');
  assert.match(script, /git push origin "\$branch"/);
  assert.doesNotMatch(script, /git push[^\n]*\bmain\b/, 'the refresh never pushes to the default branch');
  assert.match(script, /gh pr create --draft/);
  assert.match(script, /--title "chore: refresh the status snapshot"/);
});

test('live smoke runs after a successful deploy, gated, and never prompts the model', () => {
  const { workflow, source } = loaded.get('live-smoke.yml');
  const on = triggers(workflow);
  assert.ok('workflow_dispatch' in on);
  assert.ok('schedule' in on, 'the six-hourly schedule is present');
  assert.equal('push' in on, false, 'a push is not what it follows');
  assert.deepEqual(on.workflow_run.workflows, ['deploy'], 'it follows the deploy');
  assert.deepEqual(on.workflow_run.types, ['completed']);
  assert.deepEqual(on.workflow_run.branches, ['main']);
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  const job = workflow.jobs.smoke;
  assert.match(job.if, /vars\.LIVE_SMOKE_ENABLED == 'true'/, 'the variable is the switch');
  assert.match(job.if, /workflow_run\.conclusion == 'success'/, 'a failed deploy is not smoked');
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
  assert.match(source, /for attempt in \$\(seq 1 12\)/, 'a fresh deploy is given time to propagate');
});

import fs from 'node:fs';
import path from 'node:path';
import { ProposalInfo } from './proposals.js';
import assert from 'node:assert';
import { execSync } from 'node:child_process';

const fixupProposal = (proposal: ProposalInfo) => {
  const proposalPath = path.join('proposals', proposal.path);
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(proposalPath, 'package.json'), 'utf-8'),
  );
  if (packageJson.dependencies || packageJson.devDependencies) {
    assert(
      packageJson.packageManager,
      'missing packageManager in package.json',
    );
    if (packageJson.packageManager.includes('yarn')) {
      console.log('found "yarn" packageManager, processing...');
      // ensure it has its own yarn.lock, to indicate this is a separate project
      const yarnLock = path.join(proposalPath, 'yarn.lock');
      if (!fs.existsSync(yarnLock)) {
        console.log(`creating empty ${yarnLock}`);
        fs.writeFileSync(yarnLock, '');
      }

      // default to node-modules linker
      // (The pnpm linker has little benefit because hard links can't cross
      // volumes so each Docker layer will have copies of the deps anyway. The
      // pnp linker might work but requires other changes.)
      const yarnRc = path.join(proposalPath, '.yarnrc.yml');
      if (!fs.existsSync(yarnRc)) {
        console.log(`creating ${yarnRc} with node-modules linker`);
        fs.writeFileSync(yarnRc, 'nodeLinker: node-modules\n');
      }

      // refresh install
      execSync('rm -rf node_modules', { cwd: proposalPath });
      // install to update yarn.lock and get importable typed modules but
      // skip building because the proposal never runs on the local filesystem.
      // Without this the local environment may install binaries (e.g. better_sqlite3.node)
      // that fail when mounted in the Docker environment by the test debug mode.
      execSync('yarn install --mode=skip-build', { cwd: proposalPath });
    }
  }
};

export const runDoctor = (proposals: ProposalInfo[]) => {
  console.log('Running doctor...');

  console.log('enabling corepack');
  execSync('corepack enable', { stdio: 'inherit' });

  // path to yarn
  const yarnpath = execSync('which yarn', {
    encoding: 'utf-8',
  });
  if (yarnpath.includes('homebrew')) {
    // Homebrew's yarn install overrides Node's corepack install
    console.error(
      'Homebrew installs of yarn are not supported. Use corepack instead:',
    );
    console.error('  brew uninstall yarn');
    process.exit(1);
  }
  console.log(yarnpath);

  console.log('Verifying the CLI runs and create the Dockerfiles');
  execSync('yarn synthetic-chain prepare-build', { stdio: 'inherit' });

  console.log(
    'Verifying the install Docker Buildx is new enough to handle the Bake file',
  );
  try {
    execSync('docker buildx bake --print');
  } catch (e: any) {
    console.error('Docker Buildx version is too old');
    execSync('docker buildx version', { stdio: 'inherit' });
    console.log(
      'It must be at least 0.11. https://docs.docker.com/build/release-notes/#0110',
    );
    process.exit(1);
  }

  for (const proposal of proposals) {
    try {
      console.log('\nchecking proposal', proposal.proposalName, '...');
      fixupProposal(proposal);
      console.log('passed');
    } catch (e: any) {
      console.error('message' in e ? e.message : e);
      console.log('PROBLEM ^^^  After correcting, run doctor again.');
    }
  }
};

import { spawnSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { ProposalInfo, imageNameForProposal } from './proposals.js';

const createMessageFile = () => {
  const messageFileName = `${new Date().getTime()}.tmp`;
  const messageFilePath = `/tmp/${messageFileName}`;
  spawnSync('touch', [`/tmp/${messageFileName}`]);
  return [messageFileName, messageFilePath];
};

const executeHostScriptIfPresent = (
  proposal: ProposalInfo,
  scriptName: string,
) => {
  const scriptPath = `${resolvePath('.')}/proposals/${proposal.path}/host/${scriptName}`;
  if (existsSync(scriptPath)) {
    console.log(
      `Running script ${scriptName} for proposal ${proposal.proposalName}`,
    );
    spawnSync(scriptPath, { env: process.env, stdio: 'inherit' });
  }
};

/**
 * Used to propagate a SLOGFILE environment variable into Docker containers.
 * Any file identified by such a variable will be created if it does not already
 * exist.
 *
 * @param {typeof process.env} env environment variables
 * @returns {string[]} docker run options
 */
const propagateSlogfile = env => {
  const { SLOGFILE } = env;
  if (!SLOGFILE) return [];

  spawnSync('touch', [SLOGFILE]);

  return [
    '--env',
    `SLOGFILE=${SLOGFILE}`,
    '--volume',
    `${SLOGFILE}:${realpathSync(SLOGFILE)}`,
  ];
};

export const runTestImage = (proposal: ProposalInfo) => {
  const [messageFileName, messageFilePath] = createMessageFile();

  const containerFilePath = `/root/${messageFileName}`;
  process.env.MESSAGE_FILE_PATH = messageFilePath;

  executeHostScriptIfPresent(proposal, 'before-test-run.sh');

  console.log(`Running test image for proposal ${proposal.proposalName}`);
  const { name } = imageNameForProposal(proposal, 'test');
  spawnSync(
    'docker',
    [
      'run',
      '--env',
      `MESSAGE_FILE_PATH=${containerFilePath}`,
      '--mount',
      `source=${messageFilePath},target=${containerFilePath},type=bind`,
      '--network',
      'host',
      '--rm',
      ...propagateSlogfile(process.env),
      name,
    ],
    { stdio: 'inherit' },
  );

  spawnSync('rm', ['--force', messageFilePath]);

  executeHostScriptIfPresent(proposal, 'after-test-run.sh');
};

export const debugTestImage = (proposal: ProposalInfo) => {
  executeHostScriptIfPresent(proposal, 'before-test-run.sh');
  const { name } = imageNameForProposal(proposal, 'test');
  console.log(
    `
  Starting chain of test image for proposal ${proposal.proposalName}
  
  To get an interactive shell in the container, use an IDE feature like "Attach Shell" or this command:'
  
    docker exec -ti $(docker ps -q -f ancestor=${name}) bash
  
  And within that shell:
    cd /usr/src/proposals/${proposal.path} && ./test.sh
  
  To edit files you can use terminal tools like vim, or mount the container in your IDE.
  In VS Code the command is:
    Dev Containers: Attach to Running Container...
  `,
  );

  // start the chain with ports mapped
  spawnSync(
    'docker',
    [
      'run',
      '--entrypoint',
      '/usr/src/upgrade-test-scripts/start_agd.sh',
      '--interactive',
      '--publish',
      '1317:1317',
      '--publish',
      '9090:9090',
      '--publish',
      '26657:26657',
      '--tty',
      ...propagateSlogfile(process.env),
      name,
    ],
    { stdio: 'inherit' },
  );
  executeHostScriptIfPresent(proposal, 'after-test-run.sh');
};

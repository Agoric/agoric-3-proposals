import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { ProposalInfo, imageNameForProposal } from './proposals.js';

const propagateMessageFilePath = (env: typeof process.env) => {
  const fileName = 'message-file-path.tmp';
  const { HOME } = env;

  const containerFilePath = `/root/${fileName}`;
  const filePath = `${HOME}/${fileName}`;

  spawnSync('touch', [filePath]);

  return [
    '--env',
    `MESSAGE_FILE_PATH=${containerFilePath}`,
    '--mount',
    `source=${filePath},target=${containerFilePath},type=bind`,
  ];
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
    "--env",
    `SLOGFILE=${SLOGFILE}`,  
    "--volume",
    `${SLOGFILE}:${realpathSync(SLOGFILE)}`
  ];
};

export const runTestImage = (proposal: ProposalInfo) => {
  console.log(`Running test image for proposal ${proposal.proposalName}`);
  const { name } = imageNameForProposal(proposal, 'test');
  spawnSync(
    'docker',
    [
      'run',
      '--network',
      'host',
      '--rm',
      ...propagateSlogfile(process.env),
      ...propagateMessageFilePath(process.env),
      name,
    ],
    { stdio: 'inherit' },
  );
};

export const debugTestImage = (proposal: ProposalInfo) => {
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
      '26657:26657',
      '--publish',
      '1317:1317',
      '--publish',
      '9090:9090',
      '--tty',
      ...propagateSlogfile(process.env),
      name,
    ],
    { stdio: 'inherit' },
  );
};

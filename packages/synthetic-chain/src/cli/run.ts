import { execSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { ProposalInfo, imageNameForProposal } from './proposals.js';

const propagateMessageFilePath = () => {
  const timestamp = new Date().getTime();
  const filePath = `/tmp/${timestamp}.tmp`;
  execSync(`touch ${filePath}`);
  return [
    '--env',
    `MESSAGE_FILE_PATH=${filePath}`,
    '--mount',
    `"source=${filePath},target=${filePath},type=bind"`,
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

  execSync('touch "$SLOGFILE"');
  return [
    '--env',
    'SLOGFILE',
    '--volume',
    `"$SLOGFILE:${realpathSync(SLOGFILE)}"`,
  ];
};

export const runTestImage = (proposal: ProposalInfo) => {
  console.log(`Running test image for proposal ${proposal.proposalName}`);
  const { name } = imageNameForProposal(proposal, 'test');
  const cmd = [
    'docker',
    'run',
    `--network "host"`,
    '--rm',
    `--user "root"`,
    ...propagateSlogfile(process.env),
    ...propagateMessageFilePath(),
    name,
  ].join(' ');
  execSync(cmd, { stdio: 'inherit' });
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

  const slogOpts = propagateSlogfile(process.env);
  // start the chain with ports mapped
  const cmd = `docker run ${slogOpts.join(' ')} --publish 26657:26657 --publish 1317:1317 --publish 9090:9090 --interactive --tty --entrypoint /usr/src/upgrade-test-scripts/start_agd.sh ${name}`;
  execSync(cmd, { stdio: 'inherit' });
};

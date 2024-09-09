import { execSync } from 'node:child_process';
import { ProposalInfo, imageNameForProposal } from './proposals.js';

export const runTestImage = (proposal: ProposalInfo, repositoryColon: string) => {
  console.log(`Running test image for proposal ${proposal.proposalName}`);
  const { name } = imageNameForProposal(proposal, 'test', repositoryColon);
  // 'rm' to remove the container when it exits
  const cmd = `docker run --rm ${name}`;
  execSync(cmd, { stdio: 'inherit' });
};

export const debugTestImage = (proposal: ProposalInfo, repositoryColon: string) => {
  const { name } = imageNameForProposal(proposal, 'test', repositoryColon);
  console.log(
    `
  Starting chain of test image for proposal ${proposal.proposalName}
  
  To get an interactive shell in the container, use an IDE feature like "Attach Shell" or this command:'
  
    docker exec -ti $(docker ps -q -f ancestor=${name}) bash
  
  And within that shell:
    cd /usr/src/proposals/${proposal.path} && ./test.sh
  
  The 'proposals' path is mounted in the container so your edits will appear there.
  `,
  );

  // start the chain, with ports mapped and the repo mounted at /usr/src
  const cmd = `docker run --publish 26657:26657 --publish 1317:1317 --publish 9090:9090 --mount type=bind,src=./proposals,dst=/usr/src/proposals --interactive --tty --entrypoint /usr/src/upgrade-test-scripts/start_agd.sh ${name}`;
  execSync(cmd, { stdio: 'inherit' });
};

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ProposalInfo, imageNameForProposal } from './proposals.js';

export const buildProposalSubmissions = (proposals: ProposalInfo[]) => {
  for (const proposal of proposals) {
    if (!('source' in proposal && proposal.source === 'build')) continue;

    console.log(
      'Refreshing submission for',
      proposal.proposalIdentifier,
      proposal.proposalName,
    );
    const { buildScript } = proposal;
    const proposalPath = `proposals/${proposal.proposalIdentifier}:${proposal.proposalName}`;
    const submissionPath = `${proposalPath}/submission`;
    const relativeBuildScript = path.relative(submissionPath, buildScript);

    execSync(`mkdir -p ${submissionPath}`);
    // Generate files only in submission path.
    execSync(`agoric run ${relativeBuildScript}`, {
      cwd: submissionPath,
      env: { ...process.env, HOME: '.' },
    });
    // find the one file ending in -plan.json
    // TODO error if there is more than one
    const planPath = execSync(
      `find ${submissionPath} -maxdepth 1 -type f -name '*-plan.json'`,
    )
      .toString()
      .trim();
    const plan = JSON.parse(fs.readFileSync(planPath, 'utf-8'));
    for (const { fileName } of plan.bundles) {
      // Copy the bundle into the submission path.
      execSync(`cp ${fileName} ${submissionPath}`);
    }
  }
};

export const buildTestImages = (proposals: ProposalInfo[], dry = false) => {
  for (const proposal of proposals) {
    if (!dry) {
      console.log(
        `\nBuilding test image for proposal ${proposal.proposalName}`,
      );
    }
    const { name, target } = imageNameForProposal(proposal, 'test');
    // 'load' to ensure the images are output to the Docker client. Seems to be necessary
    // for the CI docker/build-push-action to re-use the cached stages.
    const cmd = `docker buildx build --load --tag ${name} --target ${target} .`;
    console.log(cmd);
    if (!dry) {
      // `time` to output how long each build takes
      execSync(`time ${cmd}`, { stdio: 'inherit' });
    }
  }
};

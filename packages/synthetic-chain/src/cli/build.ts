import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ProposalInfo } from './proposals.js';

export type Platform = 'linux/amd64' | 'linux/arm64';

export type AgoricSyntheticChainConfig = {
  /**
   * The agoric-3-proposals tag to build the agoric synthetic chain from.
   * If `null`, the chain is built from an ag0 genesis.
   * Defaults to `latest`, which containing all passed proposals
   */
  fromTag: string | null;
  platforms?: Platform[];
};

const defaultConfig: AgoricSyntheticChainConfig = {
  // Tag of the agoric-3 image containing all passed proposals
  // Must match the Bake file and CI config
  fromTag: 'latest',
};

export function readBuildConfig(root: string): AgoricSyntheticChainConfig {
  const packageJsonPath = path.join(root, 'package.json');
  const packageJson = fs.readFileSync(packageJsonPath, 'utf-8');
  const { agoricSyntheticChain } = JSON.parse(packageJson);

  const config = { ...defaultConfig, ...agoricSyntheticChain };
  // UNTIL https://github.com/Agoric/agoric-3-proposals/issues/77
  return config;
}

export const buildProposalSubmissions = (proposals: ProposalInfo[]) => {
  for (const proposal of proposals) {
    if (!('source' in proposal && proposal.source === 'build')) continue;

    console.log(
      'Refreshing submission for',
      proposal.proposalIdentifier,
      proposal.proposalName,
    );
    const { buildScript } = proposal;
    const proposalPath = `proposals/${path}`;
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
      // Set timestamp to zero to avoid invalidating the build cache
      execSync(`touch -t 197001010000 ${submissionPath}/${fileName}`);
    }
  }
};

/**
 * Bake images using the docker buildx bake command.
 *
 * Note this uses `--load` which pushes the completed images to the builder,
 * consuming 2-3 GB per image.
 * @see {@link https://docs.docker.com/engine/reference/commandline/buildx_build/#load}
 *
 * @param target - The image or group target
 * @param [dry] - Whether to skip building and just print the build config.
 */
export const bakeTarget = (target: string, dry = false) => {
  const cmd = `docker buildx bake --load ${target} ${dry ? '--print' : ''}`;
  console.log(cmd);
  execSync(cmd, { stdio: 'inherit' });
};

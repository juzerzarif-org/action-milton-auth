import * as core from '@actions/core';

import { cleanupGitCredentials, setupGitCredentials } from './git-credentials.js';
import {
  revokeMiltonInstallationToken,
  createMiltonInstallationToken,
} from './milton-installation.js';
import { parseMiltonSecrets } from './milton-secrets.js';
import { parsePermissions } from './permissions.js';

// Determines if this process is running the action's post phase
const isPost = !!core.getState('is-post');
if (!isPost) {
  core.saveState('is-post', true);
}

const InputName = {
  MILTON_SECRETS: 'milton-secrets',
  SETUP_GIT_CREDENTIALS: 'setup-git-credentials',
  PERMISSIONS: 'permissions',
};

async function main() {
  const miltonSecrets = parseMiltonSecrets(core.getInput(InputName.MILTON_SECRETS));
  const permissions = parsePermissions(core.getInput(InputName.PERMISSIONS));
  const shouldSetupGitCreds = core.getBooleanInput(InputName.SETUP_GIT_CREDENTIALS);

  const miltonInstallationToken = await createMiltonInstallationToken({
    secrets: miltonSecrets,
    permissions,
  });

  if (shouldSetupGitCreds) {
    await setupGitCredentials(miltonSecrets.login, miltonInstallationToken);
  }

  core.setOutput('token', miltonInstallationToken);
}

async function cleanup() {
  const shouldSetupGitCreds = core.getBooleanInput(InputName.SETUP_GIT_CREDENTIALS);

  await revokeMiltonInstallationToken();
  if (shouldSetupGitCreds) {
    await cleanupGitCredentials();
  }
}

try {
  if (isPost) {
    await cleanup();
  } else {
    await main();
  }
} catch (err) {
  core.setFailed((err as Error | undefined) || 'Unknown error occurred');
}

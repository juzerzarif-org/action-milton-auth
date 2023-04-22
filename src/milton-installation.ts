import * as core from '@actions/core';
import * as github from '@actions/github';
import { createAppAuth } from '@octokit/auth-app';

import { type MiltonSecrets } from './milton-secrets.js';
import { type PermissionDict } from './permissions.js';

interface CreateMiltonTokenOptions {
  secrets: MiltonSecrets;
  permissions: PermissionDict;
}

const INSTALLATION_TOKEN_STATE_KEY = 'milton-installation-token';

async function createMiltonInstallationToken(options: CreateMiltonTokenOptions): Promise<string> {
  const { appId, installationId, clientId, clientSecret, privateKey } = options.secrets;
  const miltonAppAuth = createAppAuth({ appId, privateKey, clientId, clientSecret });
  const miltonInstallation = await miltonAppAuth({
    type: 'installation',
    installationId,
    permissions: options.permissions,
  });

  core.info(
    `milton-bot installation token created successfully. Expires at ${miltonInstallation.expiresAt}.`
  );
  core.saveState(INSTALLATION_TOKEN_STATE_KEY, miltonInstallation.token);
  return miltonInstallation.token;
}

async function revokeMiltonInstallationToken(): Promise<void> {
  const savedInstallationToken = core.getState(INSTALLATION_TOKEN_STATE_KEY);
  if (savedInstallationToken) {
    try {
      core.info('Revoking milton-bot installation token...');
      const miltonOctokit = github.getOctokit(savedInstallationToken);
      await miltonOctokit.rest.apps.revokeInstallationAccessToken();
    } catch (err) {
      core.error(`Error while revoking milton-bot installation token: ${err}`);
      core.info('Workflow will not be marked as failed...');
    }
  }
}

export { createMiltonInstallationToken, revokeMiltonInstallationToken };

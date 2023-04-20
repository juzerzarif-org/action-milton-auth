import * as core from '@actions/core';
import { createAppAuth } from '@octokit/auth-app';
import { parseMiltonSecrets } from './milton-secrets.js';
import { parsePermissions } from './permissions.js';
import { exec } from '@actions/exec';
import { GitFilesManager } from './git-files-manager.js';

const InputName = {
  MILTON_SECRETS: 'milton-secrets',
  SETUP_GIT_CREDENTIALS: 'setup-git-credentials',
  PERMISSIONS: 'permissions',
};

async function main() {
  const miltonSecrets = parseMiltonSecrets(core.getInput(InputName.MILTON_SECRETS));
  const permissions = parsePermissions(core.getInput(InputName.PERMISSIONS));
  const shouldSetupGitCreds = core.getBooleanInput(InputName.SETUP_GIT_CREDENTIALS);

  const miltonApp = createAppAuth({
    appId: miltonSecrets.appId,
    privateKey: miltonSecrets.privateKey,
  });
  const auth = await miltonApp({
    type: 'installation',
    installationId: miltonSecrets.installationId,
    permissions,
  });

  if (shouldSetupGitCreds) {
    const gitFilesManager = GitFilesManager.initialize();
    // user and email format from https://github.com/orgs/community/discussions/24664
    const gitUser = miltonSecrets.login;
    const gitEmail = `${miltonSecrets.userId}+${miltonSecrets.login}@users.noreply.github.com`;

    await gitFilesManager.ensureGlobalConfig();
    await gitFilesManager.saveInCredentialStore(miltonSecrets.login, auth.token);

    await exec('git', ['config', '--global', 'credential.helper', 'store']);
    await exec('git', [
      'config',
      '--global',
      '--replace-all',
      'url.https://github.com/.insteadOf',
      'ssh://git@github.com/',
    ]);
    await exec('git', [
      'config',
      '--global',
      '--add',
      'url.https://github.com/.insteadOf',
      'git@github.com:',
    ]);
    await exec('git', [
      'config',
      '--global',
      'credential.https://github.com.username',
      miltonSecrets.login,
    ]);
    await exec('git', ['config', '--global', 'user.name', gitUser]);
    await exec('git', ['config', '--global', 'user.email', gitEmail]);
    await exec('git', ['config', '--list']);
  }

  core.setOutput('token', auth.token);
}

try {
  await main();
} catch (err) {
  core.setFailed((err as Error | undefined) || 'Unknown error occurred');
  process.exitCode = 1;
} finally {
  process.exit();
}

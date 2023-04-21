import { exec } from '@actions/exec';

import { GitFilesManager } from './git-files-manager.js';

async function setupGitCredentials(user: string, password: string): Promise<void> {
  const gitFilesManager = await GitFilesManager.initialize();
  await gitFilesManager.saveInCredentialStore(user, password);

  await exec('git', ['config', '--global', 'credential.helper', 'store']);
  await exec('git', ['config', '--global', 'credential.https://github.com.username', user]);
  // prettier-ignore
  await exec('git', ['config', '--global', '--replace-all', 'url.https://github.com/.insteadOf', 'ssh://git@github.com/']);
  // prettier-ignore
  await exec('git', ['config', '--global', '--add', 'url.https://github.com/.insteadOf', 'git@github.com:']);
}

async function cleanupGitCredentials() {
  const gitFilesManager = await GitFilesManager.initialize();
  await gitFilesManager.restoreGitFiles();
}

export { setupGitCredentials, cleanupGitCredentials };

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import * as core from '@actions/core';
import { escapeRegExp } from 'lodash';

const CREDENTIALS_STORE_PATH = path.join(os.homedir(), '.git-credentials');
const GLOBAL_CONFIG_PATH = path.join(
  process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'),
  'git',
  'config'
);

class GitFilesManager {
  private PRESERVED_FILES_STATE_KEY = 'preserved-git-files';

  private constructor() {}

  static async initialize(): Promise<GitFilesManager> {
    const gitFilesManager = new GitFilesManager();
    await gitFilesManager.preserveFilesIfNeeded([GLOBAL_CONFIG_PATH, CREDENTIALS_STORE_PATH]);
    return gitFilesManager;
  }

  async saveInCredentialStore(user: string, password: string): Promise<void> {
    const userCredentialRegex = new RegExp(`https:\/\/${escapeRegExp(user)}:.+@github\.com`);

    core.info(`Storing user credentials in git credential store at ${CREDENTIALS_STORE_PATH}`);
    const credentialStoreContent = await fs.promises.readFile(CREDENTIALS_STORE_PATH, {
      encoding: 'utf-8',
    });
    const credentialUrls = credentialStoreContent.split(/\r?\n/).filter((line) => {
      line = line.trim();
      if (!line) return false;

      if (line.match(userCredentialRegex)) {
        core.debug(
          'Found an existing entry in the credential store with the same username. Removing...'
        );
        return false;
      }
      return true;
    });

    credentialUrls.push(`https://${user}:${password}@github.com`);
    await fs.promises.writeFile(CREDENTIALS_STORE_PATH, credentialUrls.join('\n'), {
      encoding: 'utf-8',
    });
  }

  async restoreGitFiles(): Promise<void> {
    const preservedFilesState = core.getState(this.PRESERVED_FILES_STATE_KEY) || '{}';
    const preservedFilesMap = JSON.parse(preservedFilesState) as Record<string, string>;

    for (const [filePath, fileContent] of Object.entries(preservedFilesMap)) {
      core.info(`Restoring file at ${filePath} to its original state`);
      if (!fileContent) {
        await fs.promises.rm(filePath, { force: true });
      } else {
        await fs.promises.writeFile(filePath, fileContent, { encoding: 'utf-8' });
      }

      delete preservedFilesMap[filePath];
      core.saveState(this.PRESERVED_FILES_STATE_KEY, JSON.stringify(preservedFilesMap));
    }
  }

  protected async preserveFilesIfNeeded(filePaths: string[]) {
    const preservedFilesState = core.getState(this.PRESERVED_FILES_STATE_KEY) || '{}';
    const preservedFilesMap = JSON.parse(preservedFilesState) as Record<string, string>;

    await Promise.all(
      filePaths.map(async (filePath) => {
        if (Object.prototype.hasOwnProperty.call(preservedFilesMap, filePath)) {
          // File was already preserved nothing to do
          return;
        }

        core.info(`Preserving original state of file used by git at ${filePath}`);
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
        const file = await fs.promises.open(filePath, 'a+');

        preservedFilesMap[filePath] = await file.readFile({ encoding: 'utf-8' });
        await file.close();
      })
    );
    core.saveState(this.PRESERVED_FILES_STATE_KEY, JSON.stringify(preservedFilesMap));
  }
}

export { GitFilesManager };

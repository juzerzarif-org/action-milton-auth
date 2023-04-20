import * as core from '@actions/core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { escapeRegExp } from 'lodash';

function buildStateHelpersFor(key: string) {
  return {
    get(): string {
      return core.getState(key);
    },
    set(value: string) {
      return core.saveState(key, value);
    },
  };
}

const credentialStoreState = buildStateHelpersFor('git-credential-store');
const globalConfigState = buildStateHelpersFor('git-global-config');

export class GitFilesManager {
  private originalCredentialStorePreserved = false;
  private originalGlobalConfigPreserved = false;

  private credentialStorePath = path.join(os.homedir(), '.git-credentials');
  private globalConfigPath = path.join(
    process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'),
    'git',
    'config'
  );

  private constructor() {}

  static initialize() {
    return new GitFilesManager();
  }

  async saveInCredentialStore(user: string, password: string): Promise<void> {
    core.startGroup('Store user credentials in git credential store');
    const credentialStore = await this.openCredentialStore();
    const userCredentialRegex = new RegExp(`https:\/\/${escapeRegExp(user)}:.+@github\.com`);

    const credentialUrls = (await credentialStore.readFile({ encoding: 'utf-8' }))
      .split(/\r?\n/)
      .filter((line) => {
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
    await credentialStore.truncate(0);
    await credentialStore.write(credentialUrls.join('\n'), null, 'utf-8');
    await credentialStore.close();
    core.endGroup();
  }

  async cleanupCredentialStore() {
    const savedCredentialStoreContent = credentialStoreState.get();
    if (!savedCredentialStoreContent) {
      await fs.promises.rm(this.credentialStorePath, { force: true });
    } else {
      await fs.promises.writeFile(this.credentialStorePath, savedCredentialStoreContent);
    }
  }

  async ensureGlobalConfig() {
    core.info(`Using global git config file at ${this.globalConfigPath}`);
    await fs.promises.mkdir(path.dirname(this.globalConfigPath), { recursive: true });
    const globalConfig = await fs.promises.open(this.globalConfigPath, 'a+');

    if (!this.originalGlobalConfigPreserved) {
      core.debug('Saving original state of global git config file to restore in post step');
      globalConfigState.set(await globalConfig.readFile({ encoding: 'utf-8' }));
      this.originalGlobalConfigPreserved = true;
    }

    await globalConfig.close();
  }

  async cleanupGlobalConfig() {
    const savedGlobalConfigContent = globalConfigState.get();
    if (!savedGlobalConfigContent) {
      await fs.promises.rm(this.globalConfigPath, { force: true });
    } else {
      await fs.promises.writeFile(this.globalConfigPath, savedGlobalConfigContent);
    }
  }

  private async openCredentialStore() {
    core.info(`Using git credential store at ${this.credentialStorePath}`);
    const credentialStore = await fs.promises.open(this.credentialStorePath, 'a+');

    if (!this.originalCredentialStorePreserved) {
      core.debug('Saving original state of git credential store to restore in post step');
      credentialStoreState.set(await credentialStore.readFile({ encoding: 'utf-8' }));
      this.originalCredentialStorePreserved = true;
    }

    return credentialStore;
  }
}

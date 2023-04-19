import * as core from '@actions/core';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from 'octokit';
import { z } from 'zod';
import { getGithubRepository } from './workflowEnv.js';

const VALID_PERMISSION_KEYS = [
  'actions',
  'administration',
  'checks',
  'contents',
  'deployments',
  'environments',
  'issues',
  'metadata',
  'packages',
  'pages',
  'pull_requests',
  'repository_announcement_banners',
  'repository_hooks',
  'repository_projects',
  'secret_scanning_alerts',
  'secrets',
  'security_events',
  'single_file',
  'statuses',
  'vulnerability_alerts',
  'workflows',
  'members',
  'organization_administration',
  'organization_custom_roles',
  'organization_announcement_banners',
  'organization_hooks',
  'organization_personal_access_tokens',
  'organization_personal_access_token_requests',
  'organization_plan',
  'organization_projects',
  'organization_packages',
  'organization_secrets',
  'organization_self_hosted_runners',
  'organization_user_blocking',
  'team_discussions',
] as const;
type PermissionKey = (typeof VALID_PERMISSION_KEYS)[number];
function isValidPermissionKey(key: string): key is PermissionKey {
  return VALID_PERMISSION_KEYS.includes(key as PermissionKey);
}

const VALID_PERMISSION_VALUES = ['read', 'write'] as const;
type PermissionValue = (typeof VALID_PERMISSION_VALUES)[number];
function isValidPermissionValue(value: string): value is PermissionValue {
  return VALID_PERMISSION_VALUES.includes(value as PermissionValue);
}

type PermissionDict = Partial<Record<PermissionKey, PermissionValue>>;

const InputName = {
  MILTON_SECRETS: 'milton-secrets',
  SETUP_GIT_CREDS: 'setup-git-creds',
  PERMISSIONS: 'permissions',
};

const miltonSecretsSchema = z.object({
  appId: z.string(),
  installationId: z.string(),
  clientId: z.string(),
  clientSecret: z.string(),
  privateKey: z.string(),
});

function getMiltonAppSecrets() {
  const miltonSecretsPayload = core.getInput(InputName.MILTON_SECRETS);
  if (!miltonSecretsPayload) {
    throw new Error(
      'Input milton-secret is required. Normally you can access it from org secrets.'
    );
  }

  core.debug(miltonSecretsPayload);
  return miltonSecretsSchema.parse(JSON.parse(miltonSecretsPayload));
}

async function main() {
  const miltonSecrets = getMiltonAppSecrets();
  // const shouldSetupGitCreds = core.getBooleanInput(InputName.SETUP_GIT_CREDS);
  const permissions = core.getMultilineInput(InputName.PERMISSIONS);

  if (!permissions) {
    throw new Error('You need to explicitly ask for the permissions you need');
  }

  const permissionDict = permissions.reduce((permissionDict, permissionString) => {
    const match = permissionString.match(/^(.+)\s*:\s*(.+)$/);
    if (!match) {
      throw new Error(
        `Permission item "${permissionString}" does not conform to pattern "scope:value"`
      );
    }

    const [, permissionKey, permissionValue] = match as [string, string, string];
    if (!isValidPermissionKey(permissionKey)) {
      throw new Error(`"${permissionKey}" is not a valid permission scope`);
    }
    if (!isValidPermissionValue(permissionValue)) {
      throw new Error(`"${permissionValue}" is not a valid permission value`);
    }

    permissionDict[permissionKey] = permissionValue;
    return permissionDict;
  }, {} as PermissionDict);

  const miltonApp = createAppAuth({
    appId: miltonSecrets.appId,
    privateKey: miltonSecrets.privateKey,
  });
  const auth = await miltonApp({
    type: 'installation',
    permissions: permissionDict,
    installationId: miltonSecrets.installationId,
  });

  core.setOutput('token', auth.token);
}

try {
  await main();
} catch (err) {
  core.error((err as Error | undefined) || 'Unknown error occurred');
  process.exitCode = 1;
} finally {
  process.exit();
}

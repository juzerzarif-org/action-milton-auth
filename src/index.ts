import * as core from '@actions/core';

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

const VALID_PERMISSION_VALUES = ['read', 'write'] as const;
type PermissionValue = (typeof VALID_PERMISSION_VALUES)[number];

async function main() {
  const shouldSetupGitCreds = core.getBooleanInput('setup-git-creds');
  const permissions = core.getMultilineInput('permissions');

  core.info(
    `setup-git-creds: type: ${typeof shouldSetupGitCreds}, JSON: ${JSON.stringify(
      shouldSetupGitCreds
    )}`
  );
  core.info(`permissions: type: ${typeof permissions}, JSON: ${JSON.stringify(permissions)}`);
}

main();

import assert from 'assert';

const VALID_PERMISSION_SCOPES = [
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
type PermissionScope = (typeof VALID_PERMISSION_SCOPES)[number];
function isValidPermissionScope(scope: string): scope is PermissionScope {
  return VALID_PERMISSION_SCOPES.includes(scope as PermissionScope);
}

const VALID_PERMISSION_VALUES = ['read', 'write'] as const;
type PermissionValue = (typeof VALID_PERMISSION_VALUES)[number];
function isValidPermissionValue(value: string): value is PermissionValue {
  return VALID_PERMISSION_VALUES.includes(value as PermissionValue);
}

type PermissionDict = Partial<Record<PermissionScope, PermissionValue>>;

function parsePermissions(permissionsInput: string): PermissionDict {
  const permissionEntries = permissionsInput.split(/\r?\n/).map((entry) => entry.trim());
  return permissionEntries.reduce((permissionDict, permissionEntry) => {
    const errorPrefix = `Error parsing permission entry "${permissionEntry}":`;
    const match = permissionEntry.match(/^(.+)\s*:\s*(.+)$/);
    if (!match) {
      throw new Error(`${errorPrefix} Does not conform to pattern scope:value`);
    }

    const [, scope, permissionValue] = match as [string, string, string];
    assert.ok(
      isValidPermissionScope(scope),
      `${errorPrefix} "${scope}" is not a valid GitHub App permission scope`
    );
    assert.ok(
      isValidPermissionValue(permissionValue),
      `${errorPrefix} "${permissionValue}" is not a valid GitHub App permission value`
    );

    permissionDict[scope] = permissionValue;

    return permissionDict;
  }, {} as PermissionDict);
}

export { PermissionScope, PermissionValue, PermissionDict, parsePermissions };

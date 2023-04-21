import assert from 'node:assert';

const SECRET_PAYLOAD_KEYS = [
  'appId',
  'installationId',
  'clientId',
  'clientSecret',
  'privateKey',
  'userId',
  'login',
] as const;
type MiltonSecretKey = (typeof SECRET_PAYLOAD_KEYS)[number];

type MiltonSecrets = Record<MiltonSecretKey, string>;

function hasOwnProperty<const K extends string>(obj: any, key: K): obj is Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function parseMiltonSecrets(secretsPayload: string): MiltonSecrets {
  const errorPrefix = 'Error parsing milton-secrets:';
  let secretsObject: object;
  try {
    secretsObject = JSON.parse(secretsPayload);
  } catch (err) {
    const error = err as Error;
    error.message = `${errorPrefix} ${error.message}`;
    throw error;
  }

  for (let key of SECRET_PAYLOAD_KEYS) {
    assert.ok(hasOwnProperty(secretsObject, key), `${errorPrefix} Missing required key "${key}"`);

    const valueType = typeof secretsObject[key];
    assert.ok(
      valueType === 'string',
      `${errorPrefix} Unexpected type for value of key "${key}". Expected string, got ${valueType}`
    );
  }

  return secretsObject as MiltonSecrets;
}

export { type MiltonSecrets, parseMiltonSecrets };

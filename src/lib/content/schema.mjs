import Ajv from 'ajv';
import manifestSchema from '../../data/contracts/manifest.schema.json' with { type: 'json' };
import statusSchema from '../../data/contracts/status.schema.json' with { type: 'json' };

const ajv = new Ajv({ allErrors: true, strict: true });
const manifestValidator = ajv.compile(manifestSchema);
const statusValidator = ajv.compile(statusSchema);

function validate(validator, value, label) {
  if (!validator(value)) {
    const detail = validator.errors?.map((error) => `${error.instancePath || '/'} ${error.message}`).join('; ');
    throw new Error(`${label} failed schema validation: ${detail}`);
  }
  return value;
}

export function validateManifest(value) {
  return validate(manifestValidator, value, 'Documentation manifest');
}

export function validateStatus(value) {
  return validate(statusValidator, value, 'Repository status');
}

export function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

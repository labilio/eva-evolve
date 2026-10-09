// Interaction policy only. Semi remains the sole owner of values and field errors.
export function createSubmissionGate() {
  let generation = 0;
  let active = null;
  return {
    begin() { if (active !== null) return null; active = ++generation; return active; },
    current(token) { return active === token; },
    finish(token) { if (active === token) active = null; },
    reset() { generation++; active = null; },
  };
}

// Semi cancels a superseded field validator without settling its old promise.
// Serialize requests, coalesce equal requests, and recheck changed values before
// returning a result. No values or field errors are stored outside Semi.
export function createValidationQueue(validate) {
  let revision = 0, generation = 0, tail = Promise.resolve();
  const requests = new Map();
  return {
    changed() { revision++; },
    reset() { generation++; revision++; requests.clear(); tail = Promise.resolve(); },
    validate(fields) {
      const key = fields == null ? '*' : JSON.stringify(fields);
      if (requests.has(key)) return requests.get(key);
      const epoch = generation;
      const request = tail.then(async () => {
        while (epoch === generation) {
          const version = revision;
          let values, error, failed = false;
          try { values = await validate(fields); }
          catch (reason) { failed = true; error = reason; }
          if (epoch !== generation) break;
          if (version !== revision) continue;
          if (failed) throw error;
          return values;
        }
        throw new Error('表单已关闭或切换');
      });
      requests.set(key, request);
      const finish = () => { if (requests.get(key) === request) requests.delete(key); };
      request.then(finish, finish);
      tail = request.catch(() => {});
      return request;
    },
  };
}

export const formDefaults = Object.freeze({
  trigger: 'custom',
  labelPosition: 'top',
  autoScrollToError: true,
  showValidateIcon: false,
});

// Required validation and required-label decoration are independent.
// Only mixed forms need stars to distinguish required fields from optional ones.
export function requiredLabelPolicy(fields) {
  const mixed = fields.some(field => field.required === true) && fields.some(field => field.required !== true);
  return field => ({text: field.label, required: mixed && field.required === true});
}

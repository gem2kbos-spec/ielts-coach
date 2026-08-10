const Ajv = require('ajv');

const ajv = new Ajv({ allowUnionTypes: true });

const itemSchema = {
  type: 'object',
  required: ['module', 'subtype', 'content'],
  properties: {
    id: { type: 'string' },
    module: { type: 'string', enum: ['writing', 'reading', 'listening', 'speaking', 'writing_expression'] },
    subtype: { type: 'string', minLength: 1 },
    difficulty: { type: ['string', 'null'], enum: ['easy', 'medium', 'hard', null] },
    tags: { type: 'array', items: { type: 'string' } },
    source: { type: 'string', enum: ['builtin_public', 'user_import', 'ai_generated'] },
    content: { type: 'object' },
    file_path: { type: ['string', 'null'] },
  },
  additionalProperties: false,
};

const validateItem = ajv.compile(itemSchema);

function assertValidItem(item) {
  if (!validateItem(item)) {
    const msg = ajv.errorsText(validateItem.errors, { separator: '; ' });
    throw new Error(`题目格式不合法: ${msg}`);
  }
  return true;
}

module.exports = { itemSchema, validateItem, assertValidItem };

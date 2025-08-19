export const workflowSchema = {
  $id: "https://claude-auto-worker/schemas/workflow.json",
  type: "object",
  additionalProperties: true,
  required: ["name", "steps"],
  properties: {
    name: { type: "string", minLength: 1 },
    description: { type: "string" },
    version: { type: "string" },
    variables: {
      type: "object",
      additionalProperties: true
    },
    steps: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: true,
        required: ["id", "type"],
        properties: {
          id: { type: "string", minLength: 1 },
          name: { type: "string" },
          type: { type: "string", minLength: 1 },
          depends_on: {
            anyOf: [
              { type: "string", minLength: 1 },
              {
                type: "array",
                items: { type: "string", minLength: 1 }
              }
            ]
          }
        }
      }
    }
  }
} as const;

export type WorkflowJsonSchema = typeof workflowSchema;



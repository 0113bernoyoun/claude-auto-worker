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
    stages: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: true,
        required: ["id", "steps"],
        properties: {
          id: { type: "string", minLength: 1 },
          name: { type: "string" },
          description: { type: "string" },
          steps: {
            type: "array",
            minItems: 1,
            items: { type: "string", minLength: 1 }
          },
          depends_on: {
            anyOf: [
              { type: "string", minLength: 1 },
              {
                type: "array",
                items: { type: "string", minLength: 1 }
              }
            ]
          },
          parallel: { type: "boolean" }
        }
      }
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
          },
          prompt: { type: "string" },
          run: {
            anyOf: [
              { type: "string", minLength: 1 },
              {
                type: "array",
                items: { type: "string", minLength: 1 }
              }
            ]
          },
          branch: { type: "string" },
          policy: {
            type: "object",
            additionalProperties: true,
            properties: {
              retry: {
                type: "object",
                properties: {
                  max_attempts: { type: "number", minimum: 1 },
                  delay_ms: { type: "number", minimum: 0 },
                  backoff_multiplier: { type: "number", minimum: 1 }
                },
                required: ["max_attempts", "delay_ms"]
              },
              timeout: {
                type: "object",
                properties: {
                  seconds: { type: "number", minimum: 1 }
                },
                required: ["seconds"]
              },
              rollback: {
                type: "object",
                properties: {
                  enabled: { type: "boolean" },
                  steps: {
                    type: "array",
                    items: { type: "string", minLength: 1 }
                  }
                },
                required: ["enabled"]
              }
            }
          }
        }
      }
    }
  }
} as const;

export type WorkflowJsonSchema = typeof workflowSchema;



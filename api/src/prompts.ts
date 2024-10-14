import type { OpenAI } from "langchain/llms/openai";

export const NOTES_TOOL_SCHEMA: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "formatNotes",
    description: "Format the notes response",
    parameters: {
      type: "object",
      properties: {
        notes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              note: {
                type: "string",
                description: "The notes",
              },
              pageNumbers: {
                type: "array",
                items: {
                  type: "number",
                  description: "The page number(s) of the note",
                },
              },
            },
          },
        },
      },
      required: ["notes"],
    },
  },
};

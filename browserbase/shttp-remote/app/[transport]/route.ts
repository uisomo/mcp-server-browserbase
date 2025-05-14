import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";

import navigate from "../../../src/tools/navigate.js";
import common from "../../../src/tools/common.js";
import snapshot from "../../../src/tools/snapshot.js";
import keyboard from "../../../src/tools/keyboard.js";
import getText from "../../../src/tools/getText.js";
import session from "../../../src/tools/session.js";
import contextTools from "../../../src/tools/context.js";

import type { Tool } from "../../../src/tools/tool.ts";

const allTools: Tool<any>[] = [
  ...common,
  ...snapshot,
  ...keyboard,
  ...getText,
  ...navigate,
  ...session,
  ...contextTools,
];

const handler = createMcpHandler(
  (server) => {
    allTools.forEach(tool => {
      if (tool.schema.inputSchema instanceof z.ZodObject) {
        server.tool(
          tool.schema.name,
          tool.schema.description,
          tool.schema.inputSchema.shape,
          async (params: z.infer<typeof tool.schema.inputSchema>, extra: any) => {
            console.log(`Executing tool: ${tool.schema.name} with params:`, params, "Extra:", extra);
            
            const responseContent: { type: "text"; text: string }[] = [
              { type: "text", text: `Executed ${tool.schema.name}` },
            ];

            return {
              content: responseContent,
            };
          }
        );
      } else {
        console.warn(
          `Tool "${tool.schema.name}" has an input schema that is not a ZodObject and will not be registered with the mcp-adapter directly. Schema type: ${tool.schema.inputSchema.constructor.name}`
        );
      }
    });
  },
  {
    capabilities: {
      tools: allTools.reduce((acc, tool) => {
        acc[tool.schema.name] = {
          description: tool.schema.description,
        };
        return acc;
      }, {} as Record<string, { description: string }>),
    },
  },
  {
    basePath: "",
    verboseLogs: true,
    maxDuration: 60,
  }
);

export { handler as GET, handler as POST, handler as DELETE };

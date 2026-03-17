import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { toolDefinition } from '@tanstack/ai';
import { z, type ZodTypeAny } from 'zod';

let mcpClient: Client | null = null;

async function getMcpClient(): Promise<Client> {
  if (mcpClient) return mcpClient;

  const url = process.env.ZAPIER_MCP_URL;
  const token = process.env.ZAPIER_MCP_TOKEN;

  if (!url) throw new Error('ZAPIER_MCP_URL is not set');
  if (!token) throw new Error('ZAPIER_MCP_TOKEN is not set');

  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  mcpClient = new Client({ name: 'tanstack-ai-assistant', version: '1.0.0' });
  await mcpClient.connect(transport);
  return mcpClient;
}

function jsonSchemaToZod(
  schema: Record<string, unknown>,
  isRequired = true,
): ZodTypeAny {
  let zodType: ZodTypeAny;

  const enumValues = schema.enum as string[] | undefined;
  if (enumValues?.length) {
    zodType = z.enum(enumValues as [string, ...string[]]);
  } else {
    switch (schema.type) {
      case 'string':
        zodType = z.string();
        break;
      case 'number':
      case 'integer':
        zodType = z.number();
        break;
      case 'boolean':
        zodType = z.boolean();
        break;
      case 'array': {
        const items = schema.items as Record<string, unknown> | undefined;
        zodType = z.array(items ? jsonSchemaToZod(items) : z.unknown());
        break;
      }
      case 'object': {
        const properties = (schema.properties ?? {}) as Record<
          string,
          Record<string, unknown>
        >;
        const required = (schema.required ?? []) as string[];
        const shape: Record<string, ZodTypeAny> = {};
        for (const [key, propSchema] of Object.entries(properties)) {
          shape[key] = jsonSchemaToZod(propSchema, required.includes(key));
        }
        zodType = z.object(shape);
        break;
      }
      default:
        zodType = z.string();
    }
  }

  if (schema.description) {
    zodType = (zodType as any).describe(schema.description as string);
  }

  return isRequired ? zodType : zodType.optional();
}

export async function getZapierMcpToolDefinitions() {
  try {
    const client = await getMcpClient();
    const { tools } = await client.listTools();

    return tools.map((tool) => {
      const schema = tool.inputSchema as Record<string, unknown>;
      const inputSchema = (
        schema?.type === 'object' ? jsonSchemaToZod(schema) : z.object({})
      ) as z.ZodObject<z.ZodRawShape>;

      return toolDefinition({
        name: tool.name,
        description: tool.description ?? '',
        inputSchema,
      }).server(async (input) => {
        const result = await client.callTool({
          name: tool.name,
          arguments: input as Record<string, unknown>,
        });
        console.log('[Zapier MCP] Tool call result:', result);
        return result;
      });
    });
  } catch (error) {
    console.warn('[Zapier MCP] Not available, skipping tools:', (error as Error).message);
    return [];
  }
}

import { NextRequest } from 'next/server';
import { search_universe_memory, searchUniverseMemorySchema, add_universe_memory, addUniverseMemorySchema } from '@/lib/mcp/tools/memory-tools';
import { generate_artifact, generateArtifactSchema } from '@/lib/mcp/tools/artifact-tools';
import { requireUser, handleApiError } from '@/server/api-auth';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const { method, params } = body;

    if (method === 'list_tools') {
      return Response.json({
        tools: [
          { name: 'search_universe_memory', description: 'Search memory.', parameters: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' } }, required: ['query'] } },
          { name: 'add_universe_memory', description: 'Save factual memory.', parameters: { type: 'object', properties: { content: { type: 'string' }, agentId: { type: 'string', enum: ['universe', 'builder'] } }, required: ['content'] } },
          { name: 'generate_artifact', description: 'Generate artifact.', parameters: { type: 'object', properties: { description: { type: 'string' }, language: { type: 'string' }, context: { type: 'string' } }, required: ['description', 'language'] } },
        ],
      });
    }

    if (method === 'call_tool') {
      const { name, arguments: args } = params;
      if (name === 'search_universe_memory') {
        const validatedArgs = searchUniverseMemorySchema.parse(args);
        return Response.json(await search_universe_memory({ ...validatedArgs, userId: user.uid }));
      }
      if (name === 'add_universe_memory') {
        const validatedArgs = addUniverseMemorySchema.parse(args);
        return Response.json(await add_universe_memory({ ...validatedArgs, userId: user.uid }));
      }
      if (name === 'generate_artifact') {
        const validatedArgs = generateArtifactSchema.parse(args);
        return Response.json(await generate_artifact(validatedArgs));
      }
      return Response.json({ error: `Tool ${name} not found` }, { status: 404 });
    }

    return Response.json({ error: 'Method not supported' }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}

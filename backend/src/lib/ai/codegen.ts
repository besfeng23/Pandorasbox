import { completeInference, ChatMessage } from '@/lib/sovereign/inference';

export interface CodeSpec {
    language: string;
    requirements: string[];
    context?: string;
    type: 'function' | 'component' | 'module';
}

export interface GeneratedCode {
    code: string;
    explanation: string;
    tests?: string;
}

/**
 * Advanced Code Generator with Senior Engineer persona.
 */
export async function generateCode(spec: CodeSpec): Promise<GeneratedCode> {
    const prompt: ChatMessage[] = [
        {
            role: 'system',
            content: `You are a Staff Software Engineer. Write production-ready, clean, and typed code.
Language: ${spec.language}
Type: ${spec.type}
Rules:
- NO comments explaining basic syntax.
- Use best practices (SOLID, DRY).
- Include JSDocs/TypeDocs.
- Return format:
<explanation>Brief approach</explanation>
<code>
[The Code]
</code>
<tests>
[Unit Tests]
</tests>`
        },
        {
            role: 'user',
            content: `Requirements:\n${spec.requirements.join('\n')}\n\nContext: ${spec.context || 'None'}`
        }
    ];

    try {
        const response = await completeInference(prompt, 0.2); // Low temp for precision

        const explanation = response.match(/<explanation>([\s\S]*?)<\/explanation>/)?.[1]?.trim() || "";
        const code = response.match(/<code>([\s\S]*?)<\/code>/)?.[1]?.trim() || response;
        const tests = response.match(/<tests>([\s\S]*?)<\/tests>/)?.[1]?.trim();

        return { code, explanation, tests };
    } catch (e) {
        console.error('Codegen Error:', e);
        throw new Error('Failed to generate code.');
    }
}

export async function reviewCode(code: string): Promise<string> {
    const prompt: ChatMessage[] = [
        {
            role: 'system',
            content: `You are a Security & Logic Auditor. Review the code for bugs, security flaws, and style issues.
Provide a markdown report.`
        },
        { role: 'user', content: code }
    ];
    return await completeInference(prompt, 0.1);
}

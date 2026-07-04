type ToolResult = {
    content: Array<{
        type: "text";
        text: string;
    }>;
    details?: unknown;
    isError?: boolean;
};
type ToolUpdate = (result: ToolResult) => void;
type ToolDefinition = {
    name: string;
    label: string;
    description: string;
    promptSnippet?: string;
    promptGuidelines?: string[];
    parameters: Schema;
    execute?: (toolCallId: string, params: Record<string, unknown>, signal: AbortSignal | undefined, onUpdate: ToolUpdate | undefined, ctx: unknown) => ToolResult | Promise<ToolResult>;
};
type ContextEvent = {
    messages: Array<{
        role: string;
        content?: unknown;
    }>;
};
type BeforeAgentStartEvent = {
    systemPrompt: string;
};
type ExtensionAPI = {
    on(event: "context", handler: (event: ContextEvent, ctx: unknown) => unknown): void;
    on(event: "before_agent_start", handler: (event: BeforeAgentStartEvent, ctx: unknown) => unknown | Promise<unknown>): void;
    on(event: "session_start" | "session_shutdown", handler: (event: unknown, ctx: unknown) => unknown): void;
    registerTool(tool: ToolDefinition): void;
};
type Schema = Record<string, unknown> & {
    optional?: true;
};
export default function (pi: ExtensionAPI): void;
export {};

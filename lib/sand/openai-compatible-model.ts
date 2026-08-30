import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3Content,
  LanguageModelV3FinishReason,
  LanguageModelV3GenerateResult,
  LanguageModelV3Message,
  LanguageModelV3StreamPart,
  LanguageModelV3ToolChoice,
  LanguageModelV3ToolResultOutput,
  LanguageModelV3Usage,
} from '@ai-sdk/provider';

type OpenAICompatibleModelConfig = {
  provider: string;
  modelId: string;
  apiUrl: string;
  apiKey: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
};

type OpenAIToolCall = {
  id?: string;
  type?: 'function';
  function?: {
    name?: string;
    arguments?: string | Record<string, unknown>;
  };
};

type OpenAIMessageContent = string | Array<{ type?: string; text?: string }> | null | undefined;

type OpenAICompletion = {
  id?: string;
  created?: number;
  model?: string;
  choices?: Array<{
    finish_reason?: string | null;
    message?: {
      content?: OpenAIMessageContent;
      tool_calls?: OpenAIToolCall[];
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
    completion_tokens_details?: { reasoning_tokens?: number };
  };
};

type OpenAIMessage =
  | { role: 'system' | 'user'; content: string }
  | {
    role: 'assistant';
    content: string | null;
    tool_calls?: Array<{
      id: string;
      type: 'function';
      function: { name: string; arguments: string };
    }>;
  }
  | { role: 'tool'; tool_call_id: string; content: string };

export class SandProviderRequestError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = 'SandProviderRequestError';
    this.status = status;
  }
}

function outputToText(output: LanguageModelV3ToolResultOutput) {
  if (output.type === 'text' || output.type === 'error-text') return output.value;
  if (output.type === 'json' || output.type === 'error-json') return JSON.stringify(output.value);
  if (output.type === 'execution-denied') return output.reason || 'Tool execution denied.';
  if (output.type === 'content') {
    return output.value
      .map((part) => part.type === 'text' ? part.text : `[${part.type}]`)
      .join('\n');
  }
  return '';
}

function promptToOpenAIMessages(prompt: LanguageModelV3Message[]): OpenAIMessage[] {
  const messages: OpenAIMessage[] = [];

  for (const message of prompt) {
    if (message.role === 'system') {
      messages.push({ role: 'system', content: message.content });
      continue;
    }

    if (message.role === 'user') {
      const content = message.content
        .map((part) => part.type === 'text' ? part.text : `[ملف ${part.mediaType} غير معروض]`)
        .join('\n');
      messages.push({ role: 'user', content });
      continue;
    }

    if (message.role === 'assistant') {
      const text = message.content
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('');
      const toolCalls = message.content
        .filter((part) => part.type === 'tool-call')
        .map((part) => ({
          id: part.toolCallId,
          type: 'function' as const,
          function: {
            name: part.toolName,
            arguments: JSON.stringify(part.input ?? {}),
          },
        }));
      messages.push({
        role: 'assistant',
        content: text || null,
        ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
      });
      continue;
    }

    for (const part of message.content) {
      if (part.type !== 'tool-result') continue;
      messages.push({
        role: 'tool',
        tool_call_id: part.toolCallId,
        content: outputToText(part.output),
      });
    }
  }

  return messages;
}

function mapToolChoice(choice?: LanguageModelV3ToolChoice) {
  if (!choice || choice.type === 'auto') return 'auto';
  if (choice.type === 'none') return 'none';
  if (choice.type === 'required') return 'required';
  return { type: 'function', function: { name: choice.toolName } };
}

function mapFinishReason(raw?: string | null): LanguageModelV3FinishReason {
  const unified = raw === 'stop'
    ? 'stop'
    : raw === 'length'
      ? 'length'
      : raw === 'content_filter'
        ? 'content-filter'
        : raw === 'tool_calls' || raw === 'function_call'
          ? 'tool-calls'
          : raw === 'error'
            ? 'error'
            : 'other';
  return { unified, raw: raw || undefined };
}

function mapUsage(usage?: OpenAICompletion['usage']): LanguageModelV3Usage {
  const cached = usage?.prompt_tokens_details?.cached_tokens;
  const input = usage?.prompt_tokens;
  const output = usage?.completion_tokens;
  return {
    inputTokens: {
      total: input,
      noCache: input == null ? undefined : Math.max(0, input - (cached || 0)),
      cacheRead: cached,
      cacheWrite: undefined,
    },
    outputTokens: {
      total: output,
      text: output,
      reasoning: usage?.completion_tokens_details?.reasoning_tokens,
    },
    raw: usage ? { ...usage } : undefined,
  };
}

function completionText(content: OpenAIMessageContent) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((part) => part?.type === 'text' ? part.text || '' : '').join('');
}

function headersRecord(headers: Headers) {
  return Object.fromEntries(headers.entries());
}

export class OpenAICompatibleLanguageModel implements LanguageModelV3 {
  readonly specificationVersion = 'v3' as const;
  readonly provider: string;
  readonly modelId: string;
  readonly supportedUrls = {};

  private readonly config: OpenAICompatibleModelConfig;

  constructor(config: OpenAICompatibleModelConfig) {
    this.config = config;
    this.provider = config.provider;
    this.modelId = config.modelId;
  }

  async doGenerate(options: LanguageModelV3CallOptions): Promise<LanguageModelV3GenerateResult> {
    const tools = (options.tools || [])
      .filter((item) => item.type === 'function')
      .map((item) => ({
        type: 'function' as const,
        function: {
          name: item.name,
          description: item.description,
          parameters: item.inputSchema,
        },
      }));

    const body = {
      model: this.modelId,
      messages: promptToOpenAIMessages(options.prompt),
      stream: false,
      parallel_tool_calls: false,
      ...(options.maxOutputTokens != null ? { max_tokens: options.maxOutputTokens } : {}),
      ...(options.temperature != null ? { temperature: options.temperature } : {}),
      ...(options.topP != null ? { top_p: options.topP } : {}),
      ...(options.presencePenalty != null ? { presence_penalty: options.presencePenalty } : {}),
      ...(options.frequencyPenalty != null ? { frequency_penalty: options.frequencyPenalty } : {}),
      ...(options.seed != null ? { seed: options.seed } : {}),
      ...(options.stopSequences?.length ? { stop: options.stopSequences } : {}),
      ...(tools.length ? { tools, tool_choice: mapToolChoice(options.toolChoice) } : {}),
      ...(options.responseFormat?.type === 'json'
        ? { response_format: { type: 'json_object' as const } }
        : {}),
    };

    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), this.config.timeoutMs || 7_000);
    const signal = options.abortSignal
      ? AbortSignal.any([options.abortSignal, timeout.signal])
      : timeout.signal;

    let response: Response;
    try {
      response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(Object.entries(options.headers || {}).filter((entry): entry is [string, string] => Boolean(entry[1]))),
          ...this.config.headers,
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(body),
        cache: 'no-store',
        signal,
      });
    } catch (error) {
      if (timeout.signal.aborted) throw new SandProviderRequestError('AI provider timed out.', 504);
      throw new SandProviderRequestError(error instanceof Error ? error.message : 'AI provider request failed.', 502);
    } finally {
      clearTimeout(timer);
    }

    const raw = await response.json().catch(() => ({})) as OpenAICompletion & { result?: OpenAICompletion };
    if (!response.ok) throw new SandProviderRequestError(`AI provider returned ${response.status}.`, response.status);
    const completion = raw.result?.choices ? raw.result : raw;
    const choice = completion.choices?.[0];
    if (!choice?.message) throw new SandProviderRequestError('AI provider returned no message.', 502);

    const content: LanguageModelV3Content[] = [];
    const text = completionText(choice.message.content);
    if (text) content.push({ type: 'text', text });

    for (const [index, call] of (choice.message.tool_calls || []).entries()) {
      const toolName = call.function?.name?.trim();
      if (!toolName) continue;
      const input = typeof call.function?.arguments === 'string'
        ? call.function.arguments
        : JSON.stringify(call.function?.arguments || {});
      content.push({
        type: 'tool-call',
        toolCallId: call.id || `sand-tool-${index}`,
        toolName,
        input,
      });
    }

    return {
      content,
      finishReason: mapFinishReason(choice.finish_reason),
      usage: mapUsage(completion.usage),
      warnings: [],
      request: { body },
      response: {
        id: completion.id,
        timestamp: completion.created ? new Date(completion.created * 1000) : undefined,
        modelId: completion.model || this.modelId,
        headers: headersRecord(response.headers),
        body: completion,
      },
    };
  }

  async doStream(options: LanguageModelV3CallOptions) {
    const result = await this.doGenerate(options);
    const stream = new ReadableStream<LanguageModelV3StreamPart>({
      start(controller) {
        controller.enqueue({ type: 'stream-start', warnings: result.warnings });
        if (result.response) controller.enqueue({ type: 'response-metadata', ...result.response });

        let textIndex = 0;
        for (const part of result.content) {
          if (part.type === 'text') {
            const id = `sand-text-${textIndex++}`;
            controller.enqueue({ type: 'text-start', id });
            controller.enqueue({ type: 'text-delta', id, delta: part.text });
            controller.enqueue({ type: 'text-end', id });
          } else if (part.type === 'tool-call') {
            controller.enqueue(part);
          }
        }
        controller.enqueue({
          type: 'finish',
          usage: result.usage,
          finishReason: result.finishReason,
        });
        controller.close();
      },
    });

    return {
      stream,
      request: result.request,
      response: { headers: result.response?.headers },
    };
  }
}

import {
  BedrockRuntimeClient,
  ConverseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime'
import { BaseTextAdapter } from '@tanstack/ai/adapters'
import { isClaude, isNova } from '../model-meta'
import type { BedrockModelId } from '../model-meta'
import type {
  ContentBlock,
  Message,
  ToolResultBlock,
  ToolUseBlock,
} from '@aws-sdk/client-bedrock-runtime'
import type {
  StructuredOutputOptions,
  StructuredOutputResult,
} from '@tanstack/ai/adapters'
import type {
  DefaultMessageMetadataByModality,
  ModelMessage,
  StreamChunk,
  TextOptions,
} from '@tanstack/ai'
import type { BedrockTextProviderOptions } from '../text-provider-options'

export interface BedrockTextConfig {
  region: string
  credentials: {
    accessKeyId: string
    secretAccessKey: string
  }
}

export type BedrockInputModalities = readonly ['text', 'image', 'video', 'document']

export class BedrockTextAdapter<
  TModel extends BedrockModelId = BedrockModelId,
> extends BaseTextAdapter<
  TModel,
  BedrockTextProviderOptions,
  BedrockInputModalities,
  DefaultMessageMetadataByModality
> {
  readonly kind = 'text' as const
  readonly name = 'bedrock' as const

  private client: BedrockRuntimeClient

  constructor(config: BedrockTextConfig, model: TModel) {
    super({}, model)
    this.client = new BedrockRuntimeClient({
      region: config.region,
      credentials: config.credentials,
    })
  }

  async *chatStream(
    options: TextOptions<BedrockTextProviderOptions>,
  ): AsyncIterable<StreamChunk> {
    const timestamp = Date.now()
    const runId = this.generateId()
    const messageId = this.generateId()

    yield { type: 'RUN_STARTED', runId, model: this.model, timestamp }

    try {
      const messages = options.messages.map((m) => this.convertToConverseMessage(m))

      const command = new ConverseStreamCommand({
        modelId: this.model,
        messages,
        system: options.systemPrompts?.map((text) => ({ text })),
        inferenceConfig: {
          maxTokens: options.maxTokens,
          temperature: options.temperature,
          topP: options.topP,
          ...options.modelOptions?.inferenceConfig,
        },
        toolConfig: options.tools?.length
          ? {
              tools: options.tools.map((t) => ({
                toolSpec: {
                  name: t.name,
                  description: t.description,
                  inputSchema: { json: t.inputSchema },
                },
              })),
            }
          : undefined,
        additionalModelRequestFields: (() => {
          if (
            isClaude(this.model) &&
            options.modelOptions?.thinking &&
            options.messages.length === 1
          ) {
            return { thinking: options.modelOptions.thinking }
          }
          if (isNova(this.model) && options.modelOptions?.thinking) {
            return {
              reasoningConfig: { enabled: true, maxReasoningEffort: 'medium' },
            }
          }
          return undefined
        })() as any,
      })

      const response = await this.client.send(command)

      if (!response.stream) {
        throw new Error('No stream received from Bedrock')
      }

      yield* this.processConverseStream(
        response.stream,
        runId,
        messageId,
        timestamp,
      )
    } catch (error: unknown) {
      const err = error as Error & { name?: string }
      yield {
        type: 'RUN_ERROR',
        runId,
        model: this.model,
        timestamp,
        error: {
          message: err.message || 'Unknown Bedrock error',
          code: err.name || 'INTERNAL_ERROR',
        },
      }
    }
  }

  structuredOutput(
    _options: StructuredOutputOptions<BedrockTextProviderOptions>,
  ): Promise<StructuredOutputResult<unknown>> {
    return Promise.reject(
      new Error('Structured output not yet supported for Bedrock ConverseStream API'),
    )
  }

  private convertToConverseMessage(message: ModelMessage): Message {
    // Tool result messages
    if (message.role === 'tool' && message.toolCallId) {
      const contentText =
        typeof message.content === 'string'
          ? message.content
          : JSON.stringify(message.content)
      let contentBlock: any = { text: contentText }
      try {
        contentBlock = { json: JSON.parse(contentText) }
      } catch {
        // keep as text
      }
      return {
        role: 'user',
        content: [
          {
            toolResult: {
              toolUseId: message.toolCallId,
              content: [contentBlock],
              status:
                (message as any).status === 'error' || (message as any).error
                  ? 'failure'
                  : 'success',
            } as ToolResultBlock,
          },
        ],
      }
    }

    // Assistant messages with tool calls
    if (message.role === 'assistant' && message.toolCalls?.length) {
      const content: Array<ContentBlock> = []

      if (typeof message.content === 'string' && message.content) {
        content.push({ text: message.content })
      } else if (Array.isArray(message.content)) {
        for (const part of message.content) {
          const block = this.convertPartToConverseBlock(part)
          if (block) content.push(block)
        }
      }

      for (const tc of message.toolCalls) {
        let input = tc.function.arguments
        if (typeof input === 'string') {
          try {
            input = JSON.parse(input)
          } catch {
            // keep as string
          }
        }
        content.push({
          toolUse: {
            toolUseId: tc.id,
            name: tc.function.name,
            input,
          } as ToolUseBlock,
        })
      }

      return { role: 'assistant', content }
    }

    // Regular user/assistant messages
    const content: Array<ContentBlock> = []
    if (typeof message.content === 'string') {
      content.push({ text: message.content })
    } else if (Array.isArray(message.content)) {
      for (const part of message.content) {
        const block = this.convertPartToConverseBlock(part)
        if (block) content.push(block)
      }
    }

    return {
      role: message.role === 'user' ? 'user' : 'assistant',
      content,
    }
  }

  private convertPartToConverseBlock(part: any): ContentBlock | null {
    if (part.type === 'text') return { text: part.content }
    if (part.type === 'image') {
      return {
        image: {
          format: part.metadata?.mediaType?.split('/')[1] || 'jpeg',
          source: { bytes: part.source.value },
        },
      }
    }
    if (part.type === 'video') {
      return {
        video: {
          format: part.metadata?.mediaType?.split('/')[1] || 'mp4',
          source: { bytes: part.source.value },
        },
      }
    }
    if (part.type === 'document') {
      return {
        document: {
          format: part.metadata?.mediaType?.split('/')[1] || 'pdf',
          source: { bytes: part.source.value },
          name: part.metadata?.name || 'document',
        },
      }
    }
    // Skip thinking parts — not sent back via Converse API
    return null
  }

  private async *processConverseStream(
    stream: AsyncIterable<any>,
    runId: string,
    messageId: string,
    timestamp: number,
  ): AsyncIterable<StreamChunk> {
    let accumulatedContent = ''
    let accumulatedThinking = ''
    let lastStopReason: string | undefined
    let lastUsage: any | undefined

    // Track streaming state
    let textMessageStarted = false
    let currentStepId: string | null = null
    // Track active tool calls: toolUseId -> { name, args }
    const activeToolCalls = new Map<string, { name: string; args: string }>()
    let currentToolUseId = ''

    // <thinking> tag parser for Nova models (tag-based reasoning)
    let isInsideThinking = false
    let pendingTagBuffer = ''

    for await (const event of stream) {
      if (event.contentBlockDelta) {
        const delta = event.contentBlockDelta.delta

        // Text content — parse <thinking> tags for Nova tag-based reasoning
        if (delta?.text) {
          let text = pendingTagBuffer + delta.text
          pendingTagBuffer = ''

          while (text.length > 0) {
            if (!isInsideThinking) {
              const startIdx = text.indexOf('<thinking>')
              if (startIdx !== -1) {
                // Emit any content before the tag
                if (startIdx > 0) {
                  const before = text.substring(0, startIdx)
                  if (!textMessageStarted) {
                    textMessageStarted = true
                    yield { type: 'TEXT_MESSAGE_START', messageId, model: this.model, timestamp, role: 'assistant' }
                  }
                  accumulatedContent += before
                  yield { type: 'TEXT_MESSAGE_CONTENT', messageId, model: this.model, timestamp, delta: before, content: accumulatedContent }
                }
                isInsideThinking = true
                if (!currentStepId) {
                  currentStepId = this.generateId()
                  yield { type: 'STEP_STARTED', stepId: currentStepId, model: this.model, timestamp, stepType: 'thinking' }
                }
                text = text.substring(startIdx + 10)
              } else if (text.includes('<')) {
                const idx = text.lastIndexOf('<')
                const before = text.substring(0, idx)
                if (before) {
                  if (!textMessageStarted) {
                    textMessageStarted = true
                    yield { type: 'TEXT_MESSAGE_START', messageId, model: this.model, timestamp, role: 'assistant' }
                  }
                  accumulatedContent += before
                  yield { type: 'TEXT_MESSAGE_CONTENT', messageId, model: this.model, timestamp, delta: before, content: accumulatedContent }
                }
                pendingTagBuffer = text.substring(idx)
                break
              } else {
                if (!textMessageStarted) {
                  textMessageStarted = true
                  yield { type: 'TEXT_MESSAGE_START', messageId, model: this.model, timestamp, role: 'assistant' }
                }
                accumulatedContent += text
                yield { type: 'TEXT_MESSAGE_CONTENT', messageId, model: this.model, timestamp, delta: text, content: accumulatedContent }
                break
              }
            } else {
              const endIdx = text.indexOf('</thinking>')
              if (endIdx !== -1) {
                if (endIdx > 0) {
                  const thinkingDelta = text.substring(0, endIdx)
                  accumulatedThinking += thinkingDelta
                  yield { type: 'STEP_FINISHED', stepId: currentStepId!, model: this.model, timestamp, delta: thinkingDelta, content: accumulatedThinking }
                }
                isInsideThinking = false
                currentStepId = null
                text = text.substring(endIdx + 11)
              } else if (text.includes('<')) {
                const idx = text.lastIndexOf('<')
                const thinkingDelta = text.substring(0, idx)
                if (thinkingDelta) {
                  accumulatedThinking += thinkingDelta
                  yield { type: 'STEP_FINISHED', stepId: currentStepId!, model: this.model, timestamp, delta: thinkingDelta, content: accumulatedThinking }
                }
                pendingTagBuffer = text.substring(idx)
                break
              } else {
                accumulatedThinking += text
                yield { type: 'STEP_FINISHED', stepId: currentStepId!, model: this.model, timestamp, delta: text, content: accumulatedThinking }
                break
              }
            }
          }
        }

        // Claude native reasoning via reasoningContent (streamed as structured field, not tags)
        if (delta?.reasoningContent?.text !== undefined) {
          const reasoningDelta = delta.reasoningContent.text
          if (!currentStepId) {
            currentStepId = this.generateId()
            yield { type: 'STEP_STARTED', stepId: currentStepId, model: this.model, timestamp, stepType: 'thinking' }
          }
          accumulatedThinking += reasoningDelta
          yield { type: 'STEP_FINISHED', stepId: currentStepId, model: this.model, timestamp, delta: reasoningDelta, content: accumulatedThinking }
        }

        // Tool input delta (streaming JSON arguments)
        if (delta?.toolUse?.input !== undefined) {
          const argsDelta = delta.toolUse.input
          const tc = activeToolCalls.get(currentToolUseId)
          if (tc) {
            tc.args += argsDelta
            yield { type: 'TOOL_CALL_ARGS', toolCallId: currentToolUseId, model: this.model, timestamp, delta: argsDelta, args: tc.args }
          }
        }
      }

      // Tool use block start
      if (event.contentBlockStart?.start?.toolUse) {
        const toolUse = event.contentBlockStart.start.toolUse
        currentToolUseId = toolUse.toolUseId
        activeToolCalls.set(currentToolUseId, { name: toolUse.name, args: '' })
        yield {
          type: 'TOOL_CALL_START',
          toolCallId: toolUse.toolUseId,
          toolName: toolUse.name,
          model: this.model,
          timestamp,
        }
      }

      // Content block stop — finalize tool calls
      if (event.contentBlockStop !== undefined) {
        const tc = activeToolCalls.get(currentToolUseId)
        if (tc) {
          let parsedInput: unknown
          try {
            parsedInput = JSON.parse(tc.args)
          } catch {
            parsedInput = tc.args
          }
          yield {
            type: 'TOOL_CALL_END',
            toolCallId: currentToolUseId,
            toolName: tc.name,
            model: this.model,
            timestamp,
            input: parsedInput,
          }
          activeToolCalls.delete(currentToolUseId)
        }
      }

      if (event.messageStop) {
        lastStopReason = event.messageStop.stopReason
      }

      if (event.metadata?.usage) {
        lastUsage = event.metadata.usage
      }
    }

    if (textMessageStarted) {
      yield { type: 'TEXT_MESSAGE_END', messageId, model: this.model, timestamp }
    }

    yield {
      type: 'RUN_FINISHED',
      runId,
      model: this.model,
      timestamp,
      finishReason: lastStopReason === 'tool_use' ? 'tool_calls' : 'stop',
      usage: lastUsage
        ? {
            promptTokens: lastUsage.inputTokens ?? 0,
            completionTokens: lastUsage.outputTokens ?? 0,
            totalTokens:
              lastUsage.totalTokens ??
              (lastUsage.inputTokens ?? 0) + (lastUsage.outputTokens ?? 0),
          }
        : undefined,
    }
  }
}

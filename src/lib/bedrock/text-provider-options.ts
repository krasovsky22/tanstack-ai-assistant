export interface BedrockStopSequencesOptions {
  stop_sequences?: Array<string>
}

export interface BedrockThinkingOptions {
  thinking?:
    | { budget_tokens: number; type: 'enabled' }
    | { type: 'disabled' }
}

export interface BedrockSamplingOptions {
  top_k?: number
}

export interface BedrockInferenceConfig {
  maxTokens?: number
  temperature?: number
  topP?: number
  stopSequences?: Array<string>
}

export type BedrockTextProviderOptions = BedrockStopSequencesOptions &
  BedrockThinkingOptions &
  BedrockSamplingOptions & {
    inferenceConfig?: BedrockInferenceConfig
  }

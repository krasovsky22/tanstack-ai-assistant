export type BedrockImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

export interface BedrockImageMetadata {
  mediaType?: BedrockImageMediaType
}

export type BedrockTextMetadata = Record<string, never>

export interface BedrockDocumentMetadata {
  mediaType?: string
  name?: string
}

export interface BedrockAudioMetadata {
  mediaType?: string
}

export interface BedrockVideoMetadata {
  mediaType?: string
}

export interface BedrockMessageMetadataByModality {
  text: BedrockTextMetadata
  image: BedrockImageMetadata
  audio: BedrockAudioMetadata
  video: BedrockVideoMetadata
  document: BedrockDocumentMetadata
}

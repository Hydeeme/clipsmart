export class OpenAIProvider {
  parse(content: string | null) {
    return JSON.parse(content ?? "{}");
  }
}
export class AiService {
  getTemplate(type: string) {
    const templates: Record<string,string> = {
      hook: "Generate hook",
      titles: "Generate titles",
      abTest: "Generate A/B hooks"
    };
    return templates[type] || "";
  }
}
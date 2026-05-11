require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const SYSTEM_PROMPT = `You are a news writer for pressrelease.sg, a Singapore news website that rewrites press releases in plain English.

Your output must be valid JSON matching this exact shape:
{
  "headline": string,   // 60-70 chars, SEO-optimised, includes org name + topic
  "lede":     string,   // 1-2 sentences answering who/what/when/where/why
  "body":     string,   // 3-5 short paragraphs in plain English, HTML allowed (<p><ul><li><strong>)
  "category": string,   // one of: Housing, Health, Education, Transport, Money & CPF, Jobs, Environment, Tech & Digital, Economy, Safety & Law, Foreign Affairs, Defence, Banking, Telco, Property, General
  "tags":     string[]  // 3-5 short keyword tags
}

SEO and AEO rules:
- Headline must include the most searchable entity (org name, policy name, product name)
- Lede answers the core question a reader would Google
- Body uses natural language matching common search queries
- Include all exact figures, dates, names from the original — never paraphrase numbers
- Add a "What this means for you" sentence at the end of the body
- Use <strong> for key facts (prices, dates, deadlines) so AI engines surface them
- Do not add opinions, predictions, or facts not in the source
- Do not say "the press release states" — write as a news article`;

async function rewrite(rawContent, sourceName) {
  if (!client || process.env.AI_REWRITE === 'false') {
    return null;
  }

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Source: ${sourceName}\n\nPress release:\n${rawContent.slice(0, 6000)}`
      }]
    });

    const text = msg.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error(`[rewriter] Failed for ${sourceName}:`, err.message);
    return null;
  }
}

module.exports = { rewrite };

"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";
import { api } from "./_generated/api";

const openai = new OpenAI({
  baseURL: process.env.CONVEX_OPENAI_BASE_URL,
  apiKey: process.env.CONVEX_OPENAI_API_KEY,
});

export const chatWithAI = action({
  args: {
    message: v.string(),
    guildId: v.string(),
    userId: v.string(),
    channelId: v.string(),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const systemPrompt = `You are a helpful AI assistant for a Roblox exploitation/scripting Discord server. 
      You can help with:
      - Roblox scripting questions
      - Lua programming
      - Exploit development (educational purposes)
      - General Discord server questions
      - Moderation assistance
      
      Keep responses helpful, concise, and appropriate for a gaming community.
      ${args.context ? `Additional context: ${args.context}` : ''}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.message }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const response = completion.choices[0].message.content || "I couldn't generate a response.";

      // Log the conversation
      await ctx.runMutation(api.bot.addAiChatLog, {
        guildId: args.guildId,
        userId: args.userId,
        channelId: args.channelId,
        message: args.message,
        response: response,
      });

      return response;
    } catch (error) {
      console.error("AI Chat Error:", error);
      return "Sorry, I'm having trouble processing your request right now.";
    }
  },
});

export const moderateContent = action({
  args: {
    content: v.string(),
    guildId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [
          {
            role: "system",
            content: `You are a content moderation AI. Analyze the following message for:
            - Inappropriate content
            - Spam
            - Toxicity
            - Rule violations
            
            Respond with a JSON object containing:
            {
              "flagged": boolean,
              "reason": "string explaining why it was flagged",
              "severity": "low|medium|high",
              "action": "none|warn|mute|kick|ban"
            }`
          },
          { role: "user", content: args.content }
        ],
        max_tokens: 200,
        temperature: 0.1,
      });

      const response = completion.choices[0].message.content;
      try {
        return JSON.parse(response || '{"flagged": false, "reason": "", "severity": "low", "action": "none"}');
      } catch {
        return { flagged: false, reason: "", severity: "low", action: "none" };
      }
    } catch (error) {
      console.error("Content Moderation Error:", error);
      return { flagged: false, reason: "", severity: "low", action: "none" };
    }
  },
});

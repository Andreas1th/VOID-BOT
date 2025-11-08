"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const searchRobloxScripts = action({
  args: {
    query: v.string(),
    gameId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    database: any[];
    external: any[];
    total: number;
    error?: string;
  }> => {
    try {
      // This would typically scrape from script sharing sites
      // For demo purposes, we'll return mock data and use our database
      
      const dbResults: any[] = await ctx.runQuery(api.bot.searchScripts, {
        query: args.query,
        verified: true,
      });

      // Mock external script sources (you'd implement actual scraping here)
      const mockExternalScripts = [
        {
          name: `${args.query} Universal Script`,
          description: `A universal script for ${args.query} functionality`,
          source: "ScriptBlox",
          url: `https://scriptblox.com/script/${args.query.toLowerCase()}`,
          verified: false,
        },
        {
          name: `${args.query} GUI`,
          description: `GUI script for ${args.query}`,
          source: "RobloxScripts",
          url: `https://robloxscripts.com/${args.query.toLowerCase()}`,
          verified: false,
        }
      ];

      return {
        database: dbResults,
        external: mockExternalScripts,
        total: dbResults.length + mockExternalScripts.length,
      };
    } catch (error) {
      console.error("Script search error:", error);
      return {
        database: [],
        external: [],
        total: 0,
        error: "Failed to search scripts",
      };
    }
  },
});

export const getRobloxGameInfo = action({
  args: { gameId: v.string() },
  handler: async (ctx, args): Promise<any> => {
    try {
      // Mock Roblox API call (you'd use actual Roblox API here)
      const mockGameInfo = {
        id: args.gameId,
        name: "Sample Game",
        description: "A sample Roblox game",
        creator: "SampleCreator",
        playing: 1000,
        visits: 50000,
        created: "2023-01-01",
        updated: "2024-01-01",
      };

      return mockGameInfo;
    } catch (error) {
      console.error("Game info error:", error);
      return null;
    }
  },
});

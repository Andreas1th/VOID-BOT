import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";

// Bot configuration queries and mutations
export const getBotConfig = query({
  args: { guildId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("botConfig")
      .withIndex("by_guild", (q) => q.eq("guildId", args.guildId))
      .unique();
  },
});

export const createBotConfig = mutation({
  args: {
    guildId: v.string(),
    ownerId: v.string(),
    prefix: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("botConfig", {
      guildId: args.guildId,
      ownerId: args.ownerId,
      prefix: args.prefix,
      autoModEnabled: true,
      antiSpamEnabled: true,
      antiRaidEnabled: true,
    });
  },
});

// User permissions system
export const getUserPermissions = query({
  args: { userId: v.string(), guildId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userPermissions")
      .withIndex("by_user_guild", (q) => 
        q.eq("userId", args.userId).eq("guildId", args.guildId)
      )
      .unique();
  },
});

export const addUserPermission = mutation({
  args: {
    userId: v.string(),
    guildId: v.string(),
    role: v.string(),
    addedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userPermissions")
      .withIndex("by_user_guild", (q) => 
        q.eq("userId", args.userId).eq("guildId", args.guildId)
      )
      .unique();

    if (existing) {
      const newRoles = [...new Set([...existing.roles, args.role])];
      return await ctx.db.patch(existing._id, {
        roles: newRoles,
      });
    } else {
      return await ctx.db.insert("userPermissions", {
        userId: args.userId,
        guildId: args.guildId,
        roles: [args.role],
        permissions: [],
        addedBy: args.addedBy,
        addedAt: Date.now(),
      });
    }
  },
});

// Moderation system
export const addModerationLog = mutation({
  args: {
    guildId: v.string(),
    moderatorId: v.string(),
    targetUserId: v.string(),
    action: v.string(),
    reason: v.string(),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("moderationLogs", {
      guildId: args.guildId,
      moderatorId: args.moderatorId,
      targetUserId: args.targetUserId,
      action: args.action,
      reason: args.reason,
      duration: args.duration,
      timestamp: Date.now(),
    });
  },
});

export const addWarning = mutation({
  args: {
    guildId: v.string(),
    userId: v.string(),
    moderatorId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("warnings", {
      guildId: args.guildId,
      userId: args.userId,
      moderatorId: args.moderatorId,
      reason: args.reason,
      timestamp: Date.now(),
      active: true,
    });
  },
});

export const getUserWarnings = query({
  args: { userId: v.string(), guildId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("warnings")
      .withIndex("by_user_guild", (q) => 
        q.eq("userId", args.userId).eq("guildId", args.guildId)
      )
      .filter((q) => q.eq(q.field("active"), true))
      .collect();
  },
});

// Roblox scripts system
export const searchScripts = query({
  args: { 
    query: v.string(),
    category: v.optional(v.string()),
    verified: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let searchQuery = ctx.db
      .query("robloxScripts")
      .withSearchIndex("search_scripts", (q) => {
        let search = q.search("name", args.query);
        if (args.category) {
          search = search.eq("category", args.category);
        }
        if (args.verified !== undefined) {
          search = search.eq("verified", args.verified);
        }
        return search;
      });

    return await searchQuery.take(20);
  },
});

export const addScript = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    gameId: v.optional(v.string()),
    gameName: v.optional(v.string()),
    scriptContent: v.optional(v.string()),
    scriptUrl: v.optional(v.string()),
    category: v.string(),
    tags: v.array(v.string()),
    addedBy: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("robloxScripts", {
      name: args.name,
      description: args.description,
      gameId: args.gameId,
      gameName: args.gameName,
      scriptContent: args.scriptContent,
      scriptUrl: args.scriptUrl,
      category: args.category,
      tags: args.tags,
      addedBy: args.addedBy,
      verified: false,
      downloads: 0,
      rating: 0,
    });
  },
});

export const verifyScript = mutation({
  args: { scriptId: v.id("robloxScripts") },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.scriptId, {
      verified: true,
    });
  },
});

// AI chat system
export const addAiChatLog = mutation({
  args: {
    guildId: v.string(),
    userId: v.string(),
    channelId: v.string(),
    message: v.string(),
    response: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiChatLogs", {
      guildId: args.guildId,
      userId: args.userId,
      channelId: args.channelId,
      message: args.message,
      response: args.response,
      timestamp: Date.now(),
    });
  },
});

// Temporary punishments
export const addTempPunishment = mutation({
  args: {
    guildId: v.string(),
    userId: v.string(),
    type: v.string(),
    duration: v.number(),
    reason: v.string(),
    moderatorId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tempPunishments", {
      guildId: args.guildId,
      userId: args.userId,
      type: args.type,
      expiresAt: Date.now() + args.duration,
      reason: args.reason,
      moderatorId: args.moderatorId,
    });
  },
});

export const getExpiredPunishments = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("tempPunishments")
      .withIndex("by_expiry", (q) => q.lt("expiresAt", Date.now()))
      .collect();
  },
});

export const removeTempPunishment = mutation({
  args: { punishmentId: v.id("tempPunishments") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.punishmentId);
  },
});

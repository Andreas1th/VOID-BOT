import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // Bot configuration
  botConfig: defineTable({
    guildId: v.string(),
    ownerId: v.string(),
    prefix: v.string(),
    logChannelId: v.optional(v.string()),
    welcomeChannelId: v.optional(v.string()),
    rulesChannelId: v.optional(v.string()),
    autoModEnabled: v.boolean(),
    antiSpamEnabled: v.boolean(),
    antiRaidEnabled: v.boolean(),
  }).index("by_guild", ["guildId"]),

  // User permissions and roles
  userPermissions: defineTable({
    userId: v.string(),
    guildId: v.string(),
    roles: v.array(v.string()), // owner, admin, moderator, staff
    permissions: v.array(v.string()),
    addedBy: v.string(),
    addedAt: v.number(),
  }).index("by_user_guild", ["userId", "guildId"]),

  // Moderation logs
  moderationLogs: defineTable({
    guildId: v.string(),
    moderatorId: v.string(),
    targetUserId: v.string(),
    action: v.string(), // ban, kick, mute, warn, etc.
    reason: v.string(),
    duration: v.optional(v.number()),
    timestamp: v.number(),
  }).index("by_guild", ["guildId"])
    .index("by_target", ["targetUserId"]),

  // Warnings system
  warnings: defineTable({
    guildId: v.string(),
    userId: v.string(),
    moderatorId: v.string(),
    reason: v.string(),
    timestamp: v.number(),
    active: v.boolean(),
  }).index("by_user_guild", ["userId", "guildId"]),

  // Roblox scripts database
  robloxScripts: defineTable({
    name: v.string(),
    description: v.string(),
    gameId: v.optional(v.string()),
    gameName: v.optional(v.string()),
    scriptContent: v.optional(v.string()),
    scriptUrl: v.optional(v.string()),
    category: v.string(), // exploit, gui, universal, game-specific
    tags: v.array(v.string()),
    addedBy: v.string(),
    verified: v.boolean(),
    downloads: v.number(),
    rating: v.number(),
  }).index("by_category", ["category"])
    .index("by_game", ["gameId"])
    .searchIndex("search_scripts", {
      searchField: "name",
      filterFields: ["category", "verified"]
    }),

  // Auto-moderation settings
  autoModSettings: defineTable({
    guildId: v.string(),
    spamThreshold: v.number(),
    capsThreshold: v.number(),
    linkWhitelist: v.array(v.string()),
    bannedWords: v.array(v.string()),
    raidProtection: v.boolean(),
    antiInvite: v.boolean(),
  }).index("by_guild", ["guildId"]),

  // Temporary punishments
  tempPunishments: defineTable({
    guildId: v.string(),
    userId: v.string(),
    type: v.string(), // mute, ban
    expiresAt: v.number(),
    reason: v.string(),
    moderatorId: v.string(),
  }).index("by_guild_user", ["guildId", "userId"])
    .index("by_expiry", ["expiresAt"]),

  // AI chat logs for context
  aiChatLogs: defineTable({
    guildId: v.string(),
    userId: v.string(),
    channelId: v.string(),
    message: v.string(),
    response: v.string(),
    timestamp: v.number(),
  }).index("by_guild", ["guildId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});

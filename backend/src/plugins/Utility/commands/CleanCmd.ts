import { ChannelType, CommandInteraction, GuildTextBasedChannel, Message, Snowflake } from "discord.js";
import { slashOptions } from "knub";
import {
  ContextResponse,
  GenericCommandSource,
  deleteContextResponse,
  getContextChannel,
  isContextInteraction,
} from "../../../pluginUtils.js";
import { ModActionsPlugin } from "../../../plugins/ModActions/ModActionsPlugin.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { SECONDS, noop } from "../../../utils.js";
import { inputPatternToRegExp } from "../../../utils.js";
import { cleanMessages } from "../functions/cleanMessages.js";
import { fetchChannelMessagesToClean } from "../functions/fetchChannelMessagesToClean.js";
import { getCommandMember } from "../utils/contextHelpers.js";
import { utilityCmd, utilitySlashCmd } from "../types.js";

const CLEAN_COMMAND_DELETE_DELAY = 10 * SECONDS;

const opts = {
  user: ct.userId({ option: true, shortcut: "u" }),
  channel: ct.channelId({ option: true, shortcut: "c" }),
  bots: ct.switchOption({ def: false, shortcut: "b" }),
  "delete-pins": ct.switchOption({ def: false, shortcut: "p" }),
  "has-invites": ct.switchOption({ def: false, shortcut: "i" }),
  match: ct.regex({ option: true, shortcut: "m" }),
  "to-id": ct.anyId({ option: true, shortcut: "id" }),
};

export const CleanCmd = utilityCmd({
  trigger: ["clean", "clear"],
  description: "Remove a number of recent messages",
  usage: "!clean 20",
  permission: "can_clean",

  signature: [
    {
      count: ct.number(),
      update: ct.number({ option: true, shortcut: "up" }),

      ...opts,
    },
    {
      count: ct.number(),
      update: ct.switchOption({ def: false, shortcut: "up" }),

      ...opts,
    },
  ],

  async run({ message: msg, args, pluginData }) {
    await runCleanCommand(pluginData, msg, {
      count: args.count,
      update: typeof args.update === "number" ? args.update : null,
      updateLatest: typeof args.update === "boolean" ? args.update : false,
      userId: args.user,
      channelId: args.channel ?? null,
      bots: args.bots ?? false,
      deletePins: args["delete-pins"] ?? false,
      hasInvites: args["has-invites"] ?? false,
      match: args.match ?? null,
      upToId: args["to-id"] ?? null,
    });
  },
});

interface CleanCommandOptions {
  count: number;
  update: number | null;
  updateLatest: boolean;
  userId: string | null;
  channelId: string | null;
  bots: boolean;
  deletePins: boolean;
  hasInvites: boolean;
  match: RegExp | null;
  upToId: string | null;
}

async function runCleanCommand(pluginData, context: GenericCommandSource, options: CleanCommandOptions) {
  const potentialChannel = options.channelId
    ? pluginData.guild.channels.cache.get(options.channelId as Snowflake)
    : await getContextChannel(context);

  if (!potentialChannel || !potentialChannel.isTextBased() || potentialChannel.isDMBased()) {
    await pluginData.state.common.sendErrorMessage(context, "Invalid channel specified");
    return;
  }

  const targetChannel = potentialChannel as GuildTextBasedChannel;

  const authorMember = await getCommandMember(pluginData, context);
  if (!authorMember) {
    await pluginData.state.common.sendErrorMessage(context, "Could not resolve command member");
    return;
  }

  if ((context instanceof Message && targetChannel.id !== context.channel.id) || isContextInteraction(context)) {
    const configForTargetChannel = await pluginData.config.getMatchingConfig({
      userId: authorMember.id,
      member: authorMember,
      channelId: targetChannel.id,
      categoryId: targetChannel.parentId,
    });
    if (configForTargetChannel.can_clean !== true) {
      await pluginData.state.common.sendErrorMessage(context, `Missing permissions to use clean on that channel`);
      return;
    }
  }

  const beforeId = (isContextInteraction(context) ? (context as CommandInteraction).id : (context as Message).id) as string;

  const fetchMessagesResult = await fetchChannelMessagesToClean(pluginData, targetChannel, {
    beforeId,
    count: options.count,
    authorId: options.userId ?? undefined,
    includePins: options.deletePins,
    onlyBotMessages: options.bots,
    onlyWithInvites: options.hasInvites,
    upToId: options.upToId ?? undefined,
    matchContent: options.match ?? undefined,
  });

  if ("error" in fetchMessagesResult) {
    await pluginData.state.common.sendErrorMessage(context, fetchMessagesResult.error);
    return;
  }

  const { messages: messagesToClean, note } = fetchMessagesResult;

  let responseMsg: ContextResponse | null = null;
  if (messagesToClean.length > 0) {
    const cleanResult = await cleanMessages(pluginData, targetChannel, messagesToClean, authorMember.user);

    let responseText = `Cleaned ${messagesToClean.length} ${messagesToClean.length === 1 ? "message" : "messages"}`;
    if (note) {
      responseText += ` (${note})`;
    }
    if (context instanceof Message ? targetChannel.id !== context.channel.id : true) {
      responseText += ` in <#${targetChannel.id}>: ${cleanResult.archiveUrl}`;
    }

    if (context instanceof Message && (options.update || options.updateLatest)) {
      const modActions = pluginData.getPlugin(ModActionsPlugin);
      const channelId =
        context instanceof Message && targetChannel.id === context.channel.id ? context.channel.id : targetChannel.id;
      const updateMessage = `Cleaned ${messagesToClean.length} ${
        messagesToClean.length === 1 ? "message" : "messages"
      } in <#${channelId}>: ${cleanResult.archiveUrl}`;
      if (options.update) {
        modActions.updateCase(context as Message, options.update, updateMessage);
      } else {
        modActions.updateCase(context as Message, null, updateMessage);
      }
    }

    responseMsg = await pluginData.state.common.sendSuccessMessage(context, responseText, undefined, undefined, false);
  } else {
    const responseText = `Found no messages to clean${note ? ` (${note})` : ""}!`;
    responseMsg = await pluginData.state.common.sendErrorMessage(context, responseText, undefined, undefined, false);
  }

    if (context instanceof Message && targetChannel.id === context.channel.id) {
      context.delete().catch(noop);
      setTimeout(() => {
        if (responseMsg) {
          deleteContextResponse(responseMsg).catch(noop);
          responseMsg.delete().catch(noop);
        }
      }, CLEAN_COMMAND_DELETE_DELAY);
    }
  }

export const CleanSlashCmd = utilitySlashCmd({
  name: "clean",
  description: "Remove a number of recent messages",
  configPermission: "can_clean",
  allowDms: false,

  signature: [
    slashOptions.integer({ name: "count", description: "Number of messages", required: true, minValue: 1, maxValue: 300 }),
    slashOptions.user({ name: "user", description: "Only from user", required: false }),
    slashOptions.channel({
      name: "channel",
      description: "Channel to clean",
      required: false,
      channelTypes: [
        ChannelType.GuildText,
        ChannelType.GuildAnnouncement,
        ChannelType.PublicThread,
        ChannelType.PrivateThread,
        ChannelType.AnnouncementThread,
        ChannelType.GuildForum,
        ChannelType.GuildMedia,
      ],
    }),
    slashOptions.boolean({ name: "bots", description: "Only bot messages", required: false }),
    slashOptions.boolean({ name: "delete-pins", description: "Include pinned messages", required: false }),
    slashOptions.boolean({ name: "has-invites", description: "Only messages with invites", required: false }),
    slashOptions.string({ name: "match", description: "Regex pattern to match", required: false }),
    slashOptions.string({ name: "to-id", description: "Stop at message ID", required: false }),
    slashOptions.integer({ name: "update-case", description: "Case number to update", required: false }),
    slashOptions.boolean({ name: "update-latest", description: "Update latest case", required: false }),
  ],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: false });

    let matchRegex: RegExp | null = null;
    if (options.match) {
      try {
        matchRegex = inputPatternToRegExp(options.match);
      } catch (err) {
        await pluginData.state.common.sendErrorMessage(interaction, `Could not parse RegExp: ${err.message}`);
        return;
      }
    }

    if (options["update-case"] && options["update-latest"]) {
      await pluginData.state.common.sendErrorMessage(
        interaction,
        "Cannot specify both update-case and update-latest",
      );
      return;
    }

    if (options["update-case"] || options["update-latest"]) {
      await pluginData.state.common.sendErrorMessage(
        interaction,
        "Updating cases is only supported via the prefix command",
      );
      return;
    }

    await runCleanCommand(pluginData, interaction, {
      count: options.count,
      update: options["update-case"] ?? null,
      updateLatest: options["update-latest"] ?? false,
      userId: options.user?.id ?? null,
      channelId: options.channel?.id ?? null,
      bots: options.bots ?? false,
      deletePins: options["delete-pins"] ?? false,
      hasInvites: options["has-invites"] ?? false,
      match: matchRegex,
      upToId: options["to-id"] ?? null,
    });
  },
});

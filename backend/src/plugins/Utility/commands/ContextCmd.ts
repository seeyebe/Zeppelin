import { ChannelType, GuildTextBasedChannel, Snowflake, TextChannel } from "discord.js";
import { slashOptions } from "knub";
import { GenericCommandSource, sendContextResponse } from "../../../pluginUtils.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { messageLink } from "../../../utils.js";
import { canReadChannel } from "../../../utils/canReadChannel.js";
import { resolveMessageTarget } from "../../../utils/resolveMessageTarget.js";
import { getCommandMember } from "../utils/contextHelpers.js";
import { utilityCmd, utilitySlashCmd } from "../types.js";

async function runContextCommand(
  pluginData,
  context: GenericCommandSource,
  target: { channel: GuildTextBasedChannel; messageId: string } | null,
) {
  if (!target) {
    await pluginData.state.common.sendErrorMessage(context, "Message context not found");
    return;
  }

  const authorMember = await getCommandMember(pluginData, context);
  if (!authorMember || !canReadChannel(target.channel, authorMember)) {
    await pluginData.state.common.sendErrorMessage(context, "Message context not found");
    return;
  }

  const previousMessage = (
    await target.channel.messages.fetch({
      limit: 1,
      before: target.messageId as Snowflake,
    })
  )[0];
  if (!previousMessage) {
    await pluginData.state.common.sendErrorMessage(context, "Message context not found");
    return;
  }

  await sendContextResponse(
    context,
    messageLink(pluginData.guild.id, previousMessage.channel.id, previousMessage.id),
    false,
  );
}

export const ContextCmd = utilityCmd({
  trigger: "context",
  description: "Get a link to the context of the specified message",
  usage: "!context 94882524378968064 650391267720822785",
  permission: "can_context",

  signature: [
    {
      message: ct.messageTarget(),
    },
    {
      channel: ct.channel(),
      messageId: ct.string(),
    },
  ],

  async run({ message: msg, args, pluginData }) {
    if (args.channel && !(args.channel instanceof TextChannel)) {
      void pluginData.state.common.sendErrorMessage(msg, "Channel must be a text channel");
      return;
    }

    const channel = args.channel ?? args.message.channel;
    const messageId = args.messageId ?? args.message.messageId;

    await runContextCommand(pluginData, msg, {
      channel: channel as GuildTextBasedChannel,
      messageId,
    });
  },
});

export const ContextSlashCmd = utilitySlashCmd({
  name: "context",
  description: "Get a link to the context of the specified message",
  configPermission: "can_context",
  allowDms: false,

  signature: [
    slashOptions.string({ name: "message", description: "Message link or ID", required: false }),
    slashOptions.channel({
      name: "channel",
      description: "Channel",
      required: false,
      channelTypes: [
        ChannelType.GuildText,
        ChannelType.GuildVoice,
        ChannelType.GuildAnnouncement,
        ChannelType.GuildStageVoice,
        ChannelType.PublicThread,
        ChannelType.PrivateThread,
        ChannelType.AnnouncementThread,
        ChannelType.GuildForum,
        ChannelType.GuildMedia,
      ],
    }),
    slashOptions.string({ name: "message-id", description: "Message ID", required: false }),
  ],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: false });

    let target: { channel: GuildTextBasedChannel; messageId: string } | null = null;

    if (options.message) {
      target = await resolveMessageTarget(pluginData, options.message);
    } else if (options.channel && options["message-id"]) {
      const channel = pluginData.guild.channels.cache.get(options.channel.id as Snowflake);
      if (channel && channel.isTextBased() && !channel.isDMBased()) {
        target = {
          channel: channel as GuildTextBasedChannel,
          messageId: options["message-id"],
        };
      }
    } else {
      await pluginData.state.common.sendErrorMessage(
        interaction,
        "Provide either a message link or both channel and message ID",
      );
      return;
    }

    await runContextCommand(pluginData, interaction, target);
  },
});

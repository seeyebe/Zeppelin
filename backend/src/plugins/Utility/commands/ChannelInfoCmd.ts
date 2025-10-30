import { ChannelType } from "discord.js";
import { slashOptions } from "knub";
import { GenericCommandSource, getContextChannel, sendContextResponse } from "../../../pluginUtils.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { getChannelInfoEmbed } from "../functions/getChannelInfoEmbed.js";
import { utilityCmd, utilitySlashCmd } from "../types.js";

async function runChannelInfoCommand(pluginData, context: GenericCommandSource, channelId: string | null) {
  let targetChannelId = channelId;
  if (!targetChannelId) {
    const channel = await getContextChannel(context);
    targetChannelId = channel?.id ?? null;
  }

  if (!targetChannelId) {
    await pluginData.state.common.sendErrorMessage(context, "Unknown channel");
    return;
  }

  const embed = await getChannelInfoEmbed(pluginData, targetChannelId);
  if (!embed) {
    await pluginData.state.common.sendErrorMessage(context, "Unknown channel");
    return;
  }

  await sendContextResponse(context, { embeds: [embed] }, false);
}

export const ChannelInfoCmd = utilityCmd({
  trigger: ["channel", "channelinfo"],
  description: "Show information about a channel",
  usage: "!channel 534722016549404673",
  permission: "can_channelinfo",

  signature: {
    channel: ct.channelId({ required: false }),
  },

  async run({ message, args, pluginData }) {
    await runChannelInfoCommand(pluginData, message, args.channel ?? null);
  },
});

export const ChannelInfoSlashCmd = utilitySlashCmd({
  name: "channelinfo",
  description: "Show information about a channel",
  configPermission: "can_channelinfo",
  allowDms: false,

  signature: [
    slashOptions.channel({
      name: "channel",
      description: "Channel to inspect",
      required: false,
      channelTypes: [
        ChannelType.GuildText,
        ChannelType.GuildVoice,
        ChannelType.GuildAnnouncement,
        ChannelType.GuildStageVoice,
        ChannelType.GuildCategory,
        ChannelType.PublicThread,
        ChannelType.PrivateThread,
        ChannelType.AnnouncementThread,
        ChannelType.GuildForum,
        ChannelType.GuildMedia,
      ],
    }),
  ],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: false });
    await runChannelInfoCommand(pluginData, interaction, options.channel?.id ?? null);
  },
});

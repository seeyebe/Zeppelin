import { GuildTextBasedChannel } from "discord.js";
import { slashOptions } from "knub";
import { GenericCommandSource, sendContextResponse } from "../../../pluginUtils.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { canReadChannel } from "../../../utils/canReadChannel.js";
import { resolveMessageTarget } from "../../../utils/resolveMessageTarget.js";
import { getCommandMember } from "../utils/contextHelpers.js";
import { getMessageInfoEmbed } from "../functions/getMessageInfoEmbed.js";
import { utilityCmd, utilitySlashCmd } from "../types.js";

async function runMessageInfoCommand(
  pluginData,
  context: GenericCommandSource,
  target: { channel: GuildTextBasedChannel; messageId: string } | null,
) {
  if (!target) {
    await pluginData.state.common.sendErrorMessage(context, "Unknown message");
    return;
  }

  const member = await getCommandMember(pluginData, context);
  if (!member || !canReadChannel(target.channel, member)) {
    await pluginData.state.common.sendErrorMessage(context, "Unknown message");
    return;
  }

  const embed = await getMessageInfoEmbed(pluginData, target.channel.id, target.messageId);
  if (!embed) {
    await pluginData.state.common.sendErrorMessage(context, "Unknown message");
    return;
  }

  await sendContextResponse(context, { embeds: [embed] }, false);
}

export const MessageInfoCmd = utilityCmd({
  trigger: ["message", "messageinfo"],
  description: "Show information about a message",
  usage: "!message 534722016549404673-534722219696455701",
  permission: "can_messageinfo",

  signature: {
    message: ct.messageTarget(),
  },

  async run({ message, args, pluginData }) {
    await runMessageInfoCommand(pluginData, message, {
      channel: args.message.channel as GuildTextBasedChannel,
      messageId: args.message.messageId,
    });
  },
});

export const MessageInfoSlashCmd = utilitySlashCmd({
  name: "messageinfo",
  description: "Show information about a message",
  configPermission: "can_messageinfo",
  allowDms: false,

  signature: [slashOptions.string({ name: "message", description: "Message link or ID", required: true })],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: false });
    const target = await resolveMessageTarget(pluginData, options.message);
    await runMessageInfoCommand(pluginData, interaction, target);
  },
});

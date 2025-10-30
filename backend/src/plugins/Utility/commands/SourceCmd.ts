import { GuildTextBasedChannel, Snowflake } from "discord.js";
import { slashOptions } from "knub";
import moment from "moment-timezone";
import {
  GenericCommandSource,
  getBaseUrl,
  sendContextResponse,
} from "../../../pluginUtils.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { canReadChannel } from "../../../utils/canReadChannel.js";
import { resolveMessageTarget } from "../../../utils/resolveMessageTarget.js";
import { getCommandMember } from "../utils/contextHelpers.js";
import { utilityCmd, utilitySlashCmd } from "../types.js";

async function runSourceCommand(
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

  const message = await target.channel.messages.fetch(target.messageId).catch(() => null);
  if (!message) {
    await pluginData.state.common.sendErrorMessage(context, "Unknown message");
    return;
  }

  const textSource = message.content || "<no text content>";
  const fullSource = JSON.stringify({
    id: message.id,
    content: message.content,
    attachments: message.attachments,
    embeds: message.embeds,
    stickers: message.stickers,
  });

  const source = `${textSource}\n\nSource:\n\n${fullSource}`;

  const archiveId = await pluginData.state.archives.create(source, moment.utc().add(1, "hour"));
  const baseUrl = getBaseUrl(pluginData);
  const url = pluginData.state.archives.getUrl(baseUrl, archiveId);
  await sendContextResponse(context, `Message source: ${url}`, false);
}

export const SourceCmd = utilityCmd({
  trigger: "source",
  description: "View the message source of the specified message id",
  usage: "!source 534722219696455701",
  permission: "can_source",

  signature: {
    message: ct.messageTarget(),
  },

  async run({ message: cmdMessage, args, pluginData }) {
    await runSourceCommand(pluginData, cmdMessage, {
      channel: args.message.channel as GuildTextBasedChannel,
      messageId: args.message.messageId,
    });
  },
});

export const SourceSlashCmd = utilitySlashCmd({
  name: "source",
  description: "View the message source of the specified message",
  configPermission: "can_source",
  allowDms: false,

  signature: [
    slashOptions.string({ name: "message", description: "Message link or ID", required: true }),
  ],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: false });
    const target = await resolveMessageTarget(pluginData, options.message);
    await runSourceCommand(pluginData, interaction, target);
  },
});

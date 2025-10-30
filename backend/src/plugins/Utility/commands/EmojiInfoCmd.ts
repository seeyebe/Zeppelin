import { slashOptions } from "knub";
import { GenericCommandSource, sendContextResponse } from "../../../pluginUtils.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { getCustomEmojiId } from "../functions/getCustomEmojiId.js";
import { getEmojiInfoEmbed } from "../functions/getEmojiInfoEmbed.js";
import { utilityCmd, utilitySlashCmd } from "../types.js";

async function runEmojiInfoCommand(pluginData, context: GenericCommandSource, emojiInput: string) {
  const emojiId = getCustomEmojiId(emojiInput);
  if (!emojiId) {
    await pluginData.state.common.sendErrorMessage(context, "Emoji not found");
    return;
  }

  const embed = await getEmojiInfoEmbed(pluginData, emojiId);
  if (!embed) {
    await pluginData.state.common.sendErrorMessage(context, "Emoji not found");
    return;
  }

  await sendContextResponse(context, { embeds: [embed] }, false);
}

export const EmojiInfoCmd = utilityCmd({
  trigger: ["emoji", "emojiinfo"],
  description: "Show information about an emoji",
  usage: "!emoji 106391128718245888",
  permission: "can_emojiinfo",

  signature: {
    emoji: ct.string({ required: true }),
  },

  async run({ message, args, pluginData }) {
    await runEmojiInfoCommand(pluginData, message, args.emoji);
  },
});

export const EmojiInfoSlashCmd = utilitySlashCmd({
  name: "emojiinfo",
  description: "Show information about an emoji",
  configPermission: "can_emojiinfo",
  allowDms: false,

  signature: [slashOptions.string({ name: "emoji", description: "Emoji to inspect", required: true })],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: false });
    await runEmojiInfoCommand(pluginData, interaction, options.emoji);
  },
});

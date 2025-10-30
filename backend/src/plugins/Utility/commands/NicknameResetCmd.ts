import { GuildMember } from "discord.js";
import { slashOptions } from "knub";
import { GenericCommandSource, canActOn, sendContextResponse } from "../../../pluginUtils.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { errorMessage } from "../../../utils.js";
import { getCommandMember } from "../utils/contextHelpers.js";
import { utilityCmd, utilitySlashCmd } from "../types.js";

async function runNicknameResetCommand(pluginData, context: GenericCommandSource, member: GuildMember | null) {
  if (!member) {
    await pluginData.state.common.sendErrorMessage(context, "Unknown member");
    return;
  }

  const authorMember = await getCommandMember(pluginData, context);
  if (!authorMember) {
    await pluginData.state.common.sendErrorMessage(context, "Cannot reset nickname: insufficient permissions");
    return;
  }

  if (authorMember.id !== member.id && !canActOn(pluginData, authorMember, member)) {
    await pluginData.state.common.sendErrorMessage(context, "Cannot reset nickname: insufficient permissions");
    return;
  }

  if (!member.nickname) {
    await sendContextResponse(context, errorMessage("User does not have a nickname"), false);
    return;
  }

  try {
    await member.setNickname(null);
  } catch {
    await sendContextResponse(context, errorMessage("Failed to reset nickname"), false);
    return;
  }

  await pluginData.state.common.sendSuccessMessage(
    context,
    `The nickname of <@!${member.id}> has been reset`,
    undefined,
    undefined,
    false,
  );
}

export const NicknameResetCmd = utilityCmd({
  trigger: ["nickname reset", "nick reset"],
  description: "Reset a member's nickname to their username",
  usage: "!nickname reset 106391128718245888",
  permission: "can_nickname",

  signature: {
    member: ct.resolvedMember(),
  },

  async run({ message: msg, args, pluginData }) {
    await runNicknameResetCommand(pluginData, msg, args.member);
  },
});

export const NicknameResetSlashCmd = utilitySlashCmd({
  name: "nicknamereset",
  description: "Reset a member's nickname to their username",
  configPermission: "can_nickname",
  allowDms: false,

  signature: [slashOptions.user({ name: "member", description: "Member to reset", required: true })],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: false });
    let member: GuildMember | null = null;
    try {
      member = await pluginData.guild.members.fetch(options.member.id);
    } catch {
      member = null;
    }

    await runNicknameResetCommand(pluginData, interaction, member);
  },
});

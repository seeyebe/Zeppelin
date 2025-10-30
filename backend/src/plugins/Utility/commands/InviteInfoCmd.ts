import { slashOptions } from "knub";
import { GenericCommandSource, sendContextResponse } from "../../../pluginUtils.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { parseInviteCodeInput } from "../../../utils.js";
import { getInviteInfoEmbed } from "../functions/getInviteInfoEmbed.js";
import { utilityCmd, utilitySlashCmd } from "../types.js";

async function runInviteInfoCommand(pluginData, context: GenericCommandSource, inviteCodeInput: string) {
  const inviteCode = parseInviteCodeInput(inviteCodeInput);
  const embed = await getInviteInfoEmbed(pluginData, inviteCode);
  if (!embed) {
    await pluginData.state.common.sendErrorMessage(context, "Unknown invite");
    return;
  }

  await sendContextResponse(context, { embeds: [embed] }, false);
}

export const InviteInfoCmd = utilityCmd({
  trigger: ["invite", "inviteinfo"],
  description: "Show information about an invite",
  usage: "!invite overwatch",
  permission: "can_inviteinfo",

  signature: {
    inviteCode: ct.string(),
  },

  async run({ message, args, pluginData }) {
    await runInviteInfoCommand(pluginData, message, args.inviteCode);
  },
});

export const InviteInfoSlashCmd = utilitySlashCmd({
  name: "inviteinfo",
  description: "Show information about an invite",
  configPermission: "can_inviteinfo",
  allowDms: false,

  signature: [slashOptions.string({ name: "invite", description: "Invite code or link", required: true })],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: false });
    await runInviteInfoCommand(pluginData, interaction, options.invite);
  },
});

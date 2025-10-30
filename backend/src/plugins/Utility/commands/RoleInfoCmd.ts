import { Role } from "discord.js";
import { slashOptions } from "knub";
import { GenericCommandSource, sendContextResponse } from "../../../pluginUtils.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { getRoleInfoEmbed } from "../functions/getRoleInfoEmbed.js";
import { utilityCmd, utilitySlashCmd } from "../types.js";

async function runRoleInfoCommand(pluginData, context: GenericCommandSource, role: Role | null) {
  if (!role) {
    await pluginData.state.common.sendErrorMessage(context, "Unknown role");
    return;
  }

  const embed = await getRoleInfoEmbed(pluginData, role);
  await sendContextResponse(context, { embeds: [embed] }, false);
}

export const RoleInfoCmd = utilityCmd({
  trigger: ["roleinfo"],
  description: "Show information about a role",
  usage: "!role 106391128718245888",
  permission: "can_roleinfo",

  signature: {
    role: ct.role({ required: true }),
  },

  async run({ message, args, pluginData }) {
    await runRoleInfoCommand(pluginData, message, args.role);
  },
});

export const RoleInfoSlashCmd = utilitySlashCmd({
  name: "roleinfo",
  description: "Show information about a role",
  configPermission: "can_roleinfo",
  allowDms: false,

  signature: [slashOptions.role({ name: "role", description: "Role to inspect", required: true })],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: false });
    await runRoleInfoCommand(pluginData, interaction, options.role as Role);
  },
});

import { slashOptions } from "knub";
import { GenericCommandSource, sendContextResponse } from "../../../pluginUtils.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { getServerInfoEmbed } from "../functions/getServerInfoEmbed.js";
import { utilityCmd, utilitySlashCmd } from "../types.js";

async function runServerInfoCommand(pluginData, context: GenericCommandSource, serverId: string | null) {
  const id = serverId || pluginData.guild.id;
  const serverInfoEmbed = await getServerInfoEmbed(pluginData, id);
  if (!serverInfoEmbed) {
    await pluginData.state.common.sendErrorMessage(context, "Could not find information for that server");
    return;
  }

  await sendContextResponse(context, { embeds: [serverInfoEmbed] }, false);
}

export const ServerInfoCmd = utilityCmd({
  trigger: ["server", "serverinfo"],
  description: "Show server information",
  usage: "!server",
  permission: "can_server",

  signature: {
    serverId: ct.string({ required: false }),
  },

  async run({ message, pluginData, args }) {
    await runServerInfoCommand(pluginData, message, args.serverId ?? null);
  },
});

export const ServerInfoSlashCmd = utilitySlashCmd({
  name: "serverinfo",
  description: "Show server information",
  configPermission: "can_server",
  allowDms: false,

  signature: [slashOptions.string({ name: "server-id", description: "Server ID", required: false })],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: false });
    await runServerInfoCommand(pluginData, interaction, options["server-id"] ?? null);
  },
});

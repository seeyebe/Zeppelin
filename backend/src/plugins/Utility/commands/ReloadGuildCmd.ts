import { TextChannel } from "discord.js";
import { GenericCommandSource, getContextChannel, sendContextResponse } from "../../../pluginUtils.js";
import { activeReloads } from "../guildReloads.js";
import { utilityCmd, utilitySlashCmd } from "../types.js";

async function runReloadGuildCommand(pluginData, context: GenericCommandSource) {
  if (activeReloads.has(pluginData.guild.id)) {
    return;
  }

  const channel = await getContextChannel(context);
  if (!channel || !(channel instanceof TextChannel)) {
    await pluginData.state.common.sendErrorMessage(context, "Reload must be triggered from a text channel");
    return;
  }

  activeReloads.set(pluginData.guild.id, channel);

  await sendContextResponse(context, "Reloading...", false);
  pluginData.getKnubInstance().reloadGuild(pluginData.guild.id);
}

export const ReloadGuildCmd = utilityCmd({
  trigger: "reload_guild",
  description: "Reload the Zeppelin configuration and all plugins for the server. This can sometimes fix issues.",
  permission: "can_reload_guild",

  async run({ message: msg, pluginData }) {
    await runReloadGuildCommand(pluginData, msg);
  },
});

export const ReloadGuildSlashCmd = utilitySlashCmd({
  name: "reloadguild",
  description: "Reload the Zeppelin configuration and plugins for this server",
  configPermission: "can_reload_guild",
  allowDms: false,

  signature: [],

  async run({ interaction, pluginData }) {
    await interaction.deferReply({ ephemeral: false });
    await runReloadGuildCommand(pluginData, interaction);
  },
});

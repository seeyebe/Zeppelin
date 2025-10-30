import { GuildMember, VoiceChannel } from "discord.js";
import { slashOptions } from "knub";
import { GenericCommandSource, canActOn } from "../../../pluginUtils.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { renderUsername } from "../../../utils.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { getCommandMember } from "../utils/contextHelpers.js";
import { utilityCmd, utilitySlashCmd } from "../types.js";

async function runVcdisconnectCommand(pluginData, context: GenericCommandSource, member: GuildMember | null) {
  if (!member) {
    await pluginData.state.common.sendErrorMessage(context, "Unknown member");
    return;
  }

  const authorMember = await getCommandMember(pluginData, context);
  if (!authorMember || !canActOn(pluginData, authorMember, member)) {
    await pluginData.state.common.sendErrorMessage(context, "Cannot move: insufficient permissions");
    return;
  }

  if (!member.voice?.channelId) {
    await pluginData.state.common.sendErrorMessage(context, "Member is not in a voice channel");
    return;
  }
  const channel = pluginData.guild.channels.cache.get(member.voice.channelId) as VoiceChannel;

  try {
    await member.voice.disconnect();
  } catch {
    await pluginData.state.common.sendErrorMessage(context, "Failed to disconnect member");
    return;
  }

  pluginData.getPlugin(LogsPlugin).logVoiceChannelForceDisconnect({
    mod: authorMember.user,
    member,
    oldChannel: channel,
  });

  await pluginData.state.common.sendSuccessMessage(
    context,
    `**${renderUsername(member)}** disconnected from **${channel.name}**`,
    undefined,
    undefined,
    false,
  );
}

export const VcdisconnectCmd = utilityCmd({
  trigger: ["vcdisconnect", "vcdisc", "vcdc", "vckick", "vck"],
  description: "Disconnect a member from their voice channel",
  usage: "!vcdc @Dark",
  permission: "can_vckick",

  signature: {
    member: ct.resolvedMember(),
  },

  async run({ message: msg, args, pluginData }) {
    await runVcdisconnectCommand(pluginData, msg, args.member);
  },
});

export const VcdisconnectSlashCmd = utilitySlashCmd({
  name: "vcdisconnect",
  description: "Disconnect a member from their voice channel",
  configPermission: "can_vckick",
  allowDms: false,

  signature: [slashOptions.user({ name: "member", description: "Member to disconnect", required: true })],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: false });
    let member: GuildMember | null = null;
    try {
      member = await pluginData.guild.members.fetch(options.member.id);
    } catch {
      member = null;
    }

    await runVcdisconnectCommand(pluginData, interaction, member);
  },
});

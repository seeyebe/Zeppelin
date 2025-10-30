import { ChannelType, GuildMember, Snowflake, VoiceChannel } from "discord.js";
import { slashOptions } from "knub";
import { GenericCommandSource, canActOn } from "../../../pluginUtils.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { channelMentionRegex, isSnowflake, renderUsername, simpleClosestStringMatch } from "../../../utils.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { getCommandMember } from "../utils/contextHelpers.js";
import { utilityCmd, utilitySlashCmd } from "../types.js";

function resolveVoiceChannelInput(pluginData, input: string): VoiceChannel | null {
  if (isSnowflake(input)) {
    const potential = pluginData.guild.channels.cache.get(input as Snowflake);
    return potential instanceof VoiceChannel ? potential : null;
  }

  const mentionMatch = input.match(channelMentionRegex);
  if (mentionMatch) {
    const channelId = mentionMatch[1];
    const potential = pluginData.guild.channels.cache.get(channelId as Snowflake);
    return potential instanceof VoiceChannel ? potential : null;
  }

  const voiceChannels = [...pluginData.guild.channels.cache.values()].filter(
    (c): c is VoiceChannel => c.type === ChannelType.GuildVoice,
  );
  return simpleClosestStringMatch(input, voiceChannels, (ch) => ch.name) ?? null;
}

async function runVcmoveCommand(
  pluginData,
  context: GenericCommandSource,
  member: GuildMember | null,
  targetChannel: VoiceChannel | null,
  channelInput?: string,
) {
  if (!member) {
    await pluginData.state.common.sendErrorMessage(context, "Unknown member");
    return;
  }

  const channel = targetChannel ?? (channelInput ? resolveVoiceChannelInput(pluginData, channelInput) : null);
  if (!channel) {
    await pluginData.state.common.sendErrorMessage(context, "Unknown or non-voice channel");
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

  if (member.voice.channelId === channel.id) {
    await pluginData.state.common.sendErrorMessage(context, "Member is already on that channel!");
    return;
  }

  const oldVoiceChannel = pluginData.guild.channels.cache.get(member.voice.channelId) as VoiceChannel;

  try {
    await member.edit({ channel: channel.id });
  } catch {
    await pluginData.state.common.sendErrorMessage(context, "Failed to move member");
    return;
  }

  pluginData.getPlugin(LogsPlugin).logVoiceChannelForceMove({
    mod: authorMember.user,
    member,
    oldChannel: oldVoiceChannel,
    newChannel: channel,
  });

  await pluginData.state.common.sendSuccessMessage(
    context,
    `**${renderUsername(member)}** moved to **${channel.name}**`,
    undefined,
    undefined,
    false,
  );
}

async function runVcmoveAllCommand(
  pluginData,
  context: GenericCommandSource,
  sourceChannel: VoiceChannel | null,
  targetChannel: VoiceChannel | null,
  channelInput?: string,
) {
  if (!sourceChannel) {
    await pluginData.state.common.sendErrorMessage(context, "Unknown source channel");
    return;
  }

  const channel = targetChannel ?? (channelInput ? resolveVoiceChannelInput(pluginData, channelInput) : null);
  if (!channel) {
    await pluginData.state.common.sendErrorMessage(context, "Unknown or non-voice channel");
    return;
  }

  if (sourceChannel.members.size === 0) {
    await pluginData.state.common.sendErrorMessage(context, "Voice channel is empty");
    return;
  }

  if (sourceChannel.id === channel.id) {
    await pluginData.state.common.sendErrorMessage(context, "Cant move from and to the same channel!");
    return;
  }

  const authorMember = await getCommandMember(pluginData, context);
  if (!authorMember) {
    await pluginData.state.common.sendErrorMessage(context, "Cannot move: insufficient permissions");
    return;
  }

  const moveAmt = sourceChannel.members.size;
  let errAmt = 0;

  for (const [, member] of sourceChannel.members) {
    if (member.id !== authorMember.id && !canActOn(pluginData, authorMember, member)) {
      await pluginData.state.common.sendErrorMessage(
        context,
        `Failed to move ${renderUsername(member)} (${member.id}): You cannot act on this member`,
      );
      errAmt++;
      continue;
    }

    try {
      await member.edit({ channel: channel.id });
    } catch {
      await pluginData.state.common.sendErrorMessage(
        context,
        `Failed to move ${renderUsername(member)} (${member.id})`,
      );
      errAmt++;
      continue;
    }

    pluginData.getPlugin(LogsPlugin).logVoiceChannelForceMove({
      mod: authorMember.user,
      member,
      oldChannel: sourceChannel,
      newChannel: channel,
    });
  }

  if (moveAmt !== errAmt) {
    await pluginData.state.common.sendSuccessMessage(
      context,
      `${moveAmt - errAmt} members from **${sourceChannel.name}** moved to **${channel.name}**`,
      undefined,
      undefined,
      false,
    );
  } else {
    await pluginData.state.common.sendErrorMessage(context, `Failed to move any members.`);
  }
}

export const VcmoveCmd = utilityCmd({
  trigger: "vcmove",
  description: "Move a member to another voice channel",
  usage: "!vcmove @Dragory 473223047822704651",
  permission: "can_vcmove",

  signature: {
    member: ct.resolvedMember(),
    channel: ct.string({ catchAll: true }),
  },

  async run({ message: msg, args, pluginData }) {
    await runVcmoveCommand(pluginData, msg, args.member, null, args.channel);
  },
});

export const VcmoveAllCmd = utilityCmd({
  trigger: "vcmoveall",
  description: "Move all members of a voice channel to another voice channel",
  usage: "!vcmoveall 551767166395875334 767497573560352798",
  permission: "can_vcmove",

  signature: {
    oldChannel: ct.voiceChannel(),
    channel: ct.string({ catchAll: true }),
  },

  async run({ message: msg, args, pluginData }) {
    await runVcmoveAllCommand(pluginData, msg, args.oldChannel, null, args.channel);
  },
});

export const VcmoveSlashCmd = utilitySlashCmd({
  name: "vcmove",
  description: "Move a member to another voice channel",
  configPermission: "can_vcmove",
  allowDms: false,

  signature: [
    slashOptions.user({ name: "member", description: "Member to move", required: true }),
    slashOptions.channel({
      name: "channel",
      description: "Target voice channel",
      required: true,
      channelTypes: [ChannelType.GuildVoice],
    }),
  ],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: false });
    let member: GuildMember | null = null;
    try {
      member = await pluginData.guild.members.fetch(options.member.id);
    } catch {
      member = null;
    }

    const channel = pluginData.guild.channels.cache.get(options.channel.id as Snowflake);
    await runVcmoveCommand(pluginData, interaction, member, channel instanceof VoiceChannel ? channel : null);
  },
});

export const VcmoveAllSlashCmd = utilitySlashCmd({
  name: "vcmoveall",
  description: "Move all members of a voice channel to another voice channel",
  configPermission: "can_vcmove",
  allowDms: false,

  signature: [
    slashOptions.channel({
      name: "source",
      description: "Source voice channel",
      required: true,
      channelTypes: [ChannelType.GuildVoice],
    }),
    slashOptions.channel({
      name: "channel",
      description: "Target voice channel",
      required: true,
      channelTypes: [ChannelType.GuildVoice],
    }),
  ],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: false });
    const source = pluginData.guild.channels.cache.get(options.source.id as Snowflake);
    const target = pluginData.guild.channels.cache.get(options.channel.id as Snowflake);
    await runVcmoveAllCommand(
      pluginData,
      interaction,
      source instanceof VoiceChannel ? source : null,
      target instanceof VoiceChannel ? target : null,
    );
  },
});

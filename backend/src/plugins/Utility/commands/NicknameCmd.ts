import { GuildMember, escapeBold } from "discord.js";
import { slashOptions } from "knub";
import { GenericCommandSource, canActOn, sendContextResponse } from "../../../pluginUtils.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { errorMessage } from "../../../utils.js";
import { getCommandMember } from "../utils/contextHelpers.js";
import { utilityCmd, utilitySlashCmd } from "../types.js";

async function runNicknameCommand(
  pluginData,
  context: GenericCommandSource,
  member: GuildMember | null,
  nickname: string | null,
) {
  if (!member) {
    await pluginData.state.common.sendErrorMessage(context, "Unknown member");
    return;
  }

  if (!nickname) {
    if (!member.nickname) {
      await sendContextResponse(context, `<@!${member.id}> does not have a nickname`, false);
    } else {
      await sendContextResponse(
        context,
        `The nickname of <@!${member.id}> is **${escapeBold(member.nickname)}**`,
        false,
      );
    }
    return;
  }

  const authorMember = await getCommandMember(pluginData, context);
  if (!authorMember) {
    await pluginData.state.common.sendErrorMessage(context, "Cannot change nickname: missing permissions");
    return;
  }

  if (authorMember.id !== member.id && !canActOn(pluginData, authorMember, member)) {
    await pluginData.state.common.sendErrorMessage(context, "Cannot change nickname: insufficient permissions");
    return;
  }

  const nicknameLength = [...nickname].length;
  if (nicknameLength < 2 || nicknameLength > 32) {
    await pluginData.state.common.sendErrorMessage(context, "Nickname must be between 2 and 32 characters long");
    return;
  }

  const oldNickname = member.nickname || "<none>";

  try {
    await member.setNickname(nickname);
  } catch {
    await pluginData.state.common.sendErrorMessage(context, "Failed to change nickname");
    return;
  }

  await pluginData.state.common.sendSuccessMessage(
    context,
    `Changed nickname of <@!${member.id}> from **${oldNickname}** to **${nickname}**`,
    undefined,
    undefined,
    false,
  );
}

export const NicknameCmd = utilityCmd({
  trigger: ["nickname", "nick"],
  description: "Set a member's nickname",
  usage: "!nickname 106391128718245888 Drag",
  permission: "can_nickname",

  signature: {
    member: ct.resolvedMember(),
    nickname: ct.string({ catchAll: true, required: false }),
  },

  async run({ message: msg, args, pluginData }) {
    if (!args.nickname) {
      if (!args.member.nickname) {
        msg.channel.send(`<@!${args.member.id}> does not have a nickname`);
      } else {
        msg.channel.send(`The nickname of <@!${args.member.id}> is **${escapeBold(args.member.nickname)}**`);
      }
      return;
    }

    await runNicknameCommand(pluginData, msg, args.member, args.nickname ?? null);
  },
});

export const NicknameSlashCmd = utilitySlashCmd({
  name: "nickname",
  description: "Set a member's nickname",
  configPermission: "can_nickname",
  allowDms: false,

  signature: [
    slashOptions.user({ name: "member", description: "Member to modify", required: true }),
    slashOptions.string({ name: "nickname", description: "New nickname", required: false }),
  ],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: false });
    let member: GuildMember | null = null;
    try {
      member = await pluginData.guild.members.fetch(options.member.id);
    } catch {
      member = null;
    }

    await runNicknameCommand(pluginData, interaction, member, options.nickname ?? null);
  },
});

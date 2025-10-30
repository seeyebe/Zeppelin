import { GuildMember } from "discord.js";
import { helpers, slashOptions } from "knub";
import { GenericCommandSource, sendContextResponse } from "../../../pluginUtils.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { renderUsername } from "../../../utils.js";
import { getCommandMember } from "../utils/contextHelpers.js";
import { utilityCmd, utilitySlashCmd } from "../types.js";

const { getMemberLevel } = helpers;

async function runLevelCommand(pluginData, context: GenericCommandSource, member: GuildMember | null) {
  const targetMember = member ?? (await getCommandMember(pluginData, context));
  if (!targetMember) {
    await pluginData.state.common.sendErrorMessage(context, "Unknown member");
    return;
  }

  const level = getMemberLevel(pluginData, targetMember);
  await sendContextResponse(
    context,
    `The permission level of ${renderUsername(targetMember)} is **${level}**`,
    false,
  );
}

export const LevelCmd = utilityCmd({
  trigger: "level",
  description: "Show the permission level of a user",
  usage: "!level 106391128718245888",
  permission: "can_level",

  signature: {
    member: ct.resolvedMember({ required: false }),
  },

  async run({ message, args, pluginData }) {
    await runLevelCommand(pluginData, message, args.member ?? null);
  },
});

export const LevelSlashCmd = utilitySlashCmd({
  name: "level",
  description: "Show the permission level of a user",
  configPermission: "can_level",
  allowDms: false,

  signature: [slashOptions.user({ name: "user", description: "User to inspect", required: false })],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: false });
    let member: GuildMember | null = null;
    if (options.user) {
      try {
        member = await pluginData.guild.members.fetch(options.user.id);
      } catch {
        member = null;
      }
      if (!member) {
        await pluginData.state.common.sendErrorMessage(interaction, "Unknown member");
        return;
      }
    }

    await runLevelCommand(pluginData, interaction, member);
  },
});

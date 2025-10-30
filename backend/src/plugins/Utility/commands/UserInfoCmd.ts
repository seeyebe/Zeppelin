import { slashOptions } from "knub";
import { GenericCommandSource, sendContextResponse } from "../../../pluginUtils.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { getCommandUser } from "../utils/contextHelpers.js";
import { getUserInfoEmbed } from "../functions/getUserInfoEmbed.js";
import { utilityCmd, utilitySlashCmd } from "../types.js";

async function runUserInfoCommand(pluginData, context: GenericCommandSource, userId: string | null, compact: boolean) {
  const targetUserId = userId ?? getCommandUser(context).id;
  const embed = await getUserInfoEmbed(pluginData, targetUserId, compact);
  if (!embed) {
    await pluginData.state.common.sendErrorMessage(context, "User not found");
    return;
  }

  await sendContextResponse(context, { embeds: [embed] }, false);
}

export const UserInfoCmd = utilityCmd({
  trigger: ["user", "userinfo", "whois"],
  description: "Show information about a user",
  usage: "!user 106391128718245888",
  permission: "can_userinfo",

  signature: {
    user: ct.resolvedUserLoose({ required: false }),

    compact: ct.switchOption({ def: false, shortcut: "c" }),
  },

  async run({ message, args, pluginData }) {
    await runUserInfoCommand(pluginData, message, args.user?.id ?? null, args.compact);
  },
});

export const UserInfoSlashCmd = utilitySlashCmd({
  name: "userinfo",
  description: "Show information about a user",
  configPermission: "can_userinfo",
  allowDms: false,

  signature: [
    slashOptions.user({ name: "user", description: "User to show", required: false }),
    slashOptions.boolean({ name: "compact", description: "Use compact view", required: false }),
  ],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: false });
    await runUserInfoCommand(pluginData, interaction, options.user?.id ?? null, options.compact ?? false);
  },
});

import { APIEmbed, GuildMember, ImageFormat, User } from "discord.js";
import { slashOptions } from "knub";
import { GenericCommandSource, isContextInteraction, sendContextResponse } from "../../../pluginUtils.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { UnknownUser, renderUsername } from "../../../utils.js";
import { utilityCmd, utilitySlashCmd } from "../types.js";

async function runAvatarCommand(
  pluginData,
  context: GenericCommandSource,
  user: GuildMember | User | UnknownUser | null,
) {
  const fallbackUser = isContextInteraction(context) ? context.user : context.author;
  const target = user ?? fallbackUser;

  if (target instanceof UnknownUser) {
    await pluginData.state.common.sendErrorMessage(context, "Invalid user ID");
    return;
  }

  const resolvedUser: GuildMember | User = target;
  const embed: APIEmbed = {
    image: {
      url: resolvedUser.displayAvatarURL({ extension: ImageFormat.PNG, size: 2048 }),
    },
    title: `Avatar of ${renderUsername(resolvedUser)}:`,
  };

  await sendContextResponse(context, { embeds: [embed] }, false);
}

export const AvatarCmd = utilityCmd({
  trigger: ["avatar", "av"],
  description: "Retrieves a user's profile picture",
  permission: "can_avatar",

  signature: {
    user: ct.resolvedMember({ required: false }) || ct.resolvedUserLoose({ required: false }),
  },

  async run({ message: msg, args, pluginData }) {
    const user = args.user ?? msg.member ?? msg.author;
    await runAvatarCommand(pluginData, msg, user);
  },
});

export const AvatarSlashCmd = utilitySlashCmd({
  name: "avatar",
  description: "Retrieves a user's profile picture",
  configPermission: "can_avatar",
  allowDms: false,

  signature: [slashOptions.user({ name: "user", description: "User to show", required: false })],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: false });
    await runAvatarCommand(pluginData, interaction, (options.user as GuildMember | User | null) ?? null);
  },
});

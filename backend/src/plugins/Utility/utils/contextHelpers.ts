import { GuildMember, Message } from "discord.js";
import { GenericCommandSource, isContextInteraction, resolveMessageMember } from "../../../pluginUtils.js";

export function getCommandUser(context: GenericCommandSource) {
  return isContextInteraction(context) ? context.user : context.author;
}

export async function getCommandMember(pluginData, context: GenericCommandSource): Promise<GuildMember | null> {
  if (isContextInteraction(context)) {
    const interaction = context;
    if (interaction.member instanceof GuildMember) {
      return interaction.member;
    }

    if (interaction.guildId) {
      try {
        return await pluginData.guild.members.fetch(interaction.user.id);
      } catch {
        return null;
      }
    }

    return null;
  }

  if (context instanceof Message) {
    if (!context.inGuild()) {
      return null;
    }

    return resolveMessageMember(context);
  }

  return null;
}

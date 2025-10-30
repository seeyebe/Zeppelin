import { Snowflake } from "discord.js";
import { getChannelId, getRoleId } from "knub/helpers";
import { slashOptions } from "knub";
import {
  GenericCommandSource,
  getConfigForContext,
  sendContextResponse,
} from "../../../pluginUtils.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import {
  isValidSnowflake,
  noop,
  parseInviteCodeInput,
  resolveInvite,
  resolveUser,
} from "../../../utils.js";
import { canReadChannel } from "../../../utils/canReadChannel.js";
import { resolveMessageTarget } from "../../../utils/resolveMessageTarget.js";
import { getChannelInfoEmbed } from "../functions/getChannelInfoEmbed.js";
import { getCustomEmojiId } from "../functions/getCustomEmojiId.js";
import { getEmojiInfoEmbed } from "../functions/getEmojiInfoEmbed.js";
import { getGuildPreview } from "../functions/getGuildPreview.js";
import { getInviteInfoEmbed } from "../functions/getInviteInfoEmbed.js";
import { getMessageInfoEmbed } from "../functions/getMessageInfoEmbed.js";
import { getRoleInfoEmbed } from "../functions/getRoleInfoEmbed.js";
import { getServerInfoEmbed } from "../functions/getServerInfoEmbed.js";
import { getSnowflakeInfoEmbed } from "../functions/getSnowflakeInfoEmbed.js";
import { getUserInfoEmbed } from "../functions/getUserInfoEmbed.js";
import { getCommandMember, getCommandUser } from "../utils/contextHelpers.js";
import { utilityCmd, utilitySlashCmd } from "../types.js";

async function runInfoCommand(pluginData, context: GenericCommandSource, valueArg: string | null, compact: boolean) {
  const value = valueArg || getCommandUser(context).id;
  const userCfg = await getConfigForContext(pluginData.config, context);

  // 1. Channel
  if (userCfg.can_channelinfo) {
    const channelId = getChannelId(value);
    const channel = channelId && pluginData.guild.channels.cache.get(channelId as Snowflake);
    if (channel) {
      const embed = await getChannelInfoEmbed(pluginData, channelId!);
      if (embed) {
        await sendContextResponse(context, { embeds: [embed] }, false);
        return;
      }
    }
  }

  // 2. Server
  if (userCfg.can_server) {
    const guild = await pluginData.client.guilds.fetch(value as Snowflake).catch(noop);
    if (guild) {
      const embed = await getServerInfoEmbed(pluginData, value);
      if (embed) {
        await sendContextResponse(context, { embeds: [embed] }, false);
        return;
      }
    }
  }

  // 3. User
  if (userCfg.can_userinfo) {
    const user = await resolveUser(pluginData.client, value);
    if (user) {
      const embed = await getUserInfoEmbed(pluginData, user.id, Boolean(compact));
      if (embed) {
        await sendContextResponse(context, { embeds: [embed] }, false);
        return;
      }
    }
  }

  // 4. Message
  if (userCfg.can_messageinfo) {
    const messageTarget = await resolveMessageTarget(pluginData, value);
    if (messageTarget) {
      const authorMember = await getCommandMember(pluginData, context);
      if (authorMember && canReadChannel(messageTarget.channel, authorMember)) {
        const embed = await getMessageInfoEmbed(pluginData, messageTarget.channel.id, messageTarget.messageId);
        if (embed) {
          await sendContextResponse(context, { embeds: [embed] }, false);
          return;
        }
      }
    }
  }

  // 5. Invite
  if (userCfg.can_inviteinfo) {
    const inviteCode = parseInviteCodeInput(value) ?? value;
    if (inviteCode) {
      const invite = await resolveInvite(pluginData.client, inviteCode, true);
      if (invite) {
        const embed = await getInviteInfoEmbed(pluginData, inviteCode);
        if (embed) {
          await sendContextResponse(context, { embeds: [embed] }, false);
          return;
        }
      }
    }
  }

  // 6. Server again (fallback for discovery servers)
  if (userCfg.can_server) {
    const serverPreview = await getGuildPreview(pluginData.client, value).catch(() => null);
    if (serverPreview) {
      const embed = await getServerInfoEmbed(pluginData, value);
      if (embed) {
        await sendContextResponse(context, { embeds: [embed] }, false);
        return;
      }
    }
  }

  // 7. Role
  if (userCfg.can_roleinfo) {
    const roleId = getRoleId(value);
    const role = roleId && pluginData.guild.roles.cache.get(roleId as Snowflake);
    if (role) {
      const embed = await getRoleInfoEmbed(pluginData, role);
      await sendContextResponse(context, { embeds: [embed] }, false);
      return;
    }
  }

  // 8. Emoji
  if (userCfg.can_emojiinfo) {
    const emojiId = getCustomEmojiId(value);
    if (emojiId) {
      const embed = await getEmojiInfoEmbed(pluginData, emojiId);
      if (embed) {
        await sendContextResponse(context, { embeds: [embed] }, false);
        return;
      }
    }
  }

  // 9. Arbitrary ID
  if (isValidSnowflake(value) && userCfg.can_snowflake) {
    const embed = await getSnowflakeInfoEmbed(value, true);
    await sendContextResponse(context, { embeds: [embed] }, false);
    return;
  }

  await pluginData.state.common.sendErrorMessage(
    context,
    "Could not find anything with that value or you are lacking permission for the snowflake type",
  );
}

export const InfoCmd = utilityCmd({
  trigger: "info",
  description: "Show information about the specified thing",
  usage: "!info",
  permission: "can_info",

  signature: {
    value: ct.string({ required: false }),

    compact: ct.switchOption({ def: false, shortcut: "c" }),
  },

  async run({ message, args, pluginData }) {
    await runInfoCommand(pluginData, message, args.value ?? null, Boolean(args.compact));
  },
});

export const InfoSlashCmd = utilitySlashCmd({
  name: "info",
  description: "Show information about the specified value",
  configPermission: "can_info",
  allowDms: false,

  signature: [
    slashOptions.string({ name: "value", description: "Target value", required: false }),
    slashOptions.boolean({ name: "compact", description: "Use compact output for user info", required: false }),
  ],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: false });
    await runInfoCommand(pluginData, interaction, options.value ?? null, options.compact ?? false);
  },
});

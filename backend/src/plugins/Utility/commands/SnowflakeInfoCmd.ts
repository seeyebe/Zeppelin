import { slashOptions } from "knub";
import { GenericCommandSource, sendContextResponse } from "../../../pluginUtils.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { getSnowflakeInfoEmbed } from "../functions/getSnowflakeInfoEmbed.js";
import { utilityCmd, utilitySlashCmd } from "../types.js";

async function runSnowflakeInfoCommand(context: GenericCommandSource, id: string) {
  const embed = await getSnowflakeInfoEmbed(id, false);
  await sendContextResponse(context, { embeds: [embed] }, false);
}

export const SnowflakeInfoCmd = utilityCmd({
  trigger: ["snowflake", "snowflakeinfo"],
  description: "Show information about a snowflake ID",
  usage: "!snowflake 534722016549404673",
  permission: "can_snowflake",

  signature: {
    id: ct.anyId(),
  },

  async run({ message, args }) {
    await runSnowflakeInfoCommand(message, args.id);
  },
});

export const SnowflakeInfoSlashCmd = utilitySlashCmd({
  name: "snowflakeinfo",
  description: "Show information about a snowflake ID",
  configPermission: "can_snowflake",
  allowDms: false,

  signature: [slashOptions.string({ name: "id", description: "Snowflake ID", required: true })],

  async run({ interaction, options }) {
    await interaction.deferReply({ ephemeral: false });
    await runSnowflakeInfoCommand(interaction, options.id);
  },
});

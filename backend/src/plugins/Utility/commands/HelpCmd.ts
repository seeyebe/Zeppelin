import { LoadedGuildPlugin, PluginCommandDefinition, slashOptions } from "knub";
import { GenericCommandSource, sendContextResponse } from "../../../pluginUtils.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { env } from "../../../env.js";
import { chunkMessageLines } from "../../../utils.js";
import { utilityCmd, utilitySlashCmd } from "../types.js";

async function runHelpCommand(pluginData, context: GenericCommandSource, commandQuery: string) {
  const searchStr = commandQuery.toLowerCase();

  const matchingCommands: Array<{
    plugin: LoadedGuildPlugin<any>;
    command: PluginCommandDefinition;
  }> = [];

  const guildData = pluginData.getKnubInstance().getLoadedGuild(pluginData.guild.id)!;
  for (const plugin of guildData.loadedPlugins.values()) {
    const registeredCommands = plugin.pluginData.messageCommands.getAll();
    for (const registeredCommand of registeredCommands) {
      for (const trigger of registeredCommand.originalTriggers) {
        const strTrigger = typeof trigger === "string" ? trigger : trigger.source;

        if (strTrigger.startsWith(searchStr)) {
          matchingCommands.push({
            plugin,
            command: registeredCommand,
          });
          break;
        }
      }
    }
  }

  const totalResults = matchingCommands.length;
  if (totalResults === 0) {
    await sendContextResponse(context, "No matching commands found!", false);
    return;
  }

  const limitedResults = matchingCommands.slice(0, 3);
  const commandSnippets = limitedResults.map(({ plugin, command }) => {
    const prefix: string = command.originalPrefix
      ? typeof command.originalPrefix === "string"
        ? command.originalPrefix
        : command.originalPrefix.source
      : "";

    const originalTrigger = command.originalTriggers[0];
    const trigger: string = originalTrigger
      ? typeof originalTrigger === "string"
        ? originalTrigger
        : originalTrigger.source
      : "";

    const description = command.config!.extra!.blueprint.description;
    const usage = command.config!.extra!.blueprint.usage;
    const commandSlug = trigger.trim().toLowerCase().replace(/\s/g, "-");

    let snippet = `**${prefix}${trigger}**`;
    if (description) snippet += `\n${description}`;
    if (usage) snippet += `\nBasic usage: \`${usage}\``;
    snippet += `\n<${env.DASHBOARD_URL}/docs/plugins/${plugin.blueprint.name}/usage#command-${commandSlug}>`;

    return snippet;
  });

  let message =
    totalResults !== limitedResults.length
      ? `Results (${totalResults} total, showing first ${limitedResults.length}):\n\n`
      : "";

  message += commandSnippets.join("\n\n");

  const chunks = chunkMessageLines(message);
  for (const chunk of chunks) {
    await sendContextResponse(context, chunk, false);
  }
}

export const HelpCmd = utilityCmd({
  trigger: "help",
  description: "Show a quick reference for the specified command's usage",
  usage: "!help clean",
  permission: "can_help",

  signature: {
    command: ct.string({ catchAll: true }),
  },

  async run({ message, args, pluginData }) {
    await runHelpCommand(pluginData, message, args.command);
  },
});

export const HelpSlashCmd = utilitySlashCmd({
  name: "help",
  description: "Show a quick reference for a command's usage",
  configPermission: "can_help",
  allowDms: false,

  signature: [slashOptions.string({ name: "command", description: "Command name", required: true })],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: false });
    await runHelpCommand(pluginData, interaction, options.command);
  },
});

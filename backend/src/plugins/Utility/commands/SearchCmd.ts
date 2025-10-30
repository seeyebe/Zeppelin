import { slashOptions } from "knub";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { archiveSearch, displaySearch, SearchType } from "../search.js";
import { utilityCmd, utilitySlashCmd } from "../types.js";

// Separate from SearchCmd to avoid a circular reference from ./search.ts
export const searchCmdSignature = {
  query: ct.string({ catchAll: true, required: false }),

  page: ct.number({ option: true, shortcut: "p" }),
  role: ct.string({ option: true, shortcut: "r" }),
  voice: ct.switchOption({ def: false, shortcut: "v" }),
  bot: ct.switchOption({ def: false, shortcut: "b" }),
  sort: ct.string({ option: true }),
  "case-sensitive": ct.switchOption({ def: false, shortcut: "cs" }),
  export: ct.switchOption({ def: false, shortcut: "e" }),
  ids: ct.switchOption(),
  regex: ct.switchOption({ def: false, shortcut: "re" }),
  // "status-search": ct.switchOption({ def: false, shortcut: "ss" }),
};

export const SearchCmd = utilityCmd({
  trigger: ["search", "s"],
  description: "Search server members",
  usage: "!search dragory",
  permission: "can_search",

  signature: searchCmdSignature,

  run({ pluginData, message, args }) {
    if (args.export) {
      return archiveSearch(pluginData, args, SearchType.MemberSearch, message);
    } else {
      return displaySearch(pluginData, args, SearchType.MemberSearch, message);
    }
  },
});

export const SearchSlashCmd = utilitySlashCmd({
  name: "search",
  description: "Search server members",
  configPermission: "can_search",
  allowDms: false,

  signature: [
    slashOptions.string({ name: "query", description: "Search query", required: false }),
    slashOptions.number({ name: "page", description: "Page number", required: false }),
    slashOptions.string({ name: "role", description: "Required role IDs (comma separated)", required: false }),
    slashOptions.boolean({ name: "voice", description: "Only members in voice", required: false }),
    slashOptions.boolean({ name: "bot", description: "Only bots", required: false }),
    slashOptions.string({ name: "sort", description: "Sort field", required: false }),
    slashOptions.boolean({ name: "case-sensitive", description: "Match case", required: false }),
    slashOptions.boolean({ name: "export", description: "Export results", required: false }),
    slashOptions.boolean({ name: "ids", description: "List IDs only", required: false }),
    slashOptions.boolean({ name: "regex", description: "Treat query as regex", required: false }),
  ],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: false });

    const args = {
      query: options.query ?? undefined,
      page: options.page ?? undefined,
      role: options.role ?? undefined,
      voice: options.voice ?? false,
      bot: options.bot ?? false,
      sort: options.sort ?? undefined,
      "case-sensitive": options["case-sensitive"] ?? false,
      export: options.export ?? false,
      ids: options.ids ?? false,
      regex: options.regex ?? false,
    } as any;

    if (args.export) {
      await archiveSearch(pluginData, args, SearchType.MemberSearch, interaction);
    } else {
      await displaySearch(pluginData, args, SearchType.MemberSearch, interaction);
    }
  },
});

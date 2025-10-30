import { slashOptions } from "knub";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { archiveSearch, displaySearch, SearchType } from "../search.js";
import { utilityCmd, utilitySlashCmd } from "../types.js";

// Separate from BanSearchCmd to avoid a circular reference from ./search.ts
export const banSearchSignature = {
  query: ct.string({ catchAll: true }),

  page: ct.number({ option: true, shortcut: "p" }),
  sort: ct.string({ option: true }),
  "case-sensitive": ct.switchOption({ def: false, shortcut: "cs" }),
  export: ct.switchOption({ def: false, shortcut: "e" }),
  ids: ct.switchOption(),
  regex: ct.switchOption({ def: false, shortcut: "re" }),
};

export const BanSearchCmd = utilityCmd({
  trigger: ["bansearch", "bs"],
  description: "Search banned users",
  usage: "!bansearch dragory",
  permission: "can_search",

  signature: banSearchSignature,

  run({ pluginData, message, args }) {
    if (args.export) {
      return archiveSearch(pluginData, args, SearchType.BanSearch, message);
    } else {
      return displaySearch(pluginData, args, SearchType.BanSearch, message);
    }
  },
});

export const BanSearchSlashCmd = utilitySlashCmd({
  name: "bansearch",
  description: "Search banned users",
  configPermission: "can_search",
  allowDms: false,

  signature: [
    slashOptions.string({ name: "query", description: "Search query", required: false }),
    slashOptions.number({ name: "page", description: "Page number", required: false }),
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
      sort: options.sort ?? undefined,
      "case-sensitive": options["case-sensitive"] ?? false,
      export: options.export ?? false,
      ids: options.ids ?? false,
      regex: options.regex ?? false,
    } as any;

    if (args.export) {
      await archiveSearch(pluginData, args, SearchType.BanSearch, interaction);
    } else {
      await displaySearch(pluginData, args, SearchType.BanSearch, interaction);
    }
  },
});

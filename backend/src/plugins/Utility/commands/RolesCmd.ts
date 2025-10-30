import { Role } from "discord.js";
import { slashOptions } from "knub";
import { GenericCommandSource, sendContextResponse } from "../../../pluginUtils.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { chunkArray, sorter, trimLines } from "../../../utils.js";
import { refreshMembersIfNeeded } from "../refreshMembers.js";
import { utilityCmd, utilitySlashCmd } from "../types.js";

interface RolesCommandOptions {
  search?: string | null;
  counts?: boolean;
  sort?: string | null;
}

async function runRolesCommand(pluginData, context: GenericCommandSource, options: RolesCommandOptions) {
  const guild = pluginData.guild;

  let roles: Role[] = Array.from(guild.roles.cache.values());
  let sort = options.sort ?? undefined;

  if (options.search) {
    const searchStr = options.search.toLowerCase();
    roles = roles.filter((r) => r.name.toLowerCase().includes(searchStr) || r.id === searchStr);
  }

  let roleCounts: Map<string, number> | null = null;
  if (options.counts) {
    await refreshMembersIfNeeded(guild);

    roleCounts = new Map<string, number>(guild.roles.cache.map((r) => [r.id, 0]));

    for (const member of guild.members.cache.values()) {
      for (const id of member.roles.cache.keys()) {
        roleCounts.set(id, (roleCounts.get(id) ?? 0) + 1);
      }
    }

    roleCounts.set(guild.id, guild.memberCount);

    if (!sort) sort = "-memberCount";
  }

  if (!sort) sort = "name";

  let sortDir: "ASC" | "DESC" = "ASC";
  if (sort[0] === "-") {
    sort = sort.slice(1);
    sortDir = "DESC";
  }

  if (sort === "position" || sort === "order") {
    roles.sort(sorter("position", sortDir));
  } else if (sort === "memberCount" && options.counts) {
    roles.sort((first, second) => roleCounts!.get(second.id)! - roleCounts!.get(first.id)!);
  } else if (sort === "name") {
    roles.sort(sorter((r) => r.name.toLowerCase(), sortDir));
  } else {
    await pluginData.state.common.sendErrorMessage(context, "Unknown sorting method");
    return;
  }

  const longestId = roles.reduce((longest, role) => Math.max(longest, role.id.length), 0);

  const chunks = chunkArray(roles, 20);
  for (const [i, chunk] of chunks.entries()) {
    const roleLines = chunk.map((role) => {
      const paddedId = role.id.padEnd(longestId, " ");
      let line = `${paddedId} ${role.name}`;
      const memberCount = roleCounts?.get(role.id);
      if (memberCount !== undefined) {
        line += ` (${memberCount} ${memberCount === 1 ? "member" : "members"})`;
      }
      return line;
    });

    const codeBlock = "```py\n" + roleLines.join("\n") + "```";
    if (i === 0) {
      await sendContextResponse(
        context,
        trimLines(`
          ${(options.search ? "Total roles found" : "Total roles")}: ${roles.length}
          ${codeBlock}
        `),
        false,
      );
    } else {
      await sendContextResponse(context, codeBlock, false);
    }
  }
}

export const RolesCmd = utilityCmd({
  trigger: "roles",
  description: "List all roles or roles matching a search",
  usage: "!roles mod",
  permission: "can_roles",

  signature: {
    search: ct.string({ required: false, catchAll: true }),

    counts: ct.switchOption(),
    sort: ct.string({ option: true }),
  },

  async run({ message: msg, args, pluginData }) {
    await runRolesCommand(pluginData, msg, {
      search: args.search ?? null,
      counts: Boolean(args.counts),
      sort: args.sort ?? null,
    });
  },
});

export const RolesSlashCmd = utilitySlashCmd({
  name: "roles",
  description: "List all roles or roles matching a search",
  configPermission: "can_roles",
  allowDms: false,

  signature: [
    slashOptions.string({ name: "search", description: "Search query", required: false }),
    slashOptions.boolean({ name: "counts", description: "Include member counts", required: false }),
    slashOptions.string({ name: "sort", description: "Sort method", required: false }),
  ],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: false });
    await runRolesCommand(pluginData, interaction, {
      search: options.search ?? null,
      counts: options.counts ?? false,
      sort: options.sort ?? null,
    });
  },
});

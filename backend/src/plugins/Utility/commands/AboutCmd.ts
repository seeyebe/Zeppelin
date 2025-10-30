import { APIEmbed } from "discord.js";
import LCL from "last-commit-log";
import shuffle from "lodash/shuffle.js";
import moment from "moment-timezone";
import { GenericCommandSource, sendContextResponse } from "../../../pluginUtils.js";
import { humanizeDuration } from "../../../humanizeDuration.js";
import { rootDir } from "../../../paths.js";
import { getCurrentUptime } from "../../../uptime.js";
import { resolveMember, sorter } from "../../../utils.js";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin.js";
import { utilityCmd, utilitySlashCmd } from "../types.js";

async function runAboutCommand(pluginData, context: GenericCommandSource) {
  const timeAndDate = pluginData.getPlugin(TimeAndDatePlugin);

  const uptime = getCurrentUptime();
  const prettyUptime = humanizeDuration(uptime, { largest: 2, round: true });

  let lastCommit;

  try {
    const lcl = new LCL(rootDir);
    lastCommit = await lcl.getLastCommit();
  } catch {} // eslint-disable-line no-empty

  let lastUpdate;
  let version;

  if (lastCommit) {
    lastUpdate = timeAndDate
      .inGuildTz(moment.utc(lastCommit.committer.date, "X"))
      .format(pluginData.getPlugin(TimeAndDatePlugin).getDateFormat("pretty_datetime"));
    version = lastCommit.shortHash;
  } else {
    lastUpdate = "?";
    version = "?";
  }

  const lastReload = humanizeDuration(Date.now() - pluginData.state.lastReload, {
    largest: 2,
    round: true,
  });

  const basicInfoRows = [
    ["Uptime", prettyUptime],
    ["Last config reload", `${lastReload} ago`],
    ["Last bot update", lastUpdate],
    ["Version", version],
    ["API latency", `${pluginData.client.ws.ping}ms`],
    ["Server timezone", timeAndDate.getGuildTz()],
  ];

  const loadedPlugins = Array.from(pluginData.getKnubInstance().getLoadedGuild(pluginData.guild.id)!.loadedPlugins.keys());
  loadedPlugins.sort();

  const aboutEmbed: APIEmbed = {
    title: `About ${pluginData.client.user!.username}`,
    fields: [
      {
        name: "Status",
        value: basicInfoRows.map(([label, value]) => `${label}: **${value}**`).join("\n"),
      },
      {
        name: `Loaded plugins on this server (${loadedPlugins.length})`,
        value: loadedPlugins.join(", "),
      },
    ],
  };

  const supporters = await pluginData.state.supporters.getAll();
  const shuffledSupporters = shuffle(supporters);

  if (supporters.length) {
    const formattedSupporters = shuffledSupporters
      .map((s, i) => (i % 2 === 0 ? `**${s.name}**` : `__${s.name}__`))
      .join(" ");

    aboutEmbed.fields!.push({
      name: "Zeppelin supporters 🎉",
      value: "These amazing people have supported Zeppelin development:\n\n" + formattedSupporters,
      inline: false,
    });
  }

  const botMember = await resolveMember(pluginData.client, pluginData.guild, pluginData.client.user!.id);
  let botRoles = botMember?.roles.cache.map((r) => pluginData.guild.roles.cache.get(r.id)!) || [];
  botRoles = botRoles.filter((r) => !!r);
  botRoles = botRoles.filter((r) => r.color);
  botRoles.sort(sorter("position", "DESC"));
  if (botRoles.length) {
    aboutEmbed.color = botRoles[0].color;
  }

  if (pluginData.client.user!.displayAvatarURL()) {
    aboutEmbed.thumbnail = { url: pluginData.client.user!.displayAvatarURL()! };
  }

  await sendContextResponse(context, { embeds: [aboutEmbed] }, false);
}

export const AboutCmd = utilityCmd({
  trigger: "about",
  description: "Show information about Zeppelin's status on the server",
  permission: "can_about",

  async run({ message: msg, pluginData }) {
    await runAboutCommand(pluginData, msg);
  },
});

export const AboutSlashCmd = utilitySlashCmd({
  name: "about",
  description: "Show information about Zeppelin's status on the server",
  configPermission: "can_about",
  allowDms: false,

  signature: [],

  async run({ interaction, pluginData }) {
    await interaction.deferReply({ ephemeral: false });
    await runAboutCommand(pluginData, interaction);
  },
});

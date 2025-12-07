import express, { Request, Response } from "express";
import moment from "moment-timezone";
import { Configs } from "../data/Configs.js";
import { GuildArchives } from "../data/GuildArchives.js";
import { defaultDateFormats } from "../plugins/TimeAndDate/defaultDateFormats.js";
import { zTimeAndDateConfig } from "../plugins/TimeAndDate/types.js";
import { zZeppelinGuildConfig } from "../types.js";
import { loadYamlSafely } from "../utils/loadYamlSafely.js";
import { notFound } from "./responses.js";

const defaultTimeAndDateConfig = zTimeAndDateConfig.parse({});
function getDefaultTimeAndDateSettings() {
  return {
    timezone: defaultTimeAndDateConfig.timezone,
    dateFormats: { ...defaultTimeAndDateConfig.date_formats },
  };
}

async function getTimeAndDateSettingsForGuild(guildId: string, configs: Configs) {
  try {
    const configEntry = await configs.getActiveByKey(`guild-${guildId}`);
    if (!configEntry?.config) {
      return getDefaultTimeAndDateSettings();
    }

    const parsedConfig = loadYamlSafely(configEntry.config);
    const guildConfig = zZeppelinGuildConfig.safeParse(parsedConfig);
    if (!guildConfig.success) {
      return getDefaultTimeAndDateSettings();
    }

    const pluginOptions = guildConfig.data.plugins?.time_and_date;
    if (!pluginOptions || typeof pluginOptions !== "object") {
      return getDefaultTimeAndDateSettings();
    }

    const basePluginConfig =
      typeof (pluginOptions as any).config === "object" ? (pluginOptions as any).config : pluginOptions;
    const pluginConfig = zTimeAndDateConfig.safeParse(basePluginConfig ?? {});
    if (!pluginConfig.success) {
      return getDefaultTimeAndDateSettings();
    }

    return {
      timezone: pluginConfig.data.timezone,
      dateFormats: pluginConfig.data.date_formats,
    };
  } catch {
    return getDefaultTimeAndDateSettings();
  }
}

export function initArchives(router: express.Router) {
  const archives = new GuildArchives(null);
  const configs = new Configs();

  // Legacy redirect
  router.get("/spam-logs/:id", (req: Request, res: Response) => {
    res.redirect("/archives/" + req.params.id);
  });

  router.get("/archives/:id", async (req: Request, res: Response) => {
    const archive = await archives.find(req.params.id);
    if (!archive) return notFound(res);

    let body = archive.body;

    // Add some metadata at the end of the log file (but only if it doesn't already have it directly in the body)
    if (archive.body.indexOf("Log file generated on") === -1) {
      const timeAndDate = await getTimeAndDateSettingsForGuild(archive.guild_id, configs);
      const prettyDatetimeFormat =
        timeAndDate.dateFormats.pretty_datetime ?? defaultDateFormats.pretty_datetime;

      const createdAt = moment.utc(archive.created_at).tz(timeAndDate.timezone).format(prettyDatetimeFormat);
      body += `\n\nLog file generated on ${createdAt}`;

      if (archive.expires_at !== null) {
        const expiresAt = moment.utc(archive.expires_at).tz(timeAndDate.timezone).format(prettyDatetimeFormat);
        body += `\nExpires at ${expiresAt}`;
      }
    }

    res.setHeader("Content-Type", "text/plain; charset=UTF-8");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.end(body);
  });
}

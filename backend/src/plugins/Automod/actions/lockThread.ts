import { AnyThreadChannel } from "discord.js";
import { z } from "zod";
import { noop } from "../../../utils.js";
import { automodAction } from "../helpers.js";

const configSchema = z.strictObject({});

export const LockThreadAction = automodAction({
  configSchema,

  async apply({ pluginData, contexts }) {
    const threads = new Set<AnyThreadChannel>();

    for (const context of contexts) {
      if (context.message?.channel_id) {
        const channel = pluginData.guild.channels.cache.get(context.message.channel_id);
        if (channel?.isThread()) {
          threads.add(channel as AnyThreadChannel);
        }
      }

      if (context.channel?.isThread()) {
        threads.add(context.channel as AnyThreadChannel);
      }

      const threadChange = context.threadChange;
      if (threadChange) {
        for (const thread of Object.values(threadChange)) {
          if (thread?.isThread()) {
            threads.add(thread as AnyThreadChannel);
          }
        }
      }
    }

    for (const thread of threads) {
      await thread.setLocked(true).catch(noop);
    }
  },
});

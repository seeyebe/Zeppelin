import { CommandInteraction, Message } from "discord.js";
import { performance } from "perf_hooks";
import { GenericCommandSource, getContextChannel, sendContextResponse } from "../../../pluginUtils.js";
import { noop, trimLines } from "../../../utils.js";
import { utilityCmd, utilitySlashCmd } from "../types.js";

async function runPingCommand(pluginData, context: GenericCommandSource) {
  const channel = await getContextChannel(context);
  if (!channel || !channel.isSendable()) {
    await pluginData.state.common.sendErrorMessage(context, "Channel is not accessible");
    return;
  }

  const times: number[] = [];
  const messages: Message[] = [];
  let msgToMsgDelay: number | undefined;

  const contextTimestamp = (context as Message | CommandInteraction).createdTimestamp;

  for (let i = 0; i < 4; i++) {
    const start = performance.now();
    const sentMessage = await channel.send(`Calculating ping... ${i + 1}`);
    times.push(performance.now() - start);
    messages.push(sentMessage);

    if (msgToMsgDelay === undefined) {
      msgToMsgDelay = sentMessage.createdTimestamp - contextTimestamp;
    }
  }

  const highest = Math.round(Math.max(...times));
  const lowest = Math.round(Math.min(...times));
  const mean = Math.round(times.reduce((total, ms) => total + ms, 0) / times.length);

  await sendContextResponse(
    context,
    trimLines(`
      **Ping:**
      Lowest: **${lowest}ms**
      Highest: **${highest}ms**
      Mean: **${mean}ms**
      Time between ping command and first reply: **${msgToMsgDelay!}ms**
      Shard latency: **${pluginData.client.ws.ping}ms**
    `),
    false,
  );

  await Promise.all(messages.map((m) => m.delete().catch(noop)));
}

export const PingCmd = utilityCmd({
  trigger: ["ping", "pong"],
  description: "Test the bot's ping to the Discord API",
  permission: "can_ping",

  async run({ message: msg, pluginData }) {
    await runPingCommand(pluginData, msg);
  },
});

export const PingSlashCmd = utilitySlashCmd({
  name: "ping",
  description: "Test the bot's ping to the Discord API",
  configPermission: "can_ping",
  allowDms: false,

  signature: [],

  async run({ interaction, pluginData }) {
    await interaction.deferReply({ ephemeral: false });
    await runPingCommand(pluginData, interaction);
  },
});

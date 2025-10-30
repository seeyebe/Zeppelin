import photon from "@silvia-odwyer/photon-node";
import { AttachmentBuilder } from "discord.js";
import { slashOptions } from "knub";
import { GenericCommandSource, sendContextResponse } from "../../../pluginUtils.js";
import fs from "fs";
import twemoji from "twemoji";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { downloadFile, isEmoji, SECONDS } from "../../../utils.js";
import { utilityCmd, utilitySlashCmd } from "../types.js";

const fsp = fs.promises;

async function getBufferFromUrl(url: string): Promise<Buffer> {
  const downloadedEmoji = await downloadFile(url);
  return fsp.readFile(downloadedEmoji.path);
}

function bufferToPhotonImage(input: Buffer): photon.PhotonImage {
  const base64 = input.toString("base64").replace(/^data:image\/\w+;base64,/, "");

  return photon.PhotonImage.new_from_base64(base64);
}

function photonImageToBuffer(image: photon.PhotonImage): Buffer {
  const base64 = image.get_base64().replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(base64, "base64");
}

function resizeBuffer(input: Buffer, width: number, height: number): Buffer {
  const photonImage = bufferToPhotonImage(input);
  photon.resize(photonImage, width, height, photon.SamplingFilter.Lanczos3);
  return photonImageToBuffer(photonImage);
}

async function runJumboCommand(pluginData, context: GenericCommandSource, emojiInput: string) {
  const config = pluginData.config.get();
  const size = config.jumbo_size > 2048 ? 2048 : config.jumbo_size;
  const emojiRegex = new RegExp(`(<.*:).*:(\\d+)`);
  const results = emojiRegex.exec(emojiInput);
  let extension = ".png";
  let file: AttachmentBuilder | undefined;

  if (!isEmoji(emojiInput)) {
    await pluginData.state.common.sendErrorMessage(context, "Invalid emoji");
    return;
  }

  if (results) {
    let url = "https://cdn.discordapp.com/emojis/";
    if (results[1] === "<a:") {
      extension = ".gif";
    }
    url += `${results[2]}${extension}`;
    if (extension === ".png") {
      const image = resizeBuffer(await getBufferFromUrl(url), size, size);
      file = new AttachmentBuilder(image, { name: `emoji${extension}` });
    } else {
      const image = await getBufferFromUrl(url);
      file = new AttachmentBuilder(image, { name: `emoji${extension}` });
    }
  } else {
    let url = `${twemoji.base}${twemoji.size}/${twemoji.convert.toCodePoint(emojiInput)}${twemoji.ext}`;
    let image: Buffer | undefined;
    try {
      const downloadedBuffer = await getBufferFromUrl(url);
      image = resizeBuffer(downloadedBuffer, size, size);
    } catch (err) {
      if (url.toLocaleLowerCase().endsWith("fe0f.png")) {
        url = url.slice(0, url.lastIndexOf("-fe0f")) + ".png";
        try {
          image = resizeBuffer(await getBufferFromUrl(url), size, size);
        } catch {
          // It's fine if this fails, we just don't jumbo then.
        }
      }
    }
    if (!image) {
      await pluginData.state.common.sendErrorMessage(context, "Error occurred while jumboing default emoji");
      return;
    }

    file = new AttachmentBuilder(image, { name: "emoji.png" });
  }

  await sendContextResponse(context, { files: [file!] }, false);
}

export const JumboCmd = utilityCmd({
  trigger: "jumbo",
  description: "Makes an emoji jumbo",
  permission: "can_jumbo",
  cooldown: 5 * SECONDS,

  signature: {
    emoji: ct.string(),
  },

  async run({ message: msg, args, pluginData }) {
    await runJumboCommand(pluginData, msg, args.emoji);
  },
});

export const JumboSlashCmd = utilitySlashCmd({
  name: "jumbo",
  description: "Makes an emoji jumbo",
  configPermission: "can_jumbo",
  allowDms: false,

  signature: [slashOptions.string({ name: "emoji", description: "Emoji to enlarge", required: true })],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: false });
    await runJumboCommand(pluginData, interaction, options.emoji);
  },
});

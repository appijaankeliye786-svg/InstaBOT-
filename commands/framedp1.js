const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const Jimp = require("jimp");

module.exports.config = {
  name: "framedp1",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Miss Aliya 💫",
  description: "Create a display picture with frame",
  commandCategory: "Love",
  usages: "[reply to image or photo attachment]",
  cooldowns: 2
};

const cacheDir = path.join(__dirname, "cache", "canvas");
const templatePath = path.join(cacheDir, "framedp1_template.png");

// Global template cache to avoid repeated downloading
let loadedTemplate = null;

async function getTemplate() {
  if (loadedTemplate) return loadedTemplate;
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  if (!fs.existsSync(templatePath)) {
    const templateUrls = [
      "https://i.ibb.co/jP5RT6mh/59231906c30e.jpg",
      "https://i.ibb.co/LX3qWqB3/da0dde329b3c.jpg",
      "https://i.imgur.com/Gc3Hs2Q.png"
    ];

    for (const url of templateUrls) {
      try {
        const response = await axios.get(url, { responseType: "arraybuffer", timeout: 8000 });
        if (response.status === 200) {
          fs.writeFileSync(templatePath, Buffer.from(response.data));
          break;
        }
      } catch (e) {
        continue;
      }
    }
    if (!fs.existsSync(templatePath)) {
      const fallback = await Jimp.create(800, 800, 0xff69b4);
      await fallback.writeAsync(templatePath);
    }
  }

  loadedTemplate = await Jimp.read(templatePath);
  return loadedTemplate;
}

module.exports.run = async function ({ api, event }) {
  const threadID = event.threadID || event.chat_id || event.from || event.thread_id;
  const messageID = event.messageID || event.message_id || event.mid;

  function getImgUrl(ev) {
    if (ev.reply_to_message?.attachments?.[0]?.url) return ev.reply_to_message.attachments[0].url;
    if (ev.reply_to_message?.photo?.[0]?.url) return ev.reply_to_message.photo[0].url;
    if (ev.messageReply?.attachments?.[0]?.url) return ev.messageReply.attachments[0].url;
    if (ev.attachments?.[0]?.url) return ev.attachments[0].url;
    if (ev.photo?.[0]?.url) return ev.photo[0].url;
    return null;
  }

  try {
    const baseTemplate = await getTemplate();
    const template = baseTemplate.clone(); // Clone for fast speed

    const imgUrl = getImgUrl(event);
    let userImage;

    if (imgUrl) {
      const res = await axios.get(imgUrl, { responseType: "arraybuffer", timeout: 8000 });
      userImage = await Jimp.read(Buffer.from(res.data));
    } else {
      userImage = await Jimp.create(230, 310, 0xffc0cb);
    }

    userImage.resize(230, 310);
    template.composite(userImage, 210, 93);

    const outputPath = path.join(cacheDir, `framedp1_${Date.now()}.png`);
    await template.writeAsync(outputPath);

    const msgText = `✨ 𝐌𝐢𝐬𝐬 𝐀𝐥𝐢𝐲𝐚 ✨\n\n💕 𝐘𝐨𝐮𝐫 𝐅𝐫𝐚𝐦𝐞 𝐃𝐏 𝐢𝐬 𝐫𝐞𝐚𝐝𝐲!`;

    // Passing array of path [outputPath] fixes path string error & sends image
    if (api && typeof api.sendMessage === "function") {
      await api.sendMessage(
        {
          body: msgText,
          attachment: fs.existsSync(outputPath) ? [outputPath] : []
        },
        threadID,
        () => {
          setTimeout(() => {
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
          }, 3000);
        },
        messageID
      );
    }

  } catch (error) {
    console.error("framedp1 error:", error);
    if (api && typeof api.sendMessage === "function") {
      api.sendMessage("❌ Error creating DP: " + error.message, threadID, messageID);
    }
  }
};

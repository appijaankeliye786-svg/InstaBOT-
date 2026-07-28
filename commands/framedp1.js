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
  cooldowns: 5
};

module.exports.run = async function ({ api, event }) {
  const threadID = event.threadID || event.chat_id || event.from || event.thread_id;
  const messageID = event.messageID || event.message_id || event.mid;

  const cacheDir = path.join(__dirname, "cache", "canvas");
  const templatePath = path.join(cacheDir, "framedp1_template.png");

  const templateUrls = [
    "https://i.ibb.co/jP5RT6mh/59231906c30e.jpg",
    "https://i.ibb.co/LX3qWqB3/da0dde329b3c.jpg",
    "https://i.imgur.com/Gc3Hs2Q.png"
  ];

  async function downloadTemplate() {
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    if (fs.existsSync(templatePath)) return true;

    for (const url of templateUrls) {
      try {
        const response = await axios.get(url, { 
          responseType: "arraybuffer", 
          timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (response.status === 200) {
          fs.writeFileSync(templatePath, Buffer.from(response.data));
          return true;
        }
      } catch (e) {
        continue;
      }
    }

    const fallback = await Jimp.create(800, 800, 0xff69b4);
    await fallback.writeAsync(templatePath);
    return true;
  }

  function getImgUrl(ev) {
    if (ev.reply_to_message?.attachments?.[0]?.url) return ev.reply_to_message.attachments[0].url;
    if (ev.reply_to_message?.photo?.[0]?.url) return ev.reply_to_message.photo[0].url;
    if (ev.messageReply?.attachments?.[0]?.url) return ev.messageReply.attachments[0].url;
    if (ev.attachments?.[0]?.url) return ev.attachments[0].url;
    if (ev.photo?.[0]?.url) return ev.photo[0].url;
    return null;
  }

  try {
    await downloadTemplate();

    const imgUrl = getImgUrl(event);
    let imageBuffer = null;

    if (imgUrl) {
      const res = await axios.get(imgUrl, { responseType: "arraybuffer", timeout: 10000 });
      imageBuffer = Buffer.from(res.data);
    } else {
      const img = await Jimp.create(230, 310, 0xffc0cb);
      imageBuffer = await img.getBufferAsync(Jimp.MIME_PNG);
    }

    const userImage = await Jimp.read(imageBuffer);
    userImage.resize(230, 310);

    const template = await Jimp.read(templatePath);
    
    const posX = 210;
    const posY = 93;
    
    template.composite(userImage, posX, posY);

    const outputPath = path.join(cacheDir, `framedp1_${Date.now()}.png`);
    await template.writeAsync(outputPath);

    const msgText = `✨ 𝐌𝐢𝐬𝐬 𝐀𝐥𝐢𝐲𝐚 ✨\n\n💕 𝐘𝐨𝐮𝐫 𝐅𝐫𝐚𝐦𝐞 𝐃𝐏 𝐢𝐬 𝐫𝐞𝐚𝐝𝐲!`;

    // Fix: Send direct String file path array/string instead of ReadStream
    if (api && typeof api.sendMessage === "function") {
      await api.sendMessage(
        {
          body: msgText,
          attachment: outputPath // Direct string path
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

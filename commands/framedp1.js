const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const Jimp = require("jimp");

module.exports.config = {
  name: "framedp1",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Miss Aliya 💫",
  description: "Create a display picture with profile pic",
  commandCategory: "Love",
  usages: "[@mention or reply to image]",
  cooldowns: 5
};

module.exports.run = async ({ api, event }) => {
  const threadID = event.threadID || event.chat_id || event.from;
  const cacheDir = path.join(__dirname, "cache", "canvas");
  const templatePath = path.join(cacheDir, "framedp1_template.png");

  const templateUrls = [
    "https://i.ibb.co/jP5RT6mh/59231906c30e.jpg",
    "https://i.ibb.co/LX3qWqB3/da0dde329b3c.jpg",
    "https://i.imgur.com/Gc3Hs2Q.png",
    "https://i.imgur.com/q9ZzTkR.png"
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

  try {
    await downloadTemplate();

    let imageBuffer = null;

    if (event.reply_to_message && event.reply_to_message.attachments && event.reply_to_message.attachments[0]) {
      const url = event.reply_to_message.attachments[0].url;
      const res = await axios.get(url, { responseType: "arraybuffer" });
      imageBuffer = Buffer.from(res.data);
    } else if (event.attachments && event.attachments[0]) {
      const url = event.attachments[0].url;
      const res = await axios.get(url, { responseType: "arraybuffer" });
      imageBuffer = Buffer.from(res.data);
    }

    if (!imageBuffer) {
      const img = await Jimp.create(230, 310, 0x808080);
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

    if (api.sendAttachment) {
      await api.sendAttachment(threadID, outputPath, msgText);
    } else if (api.sendMessage) {
      await api.sendMessage(threadID, {
        body: msgText,
        attachment: fs.createReadStream(outputPath)
      });
    }

    setTimeout(() => {
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }, 5000);

  } catch (error) {
    console.error("framedp1 error:", error);
    if (api.sendMessage) {
      api.sendMessage(threadID, "❌ Error creating DP: " + error.message);
    }
  }
};

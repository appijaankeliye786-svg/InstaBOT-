const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const Jimp = require("jimp");

module.exports = {
  name: "framedp1",
  version: "1.0.0",
  description: "Create a display picture with profile pic (Instagram Version)",
  usage: "Reply to an image with /framedp1",
  cooldown: 5,

  async execute(client, message, args) {
    try {
      // Check if replying to an image
      if (!message.quoted) {
        return message.reply("❌ Please reply to an image with /framedp1");
      }

      // Check if quoted message has image
      const quotedMessage = message.quoted;
      let imageBuffer = null;
      
      // Handle different image sources for Instagram
      if (quotedMessage.image) {
        try {
          // Download the image from Instagram
          const imageUrl = await client.getMediaUrl(quotedMessage.image, {
            type: 'image'
          });
          
          const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 10000
          });
          imageBuffer = Buffer.from(response.data);
        } catch (error) {
          console.error("Error downloading image:", error);
          return message.reply("❌ Failed to download the image");
        }
      } else {
        return message.reply("❌ Please reply to an image message");
      }

      // Setup paths
      const cacheDir = path.join(__dirname, "cache", "canvas");
      const templatePath = path.join(cacheDir, "framedp1_template.png");
      const templateUrls = [
        "https://i.ibb.co/jP5RT6mh/59231906c30e.jpg",
        "https://i.ibb.co/LX3qWqB3/da0dde329b3c.jpg",
        "https://i.imgur.com/Gc3Hs2Q.png",
        "https://i.imgur.com/q9ZzTkR.png"
      ];

      // Create cache directory if it doesn't exist
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      // Download template if not exists
      if (!fs.existsSync(templatePath)) {
        let templateDownloaded = false;
        for (const url of templateUrls) {
          try {
            const response = await axios.get(url, {
              responseType: "arraybuffer",
              timeout: 10000,
              headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            if (response.status === 200) {
              fs.writeFileSync(templatePath, Buffer.from(response.data));
              templateDownloaded = true;
              break;
            }
          } catch (err) {
            continue;
          }
        }

        if (!templateDownloaded) {
          // Create fallback template
          const fallbackImage = await Jimp.create(800, 800, 0xff69b4);
          await fallbackImage.writeAsync(templatePath);
        }
      }

      // Process the image
      const imgWidth = 230;
      const imgHeight = 310;
      
      // Resize user image
      let userImage;
      try {
        userImage = await Jimp.read(imageBuffer);
        userImage.resize(imgWidth, imgHeight);
      } catch (error) {
        console.error("Error resizing image:", error);
        userImage = await Jimp.create(imgWidth, imgHeight, 0xff69b4);
      }

      // Load template
      let template;
      try {
        template = await Jimp.read(templatePath);
      } catch (error) {
        template = await Jimp.create(800, 800, 0xff69b4);
      }

      // Composite image at specific position
      const posX = 210;
      const posY = 93;
      template.composite(userImage, posX, posY);

      // Save output
      const outputPath = path.join(cacheDir, `framedp1_${message.from}_${Date.now()}.png`);
      await template.writeAsync(outputPath);

      // Send the image to Instagram
      await client.sendImage(
        message.from,
        outputPath,
        `✨ Your Frame DP is ready!`
      );

      // Cleanup
      try {
        fs.unlinkSync(outputPath);
      } catch (e) {}

    } catch (error) {
      console.error("framedp1 command error:", error);
      return message.reply("❌ Error creating DP! Please try again later.");
    }
  }
};

const { IgApiClient } = require('@neoaz07/nkxica');
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

  async execute({ client, message, args }) {
    try {
      // Check if replying to an image
      if (!message.quoted) {
        return message.reply("❌ Please reply to an image with /framedp1");
      }

      // Check if quoted message has image
      const quotedMessage = message.quoted;
      let imageBuffer = null;
      
      // Handle image from Instagram using nkxica
      if (quotedMessage.image) {
        try {
          // Get image URL from the quoted message
          const imageUrl = quotedMessage.image.url || quotedMessage.image;
          
          // Download the image
          const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          imageBuffer = Buffer.from(response.data);
          
          console.log(`✅ Image downloaded: ${imageBuffer.length} bytes`);
        } catch (error) {
          console.error("Error downloading image:", error);
          return message.reply("❌ Failed to download the image. Please try again.");
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
        
        // Send status update
        await message.reply("⏳ Downloading template...");
        
        for (const url of templateUrls) {
          try {
            console.log(`Trying to download template from: ${url}`);
            const response = await axios.get(url, {
              responseType: "arraybuffer",
              timeout: 15000,
              headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
              }
            });
            
            if (response.status === 200) {
              fs.writeFileSync(templatePath, Buffer.from(response.data));
              console.log("✅ Template downloaded successfully!");
              templateDownloaded = true;
              break;
            }
          } catch (err) {
            console.log(`❌ Failed to download from ${url}:`, err.message);
            continue;
          }
        }

        if (!templateDownloaded) {
          console.log("Creating fallback template...");
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
        console.log("✅ Image resized successfully");
      } catch (error) {
        console.error("Error resizing image:", error);
        userImage = await Jimp.create(imgWidth, imgHeight, 0xff69b4);
      }

      // Load template
      let template;
      try {
        template = await Jimp.read(templatePath);
        console.log("✅ Template loaded successfully");
      } catch (error) {
        console.error("Error reading template:", error);
        template = await Jimp.create(800, 800, 0xff69b4);
      }

      // Composite image at specific position
      const posX = 210;
      const posY = 93;
      template.composite(userImage, posX, posY);

      // Save output
      const outputPath = path.join(cacheDir, `framedp1_${Date.now()}.png`);
      await template.writeAsync(outputPath);
      console.log("✅ Image saved:", outputPath);

      // Send status
      await message.reply("✨ Processing your frame DP...");

      // Send the image to Instagram using nkxica
      try {
        // For nkxica, we need to send as image buffer or file
        const imageFile = fs.readFileSync(outputPath);
        
        await client.sendImage(
          message.from,
          outputPath,
          `✨ Your Frame DP is ready!`
        );
        
        console.log("✅ Image sent successfully");
      } catch (sendError) {
        console.error("Error sending image:", sendError);
        
        // Alternative: Send as buffer
        try {
          const imageBuffer2 = fs.readFileSync(outputPath);
          await client.sendImage(
            message.from,
            imageBuffer2,
            `✨ Your Frame DP is ready!`
          );
        } catch (sendError2) {
          console.error("Both send methods failed:", sendError2);
          return message.reply("❌ Failed to send the image. Please try again.");
        }
      }

      // Cleanup
      try {
        fs.unlinkSync(outputPath);
        console.log("✅ Cleanup completed");
      } catch (e) {
        console.log("Cleanup error:", e.message);
      }

    } catch (error) {
      console.error("framedp1 command error:", error);
      return message.reply("❌ Error creating DP! " + error.message);
    }
  }
};

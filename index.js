const qrcode = require("qrcode");
const express = require("express");
const socketIo = require("socket.io");
const { Client, LocalAuth } = require("whatsapp-web.js");
const { EditPhotoHandler } = require("./feature/edit_foto");
const { Configuration, OpenAIApi } = require("openai");
const http = require("http");
const { response } = require("express");
const keynya = "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";
const configuration = new Configuration({
   apiKey: keynya,
});

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
   res.sendFile("index.html", { root: __dirname });
});
const client = new Client({
   puppeteer: {
      args: ["--no-sandbox"],
   },
   authStrategy: new LocalAuth(),
});

const openai = new OpenAIApi(configuration);

client.on("ready", () => {
   console.log("Client is ready!");
});

client.on("message", async (message) => {
   // const text = message.body.toLowerCase() || "";
   let chat = await message.getChat();
   let { from } = message;
   try {
      const body = message.body.toLowerCase();
      const prefix = /^[./~!#%^&=\,;:()]/.test(body) ? body.match(/^[./~!#%^&=\,;:()]/gi) : "#";
      const isCmd = body.startsWith(prefix);
      const args = body.trim().split(/ +/).slice(1);
      let contact = await message.getContact();
      await client.sendSeen(from);
      //if (Spamchat) {.... this is Premium features (contact owner)
      if (!chat.isGroup) {
         if (isCmd) {
            console.log(`[CMD] From (${contact.pushname}) ~> ${message.body}`);
         } else if (body.includes("edit_bg:")) {
            await EditPhotoHandler(body, message);
         } else if (body === "menu") {
            message.reply(`*Menu Command*
            1. Mengedit Background
            2. Kirim pertayaan ke AI
            3. Membuat Stiker
            4. Kirim Menfes
            \n\nKirim No dari menu Command untuk info lebih lanjut`);
         } else if (body.startsWith("stiker") && message.type === "image") {
            const media = await message.downloadMedia();
            client.sendMessage(from, media, {
               sendMediaAsSticker: true,
               stickerName: "Aldhi-Bot-WA",
               stickerAuthor: "Muhammad Aldhi",
            });
         } else if (body.includes("menfes:")) {
            const parse = body;
            const to = /\d+/g;
            const match = parse.match(to);
            const hasil = parseInt(match[0]);
            const text = message.body;
            const hasil1 = String(`+${hasil}`);
            const chatId = hasil1.substring(1) + "@c.us";
            console.log(chatId);
            client.sendMessage(chatId, text);
         } else if (body === "1") {
            message.reply("Kirimkan sebuah gambar dengan caption :\n*edit_bg:warna dengan bahasa inggris*");
         } else if (body === "2") {
            message.reply("kirim apapun pertanyaan dengan syarat lebih dari 1 kata/spasi diawali dengan *NANYA: isi dengan pertanyaan anda*");
         } else if (body === "3") {
            message.reply("Kirim gambar dan berikan caption *stiker*");
         } else if (body === "4") {
            message.reply("Kirimi sesuai yang ada di bawah ini\nmenfes:\nFrom : *NAMA BEBAS*\nTO : *NO TELP <+62>*\nMESSAGE : *PESAN*");
         } else if (body.includes("nanya:")) {
            if (args.length < 1) {
               message.reply("kirim pertanyaan yang lebih spesifik lagi");
            }
            const response = await openai.createCompletion({
               model: "text-davinci-003",
               prompt: body,
               temperature: 0,
               max_tokens: 1000,
               top_p: 1,
               frequency_penalty: 0.2,
               presence_penalty: 0,
            });
            const resultnya = response.data.choices[0].text;
            client.sendMessage(from, `Halo *${contact.pushname}*` + resultnya);
            // console.log(`[!] Message From (${contact.pushname}) ~> ${message.body}`);
         } else {
            message.reply("Kirim *MENU* untuk melihat list menu");
         }
      }
   } catch (err) {
      console.log(err);
   }
});

io.on("connection", function (socket) {
   socket.emit("message", "Connecting....");
   client.on("qr", (qr) => {
      qrcode.toDataURL(qr, (err, url) => {
         socket.emit("qr", url);
         socket.emit("message", "ready scan please");
      });
   });
   client.on("ready", () => {
      socket.emit("message", "wa bot is ready");
   });
});

// send message
app.post("/send-message", (req, res) => {
   const number = req.body.number;
   const message = req.body.message;

   client
      .sendMessage(number, message)
      .then((response) => {
         res.status(200).json({
            status: true,
            response: response,
         });
      })
      .catch((err) => {
         res.status(500).json({
            status: false,
            response: err,
         });
      });
});

client.initialize();
server.listen(8000, function () {
   console.log("app run on *:" + 8000);
});

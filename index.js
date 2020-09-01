require('dotenv').config()
const axios = require('axios').default;
const AWS = require('aws-sdk');
const fs = require('fs');
var s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    region: 'us-east-2',
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const {
    App
} = require('@slack/bolt');

const app = new App({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    token: process.env.SLACK_BOT_TOKEN,
});

app.message(/.*/, async ({
    message,
    say
}) => {
    if (message.subtype === 'file_share') {
        // Download File :)
        // return public link
        await app.client.files.sharedPublicURL({
            token: process.env.SLACK_TOKEN,
            file: message.files[0].id
        }).then((res) => {
            var file = fs.readFile(res.file.permalink_public, function (err, data) {
                if (err) throw err;

                console.log(data);
            });
            var params = {
                Bucket: "sarthakcdn",
                Body: new Buffer(),
                Key: "secured/Uploads/" + res.file.name,
                ContentType: res.file.mimetype
            };
            console.log("secured/Uploads/" + res.file.name);
            s3.putObject(params, function (err, data) {
                if (err) {
                    console.log(err, err.stack)
                } else {
                    console.log(data)
                };
            });
            app.client.chat.postMessage({
                token: process.env.SLACK_BOT_TOKEN,
                channel: message.channel,
                thread_ts: message.ts,
                text: 'Here\'s yo\' file link: https://cdn.sarthakmohanty.me/secured/Uploads/' + encodeURI(res.file.name)
            });
        }).catch((err) => {
            console.log(err);
        });
    } else {
        await app.client.chat.delete({
            token: process.env.SLACK_TOKEN,
            channel: message.channel,
            ts: message.ts
        }).catch((err) => {
            console.log(err);
        });
    }
});

(async () => {
    // Start the app
    await app.start(process.env.PORT || 3000);

    console.log('⚡️ Bolt app is running!');
})();
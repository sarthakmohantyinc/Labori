require('dotenv').config()
const axios = require('axios').default;
const AWS = require('aws-sdk');
var s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    region: 'us-east-2',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});
const Airtable = require('airtable');
var base = new Airtable({
    apiKey: process.env.AIRTABLE_API_KEY
}).base('app2TjIwSVuQpw4nK');

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
                console.log(res);
                const slackUrlRegex = RegExp(/(?:https:\/\/slack\-files\.com)\/(.+)\-(.+)\-(.+)/i);
                const slackFileLink = slackUrlRegex.exec(res.file.permalink_public);
                const slackTeamId = slackFileLink[1];
                const slackFileId = slackFileLink[2];
                const slackFilePubSecret = slackFileLink[3];
                const slackFileName = res.file.name.toLowerCase().replace(/[|&;$%@"<>()*^+,\s]/g, "_");
                const pubLink = `https://files.slack.com/files-pri/${slackTeamId}-${slackFileId}/${slackFileName}?pub_secret=${slackFilePubSecret}`
                axios.get(pubLink, {
                        responseType: 'arraybuffer'
                    })
                    .then((buffer) => {
                        console.log(buffer.data);
                        if (!res.file.mimetype.length === 0) {
                            var params = {
                                Bucket: "sarthakcdn",
                                Body: buffer.data,
                                Key: "secured/Uploads/" + res.file.name,
                                ContentType: res.file.mimetype
                            };
                        } else {
                            if (res.file.name.split('.').pop() === 'pdf') {
                                var params = {
                                    Bucket: "sarthakcdn",
                                    Body: buffer.data,
                                    Key: "secured/Uploads/" + res.file.name,
                                    ContentType: 'application/pdf'
                                };
                            } else if (res.file.name.split('.').pop() === 'png') {
                                var params = {
                                    Bucket: "sarthakcdn",
                                    Body: buffer.data,
                                    Key: "secured/Uploads/" + res.file.name,
                                    ContentType: 'image/png'
                                };
                            } else if (res.file.name.split('.').pop() === 'doc') {
                                var params = {
                                    Bucket: "sarthakcdn",
                                    Body: buffer.data,
                                    Key: "secured/Uploads/" + res.file.name,
                                    ContentType: 'application/msword'
                                };
                            } else if (res.file.name.split('.').pop() === 'docx') {
                                var params = {
                                    Bucket: "sarthakcdn",
                                    Body: buffer.data,
                                    Key: "secured/Uploads/" + res.file.name,
                                    ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                                };
                            } else if (res.file.name.split('.').pop() === 'epub') {
                                var params = {
                                    Bucket: "sarthakcdn",
                                    Body: buffer.data,
                                    Key: "secured/Uploads/" + res.file.name,
                                    ContentType: 'application/epub+zip'
                                };
                            } else if (res.file.name.split('.').pop() === 'html') {
                                var params = {
                                    Bucket: "sarthakcdn",
                                    Body: buffer.data,
                                    Key: "secured/Uploads/" + res.file.name,
                                    ContentType: 'text/html'
                                };
                            } else {
                                app.client.reactions.add({
                                    token: process.env.SLACK_BOT_TOKEN,
                                    channel: message.channel,
                                    name: 'broken_heart',
                                    timestamp: message.ts,
                                    unfurl_media: false,
                                    as_user: false,
                                    username: 'Your Ex :)',
                                    icon_emoji: ':broken_heart:'
                                });
                                app.client.chat.postMessage({
                                    token: process.env.SLACK_BOT_TOKEN,
                                    channel: message.channel,
                                    thread_ts: message.ts,
                                    text: 'Could\'nt parse file type.',
                                    unfurl_media: false,
                                    as_user: false,
                                    username: 'Your Ex :)',
                                    icon_emoji: ':broken_heart:'
                                });
                            }
                        }

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
                            text: 'Here\'s yo\' (private) file link: https://cdn.sarthakmohanty.me/secured/Uploads/' + encodeURI(res.file.name),
                            unfurl_media: false,
                            as_user: false,
                            username: 'Sheep :)',
                            icon_emoji: ':sheep:'
                        });
                        app.client.chat.postMessage({
                            token: process.env.SLACK_BOT_TOKEN,
                            channel: message.channel,
                            thread_ts: message.ts,
                            text: 'Here\'s yo\' (public) file link: ' + pubLink + '\n change it manually in Airtable if needed.',
                            unfurl_media: false,
                            as_user: false,
                            username: 'Goat :)',
                            icon_emoji: ':goat:'
                        });
                        app.client.reactions.add({
                            token: process.env.SLACK_BOT_TOKEN,
                            channel: message.channel,
                            name: 'white_check_mark',
                            timestamp: message.ts
                        });
                        base('Resource List').create({
                            "name": res.file.name.substring(0, res.file.name.indexOf('.')),
                            "subject": "Not Categorized",
                            "link": "https://cdn.sarthakmohanty.me/secured/Uploads/" + encodeURI(res.file.name),
                            "contributor": res.file.user,
                            "icon": "fas fa-star"
                        }, function (err, record) {
                            if (err) {
                                console.error(err);
                                return;
                            }
                        });
                    }).catch((err) => {
                        console.log(err);
                        app.client.reactions.add({
                            token: process.env.SLACK_BOT_TOKEN,
                            channel: message.channel,
                            name: 'warning',
                            timestamp: message.ts,
                            unfurl_media: false,
                            as_user: false,
                            username: 'the construction workers on 1604',
                            icon_emoji: ':warning:'
                        });
                        app.client.reactions.add({
                            token: process.env.SLACK_BOT_TOKEN,
                            channel: message.channel,
                            name: 'no_entry',
                            timestamp: message.ts,
                            unfurl_media: false,
                            as_user: false,
                            username: 'the construction workers on 1604',
                            icon_emoji: ':warning:'
                        });
                        app.client.chat.postMessage({
                            token: process.env.SLACK_BOT_TOKEN,
                            channel: message.channel,
                            thread_ts: message.ts,
                            text: 'welp. looks like axios failed to fetch the file. <@U015MNHKTMX> fix us, 1604 is getting clogged.',
                            unfurl_media: false,
                            as_user: false,
                            username: 'the construction workers on 1604',
                            icon_emoji: ':no_entry:'
                        });
                    });
            })
            .catch((err) => {
                console.log(err);
                app.client.reactions.add({
                    token: process.env.SLACK_BOT_TOKEN,
                    channel: message.channel,
                    name: 'no_entry',
                    timestamp: message.ts,
                    unfurl_media: false,
                    as_user: false,
                    username: 'the construction workers on 1604',
                    icon_emoji: ':no_entry:'
                });
                app.client.chat.postMessage({
                    token: process.env.SLACK_BOT_TOKEN,
                    channel: message.channel,
                    thread_ts: message.ts,
                    text: 'file couldn\'t turn public. is it a duplicate name? usually, upload with a different name and it should work.',
                    unfurl_media: false,
                    as_user: false,
                    username: 'the construction workers on 1604',
                    icon_emoji: ':no_entry:'
                });
            });
    } else {
        await app.client.chat.delete({
            token: process.env.SLACK_TOKEN,
            channel: message.channel,
            ts: message.ts
        }).catch((err) => {
            console.log(err);
            app.client.reactions.add({
                token: process.env.SLACK_BOT_TOKEN,
                channel: message.channel,
                name: 'no_entry',
                timestamp: message.ts,
                unfurl_media: false,
                as_user: false,
                username: 'the construction workers on 1604',
                icon_emoji: ':no_entry:'
            });
        });
    }
});

(async () => {
    // Start the app
    await app.start(process.env.PORT || 3000);

    console.log('⚡️ Bolt app is running!');
})();
require('dotenv').config()
const axios = require('axios').default;
var markdownpdf = require("markdown-pdf");
const fs = require('fs');
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
    console.log(message);
    // Private Upload
    if (message.subtype === 'file_share' && message.channel === 'C017CP00UHW') {
        await app.client.files.sharedPublicURL({
                token: process.env.SLACK_TOKEN,
                file: message.files[0].id
            }).then((res) => {
                const slackUrlRegex = RegExp(/(?:https:\/\/slack\-files\.com)\/(.+)\-(.+)\-(.+)/i);
                const slackFileLink = slackUrlRegex.exec(res.file.permalink_public);
                const slackTeamId = slackFileLink[1];
                const slackFileId = slackFileLink[2];
                const slackFilePubSecret = slackFileLink[3];
                const slackFileName = res.file.name.toLowerCase().replace(/[|&;$%@"<>#!'()*^+,\s]/g, "_");
                const pubLink = `https://files.slack.com/files-pri/${slackTeamId}-${slackFileId}/${slackFileName}?pub_secret=${slackFilePubSecret}`
                axios.get(pubLink, {
                        responseType: 'arraybuffer'
                    })
                    .then((buffer) => {
                        if (res.file.mimetype.length !== 0) {
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
                            } else if (res.file.name.split('.').pop() === 'jpg') {
                                var params = {
                                    Bucket: "sarthakcdn",
                                    Body: buffer.data,
                                    Key: "secured/Uploads/" + res.file.name,
                                    ContentType: 'image/jpeg'
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
                                app.client.chat.postMessage({
                                    token: process.env.SLACK_BOT_TOKEN,
                                    channel: message.channel,
                                    thread_ts: message.ts,
                                    text: 'Couldn\'t detect MIMETYPE. give me :banana:',
                                    username: 'the monkeys at the temples in india',
                                    icon_emoji: ':monkey_face:',
                                });
                            }
                        }
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
                            text: 'Here\'s yo\' file link: https://cdn.sarthakmohanty.me/secured/Uploads/' + encodeURI(res.file.name) + '\n here\'s yo\' public link: ' + pubLink,
                            unfurl_media: false,
                            username: 'Mrs. Westbrook',
                            icon_emoji: ':goat:',
                        });
                        app.client.reactions.add({
                            token: process.env.SLACK_BOT_TOKEN,
                            channel: message.channel,
                            name: 'white_check_mark',
                            timestamp: message.ts,
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
                        app.client.chat.postMessage({
                            token: process.env.SLACK_BOT_TOKEN,
                            channel: message.channel,
                            thread_ts: message.ts,
                            text: 'axios had fun failing. looks like `' + err.response.status + ' ' + err.response.statusText + '` which probably means you had some unescaped special characters. <@U015MNHKTMX> fix this. :crab: :crab: :crab: :crab:.',
                            username: 'the crabs on the beach',
                            icon_emoji: ':crab:',
                        });
                    });
            })
            .catch((err) => {
                console.log(err);
                app.client.chat.postMessage({
                    token: process.env.SLACK_BOT_TOKEN,
                    channel: message.channel,
                    thread_ts: message.ts,
                    text: 'Failed to make yo\' file public. ERR: `' + err.data.error + '` now keep moving :car:, keep moving I said!',
                    username: 'the construction workers on i-10',
                    icon_emoji: ':cyclone:',
                });
            });
    } // Public Upload
    else if (message.subtype === 'file_share' && message.channel === 'C0157NF6T3P') {
        await app.client.files.sharedPublicURL({
                token: process.env.SLACK_TOKEN,
                file: message.files[0].id
            }).then((res) => {
                const slackUrlRegex = RegExp(/(?:https:\/\/slack\-files\.com)\/(.+)\-(.+)\-(.+)/i);
                const slackFileLink = slackUrlRegex.exec(res.file.permalink_public);
                const slackTeamId = slackFileLink[1];
                const slackFileId = slackFileLink[2];
                const slackFilePubSecret = slackFileLink[3];
                const slackFileName = res.file.name.toLowerCase().replace(/[|&;$%@"<>#!'()*^+,\s]/g, "_");
                const pubLink = `https://files.slack.com/files-pri/${slackTeamId}-${slackFileId}/${slackFileName}?pub_secret=${slackFilePubSecret}`
                axios.get(pubLink, {
                        responseType: 'arraybuffer'
                    })
                    .then((buffer) => {
                        if (res.file.mimetype.length !== 0) {
                            var params = {
                                Bucket: "sarthakmohanty",
                                Body: buffer.data,
                                Key: "Uploads/" + res.file.name,
                                ContentType: res.file.mimetype,
                                ACL: "public-read",
                            };
                        } else {
                            if (res.file.name.split('.').pop() === 'pdf') {
                                var params = {
                                    Bucket: "sarthakmohanty",
                                    Body: buffer.data,
                                    Key: "Uploads/" + res.file.name,
                                    ContentType: 'application/pdf',
                                    ACL: "public-read",
                                };
                            } else if (res.file.name.split('.').pop() === 'png') {
                                var params = {
                                    Bucket: "sarthakmohanty",
                                    Body: buffer.data,
                                    Key: "Uploads/" + res.file.name,
                                    ContentType: 'image/png',
                                    ACL: "public-read",
                                };
                            } else if (res.file.name.split('.').pop() === 'jpg') {
                                var params = {
                                    Bucket: "sarthakmohanty",
                                    Body: buffer.data,
                                    Key: "Uploads/" + res.file.name,
                                    ContentType: 'image/jpeg',
                                    ACL: "public-read",
                                };
                            } else if (res.file.name.split('.').pop() === 'doc') {
                                var params = {
                                    Bucket: "sarthakmohanty",
                                    Body: buffer.data,
                                    Key: "Uploads/" + res.file.name,
                                    ContentType: 'application/msword',
                                    ACL: "public-read",
                                };
                            } else if (res.file.name.split('.').pop() === 'docx') {
                                var params = {
                                    Bucket: "sarthakmohanty",
                                    Body: buffer.data,
                                    Key: "Uploads/" + res.file.name,
                                    ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                    ACL: "public-read",
                                };
                            } else if (res.file.name.split('.').pop() === 'epub') {
                                var params = {
                                    Bucket: "sarthakmohanty",
                                    Body: buffer.data,
                                    Key: "Uploads/" + res.file.name,
                                    ContentType: 'application/epub+zip',
                                    ACL: "public-read",
                                };
                            } else if (res.file.name.split('.').pop() === 'html') {
                                var params = {
                                    Bucket: "sarthakmohanty",
                                    Body: buffer.data,
                                    Key: "Uploads/" + res.file.name,
                                    ContentType: 'text/html',
                                    ACL: "public-read",
                                };
                            } else {
                                app.client.chat.postMessage({
                                    token: process.env.SLACK_BOT_TOKEN,
                                    channel: message.channel,
                                    thread_ts: message.ts,
                                    text: 'Couldn\'t detect MIMETYPE. give me :banana:',
                                    username: 'the monkeys at the temples in india',
                                    icon_emoji: ':monkey_face:',
                                });
                            }
                        }
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
                            text: 'Here\'s yo\' normal public (faster) file link: https://sarthakmohanty.s3.amazonaws.com/Uploads/' + encodeURI(res.file.name) + '\n here\'s yo\' slack public link: ' + pubLink,
                            unfurl_media: false,
                            username: 'Mrs. Westbrook',
                            icon_emoji: ':goat:',
                        });
                        app.client.reactions.add({
                            token: process.env.SLACK_BOT_TOKEN,
                            channel: message.channel,
                            name: 'white_check_mark',
                            timestamp: message.ts,
                        });
                        base('Resource List').create({
                            "name": res.file.name.substring(0, res.file.name.indexOf('.')),
                            "subject": "Not Categorized",
                            "link": "https://sarthakmohanty.s3.amazonaws.com/Uploads/" + encodeURI(res.file.name),
                            "contributor": res.file.user,
                            "icon": "fas fa-file"
                        }, function (err, record) {
                            if (err) {
                                console.error(err);
                                return;
                            }
                        });
                    }).catch((err) => {
                        console.log(err);
                        app.client.chat.postMessage({
                            token: process.env.SLACK_BOT_TOKEN,
                            channel: message.channel,
                            thread_ts: message.ts,
                            text: 'axios had fun failing. looks like `' + err.response.status + ' ' + err.response.statusText + '` which probably means you had some unescaped special characters. <@U015MNHKTMX> fix this. :crab: :crab: :crab: :crab:.',
                            username: 'the crabs on the beach',
                            icon_emoji: ':crab:',
                        });
                    });
            })
            .catch((err) => {
                console.log(err);
                app.client.chat.postMessage({
                    token: process.env.SLACK_BOT_TOKEN,
                    channel: message.channel,
                    thread_ts: message.ts,
                    text: 'Failed to make yo\' file public. ERR: `' + err.data.error + '` now keep moving :car:, keep moving I said!',
                    username: 'the construction workers on i-10',
                    icon_emoji: ':cyclone:',
                });
            });
    } // CDN
    else if (message.subtype === 'file_share' && message.channel === 'C01A1KXB8AJ') {
        await app.client.files.sharedPublicURL({
                token: process.env.SLACK_TOKEN,
                file: message.files[0].id
            }).then((res) => {
                const slackUrlRegex = RegExp(/(?:https:\/\/slack\-files\.com)\/(.+)\-(.+)\-(.+)/i);
                const slackFileLink = slackUrlRegex.exec(res.file.permalink_public);
                const slackTeamId = slackFileLink[1];
                const slackFileId = slackFileLink[2];
                const slackFilePubSecret = slackFileLink[3];
                const slackFileName = res.file.name.toLowerCase().replace(/[|&;$%@"<>#!'()*^+,\s]/g, "_");
                const pubLink = `https://files.slack.com/files-pri/${slackTeamId}-${slackFileId}/${slackFileName}?pub_secret=${slackFilePubSecret}`
                axios.get(pubLink, {
                        responseType: 'arraybuffer'
                    })
                    .then((buffer) => {
                        if (res.file.mimetype.length !== 0) {
                            var params = {
                                Bucket: "sarthakmohanty",
                                Body: buffer.data,
                                Key: "Uploads/" + res.file.name,
                                ContentType: res.file.mimetype,
                                ACL: "public-read",
                            };
                        } else {
                            if (res.file.name.split('.').pop() === 'pdf') {
                                var params = {
                                    Bucket: "sarthakmohanty",
                                    Body: buffer.data,
                                    Key: "Uploads/" + res.file.name,
                                    ContentType: 'application/pdf',
                                    ACL: "public-read",
                                };
                            } else if (res.file.name.split('.').pop() === 'png') {
                                var params = {
                                    Bucket: "sarthakmohanty",
                                    Body: buffer.data,
                                    Key: "Uploads/" + res.file.name,
                                    ContentType: 'image/png',
                                    ACL: "public-read",
                                };
                            } else if (res.file.name.split('.').pop() === 'jpg') {
                                var params = {
                                    Bucket: "sarthakmohanty",
                                    Body: buffer.data,
                                    Key: "Uploads/" + res.file.name,
                                    ContentType: 'image/jpeg',
                                    ACL: "public-read",
                                };
                            } else if (res.file.name.split('.').pop() === 'doc') {
                                var params = {
                                    Bucket: "sarthakmohanty",
                                    Body: buffer.data,
                                    Key: "Uploads/" + res.file.name,
                                    ContentType: 'application/msword',
                                    ACL: "public-read",
                                };
                            } else if (res.file.name.split('.').pop() === 'docx') {
                                var params = {
                                    Bucket: "sarthakmohanty",
                                    Body: buffer.data,
                                    Key: "Uploads/" + res.file.name,
                                    ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                    ACL: "public-read",
                                };
                            } else if (res.file.name.split('.').pop() === 'epub') {
                                var params = {
                                    Bucket: "sarthakmohanty",
                                    Body: buffer.data,
                                    Key: "Uploads/" + res.file.name,
                                    ContentType: 'application/epub+zip',
                                    ACL: "public-read",
                                };
                            } else if (res.file.name.split('.').pop() === 'html') {
                                var params = {
                                    Bucket: "sarthakmohanty",
                                    Body: buffer.data,
                                    Key: "Uploads/" + res.file.name,
                                    ContentType: 'text/html',
                                    ACL: "public-read",
                                };
                            } else {
                                app.client.chat.postMessage({
                                    token: process.env.SLACK_BOT_TOKEN,
                                    channel: message.channel,
                                    thread_ts: message.ts,
                                    text: 'Couldn\'t detect MIMETYPE. give me :banana:',
                                    username: 'the monkeys at the temples in india',
                                    icon_emoji: ':monkey_face:',
                                });
                            }
                        }
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
                            text: 'Here\'s yo\' normal public (faster) file link: https://sarthakmohanty.s3.amazonaws.com/Uploads/' + encodeURI(res.file.name) + '\n here\'s yo\' slack public link: ' + pubLink,
                            unfurl_media: false,
                            username: 'Mrs. Westbrook',
                            icon_emoji: ':goat:',
                        });
                        app.client.reactions.add({
                            token: process.env.SLACK_BOT_TOKEN,
                            channel: message.channel,
                            name: 'white_check_mark',
                            timestamp: message.ts,
                        });
                    }).catch((err) => {
                        console.log(err);
                        app.client.chat.postMessage({
                            token: process.env.SLACK_BOT_TOKEN,
                            channel: message.channel,
                            thread_ts: message.ts,
                            text: 'axios had fun failing. looks like `' + err.response.status + ' ' + err.response.statusText + '` which probably means you had some unescaped special characters. <@U015MNHKTMX> fix this. :crab: :crab: :crab: :crab:.',
                            username: 'the crabs on the beach',
                            icon_emoji: ':crab:',
                        });
                    });
            })
            .catch((err) => {
                console.log(err);
                app.client.chat.postMessage({
                    token: process.env.SLACK_BOT_TOKEN,
                    channel: message.channel,
                    thread_ts: message.ts,
                    text: 'Failed to make yo\' file public. ERR: `' + err.data.error + '` now keep moving :car:, keep moving I said!',
                    username: 'the construction workers on i-10',
                    icon_emoji: ':cyclone:',
                });
            });
    } else if (message.subtype === 'file_share' && message.channel === 'C01ATHB7C6S') {
        await app.client.files.sharedPublicURL({
                token: process.env.SLACK_TOKEN,
                file: message.files[0].id
            }).then((res) => {
                if (res.file.name.split('.').pop() === 'md') {
                    const slackUrlRegex = RegExp(/(?:https:\/\/slack\-files\.com)\/(.+)\-(.+)\-(.+)/i);
                    const slackFileLink = slackUrlRegex.exec(res.file.permalink_public);
                    const slackTeamId = slackFileLink[1];
                    const slackFileId = slackFileLink[2];
                    const slackFilePubSecret = slackFileLink[3];
                    const slackFileName = res.file.name.toLowerCase().replace(/[|&;$%@"<>#!'()*^+,\s]/g, "_");
                    const pubLink = `https://files.slack.com/files-pri/${slackTeamId}-${slackFileId}/${slackFileName}?pub_secret=${slackFilePubSecret}`
                    axios.get(pubLink, {
                        responseType: 'arraybuffer'
                    }).then((buffer) => {
                        markdownpdf({
                            cssPath: "https://stackedit.io/style.css"
                        }).from(pubLink).to("converted.pdf", async function () {
                            app.client.files.upload({
                                token: process.env.SLACK_BOT_TOKEN,
                                thread_ts: message.ts,
                                file: fs.readFileSync(buffer),
                                filename: slackFileName.substring(0, s.indexOf('.')) + '.pdf',
                                filetype: 'pdf',
                            });
                            console.log(`Converted ${slackFileName} successfully!`)
                        });
                    });
                }
            })
            .catch((err) => {
                console.log(err);
                app.client.chat.postMessage({
                    token: process.env.SLACK_BOT_TOKEN,
                    channel: message.channel,
                    thread_ts: message.ts,
                    text: 'Failed to make yo\' file public. ERR: `' + err.data.error + '` now keep moving :car:, keep moving I said!',
                    username: 'the construction workers on i-10',
                    icon_emoji: ':cyclone:',
                });
            });
    } // Delete all other messages
    else {
        if (typeof message.thread_ts === 'undefined') {
            await app.client.chat.delete({
                token: process.env.SLACK_TOKEN,
                channel: message.channel,
                ts: message.ts
            }).catch((err) => {
                console.log(err);
            });
        } else {
            await app.client.reactions.add({
                token: process.env.SLACK_BOT_TOKEN,
                channel: message.channel,
                name: 'white_check_mark',
                timestamp: message.ts,
            });
        }
    }
});

(async () => {
    // Start the app
    await app.start(process.env.PORT || 3000);

    console.log('⚡️ Bolt app is running!');
})();
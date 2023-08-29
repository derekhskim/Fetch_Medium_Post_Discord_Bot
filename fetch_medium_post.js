const { Client, GatewayIntentBits } = require('discord.js');
const feedparser = require('feedparser-promised');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const fs = require('fs');

const LAST_POST_FILE = './last_post.json';

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('ready', () => {
    console.log('Bot is running!');
    checkMediumFeed();
    setInterval(checkMediumFeed, 60000);  // Check every 1 minute
});

async function checkMediumFeed() {
    try {
        const articles = await feedparser.parse(process.env.MEDIUM_RSS_URL);
        const latestFeedItem = articles[0];

        let lastPost = { title: '', link: '' };
        
        // Load last post details if the file exists
        if (fs.existsSync(LAST_POST_FILE)) {
            const rawData = fs.readFileSync(LAST_POST_FILE, 'utf-8');
            lastPost = JSON.parse(rawData);
        }

        // If the latest fetched post is different from the last known post
        if (latestFeedItem.link !== lastPost.link || latestFeedItem.title !== lastPost.title) {
            const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
            if (channel) {
                channel.send(`📢 New Blog Post: ${latestFeedItem.title} - ${latestFeedItem.link}`);
            }
            // Update the last known post details
            fs.writeFileSync(LAST_POST_FILE, JSON.stringify({
                title: latestFeedItem.title,
                link: latestFeedItem.link
            }));
        }

    } catch (err) {
        console.error('Failed to fetch Medium feed:', err);
    }
}

client.login(process.env.DISCORD_BOT_TOKEN);

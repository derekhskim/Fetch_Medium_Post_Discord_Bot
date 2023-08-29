const { Client, GatewayIntentBits } = require('discord.js');
const feedparser = require('feedparser-promised');
const dotenv = require('dotenv');
const express = require('express');

const sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('./last_post.db'); // Using a file-based SQLite database

// Create a table to store the last post
db.run("CREATE TABLE IF NOT EXISTS last_post (title TEXT, link TEXT)");

// Load environment variables from .env file
dotenv.config();

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
        
        // Retrieve the last post from SQLite
        db.get("SELECT title, link FROM last_post", [], (err, row) => {
            if (err) {
                return console.error('Error fetching from SQLite:', err.message);
            }
            if (row) {
                lastPost = { title: row.title, link: row.link };
            }
            
            // If the latest fetched post is different from the last known post
            if (latestFeedItem.link !== lastPost.link || latestFeedItem.title !== lastPost.title) {
                const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
                if (channel) {
                    channel.send(`📢 New Blog Post: ${latestFeedItem.title} - ${latestFeedItem.link}`);
                }
                // Update the last known post details in SQLite
                db.run("DELETE FROM last_post");
                db.run("INSERT INTO last_post(title, link) VALUES(?, ?)", [latestFeedItem.title, latestFeedItem.link]);
            }
        });
    } catch (err) {
        console.error('Failed to fetch Medium feed:', err);
    }
}

client.login(process.env.DISCORD_BOT_TOKEN);

// Express server setup
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot is alive!');
});

app.listen(port, () => {
    console.log(`Bot web server started on http://localhost:${port}`);
});

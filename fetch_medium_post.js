const { Client, GatewayIntentBits } = require('discord.js');
const feedparser = require('feedparser-promised');
const dotenv = require('dotenv');
const express = require('express');
const { Pool } = require('pg');

// Load environment variables from .env file
dotenv.config();

// Setup the PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.ELEPHANTSQL_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

// Ensure the table is created
pool.query("CREATE TABLE IF NOT EXISTS last_post (title TEXT, link TEXT)");

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('ready', () => {
    console.log('Bot is running!');
    checkMediumFeed();
    setInterval(checkMediumFeed, 60000);
});

async function checkMediumFeed() {
    try {
        const articles = await feedparser.parse(process.env.MEDIUM_RSS_URL);
        const latestFeedItem = articles[0];
        
        // Retrieve the last post from ElephantSQL
        const { rows } = await pool.query("SELECT title, link FROM last_post");
        const lastPost = rows[0] || { title: '', link: '' };

        // If the latest fetched post is different from the last known post
        if (latestFeedItem.link !== lastPost.link || latestFeedItem.title !== lastPost.title) {
            const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
            if (channel) {
                channel.send(`📢 New Blog Post Alert!\n${latestFeedItem.title}\n${latestFeedItem.link}`);
            }

            // Update the last known post details in ElephantSQL
            await pool.query("DELETE FROM last_post");
            await pool.query("INSERT INTO last_post(title, link) VALUES($1, $2)", [latestFeedItem.title, latestFeedItem.link]);
        }
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

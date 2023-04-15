if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;
const favTracks = 25;
const recTracks = 10;
const NAVIGATION = `
    <div style="display:flex; flex-direction:column;">
        <a style="margin:10px 0;" href="/auth">Get Spotify Songs</a> 
        <a style="margin:10px 0;" href="/yt">Get Youtube Links</a> 
        <a style="margin:10px 0;" href="/seed">Save YT Link To Json File</a>
        <a style="margin:10px 0;" href="/download">Download Songs</a>
        <a style="margin:10px 0;" href="/clear">Clear cache</a>
    </div>
`


const SpotifyWebApi = require('spotify-web-api-node');
const express = require('express');
const axios = require('axios');
const search = require('yt-search');
const fs = require('fs');
const { exec } = require('youtube-dl-exec');
const https = require('https');
const { json } = require('body-parser');
const app = express();
const linksJson = require('./links.json')


const spotifyApi = new SpotifyWebApi({
    clientId: clientId,
    clientSecret: clientSecret,
    redirectUri: redirectUri
});

const sleep = (delay) => new Promise((res) => setTimeout(res, delay))

// Set up the authorization route
app.get('/auth', async (req, res) => {
    const scopes = ['user-library-read', 'user-read-private'];
    const authorizeURL = spotifyApi.createAuthorizeURL(scopes);
    res.redirect(authorizeURL);
});

let trackNames = {}
// Set up the callback route
app.get('/callback', async (req, res) => {
    const { code } = req.query;
    try {
        const data = await spotifyApi.authorizationCodeGrant(code);
        const { access_token, refresh_token } = data.body;
        spotifyApi.setAccessToken(access_token);
        spotifyApi.setRefreshToken(refresh_token);

        const dataTracks = await spotifyApi.getMySavedTracks({ limit: favTracks });
        await sleep(2000)

        let uuuu = []
        await dataTracks.body.items.forEach(async (item) => {
            // urls.push(item.track.name)
            trackNames[item.track.name] = true
            uuuu.push(item.track.id)

            const resRecomendation = await spotifyApi.getRecommendations({
                seed_tracks: uuuu.slice(-5),
                limit: recTracks,
            })
            const dataRecomendationTracks = resRecomendation.body.tracks
            for (let track of dataRecomendationTracks) {
                // urls.push(track.name)
                trackNames[track.name] = true
                // console.log(trackNames, Object.keys(trackNames).length) 
                console.log(Object.keys(trackNames).length)
            }
            await sleep(2000)
            // await sleep(1000)
        })
        res.send(`Logged in successfully! ${NAVIGATION}`);
    } catch (error) {
        console.error(error);
        res.send(`Failed to log in. ${NAVIGATION}`);


    }
});


const download = async (videoUrl, songName) => {
    return new Promise((res) => {
        exec(videoUrl, {
            extractAudio: true,
            audioFormat: 'mp3',
            o: './songs/%(title)s.%(ext)s'
        }).then(output => {
            res()
            console.log(`Successfully download and saved ${songName}`);
        }).catch(error => {
            res()
            console.log(`Failed to download and save ${songName}`);
        });
    })


}

let links = []

const getYtLinks = async (songName) => {

    // Construct the search query
    const searchQuery = `${songName} audio`;

    try {
        console.log(songName, searchQuery)
        // const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        //     params: {
        //         q: searchQuery,
        //         key: apiKey,
        //         part: 'snippet',
        //         type: 'video',
        //         videoDefinition: 'high',
        //         videoLicense: 'youtube',
        //         videoEmbeddable: true
        //     }
        // })
        // const videoId = response.data.items[0].id.videoId;
        const videoResult = await search(searchQuery);
        const videoId = videoResult.videos[0].videoId;


        const downloadLink = `https://www.youtube.com/watch?v=${videoId}`;
        console.log(downloadLink, songName)
        links.push(downloadLink)
        // download(downloadLink, songName)
        await sleep(1000)
    } catch (e) {
        console.log(e.message)
    }



}

app.get('/yt', async (req, res) => {
    await Object.keys(trackNames).forEach(async (name) => await getYtLinks(name))
    res.send(`yt ${NAVIGATION}`)
})
app.get('/clear', async (req, res) => {
    trackNames = {}
    links = []
    console.clear()
    res.send(`clear ${NAVIGATION}`)
})

app.get('/seed', async (req, res) => {
    if (links.length) {

        try {
            fs.writeFileSync('./links.json', JSON.stringify(links))
        } catch (e) {
            console.log(e)
        }
    }
    res.send(`seed ${NAVIGATION}`)
})
app.get('/download', async (req, res) => {
    linksJson.forEach(async (link, i) => {
        await download(link, i)
        await sleep(1000)
    })
    res.send(`seed ${NAVIGATION}`)
})











// Start the server
app.listen(8888, () => {
    console.log('Server started on http://localhost:8888');
});

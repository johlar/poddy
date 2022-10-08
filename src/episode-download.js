const axios = require('axios');
const fs = require("fs");
const fsAsync = require("fs/promises");
const path = require("path");
const saveShownotes = require("./episode-shownotes");
const version = require('../package.json').version;

const printProgress = (chunk, downloaded, total) => {
    if (chunk.length + downloaded <= total) {
        const progress = ((chunk.length + downloaded) / total * 100).toFixed(1);
        const totalMb = ((total) / 1024 / 1024).toFixed(2);
        process.stdout.clearLine(0)
        process.stdout.write(` progress: ${progress}% of ${totalMb} MB`);
        process.stdout.cursorTo(0);
    }
}

const fileExtension = (url) => {
    const resource = url.substring(url.lastIndexOf("/") + 1);
    const hasQueryParams = resource.lastIndexOf("?") != -1
    const name = hasQueryParams
        ? resource.substring(0, resource.lastIndexOf("?"))
        : resource;
    const split = name.split('.');
    return split[split.length - 1];
}

const getOrInitMetadata = async (directory) => {
    const metadataPath = path.resolve(directory, "poddy.meta");
    if (!fs.existsSync(metadataPath)) {
        fs.writeFileSync(metadataPath, JSON.stringify({ poddy: { version }, episodes: {} }))
    }
    return JSON.parse(fs.readFileSync(metadataPath).toString());
}

const persistMetadata = async (metadata, directory) => {
    const metadataPath = path.resolve(directory, "poddy.meta");
    await fsAsync.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
}

const isDownloaded = (what, guid, metadata) => {
    return !!metadata.episodes[guid]?.[what]
}

const markAsDownloaded = (episode, what, metadata) => {
    const existingEntry = metadata.episodes[episode.guid];

    if (existingEntry) {
        metadata.episodes[episode.guid] = {
            ...existingEntry,
            episode: what.includes('episode') || existingEntry.episode,
            shownotes: what.includes('shownotes') || existingEntry.shownotes
        }
        return metadata;
    }
    metadata.episodes[episode.guid] = {
        title: episode.title,
        episode: what.includes('episode'),
        shownotes: what.includes('shownotes')
    }
    return metadata;
}

const downloadEpisode = (episode, fullPath) => {
    return new Promise(async (resolve, reject) => {

        if (fs.existsSync(fullPath)) {
            console.log(`Skipping episode '${episode.title}' because file already exists: '${fullPath}'`);
            return resolve();
        }

        console.log(episode.title)
        Object.keys(episode)
            .filter(key => ["pubDate"].includes(key))
            .filter(key => episode[key] != undefined)
            .forEach(key => console.log(` ${key}: ${episode[key]}`));

        try {
            const { data, headers } = await axios.get(episode.url, { responseType: 'stream' })
            const totalBytes = headers['content-length']
            let downloadedBytes = 0;

            const writer = fs.createWriteStream(fullPath + ".tmp")

            data.on('data', (chunk) => {
                downloadedBytes = chunk.length + downloadedBytes;
                printProgress(chunk, downloadedBytes, totalBytes)
            });
            data.on('error', (err) => {
                fs.rmSync(fullPath + ".tmp", { force: true });
                console.error(`Download failed for: \n title: ${episode.title} \n url: ${episode.url} \n error: ${err.message})`)
                return reject();
            });
            data.on('end', () => {
                fs.renameSync(fullPath + ".tmp", fullPath);
                console.log(` path: ${fullPath}`)
                return resolve();
            })

            data.pipe(writer)
        } catch (err) {
            fs.rmSync(fullPath + ".tmp", { force: true });
            console.error(`Download failed for: \n title: ${episode.title} \n url: ${episode.url} \n error: ${err.message})`)
            return reject();
        }
    });
}

const downloadEpisodes = async (episodes, directory, includeShownotes) => {
    let metadata = await getOrInitMetadata(directory);

    for (let i = 0; i < episodes.length; i++) {
        const episode = episodes[i];
        const tasks = [];

        if (!isDownloaded("episode", episode.guid, metadata)) {
            const fullPath = path.resolve(directory, `${episode.title}.${fileExtension(episode.url)}`);
            tasks.push({ what: "episode", func: () => downloadEpisode(episode, fullPath) })
        }
        if (includeShownotes && !isDownloaded("shownotes", episode.guid, metadata)) {
            const fullPath = path.resolve(directory, `${episode.title}-shownotes.html`)
            tasks.push({ what: "shownotes", func: () => saveShownotes(episode, fullPath) })
        }

        if (tasks.length == 0) {
            console.log(`Skipping: ${episode.title}`);
        } else {
            console.log(`Downloading ${tasks.map(task => task.what).join(", ")}: ${episode.title}`);
        }

        let resolvedTasks = [];
        await Promise.allSettled(tasks.map(task => task.func()))
            .then(results => {
                results.forEach((result, i) => {
                    if (result.status == "fulfilled") {
                        resolvedTasks.push(tasks[i].what);
                    }
                })
            })
            
        metadata = markAsDownloaded(episode, resolvedTasks, metadata)
        await persistMetadata(metadata, directory);
    }
}

module.exports = downloadEpisodes;
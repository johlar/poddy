const axios = require('axios');
const fs = require("fs");
const path = require("path");

const printProgress = (chunk, downloaded, total) => {
    if (chunk.length + downloaded <= total) {
        const progress = ((chunk.length + downloaded) / total * 100).toFixed(1);
        const totalMb = ((total) / 1024 / 1024).toFixed(2);
        process.stdout.clearLine(0)
        process.stdout.write(` progress: ${progress}% of ${totalMb} MB`);
        process.stdout.cursorTo(0);
    }
}

const fileNameFrom = (episode) => {
    const resource = episode.url.substring(episode.url.lastIndexOf("/") + 1);
    const hasQueryParams = resource.lastIndexOf("?") != -1
    var name = hasQueryParams
        ? resource.substring(0, resource.lastIndexOf("?"))
        : resource;
    return name;
}

const downloadEpisode = (episode, directory) => {
    return new Promise(async (resolve, reject) => {
        const fileName = fileNameFrom(episode);
        const fullPath = path.resolve(directory, fileName);
        if (fs.existsSync(fullPath)) {
            console.log(`Skipping episode '${episode.title}' because '${fileName}' already exists`);
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
const downloadEpisodes = async (episodes, directory) => {
    for (let i = 0; i < episodes.length; i++) {
        await downloadEpisode(episodes[i], directory)
    }
}

module.exports = downloadEpisodes;
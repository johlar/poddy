import axios from 'axios';
import * as fs from "fs";
import * as fsAsync from "fs/promises";
import * as path from "path";
import { saveShownotes } from "./episode-shownotes";
import { IEpisode, Metadata } from "./models"
import { APP_VERSION } from './version';

const printProgress = (chunk: any, downloaded: number, total: number): void => {
    if (chunk.length + downloaded <= total) {
        const progress = ((chunk.length + downloaded) / total * 100).toFixed(1);
        const totalMb = ((total) / 1024 / 1024).toFixed(2);
        process.stdout.clearLine(0)
        process.stdout.write(` progress: ${progress}% of ${totalMb} MB`);
        process.stdout.cursorTo(0);
    }
}

const fileExtension = (url: string): string => {
    const resource = url.substring(url.lastIndexOf("/") + 1);
    const hasQueryParams = resource.lastIndexOf("?") != -1
    const name = hasQueryParams
        ? resource.substring(0, resource.lastIndexOf("?"))
        : resource;
    const split = name.split('.');
    return split[split.length - 1];
}

const getOrInitMetadata = async (directory: string): Promise<Metadata> => {
    const metadataPath = path.resolve(directory, "poddy.meta");
    if (!fs.existsSync(metadataPath)) {
        fs.writeFileSync(metadataPath, JSON.stringify({ poddy: { APP_VERSION }, episodes: {} }))
    }
    return JSON.parse(fs.readFileSync(metadataPath).toString());
}

const persistMetadata = async (metadata: Metadata, directory: string): Promise<any> => {
    const metadataPath = path.resolve(directory, "poddy.meta");
    await fsAsync.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
}

const isDownloaded = (what: "episode" | "shownotes", guid: string, metadata: Metadata): boolean => {
    return !!metadata.episodes[guid]?.[what]
}

const markAsDownloaded = (episode: IEpisode, what: Array<"episode" | "shownotes">, metadata: Metadata): Metadata => {
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

const downloadEpisode = async (episode: IEpisode, fullPath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(fullPath)) {
            console.log(`Skipping episode '${episode.title}' because file already exists: '${fullPath}'`);
            return reject("File exists")
        }

        console.log(episode.title)
        Object.keys(episode)
            .filter(key => ["pubDate"].includes(key))
            .filter(key => episode[key as keyof IEpisode] != undefined)
            .forEach(key => console.log(` ${key}: ${episode[key as keyof IEpisode]}`));

        axios.get(episode.url, { responseType: 'stream' })
            .then(({ data, headers }) => {
                const totalBytes = parseInt(headers['content-length']);
                let downloadedBytes = 0;

                const writer = fs.createWriteStream(fullPath + ".tmp")

                data.on('data', (chunk: any) => {
                    downloadedBytes = chunk.length + downloadedBytes;
                    printProgress(chunk, downloadedBytes, totalBytes)
                });
                data.on('error', (err: any) => {
                    fs.rmSync(fullPath + ".tmp", { force: true });
                    console.error(`Download failed for: \n title: ${episode.title} \n url: ${episode.url} \n error: ${err.message})`)
                    return reject("Download failed")
                });
                data.on('end', () => {
                    fs.renameSync(fullPath + ".tmp", fullPath);
                    console.log(` path: ${fullPath}`)
                    writer.close();
                    return resolve();
                })

                data.pipe(writer)
            })
            .catch(err => {
                fs.rmSync(fullPath + ".tmp", { force: true });
                console.error(`Download failed for: \n title: ${episode.title} \n url: ${episode.url} \n error: ${err.message})`)
                return reject("Download failed")
            });
    });
}

const downloadEpisodes = async (episodes: Array<IEpisode>, directory: string, includeShownotes: boolean): Promise<void> => {
    let metadata = await getOrInitMetadata(directory);

    for (let i = 0; i < episodes.length; i++) {
        const episode = episodes[i];
        const tasks: Array<({ what: "episode" | "shownotes", func: () => Promise<void> })> = [];

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
            console.log(`Downloading ${tasks.map(task => task.what).join(", ")}: ${episode.title}`);
        }

        const resolvedTasks: Array<"episode" | "shownotes"> = [];
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

export { downloadEpisodes };
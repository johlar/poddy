import axios from 'axios';
import * as fs from "fs";
import * as fsAsync from "fs/promises";
import * as path from "path";
import { saveShownotes } from "./episode-shownotes";
import { IChannel, IEpisode, Metadata } from "./models"
import { APP_VERSION } from './version';

const fileExtension = (url: string): string => {
    const resource = url.substring(url.lastIndexOf("/") + 1);
    const hasQueryParams = resource.lastIndexOf("?") != -1
    const name = hasQueryParams
        ? resource.substring(0, resource.lastIndexOf("?"))
        : resource;
    const split = name.split('.');
    return split[split.length - 1];
}
interface IDownloadReportItem {
    episode: IEpisode,
    resolvedTasks: Set<"enclosure" | "shownotes">
}

const getOrInitMetadata = async (directory: string): Promise<Metadata> => {
    const metadataPath = path.resolve(directory, "poddy.meta");
    if (!fs.existsSync(metadataPath)) {
        const empty: Metadata = { poddy: { version: APP_VERSION }, episodes: {} };
        fs.writeFileSync(metadataPath, JSON.stringify(empty))
    }
    try {
        return JSON.parse(fs.readFileSync(metadataPath).toString());
    } catch (err: any) {
        throw new Error(`Could not open metadata file. ${err.message}`)
    }
}

const persistMetadata = async (metadata: Metadata, directory: string): Promise<any> => {
    const metadataPath = path.resolve(directory, "poddy.meta");
    await fsAsync.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
}

const isDownloaded = (what: "enclosure" | "shownotes", guid: string, metadata: Metadata): boolean => {
    return !!metadata.episodes[guid]?.[what]
}

const markAsDownloaded = (episode: IEpisode, what: Set<"enclosure" | "shownotes">, oldMetadata: Metadata): Metadata => {
    const metadata = { ...oldMetadata };
    const existingEntry = metadata.episodes[episode.guid];

    if (existingEntry) {
        metadata.episodes[episode.guid] = {
            ...existingEntry,
            enclosure: [...what].includes('enclosure') || existingEntry.enclosure,
            shownotes: [...what].includes('shownotes') || existingEntry.shownotes
        }
        return metadata;
    }
    metadata.episodes[episode.guid] = {
        title: episode.title,
        enclosure: [...what].includes('enclosure'),
        shownotes: [...what].includes('shownotes')
    }
    return metadata;
}

const downloadEpisode = async (
    episode: IEpisode,
    fullPath: string,
    signal: AbortSignal,
    onProgress?: (bytesNow: number, bytesTotal: number, episode: IEpisode) => void,
): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(fullPath)) {
            return reject(`Skipped episode because file already exists: '${fullPath}'`)
        }
        const writer = fs.createWriteStream(fullPath + ".tmp")

        const abort = (reason: Event | string) => {
            writer.close();
            fs.rmSync(fullPath + ".tmp", { force: true });
            signal.removeEventListener("abort", abort);
            if (reason instanceof Event) {
                reject("Download was not completed due to event: " + reason.type);
            } else {
                reject("Download was not completed. " + reason);
            }
        }
        signal.addEventListener("abort", abort);

        axios.get(episode.url, { signal, responseType: 'stream' })
            .then(({ data, headers }) => {
                const totalBytes = parseInt(headers['content-length']);
                let downloadedBytes = 0;

                data.on('data', (chunk: any) => {
                    if (signal.aborted) {
                        return reject("Aborted on received data")
                    }
                    downloadedBytes = chunk.length + downloadedBytes;
                    onProgress && onProgress(downloadedBytes, totalBytes, episode);
                });
                data.on('error', (err: any) => {
                    abort("Error in stream: " + err?.message);
                });
                data.on('end', () => {
                    fs.renameSync(fullPath + ".tmp", fullPath);
                    signal.removeEventListener("abort", abort)
                    writer.close();
                    return resolve();
                })

                data.pipe(writer)
            })
            .catch(err => {
                abort("Error in get: " + err?.message);
            });
    });
}

const downloadEpisodes = async (
    channel: IChannel,
    firstEpisodeNbr: number,
    lastEpisodeNbr: number,
    rootDirectory: string,
    includeShownotes: boolean,
    signal: AbortSignal,
    onProgress?: (bytesNow: number, bytesTotal: number, episode: IEpisode) => void,
): Promise<Array<IDownloadReportItem>> => {
    const channelDirectory = path.resolve(rootDirectory, channel.title);
    const shownotesDirectory = path.join(channelDirectory + "/shownotes");
    // create folders if required
    await fsAsync.mkdir(channelDirectory, { recursive: true })
    includeShownotes && await fsAsync.mkdir(shownotesDirectory, { recursive: true })

    let metadata = await getOrInitMetadata(channelDirectory);

    const toDownload = channel.episodes
        .slice(firstEpisodeNbr - 1, lastEpisodeNbr);

    const downloadReport: Array<IDownloadReportItem> = [];
    for (let i = 0; i < toDownload.length && !signal.aborted; i++) {
        const episode = toDownload[i];
        const tasks: Array<({ what: "enclosure" | "shownotes", func: () => Promise<void> })> = [];

        const fileName = `${episode.pubDate.toISOString().split('T')[0]} - ${episode.title}`;
        if (!isDownloaded("enclosure", episode.guid, metadata)) {
            const fullPath = path.resolve(channelDirectory, `${fileName}.${fileExtension(episode.url)}`);
            tasks.push({ what: "enclosure", func: () => downloadEpisode(episode, fullPath, signal, onProgress) })
        }
        if (includeShownotes && !isDownloaded("shownotes", episode.guid, metadata)) {
            const fullPath = path.resolve(shownotesDirectory, `${fileName}.html`)
            tasks.push({ what: "shownotes", func: () => saveShownotes(episode, channel, fullPath) })
        }

        if (tasks.length > 0) {
            console.log(`Starting download: ${episode.title} (${tasks.map(task => task.what).join(", ")})`);

            const resolvedTasks: Set<"enclosure" | "shownotes"> = new Set();
            const errors: Map<"enclosure" | "shownotes", string> = new Map();
            await Promise.allSettled(tasks.map(task => task.func()))
                .then(results => {
                    results.forEach((result, i) => {
                        if (result.status == "fulfilled") {
                            resolvedTasks.add(tasks[i].what);
                        } else {
                            errors.set(tasks[i].what, result.reason)
                        }
                    })
                });
            downloadReport.push({ episode, resolvedTasks });
            const resolvedTasksMsg = resolvedTasks.size == 0 ? "" : `(${[...resolvedTasks].join(", ")})`;
            const errorMsg = errors.size == 0 ? "" : `(${[...errors].map(e => `${e[0]}: ${e[1]}`).join(", ")})`;
            console.log(`Finished: ${episode.title} ${resolvedTasksMsg} ${errorMsg}`);
            metadata = markAsDownloaded(episode, resolvedTasks, metadata)
            await persistMetadata(metadata, channelDirectory);
        }
    }
    return downloadReport;
}

export { downloadEpisodes, IDownloadReportItem };
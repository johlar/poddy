import { Command, InvalidArgumentError } from 'commander';
import { searchChannels } from "./channel-search";
import { downloadEpisodes } from "./episode-download";
import { getChannel } from "./channel-get";
import { IEpisode, IChannelSearchResult } from "./models"
import * as fs from 'fs';
import * as path from "path";
import { APP_VERSION } from './version';
import { readConfigs } from './config';
import { subscribe, ISubscription } from './channels-subscribe';

const configs = readConfigs();

const abortController = new AbortController();
let currentTask: Promise<any> | undefined;
const program = new Command();

const parseEpisodeRange = (input: string): { from: number, to?: number } => {
    // note: index 1 based to make sense for episode numbers
    const ERR_MSG = "Expected episode number (e.g. '42'), range (e.g. '1-100' or '-10')";
    const parts = input.startsWith("-") ? [input] : input.split("-")
    if (parts.length == 2) {
        // like '2-10', i.e. to take eps 2 to 5
        const start = parseInt(parts[0], 10);
        const end = parseInt(parts[1], 10);

        if (isNaN(start) || isNaN(end) || start <= 0 || end < start) {
            throw new InvalidArgumentError(ERR_MSG);
        }
        return { from: start, to: end };
    }
    else if (parts.length == 1) {
        const integer = parseInt(parts[0], 10);
        if (integer > 0) {
            // like '20', i.e. to take 20 first
            return { from: 1, to: integer };
        }
        if (integer < 0) {
            // like '-20', i.e. take 20 latest
            return { from: integer, to: undefined };
        }
    }
    throw new InvalidArgumentError(ERR_MSG);
}

const parseDirectory = (directory?: string): string => {
    if (!directory) {
        throw new InvalidArgumentError(`Directory is undefined`);
    }
    if (directory.startsWith('~') && process.env.HOME) {
        directory = path.join(process.env.HOME, directory.slice(1));
    }
    if (!fs.existsSync(directory)) {
        throw new InvalidArgumentError(`Directory '${directory}' does not exist`);
    }
    return directory;
}

const parseUrl = (url: string) => {
    try {
        new URL(url);
        return url;
    } catch (_) {
        throw new InvalidArgumentError("URL is invalid.");
    }
}

const parseUrls = (url: string, previous: Array<string>): Array<string> => {
    parseUrl(url);
    if (previous.includes(url)) {
        throw new InvalidArgumentError("URLs should be unique");
    }
    return [...previous, url]
}

const assertPresent = (val: any, argName: string) => {
    if (val === undefined) {
        throw new InvalidArgumentError(`argument '${argName}' is missing`)
    }
    return val;
}

const printProgress = (downloaded: number, total: number): void => {
    if (downloaded <= total) {
        const progress = (downloaded / total * 100).toFixed(1);
        const totalMb = ((total) / 1024 / 1024).toFixed(2);
        process.stdout.clearLine(0)
        process.stdout.write(`Progress: ${progress}% of ${totalMb} MB`);
        process.stdout.cursorTo(0);
    }
}

program
    .name('Poddy')
    .description('CLI Podcast Downloader')
    .version(APP_VERSION);

program.command('search')
    .description('find feed url')
    .requiredOption('-n, --name <name>', 'name of podcast')
    .action(async (options) => {
        try {
            const channels = await searchChannels(options.name);

            channels.forEach(channel => {
                console.log(channel.name)
                Object.keys(channel)
                    .filter(key => channel[key as keyof IChannelSearchResult] != undefined)
                    .filter(key => ["genre", "latestRelease", "nbrOfEpisodes", "feedUrl"].includes(key))
                    .forEach(key => console.log(` ${key}: ${channel[key as keyof IChannelSearchResult]}`));
            });
        } catch (err: any) {
            console.error("ERROR: " + err?.message);
        }
    });

program.command('list')
    .description('display episode list')
    .requiredOption('-u, --url <url>', 'url to podcast feed', parseUrl)
    .action(async (options) => {
        try {
            const episodes = (await getChannel(options.url)).episodes;
            episodes.forEach((episode, i) => {
                console.log(`${(episodes.length - i)}. ${episode.title}`)
                Object.keys(episode)
                    .filter(key => ["pubDate", "url", "duration", "size"].includes(key))
                    .filter(key => episode[key as keyof IEpisode] != undefined)
                    .forEach(key => console.log(` ${key}: ${episode[key as keyof IEpisode]}`));
                console.log("\n")
            });
        }
        catch (err: any) {
            console.error("ERROR: " + err?.message);
        }
    });

program.command('download')
    .description('download episodes from a feed')
    .requiredOption('-u, --url <url>', 'url to podcast feed', parseUrl)
    .option('-e, --episodes <number|range>', 'podcasts to download', parseEpisodeRange)
    .option('-d, --directory <directory>', 'destination of downloads', parseDirectory)
    .option('-s, --shownotes', 'should include shownotes')
    .action(async (options) => {
        const directory = options.directory ?? parseDirectory(configs.config.downloadDirectory)
        const includeShownotes = options.shownotes ?? configs.config.includeShownotes;
        assertPresent(includeShownotes, 'includeShownotes')

        const channel = await getChannel(options.url);
        try {
            if (!options.episodes) {
                currentTask = downloadEpisodes(channel, 1, channel.episodes.length + 1, directory, includeShownotes, abortController.signal, printProgress);
                await currentTask;
            } else {
                const isTakeLatest = options.episodes.to == undefined;

                const firstEpisodeNbr = isTakeLatest
                    ? channel.episodes.length + 1 + options.episodes.from // from is negative
                    : options.episodes.from;
                const lastEpisodeNbr = isTakeLatest
                    ? channel.episodes.length
                    : options.episodes.to;

                currentTask = downloadEpisodes(channel, firstEpisodeNbr, lastEpisodeNbr, directory, includeShownotes, abortController.signal, printProgress);
                await currentTask;
            }
        } catch (err: any) {
            console.error("ERROR: " + err?.message);
        }
    });

program.command('subscribe')
    .description('continously download episodes from a feed')
    .option('-u, --urls [urls...]', 'url(s) to podcast feed(s)', parseUrls, [])
    .option('-i, --interval <interval>', 'interval between feed checks (seconds)', '600')
    .option('-d, --directory <directory>', 'destination of downloads', parseDirectory)
    .option('-s, --shownotes', 'should include shownotes')
    .action(async (options) => {
        const directory: string = options.directory ?? parseDirectory(configs.config.downloadDirectory)
        // undefined is allowed (if instead set through subscriptions conf), so assert on use
        const defaultIncludeShownotes: boolean | undefined = options.shownotes ?? configs.config.includeShownotes;
        const defaultInterval: number = parseInt(options.interval, 10);

        const subscriptions: Array<ISubscription> = options.urls.length > 0
            ? options.urls.map((url: string) => ({
                url: url,
                interval: defaultInterval,
                includeShownotes: assertPresent(defaultIncludeShownotes, 'includeShownotes')
            }))
            : configs.subscriptions.subscriptions.map(configured => ({
                url: configured.url,
                interval: configured.interval ?? defaultInterval,
                includeShownotes: configured.includeShownotes ?? assertPresent(defaultIncludeShownotes, 'includeShownotes')
            }));

        try {
            console.log(`Subscribing to ${subscriptions.length} channels`)
            currentTask = subscribe(subscriptions, directory, abortController.signal)
            await currentTask;
        } catch (err: any) {
            console.error("ERROR: " + err?.message);
        }
    });

program.parse();

process.on("SIGINT", async () => {
    console.log("Exiting...");
    abortController.abort();
    await currentTask;
    process.exit();
})
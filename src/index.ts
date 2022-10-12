import { Command, InvalidArgumentError } from 'commander';
import { searchChannels } from "./channel-search";
import { downloadEpisodes } from "./episode-download";
import { getChannel } from "./channel-get";
import { IEpisode, IChannelSearchResult } from "./models"
import * as fs from 'fs';
import * as path from "path";
import { APP_VERSION } from './version';

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

const parseDirectory = (directory: string): string => {
    if (directory.startsWith('~') && process.env.HOME) {
        directory = path.join(process.env.HOME, directory.slice(1));
    }
    if (!fs.existsSync(directory)) {
        throw new InvalidArgumentError(`Directory '${directory}' does not exist`);
    }
    return directory;
}

program
    .name('Poddy')
    .description('CLI Podcast Downloader')
    .version(APP_VERSION);

program.command('search')
    .description('find feed url')
    .requiredOption('-n, --name <name>', 'name of podcast')
    .action(async (options) => {
        const channels = await searchChannels(options.name);

        channels.forEach(channel => {
            console.log(channel.name)
            Object.keys(channel)
                .filter(key => channel[key as keyof IChannelSearchResult] != undefined)
                .filter(key => ["genre", "latestRelease", "nbrOfEpisodes", "feedUrl"].includes(key))
                .forEach(key => console.log(` ${key}: ${channel[key as keyof IChannelSearchResult]}`));
        });
    });

program.command('list')
    .description('display episode list')
    .requiredOption('-u, --url <url>', 'url to podcast feed')
    .action(async (options) => {
        const episodes = await (await getChannel(options.url)).episodes;
        episodes.forEach((episode, i) => {
            console.log(`${(episodes.length - i)}. ${episode.title}`)
            Object.keys(episode)
                .filter(key => ["pubDate", "url", "duration", "size"].includes(key))
                .filter(key => episode[key as keyof IEpisode] != undefined)
                .forEach(key => console.log(` ${key}: ${episode[key as keyof IEpisode]}`));
            console.log("\n")
        });
    });

program.command('download')
    .description('download episodes from a feed')
    .requiredOption('-u, --url <url>', 'url to podcast feed')
    .requiredOption('-d, --directory <directory>', 'destination of downloads', parseDirectory)
    .option('-e, --episodes <number|range>', 'podcasts to download', parseEpisodeRange)
    .option('-s, --shownotes', 'should include shownotes')
    .action(async (options) => {
        const episodes = (await getChannel(options.url)).episodes

        let toDownload = [];
        if (!options.episodes) {
            toDownload = episodes;
        } else {
            const isTakeLatest = options.episodes.to == undefined;

            const firstEpisodeNbr = isTakeLatest
                ? episodes.length + 1 + options.episodes.from // from is negative
                : options.episodes.from;
            const lastEpisodeNbr = isTakeLatest
                ? episodes.length
                : options.episodes.to;

            toDownload = episodes
                .slice(firstEpisodeNbr - 1, lastEpisodeNbr)
        }

        console.log(`Downloading ${toDownload.length} episodes..`);
        await downloadEpisodes(toDownload, options.directory, options.shownotes);
    });

program.parse();
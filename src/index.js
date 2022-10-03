const { Command, InvalidArgumentError } = require('commander');
const program = new Command();
const searchPodcasts = require("./podcast-search");
const downloadEpisodes = require("./episode-download");
const getEpisodeList = require("./episode-list");
const fs = require('fs');
const path = require("path");

const parseEpisodeRange = (input) => {
    // note: index 1 based to make sense for episode numbers
    const ERR_MSG = "Expected episode number (e.g. '42'), range (e.g. '1-100' or '-10')";
    const parts = input.startsWith("-") ? [input] : input.split("-")

    if (parts.length == 2) {
        // like '2-10', i.e. to take eps 2 to 5
        const start = parseInt(parts[0], 10);
        const end = parseInt(parts[1], 10);

        if (isNaN(start) || isNaN(end) || start <= 0 || end <= 0 || start >= end || start == end) {
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
    } else {
        throw new InvalidArgumentError(ERR_MSG);
    }
}

const parseDirectory = (directory) => {
    if (directory.startsWith('~')) {
        directory = path.join(process.env.HOME, directory.slice(1));
    }
    if (!fs.existsSync(directory)) {
        throw new InvalidArgumentError(`Directory '${directory}' does not exist`);
    }
    return directory;
}

program.command('search')
    .description('find feed url')
    .requiredOption('-n, --name <name>', 'name of podcast')
    .action(async (options) => {
        let podcasts = await searchPodcasts(options.name);

        podcasts.forEach(podcast => {
            console.log(podcast.name)
            Object.keys(podcast)
                .filter(key => podcast[key] != undefined)
                .filter(key => ["genre", "latestRelease", "nbrOfEpisodes", "feedUrl"].includes(key))
                .forEach(key => console.log(` ${key}: ${podcast[key]}`));
        });
    });

program.command('list')
    .description('display episode list')
    .requiredOption('-u, --url <url>', 'url to podcast feed')
    .action(async (options) => {
        let episodes = await getEpisodeList(options.url);
        episodes.forEach((episode, i) => {
            console.log(`${(episodes.length - i)}. ${episode.title}`)
            Object.keys(episode)
                .filter(key => ["pubDate", "url", "duration", "size"].includes(key))
                .filter(key => episode[key] != undefined)
                .forEach(key => console.log(` ${key}: ${episode[key]}`));
            console.log("\n")
        });
    });

program.command('download')
    .description('download episodes from a feed')
    .requiredOption('-u, --url <url>', 'url to podcast feed')
    .requiredOption('-d, --directory <directory>', 'destination of downloads', parseDirectory)
    .option('-e, --episodes <number|range>', 'podcasts to download', parseEpisodeRange)
    .action(async (options) => {
        // make episodes chronological order (lowest = oldest)
        const episodes = (await getEpisodeList(options.url)).reverse();

        let toDownload = [];
        if (!options.episodes) {
            toDownload = episodes;
        } else {
            const isTakeLatest = options.episodes.to == undefined;

            const firstEpisodeNbr = isTakeLatest
                ? episodes.length + options.episodes.from // from is negative
                : options.episodes.from;
            const lastEpisodeNbr = isTakeLatest
                ? episodes.length
                : options.episodes.to;

            toDownload = episodes
                .slice(firstEpisodeNbr - 1, lastEpisodeNbr)
        }

        console.log(`Downloading ${toDownload.length} episodes..`);
        await downloadEpisodes(toDownload, options.directory);
    });

program.parse();
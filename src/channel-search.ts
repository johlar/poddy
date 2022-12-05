import axios from 'axios';
import { IChannelSearchResult } from "./models";
import crypto from "crypto"

const iTunesSearchUrl = (searchTerm: string) => {
    // https://performance-partners.apple.com/resources/documentation/itunes-store-web-service-search-api.html#searching
    const formatted = encodeURI(searchTerm.replace(" ", "+"));
    return `https://itunes.apple.com/search?entity=podcast&term=${formatted}`;
}

const podcastIndexAuthHeader = (apiKey: string, apiSecret: string, epochSeconds: number) => {
    const sha1Hash = crypto.createHash("sha1")
    var message = apiKey + apiSecret + epochSeconds;
    sha1Hash.update(message);
    return sha1Hash.digest('hex')
}

const iTunesSearch = async (searchTerm: string) => {
    try {
        const response = await axios.get(iTunesSearchUrl(searchTerm));
        const results = response.data.results
            .flatMap((item: any) => {
                try {
                    return [{
                        name: item.artistName,
                        genre: item.primaryGenreName,
                        latestRelease: item.releaseDate,
                        nbrOfEpisodes: item.trackCount,
                        feedUrl: item.feedUrl,
                    }]
                }
                catch (err) {
                    console.error(`Error parsing search results, omitting 1 result. ${err}`)
                    return []
                }
            })
        return results;
    } catch (err: any) {
        console.error(`Failed to search for podcasts with iTunes (${err.message})`);
        return [];
    }
}

const podcastIndexSearch = async (searchTerm: string, searchEngineConfig: any) => {
    const apiKey = searchEngineConfig?.PodcastIndex?.apiKey
    const apiSecret = searchEngineConfig?.PodcastIndex?.apiSecret
    const now = Math.floor(Date.now() / 1000)

    if (!apiKey || !apiSecret) {
        throw new Error("Missing apiKey or apiSecret for PodcastIndex, check the search engine configuration.")
    }

    try {
        const url = `https://api.podcastindex.org/api/1.0/search/byterm?q=${encodeURI(searchTerm)}`
        const response = await axios.get(url, {
            headers: {
                "Content-Type": "application/json",
                "X-Auth-Date": now,
                "X-Auth-Key": apiKey,
                "Authorization": podcastIndexAuthHeader(apiKey, apiSecret, now),
                "User-Agent": "Poddy CLI"
            }
        });
        const results = response.data.feeds
            .flatMap((feed: any) => {
                try {
                    return [{
                        name: feed.title,
                        genre: feed.categories == null ? [] : Object.keys(feed.categories).map(key => feed.categories[key]).join(", "),
                        latestRelease: new Date(feed.lastUpdateTime * 1000),
                        nbrOfEpisodes: feed.episodeCount,
                        feedUrl: feed.originalUrl,
                    }]
                } catch (err) {
                    console.error(`Error parsing search results, omitting 1 result. ${err}`)
                    return []
                }
            })
        return results;
    } catch (err: any) {
        console.error(`Failed to search for podcasts with PodcastIndex (${err.message})`);
        return [];
    }
}

const searchChannels = async (
    searchTerm: string,
    searchEngine: "iTunes" | "PodcastIndex",
    searchEngineConfig: any
): Promise<Array<IChannelSearchResult>> => {
    if (searchEngine === "iTunes") {
        return iTunesSearch(searchTerm)
    }

    if (searchEngine === "PodcastIndex") {
        return podcastIndexSearch(searchTerm, searchEngineConfig)
    }

    // if the search engine param is taken from the config file, it could be anything
    console.error("Search function called with unknown search engine. Check your configuration file.")
    return []
}

export { searchChannels };
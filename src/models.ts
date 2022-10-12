interface Metadata {
    poddy: {
        version: string
    }
    episodes: {
        [key: string]: {
            title: string,
            enclosure: boolean,
            shownotes: boolean
        }
    }
}

interface IChannelSearchResult {
    name: string,
    genre: string,
    latestRelease: Date,
    nbrOfEpisodes: number,
    feedUrl: string
}

interface IEpisode {
    title: string,
    pubDate: Date,
    guid: string,
    duration: string,
    size: string,
    url: string,
    episodeNo?: number
    description: string,
    imageUrl: string,
    raw: string
}

interface IChannel {
    episodes: Array<IEpisode>
    title: string
    raw: any
}

export {
    IEpisode,
    IChannel,
    IChannelSearchResult,
    Metadata
}
import axios from 'axios';
import { xml2json } from 'xml-js';

interface Episode {
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

const sorted = (episodes: Array<Episode>): Array<Episode> => {
    // some feeds may not follow reverse chronological/latest first

    const episodeNumbersArePresent = episodes.filter(e => e.episodeNo).length == episodes.length
    if (episodeNumbersArePresent) {
        return episodes.sort((a, b) => b.episodeNo! - a.episodeNo!);
    }

    const pubDatesArePresent = episodes.filter(e => e.pubDate).length == episodes.length
    const pubDatesAreDistinct = new Set(episodes.map(e => e.pubDate)).size == episodes.length
    if (pubDatesArePresent && pubDatesAreDistinct) {
        return episodes.sort((a, b) => b.pubDate!.getTime() - a.pubDate!.getTime());
    }

    return episodes;
}

const parseEpisode = (feedItem: any): Episode => {
    const description = feedItem.description._cdata ?? feedItem['itunes:summary']?._text ?? "";
    const sizeMb = (feedItem.enclosure._attributes.length / 1024 / 1024).toFixed(1);
    const episodeNo = parseInt(feedItem['itunes:episode']?._text, 10);
    return {
        title: feedItem.title._cdata ?? feedItem.title?._text,
        pubDate: new Date(Date.parse(feedItem.pubDate._text)),
        guid: feedItem.guid?._cdata ?? feedItem.guid._text,
        duration: feedItem['itunes:duration']?._text,
        size: `${sizeMb} MB`,
        url: feedItem.enclosure._attributes.url,
        episodeNo: !isNaN(episodeNo) ? episodeNo : undefined,
        description,
        imageUrl: feedItem['itunes:image']?._attributes.href,
        raw: JSON.stringify(feedItem, null, 2)
    }
}

const getEpisodeList = async (feedUrl: string): Promise<Array<Episode>> => {
    const response = await axios.get(feedUrl);
    const xml = response.data;
    const json = JSON.parse(xml2json(xml, { compact: true }));
    const feedItems = json.rss.channel.item;

    if (feedItems instanceof Array) {
        const episodes = feedItems
            .filter((feedItem: any) => undefined != feedItem.enclosure) // remove items which are not podcasts, like ads/promos
            .map(parseEpisode);
        return sorted(episodes);
    } else {
        return [parseEpisode(feedItems)]
    }
}

export { getEpisodeList, Episode };
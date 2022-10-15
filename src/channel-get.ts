import axios from 'axios';
import { xml2json } from 'xml-js';
import { IEpisode, IChannel } from "./models";

const parseEpisode = (feedItem: any): IEpisode => {
    const description = feedItem['itunes:summary']?._text ?? feedItem.description?._cdata ?? feedItem.description?._text ?? "";
    const sizeMb = (feedItem.enclosure._attributes.length / 1024 / 1024).toFixed(1);
    const episodeNo = parseInt(feedItem['itunes:episode']?._text, 10);
    return {
        title: (feedItem.title._cdata ?? feedItem.title?._text ?? "").trim(),
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

const parseChannel = (json: any): IChannel => {
    const feedItems = json.rss.channel.item;
    const channel = json.rss.channel;

    if (feedItems instanceof Array) {
        const episodes = feedItems
            .filter((feedItem: any) => undefined != feedItem.enclosure) // remove items which are not podcasts, like ads/promos
            .map(parseEpisode)
            .reverse(); // make into chronological order
        return { title: (channel.title?._cdata ?? channel?.title?._text ?? "").trim(), raw: channel, episodes };
    } else {
        return { title: (channel.title?._cdata ?? channel?.title?._text ?? "").trim(), raw: channel, episodes: [parseEpisode(feedItems)] };
    }
}

const getChannel = async (feedUrl: string): Promise<IChannel> => {
    const response = await axios.get(feedUrl);
    const xml = response.data;
    const json = JSON.parse(xml2json(xml, { compact: true }));
    return parseChannel(json);
}

export { getChannel };
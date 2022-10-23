import axios from 'axios';
import { IChannel } from "./models";
import { DOMParser } from '@xmldom/xmldom';

const channelXmlWithoutEpisodes = (doc: Document) => {
    const docCopy = doc.cloneNode(true) as Document;

    const items = docCopy.getElementsByTagName("item")
    for (let i = 0; i < items.length; i++) {
        docCopy.removeChild(items[i])
    }
    return docCopy.toString();
}
const toArray = (anything: any) => {
    const res = [];
    for (let i = 0; i < anything.length; i++) {
        res.push(anything[i]);
    }
    return res;
}

const parseChannel = (doc: Document): IChannel => {
    return {
        title: (doc.getElementsByTagName("title")[0]?.textContent ?? "").trim(),
        raw: channelXmlWithoutEpisodes(doc),
        imageUrl: doc.getElementsByTagName("itunes:image")[0]?.getAttribute("href") || undefined,
        episodes: toArray(doc.getElementsByTagName("item"))
            .filter((item: any) => item.getElementsByTagName("enclosure").length > 0) // remove items which are not podcasts, like ads/promos
            .map((item: any) => {
                const contentEncoded = item.getElementsByTagName("content:encoded")[0]?.textContent ?? "";
                const summary = item.getElementsByTagName("itunes:summary")[0]?.textContent ?? "";

                const description: string = (contentEncoded ?? summary).trim();
                const sizeMb: string = (parseInt(item.getElementsByTagName("enclosure")[0].getAttribute("length")) / 1024 / 1024).toFixed(1);
                const episodeNo: number | undefined = parseInt(item.getElementsByTagName("itunes:episode")[0]?.textContent || "", 10) || undefined;
                return {
                    title: (item.getElementsByTagName("title")[0]?.textContent ?? "").trim(),
                    pubDate: new Date(Date.parse(item.getElementsByTagName("pubDate")[0]?.textContent)),
                    guid: item.getElementsByTagName("guid")[0]?.textContent,
                    duration: item.getElementsByTagName("itunes:duration")[0]?.textContent,
                    size: `${sizeMb} MB`,
                    url: item.getElementsByTagName("enclosure")[0]?.getAttribute('url'),
                    episodeNo: episodeNo,
                    description: description,
                    imageUrl: item.getElementsByTagName("itunes:image")[0]?.getAttribute('href'),
                    raw: item.toString()
                }
            })
            .reverse() // make into chronological order
    };
}

const getChannel = async (feedUrl: string): Promise<IChannel> => {
    const response = await axios.get(feedUrl);
    const text = response.data;
    const doc = new DOMParser().parseFromString(text);

    return parseChannel(doc);
}

export { getChannel };
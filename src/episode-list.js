const axios = require('axios');
var xmlJs = require('xml-js');

const sorted = (episodes) => {
    // some feeds may not follow reverse chronological/latest first

    const episodeNumbersArePresent = episodes.filter(e => e.episodeNo).length == episodes.length
    if (episodeNumbersArePresent) {
        return episodes.sort((a, b) => b.episodeNo - a.episodeNo);
    }

    const pubDatesAreDistinct = new Set(episodes.map(e => e.pubDate)).size == episodes.length
    if (pubDatesAreDistinct) {
        return episodes.sort((a, b) => b.pubDate - a.pubDate);
    }
    
    return episodes;
}

const getEpisodeList = async (feedUrl) => {
    const response = await axios.get(feedUrl);
    const xml = response.data;
    const json = JSON.parse(xmlJs.xml2json(xml, { compact: true }));

    const episodes = json.rss.channel.item
        .filter(feedItem => undefined != feedItem.enclosure) // remove items which are not podcasts, like ads/promos
        .map(feedItem => {
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
        });
    return sorted(episodes);
}

module.exports = getEpisodeList;
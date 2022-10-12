import axios from 'axios';
import { IChannelSearchResult } from "./models";

const iTunesSearchUrl = (searchTerm: string) => {
    // https://performance-partners.apple.com/resources/documentation/itunes-store-web-service-search-api.html#searching
    const formatted = encodeURI(searchTerm.replace(" ", "+"));
    return `https://itunes.apple.com/search?entity=podcast&term=${formatted}`;
}

const searchChannels = async (searchTerm: string): Promise<Array<IChannelSearchResult>> => {
    try {
        const response = await axios.get(iTunesSearchUrl(searchTerm));
        const results = response.data.results
            .map((item: any) => ({
                name: item.artistName,
                genre: item.primaryGenreName,
                latestRelease: item.releaseDate,
                nbrOfEpisodes: item.trackCount,
                feedUrl: item.feedUrl,
            }))
        return results;
    } catch (err: any) {
        console.error(`Failed to search for podcasts (${err.message})`);
        return [];
    }
}

export { searchChannels };
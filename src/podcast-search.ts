import axios from 'axios';

interface PodcastSearchResult {
    name: string,
    genre: string,
    latestRelease: Date,
    nbrOfEpisodes: number,
    feedUrl: string
}

const iTunesSearchUrl = (searchTerm: string) => {
    // https://performance-partners.apple.com/resources/documentation/itunes-store-web-service-search-api.html#searching
    var formatted = encodeURI(searchTerm.replace(" ", "+"));
    return `https://itunes.apple.com/search?entity=podcast&term=${formatted}`;
}

const searchPodcasts = async (searchTerm: string): Promise<Array<PodcastSearchResult>> => {
    try {
        var response = await axios.get(iTunesSearchUrl(searchTerm));
        var results = response.data.results
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

export { searchPodcasts, PodcastSearchResult };
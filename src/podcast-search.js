const axios = require('axios');

const iTunesSearchUrl = (searchTerm) => {
    // https://performance-partners.apple.com/resources/documentation/itunes-store-web-service-search-api.html#searching
    var formatted = encodeURI(searchTerm.replace(" ", "+"));
    return `https://itunes.apple.com/search?entity=podcast&term=${formatted}`;
}

const searchPodcasts = async (searchTerm) => {
    try {
        var response = await axios.get(iTunesSearchUrl(searchTerm));
        var results = response.data.results
            .map(item => ({
                name: item.artistName,
                genre: item.primaryGenreName,
                latestRelease: item.releaseDate,
                nbrOfEpisodes: item.trackCount,
                feedUrl: item.feedUrl,
            }))
        return results;
    } catch (err) {
        console.error(`Failed to search for podcasts (${err.message})`);
        return [];
    }
}

module.exports = searchPodcasts;
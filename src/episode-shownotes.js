const fs = require("fs");
const fsAsync = require("fs/promises");
const he = require('he');
const axios = require("axios");
const version = require('../package.json').version;

let cache = {};
const base64Data = async (imageUrl) => {
    if (cache[imageUrl]) {
        return cache[imageUrl];
    }
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        if (response.status == 200) {
            const base64 = "data:" + response.headers["content-type"] + ";base64," + Buffer.from(response.data).toString('base64');

            // don't let cache grow forever
            if (Object.keys(cache).length > 500) {
                cache = {};
            }
            cache[imageUrl] = base64;

            return base64;
        }
    } catch (err) {
        console.error(`Failed to fetch image: ${imageUrl}`, err.message);
    }
    return null;
}

const createHtml = async (episode) => {
    const propertyHtml = (property, svgUrl) => {
        if (!property) { return ""; }
        return `<span class="d-inline-block"><object class="px-2" data="${svgUrl}" type="image/svg+xml"></object>${he.encode(property)}</span>`
    }
    // download image to be immune to dying links
    const image = await base64Data(episode.imageUrl);
    
    return `
        <!doctype html>
            <html lang="en">
            <head>
                <meta charset="utf-8">
                <title>${he.encode(episode.title)}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.2/dist/css/bootstrap.min.css" rel="stylesheet"
                integrity="sha384-Zenh87qX5JnK2Jl0vWa8Ck2rdkQ2Bzep5IDxbcnCeuOxjzrPF/et3URy9Bv1WTRi" crossorigin="anonymous">
            </head>
            <body>
                <div class="container">
                    <div class="row justify-content-md-center py-4">
                        <div class="col-auto pb-2">
                            ${image == null ? "" : `<img alt="${episode.title}" src="${image}" height="100" class="rounded"></img>`}
                        </div>
                        <div class="col-auto">
                            <h1>${he.encode(episode.title)}</h1>
                            <div class="pb-2">
                                ${propertyHtml(episode.pubDate?.toDateString(), "https://icons.getbootstrap.com/assets/icons/calendar.svg")}
                                ${propertyHtml(episode.duration, "https://icons.getbootstrap.com/assets/icons/stopwatch.svg")}
                                ${propertyHtml(episode.size, "https://icons.getbootstrap.com/assets/icons/hdd.svg")}
                                ${propertyHtml(episode.episodeNo, "https://icons.getbootstrap.com/assets/icons/list.svg")}
                            </div>
                            <div class="py-2">
                                <p>${episode.description}</p>
                            </div>
                            <button type="button" class="btn btn-outline-secondary float-end" data-bs-toggle="modal" data-bs-target="#rawDataModal">
                                Details
                            </button>
                        </div>
                    </div>
                </div>
                <!-- Modal -->
                <div class="modal fade" id="rawDataModal" tabindex="-1" aria-labelledby="rawDataModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h1 class="modal-title fs-5" id="rawDataModalLabel">${he.encode(episode.title)}</h1>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <pre class="py-2">${he.encode(episode.raw)}</pre>
                            </div>
                            <div class="modal-footer text-muted">
                                <a href="https://github.com/johlar/poddy" target="_blank">Poddy ${version}</a>
                            </div>                    
                        </div>
                    </div>
                </div>
                <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.2/dist/js/bootstrap.bundle.min.js"
                integrity="sha384-OERcA2EqjJCMA+/3y+gxIOqMEjwtxJY7qPCqsdltbNJuaOe923+mo//f6V8Qbsw3"
                crossorigin="anonymous"></script>
            </body>
        </html>`
}

const saveShownotes = async (episode, fullPath) => {
    if (fs.existsSync(fullPath)) {
        console.log(`Skipping shownotes because file already exist at ${fullPath}`);
        return Promise.reject();
    }
    return await fsAsync.writeFile(fullPath, await createHtml(episode));
}

module.exports = saveShownotes;
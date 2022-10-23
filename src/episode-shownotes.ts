import { IChannel, IEpisode } from "./models";
import * as fs from "fs";
import * as fsAsync from "fs/promises";
import * as he from 'he';
import axios from "axios";
import { APP_VERSION } from "./version"

let cache: { [key: string]: any } = {};
const base64Data = async (imageUrl: string): Promise<string> => {
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
    } catch (err: any) {
        console.error(`Failed to fetch image: ${imageUrl}`, err.message);
    }
    return "";
}

const createHtml = async (episode: IEpisode, channel: IChannel): Promise<string> => {
    const propertyHtml = (property: any, svgUrl: string) => {
        if (!property) { return ""; }
        return `<span class="d-inline-block"><object class="px-2" data="${svgUrl}" type="image/svg+xml"></object>${he.encode(property.toString())}</span>`
    }
    // download image to be immune to dying links
    let image = "";
    if (episode.imageUrl) { image = await base64Data(episode.imageUrl) }
    if (channel.imageUrl) { image = await base64Data(channel.imageUrl) }

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
                        <div class="col-md-auto pb-2 mt-2">
                            ${image == "" ? "" : `<img alt="${episode.title}" src="${image}" height="200" class="rounded mx-auto d-block"></img>`}
                        </div>
                        <div class="col-auto col-md-6">
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
                            <button type="button" class="btn btn-outline-secondary float-end mx-4" data-bs-toggle="modal" data-bs-target="#rawChannelModal">
                                Channel Details
                            </button>
                            <button type="button" class="btn btn-outline-secondary float-end" data-bs-toggle="modal" data-bs-target="#rawEpisodeModal">
                                Episode Details
                            </button>
                        </div>
                    </div>
                </div>
                <!-- Raw Episode Modal -->
                <div class="modal fade" id="rawEpisodeModal" tabindex="-1" aria-labelledby="rawEpisodeModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h1 class="modal-title fs-5" id="rawEpisodeModalLabel">${he.encode(episode.title)}</h1>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <pre class="py-2">${he.escape(episode.raw)}</pre>
                            </div>
                            <div class="modal-footer text-muted">
                                Generated at ${new Date(Date.now()).toISOString()} with <a href="https://github.com/johlar/poddy" target="_blank">Poddy ${APP_VERSION}</a>
                            </div>                    
                        </div>
                    </div>
                </div>
                <!-- Raw Channel Modal -->
                <div class="modal fade" id="rawChannelModal" tabindex="-1" aria-labelledby="rawChannelModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h1 class="modal-title fs-5" id="rawChannelModalLabel">${he.encode(channel.title)}</h1>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <pre class="py-2">${he.escape(channel.raw)}</pre>
                            </div>
                            <div class="modal-footer text-muted">
                                Generated at ${new Date(Date.now()).toISOString()} with <a href="https://github.com/johlar/poddy" target="_blank">Poddy ${APP_VERSION}</a>
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

const saveShownotes = async (episode: IEpisode, channel: IChannel, fullPath: string): Promise<void> => {
    if (fs.existsSync(fullPath)) {
        return Promise.reject(`File already exist at ${fullPath}`);
    }
    try {
        return await fsAsync.writeFile(fullPath, await createHtml(episode, channel));
    } catch (err: any) {
        console.error(err);
        return Promise.reject(err.message);
    }
}

export { saveShownotes };
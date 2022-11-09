import { getChannel } from "./channel-get";
import { downloadEpisodes } from "./episode-download";

const DOWNLOAD_QUEUE_CHECK_INTERVAL = 500;
const MAX_PARALLELL_DOWNLOADS = 5;

interface ISubscription { url: string, interval: number, includeShownotes: boolean }
interface IDownloadQueueItem { id: string, task: () => Promise<any> }
interface IActiveDownloadItem { id: string, task: Promise<any> }

const queueChannelCheck = async (
    subscription: ISubscription,
    directory: string,
    downloadQueue: Array<IDownloadQueueItem>,
    activeDownloads: Array<IActiveDownloadItem>,
    signal: AbortSignal
): Promise<void> => {
    return getChannel(subscription.url)
        .then(channel => {
            if (!downloadQueue.find(entry => subscription.url == entry.id) && !activeDownloads.find(entry => subscription.url == entry.id)) {
                downloadQueue.push({
                    id: subscription.url,
                    task: () => downloadEpisodes(channel, 1, channel.episodes.length - 1, directory, subscription.includeShownotes, signal)
                })
            }
        })
};

const actOnDownloadQueue = (
    downloadQueue: Array<IDownloadQueueItem>,
    activeDownloads: Array<IActiveDownloadItem>,
    onAbort: () => any,
    signal: AbortSignal
): void => {
    if (signal.aborted) {
        onAbort();
    }
    while (downloadQueue.length > 0 && activeDownloads.length < MAX_PARALLELL_DOWNLOADS && !signal.aborted) {
        const queueItem = downloadQueue.pop()!;
        activeDownloads.push({
            id: queueItem.id,
            task: queueItem.task()
                .finally(() => {
                    if (!signal.aborted) {
                        const thisTaskIndex = activeDownloads.findIndex(e => e.id === queueItem.id);
                        activeDownloads.splice(thisTaskIndex, 1);
                    }
                })
        });
    }
}
const subscribe = async (
    subscriptions: Array<ISubscription>,
    directory: string,
    signal: AbortSignal
): Promise<void> => {
    const downloadQueue: Array<IDownloadQueueItem> = [];
    const activeDownloads: Array<IActiveDownloadItem> = [];
    const channelCheckingIntervals: Array<NodeJS.Timer> = [];

    for (let i = 0; i < subscriptions.length; i++) {
        const sub = subscriptions[i];
        // queue channel immediately
        queueChannelCheck(sub, directory, downloadQueue, activeDownloads, signal);
        // thereafter on interval
        channelCheckingIntervals.push(
            setInterval(
                () => queueChannelCheck(sub, directory, downloadQueue, activeDownloads, signal),
                sub.interval * 1000
            )
        );
    }

    const onAbort = () => {
        clearInterval(downloadInterval);
        channelCheckingIntervals.forEach(interval => clearInterval(interval));
    }

    const downloadInterval = setInterval(
        () => actOnDownloadQueue(downloadQueue, activeDownloads, onAbort, signal),
        DOWNLOAD_QUEUE_CHECK_INTERVAL
    )

    await Promise.allSettled(activeDownloads.map(download => download.task));
}

export {
    ISubscription,
    subscribe
}
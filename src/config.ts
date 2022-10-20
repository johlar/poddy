import * as fs from 'fs';
import * as path from "path";

interface IConfig {
    downloadDirectory?: string,
    includeShownotes?: boolean,
}

interface ISubscriptionConfig {
    subscriptions: Array<{
        url: string,
        includeShownotes?: boolean,
        interval?: number
    }>
}

const initialConfig: IConfig = {
    downloadDirectory: path.resolve(process.env.HOME + "/Podcasts"),
    includeShownotes: true
};

const initialSubscriptions: ISubscriptionConfig = {
    subscriptions: []
}

const readConfig = (fullPath: string, generateIfMissing: boolean): IConfig => {
    try {
        if (!fs.existsSync(fullPath) && generateIfMissing) {
            console.log(`Configuration file not found. Generating one at: ${fullPath}`)
            fs.mkdirSync(path.dirname(fullPath), {recursive: true});
            fs.writeFileSync(fullPath, JSON.stringify(initialConfig, undefined, 2))
            // if config was auto-created, also make sure the suggested directory exists
            if (!fs.existsSync(initialConfig.downloadDirectory!)) {
                fs.mkdirSync(initialConfig.downloadDirectory!, { recursive: true })
            }
        }
        return JSON.parse(fs.readFileSync(fullPath).toString());
    } catch (err: any) {
        throw new Error(`Could not read or write config file '${fullPath}'. ${err.message}`)
    }
}

const readSubscriptions = (fullPath: string, generateIfMissing: boolean): ISubscriptionConfig => {
    try {
        if (!fs.existsSync(fullPath) && generateIfMissing) {
            console.log(`Subscriptions file not found. Generating one at: ${fullPath}`)
            fs.mkdirSync(path.dirname(fullPath), {recursive: true});
            fs.writeFileSync(fullPath, JSON.stringify(initialSubscriptions, undefined, 2))
        }
        return JSON.parse(fs.readFileSync(fullPath).toString());
    } catch (err: any) {
        throw new Error(`Could not read or write subscriptions file '${fullPath}'. ${err.message}`)
    }
}

const readConfigs = (): { config: IConfig, subscriptions: ISubscriptionConfig } => {
    let config: IConfig;
    let subscriptions: ISubscriptionConfig;

    if (process.env.PODDY_CONFIG_FILE) {
        console.log(`Environment variable 'PODDY_CONFIG_FILE' set, looking for configuration file: ${process.env.PODDY_CONFIG_FILE}`)
        config = readConfig(process.env.PODDY_CONFIG_FILE as string, true);
    } else {
        config = readConfig(path.join(process.env.HOME as string, "/.config/poddy/config.json"), true)
    }

    if (process.env.PODDY_SUBSCRIPTIONS_FILE) {
        console.log(`Environment variable 'PODDY_SUBSCRIPTIONS_FILE' set, looking for subscriptions file: ${process.env.PODDY_CONFIG_FILE}`)
        subscriptions = readSubscriptions(process.env.PODDY_SUBSCRIPTIONS_FILE as string, true);
    } else {
        subscriptions = readSubscriptions(path.join(process.env.HOME as string, "/.config/poddy/subscriptions.json"), true)
    }

    return { config, subscriptions };
}

export {
    readConfigs,
    ISubscriptionConfig,
    IConfig
}
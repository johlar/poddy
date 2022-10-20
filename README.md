# Poddy - CLI Podcast Downloader

**NOTE! Poddy is still in BETA. Semantic versioning is not enforced and non-backwards compatible changes may be released at any time.** 

This command line tool downloads podcast episodes from an RSS feed.

I originally made Poddy for my own use to help me archive my favorite podcasts. I'm hoping it might be useful for other data hoarders out there! 📦📚

Let me know if you encounter any issues and feel free to open an issue or submit a PR.

## Table of Contents
+ [Features](#features)
+ [Installing](#installing)
+ [Examples](#examples)
+ [Configuration](#configuration)
    + [config.json](#configjson)
    + [subscriptions.json](#subscriptionsjson)
+ [Limitations](#limitations)
+ [Uninstalling](#uninstalling)
+ [Development](#development)

## Features

- Download episodes from a feed URL with flexible selections: earliest, latest, range, or all episodes
- Subscribe to feeds and continously download new episodes
- Download future-safe shownotes that are not susceptible to dead links. They are formatted as HTML but also contain the raw episode data for completeness.
- Search and find the feed URL from a show name
- List episodes from a feed URL

## Installing
```sh
# 1. Clone this repo
git clone https://github.com/johlar/poddy.git

# 2. Install, build and package the application
cd poddy && npm install && npm package

# 3. Make it available in your shell 
npm link

# 4. Verify that it works! 
poddy --version
```

When running Poddy for the first time, a configuration file and subscriptions file will be generated for you. See [Configuration](#subscriptions).

## Examples

Show all available commands
```
poddy --help
```

Find a feed to download from
```
poddy search --name "Self-Hosted"
```

Download all episodes from a feed
```
poddy download --url "https://example.com/rss"
```

Download 5 latest episodes from a feed
```
poddy download --url "https://example.com/rss" --episodes -5
```

Download the earliest 2 episodes from a feed
```
poddy download --url "https://example.com/rss" --episodes 2
```

Download a range of episodes from a feed
```
poddy download --url "https://example.com/rss" --episodes 10-15
```

Subscribe to two feeds and continously download episodes. However using [subscriptions.json](#subscriptionsjson) is recommended for convenience and versatility.
```
poddy subscribe --urls "https://example1.com/rss" "https://example2.com/rss"
```

## Configuration

Poddy uses two configuration files: `config.json` and `subscriptions.json`. By default they will be in `~/.config/poddy/`. This location can be overridden with the environment variables _PODDY_CONFIG_FILE_ and _PODDY_SUBSCRIPTIONS_FILE_.

### config.json
The properties in config.json will be used if no corresponding CLI arguments are passed.

Example:
```json
{
  "downloadDirectory": "/Users/me/Podcasts",
  "includeShownotes": true
}
```

### subscriptions.json

You can use subscriptions.json to configure your podcast subscriptions, and then simply run `poddy subscribe` in your terminal.

For each subscription object:

`url` property is **required** and should be the podcast feed URL. To find a feed URL, you can use `poddy search --name "the podcast name"`.

`interval` is optional and decides the number of seconds beteween each feed refresh. Default: 600.

`includeShownotes` is optional and decides whether to download the shownotes. If not set, the value must be set in config.json or passed as a CLI argument. 

Example: 
```json
{
    "subscriptions": [
        {
            "url": "https://example1.com/rss",
        },
        {
            "url": "https://example2.com/rss",
            "interval": 7200,
            "includeShownotes": false
        }
    ]
}
```
## Limitations

- Output formatting is very basic
- Only supports iTunes as a search provider for finding feed URLs

## Uninstalling

Removing Poddy is super simple. Just delete the downloaded repository and then remove the symlink by running: `npm r poddy -g`

## Development

When passing arguments in local development, don't forget the separator (e.g. `npm run start -- search --name "some podcast"`). Local gitignored configuration files for development will be generated in the base directory on the first run.

# Poddy - CLI Podcast Downloader

**NOTE! Poddy is still in BETA. Semantic versioning is not enforced and non-backwards compatible changes may be released at any time.** 

This command line tool downloads podcast episodes from an RSS feed.

I originally made Poddy for my own use to help me archive my favorite podcasts. I'm hoping it might be useful for other data hoarders out there! 📦📚

Let me know if you encounter any issues and feel free to open an issue or submit a PR.

## Table of Contents
- [Features](#features)
- [Installing](#installing)
- [Examples](#examples)
- [Limitations](#limitations)
- [Uninstalling](#uninstalling)
- [Development](#development)

## Features

- Download episodes from a feed URL with flexible selections: earliest, latest, range, or all episodes
- Subscribe to feeds and continously download new episodes
- Download future-safe shownotes that are not susceptible to dead links. They are formatted as HTML but also contain the raw episode data for completeness.
- Search and find the feed URL from a show name
- List episodes from a feed URL

## Installing

1. Clone this repo

`git clone https://github.com/johlar/poddy.git`

2. Install, build and package the application

`cd poddy && npm install && npm package`

3. Make it available in your shell

`npm link`

4. Verify that it works! 

`poddy --version`

## Examples

Show all available commands:

`poddy --help`

Find a feed to download from:

`poddy search --name "Self-Hosted"`

Download all episodes from a feed:

`poddy download --url "https://feeds.fireside.fm/selfhosted/rss" --directory "~/podcasts"`

Download all episodes from a feed including shownotes:

`poddy download --url "https://feeds.fireside.fm/selfhosted/rss" --directory "~/podcasts" --shownotes`

Download 5 latest episodes from a feed

`poddy download --url "https://feeds.fireside.fm/selfhosted/rss" --directory "~/podcasts" --episodes -5`

Download first episode from a feed:

`poddy download --url "https://feeds.fireside.fm/selfhosted/rss" --directory "~/podcasts" --episodes 1`

Download a range of episodes from a feed:

`poddy download --url "https://feeds.fireside.fm/selfhosted/rss" --directory "~/podcasts" --episodes 10-15`

Subscribe to two feeds and continously download episodes and shownotes every 20 minutes:

`poddy subscribe --urls "https://feeds.fireside.fm/selfhosted/rss" "https://feeds.megaphone.fm/darknetdiaries" --interval 1200 --directory ~/podcasts --shownotes`
## Limitations

- Output formatting is very basic
- Only supports iTunes as a search provider for finding feed URLs

## Uninstalling

Removing Poddy is super simple. Just delete the downloaded repository and then remove the symlink by running: `npm r poddy -g`

## Development

When passing arguments in local development, don't forget the separator (e.g. `npm run start -- search --name "some podcast"`).

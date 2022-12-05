import { searchChannels } from "../src/channel-search";
import { describe, it } from "mocha";
import { expect } from "chai";
import iTunesMockResult from "./data/search-result-itunes"
import PodcastIndexMockResult from "./data/search-result-podcastindex"
import sinon, { SinonSandbox } from "sinon";
import axios from "axios";

describe('Search Channels', () => {
    let config: any;
    let axiosStub: any;
    let sandbox: SinonSandbox;

    before(() => {
        // arbitrary but reproducible
        sinon.useFakeTimers(1670258395)
    })

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    it(`Should parse results from PodcastIndex`, async () => {
        givenSearchEngineConfig({ PodcastIndex: { apiKey: "APIKEY123123123123", apiSecret: "apisecret123" } });
        givenHttpCallReturns(PodcastIndexMockResult)

        const result = await searchChannels("some keyword", "PodcastIndex", config)

        expect(result).to.have.lengthOf(PodcastIndexMockResult.data.count)
    });

    it(`Should make expected search query to PodcastIndex`, async () => {
        givenSearchEngineConfig({ PodcastIndex: { apiKey: "APIKEY123123123123", apiSecret: "apisecret123" } });
        givenHttpCallReturns(PodcastIndexMockResult)

        const searchTerm = "Åäö_ #!?"
        await searchChannels(searchTerm, "PodcastIndex", config)

        expect(axiosStub.calledOnceWith(
            "https://api.podcastindex.org/api/1.0/search/byterm?q=%C3%85%C3%A4%C3%B6_%20#!?",
            {
                headers: {
                    "Authorization": "ca0eed614d0940749b06b87ac9539dd699ff914a",
                    "Content-Type": "application/json",
                    "User-Agent": "Poddy CLI",
                    "X-Auth-Date": 1670258,
                    "X-Auth-Key": "APIKEY123123123123"
                }
            })
        ).to.be.true
    });

    it(`Should parse results from iTunes`, async () => {
        givenHttpCallReturns(iTunesMockResult)

        const result = await searchChannels("some keyword", "iTunes", {})
        
        expect(result).to.have.lengthOf(iTunesMockResult.data.resultCount)
    });

    it(`Should make expected search query to iTunes`, async () => {
        givenHttpCallReturns(iTunesMockResult)

        const searchTerm = "Åäö_ #!?"
        await searchChannels(searchTerm, "iTunes", {})

        const expectedQuery = "https://itunes.apple.com/search?entity=podcast&term=%C3%85%C3%A4%C3%B6_+#!?"
        expect(axiosStub.calledOnceWith(expectedQuery)).to.be.true
    });

    afterEach(() => {
        sandbox.restore();
    });

    const givenHttpCallReturns = (result: any) => {
        axiosStub = sandbox.stub(axios, "get").callsFake(() => Promise.resolve(result))
    }

    const givenSearchEngineConfig = (conf: any) => {
        config = conf
    }
});

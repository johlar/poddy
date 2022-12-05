import { getChannel } from "../src/channel-get";
import { describe, it } from "mocha";
import chai, { expect } from "chai";
import chaiDateTime from "chai-datetime";
import sinon, { SinonSandbox } from "sinon";
import axios from "axios";
import { IChannel } from "../src/models";
import * as fs from "fs";
import { DOMParser } from '@xmldom/xmldom';

chai.use(chaiDateTime);

const getXmlForItem = (text: string, guid: string) => {
    const xml = new DOMParser().parseFromString(text);
    const items = xml.getElementsByTagName("item");
    for (let i = 0; i < items.length; i++) {
        if (items[i].getElementsByTagName("guid")[0]?.textContent === guid) {
            return items[i].toString();
        }
    }
    throw new Error(`misconfigured test - no item with guid '${guid}'`)
}

const getXmlForChannel = (text: string) => {
    const doc = new DOMParser().parseFromString(text);
    const docCopy = doc.cloneNode(true) as Document;

    const items = docCopy.getElementsByTagName("item")
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        let sibling = items[i].previousSibling
        // removes actual item
        docCopy.removeChild(item)
        // remove whitespaces before the item, because they are also valid nodes
        while (sibling?.nodeValue?.trim() === "") {
            const toBeRemoved = sibling;
            sibling = sibling.previousSibling;
            docCopy.removeChild(toBeRemoved);
        }
    }
    return docCopy.toString();
}

const testCases: Array<TestCase> = [
    {
        description: "Self-Hosted",
        xml: fs.readFileSync("./test/data/selfhosted.xml").toString(),
        expected: {
            title: "Self-Hosted",
            raw: getXmlForChannel(fs.readFileSync("./test/data/selfhosted.xml").toString()),
            imageUrl: "https://assets.fireside.fm/file/fireside-images/podcasts/images/7/7296e34a-2697-479a-adfb-ad32329dd0b0/cover.jpg",
            episodes: [
                {
                    title: "Self-Hosted Coming Soon",
                    pubDate: new Date(Date.parse("Tue, 27 Aug 2019 04:00:00 -0700")),
                    guid: "d1f1ab78-f5b4-441a-87f8-64fff2b78d1c",
                    duration: "2:11",
                    size: "2.1 MB",
                    url: "https://aphid.fireside.fm/d/1437767933/7296e34a-2697-479a-adfb-ad32329dd0b0/d1f1ab78-f5b4-441a-87f8-64fff2b78d1c.mp3",
                    episodeNo: undefined,
                    description: "<p>A new show that is your gateway to self hosting all the things. </p>\n\n<p>Discover new software, regain control of cloud services and own your data. Learn how you can take steps to free yourself from the agenda of large corporations and business models designed to sell your information. </p>\n\n<p>Join Alex and Chris on their Self Hosting journey on this new podcast from Jupiter Broadcasting. </p><p><a href=\"https://jupitersignal.memberful.com/checkout?plan=53744\" rel=\"payment\">Support Self-Hosted</a></p>",
                    imageUrl: undefined,
                    raw: getXmlForItem(fs.readFileSync("./test/data/selfhosted.xml").toString(), "d1f1ab78-f5b4-441a-87f8-64fff2b78d1c"),
                }
            ],
        }
    },
    {
        description: "The Daily",
        xml: fs.readFileSync("./test/data/thedaily.xml").toString(),
        expected: {
            title: "The Daily",
            raw: getXmlForChannel(fs.readFileSync("./test/data/thedaily.xml").toString()),
            imageUrl: "https://image.simplecastcdn.com/images/03d8b493-87fc-4bd1-931f-8a8e9b945d8a/2cce5659-f647-4366-b318-46e4b67afcfa/3000x3000/c81936f538106550b804e7e4fe2c236319bab7fba37941a6e8f7e5c3d3048b88fc5b2182fb790f7d446bdc820406456c94287f245db89d8656c105d5511ec3de.jpeg?aid=rss_feed",
            episodes: [
                {
                    title: "Coming Soon: “The Daily”",
                    pubDate: new Date(Date.parse("Tue, 17 Jan 2017 21:19:47 +0000")),
                    guid: "gid://art19-episode-locator/V0/dBmW5PqKxnbikwBHJNneTyAG_-Em4dVvrXuGQCBRNIw",
                    duration: "00:03:10",
                    size: "3.2 MB",
                    url: "https://dts.podtrac.com/redirect.mp3/chrt.fm/track/8DB4DB/pdst.fm/e/nyt.simplecastaudio.com/03d8b493-87fc-4bd1-931f-8a8e9b945d8a/episodes/0a40772a-b965-4e60-9673-85f0613a5e58/audio/128/default.mp3?aid=rss_feed&awCollectionId=03d8b493-87fc-4bd1-931f-8a8e9b945d8a&awEpisodeId=0a40772a-b965-4e60-9673-85f0613a5e58&feed=54nAGcIl",
                    episodeNo: undefined,
                    description: "<p>This is how the news should sound. Fifteen minutes a day. Five days a week. Hosted by Michael Barbaro. Powered by New York Times journalism. Starting Feb. 1.</p>",
                    imageUrl: "https://image.simplecastcdn.com/images/03d8b4/03d8b493-87fc-4bd1-931f-8a8e9b945d8a/0a40772a-b965-4e60-9673-85f0613a5e58/3000x3000/c81936f538106550b804e7e4fe2c236319bab7fba37941a6e8f7e5c3d3048b88fc5b2182fb790f7d446bdc820406456c94287f245db89d8656c105d5511ec3de.jpeg?aid=rss_feed",
                    raw: getXmlForItem(fs.readFileSync("./test/data/thedaily.xml").toString(), "gid://art19-episode-locator/V0/dBmW5PqKxnbikwBHJNneTyAG_-Em4dVvrXuGQCBRNIw"),
                },
                {
                    title: "Wednesday, Feb. 1, 2017",
                    pubDate: new Date(Date.parse("Wed, 1 Feb 2017 10:18:28 +0000")),
                    guid: "gid://art19-episode-locator/V0/8fJKNp6i648MNqY585bYwmeqWbklSt3qUuh0mzpMetA",
                    duration: "00:19:33",
                    size: "18.2 MB",
                    url: "https://dts.podtrac.com/redirect.mp3/chrt.fm/track/8DB4DB/pdst.fm/e/nyt.simplecastaudio.com/03d8b493-87fc-4bd1-931f-8a8e9b945d8a/episodes/f658e83e-70d2-41a3-8e5c-507799a6cb69/audio/128/default.mp3?aid=rss_feed&awCollectionId=03d8b493-87fc-4bd1-931f-8a8e9b945d8a&awEpisodeId=f658e83e-70d2-41a3-8e5c-507799a6cb69&feed=54nAGcIl",
                    episodeNo: undefined,
                    description: "<p>In a ceremony made for prime-time television, President Trump announced his Supreme Court nominee: Neil M. Gorsuch, a conservative judge with a sterling résumé. We spent the night at The New York Times talking with some of our most insightful colleagues about what the nomination means. We also get on the phone with the chief executive of Hobby Lobby, a company at the center of one of Judge Gorsuch’s most important cases.</p>",
                    imageUrl: "https://image.simplecastcdn.com/images/03d8b4/03d8b493-87fc-4bd1-931f-8a8e9b945d8a/f658e83e-70d2-41a3-8e5c-507799a6cb69/3000x3000/c81936f538106550b804e7e4fe2c236319bab7fba37941a6e8f7e5c3d3048b88fc5b2182fb790f7d446bdc820406456c94287f245db89d8656c105d5511ec3de.jpeg?aid=rss_feed",
                    raw: getXmlForItem(fs.readFileSync("./test/data/thedaily.xml").toString(), "gid://art19-episode-locator/V0/8fJKNp6i648MNqY585bYwmeqWbklSt3qUuh0mzpMetA"),
                },
                {
                    title: "Thursday, Feb. 2, 2017",
                    pubDate: new Date(Date.parse("Thu, 2 Feb 2017 10:40:19 +0000")),
                    guid: "gid://art19-episode-locator/V0/1ft_DGtLLsokwij1HwsWsLEGxwVHdD_TZN8quEGB77Y",
                    duration: "00:22:11",
                    size: "20.6 MB",
                    url: "https://dts.podtrac.com/redirect.mp3/chrt.fm/track/8DB4DB/pdst.fm/e/nyt.simplecastaudio.com/03d8b493-87fc-4bd1-931f-8a8e9b945d8a/episodes/839ee63a-5016-45cf-9fa1-9357c8315c4d/audio/128/default.mp3?aid=rss_feed&awCollectionId=03d8b493-87fc-4bd1-931f-8a8e9b945d8a&awEpisodeId=839ee63a-5016-45cf-9fa1-9357c8315c4d&feed=54nAGcIl",
                    episodeNo: undefined,
                    description: "<p>Who is influencing our new president’s views of Islam and radical Islamic terrorism? Are we seeing the beginning of a Tea Party for the Left? And why are its leaders looking to Republicans for inspiration? More on that — plus Beyoncé — on today’s show.</p>",
                    imageUrl: "https://image.simplecastcdn.com/images/03d8b4/03d8b493-87fc-4bd1-931f-8a8e9b945d8a/839ee63a-5016-45cf-9fa1-9357c8315c4d/3000x3000/c81936f538106550b804e7e4fe2c236319bab7fba37941a6e8f7e5c3d3048b88fc5b2182fb790f7d446bdc820406456c94287f245db89d8656c105d5511ec3de.jpeg?aid=rss_feed",
                    raw: getXmlForItem(fs.readFileSync("./test/data/thedaily.xml").toString(), "gid://art19-episode-locator/V0/1ft_DGtLLsokwij1HwsWsLEGxwVHdD_TZN8quEGB77Y"),
                }
            ],
        }
    }
]

interface TestCase {
    description: string,
    xml: string,
    expected: IChannel
}

describe('Get Channel', () => {
    let axiosStub: any;
    let sandbox: SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    for (let i = 0; i < testCases.length; i++) {
        const thisTest = testCases[i];

        it(`Should parse feed: '${thisTest.description}'`, async () => {
            givenHttpCallReturns({ data: thisTest.xml })

            const actual = await getChannel("_")

            expect(actual).to.deep.equal(thisTest.expected);
        });
    }

    afterEach(() => {
        sandbox.restore()
    })

    const givenHttpCallReturns = (result: any) => {
        axiosStub = sandbox.stub(axios, "get").callsFake(() => Promise.resolve(result))
    }
});

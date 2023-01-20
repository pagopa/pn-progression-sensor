const { expect } = require('chai');
const proxyquire = require("proxyquire").noPreserveCache();

describe('event handler tests', function() {

    it("test Ok", async () => {
        const event = {}

        const lambda = proxyquire.noCallThru().load("../app/eventHandler.js", {
            "./lib/kinesis.js": {
                extractKinesisData : () => {
                    return [{

                    }]
                }
            },
            "./lib/eventMapper.js": {
                mapEvents : async () => {
                    return new Promise(res => res([
                        { 'test': 1}
                    ]))
                }
            },
            "./lib/repository.js": {
                persistEvents : async () => {
                    return new Promise(res => res([
                        'abc'
                    ]))
                }
            },
        });

        const res = await lambda.handleEvent(event);
        expect(res).deep.equals({
            batchItemFailures: ['abc']
        })
    });
});
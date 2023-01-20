const { mockClient } = require("aws-sdk-client-mock");
const { DynamoDBDocumentClient, DeleteCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { expect } = require('chai');
const { persistEvents } = require('../app/lib/repository');
const ddbMock = mockClient(DynamoDBDocumentClient);
const events = [
    {
        opType: 'INSERT',
        relatedEntityId: '12123123',
        type: 'VALIDATION',
        id: '123123',
        startTimestamp: "2011-10-05T14:48:00.000Z",
        slaExpiration: "2011-10-05T14:48:00.000Z",
        alarmTTL: "2011-10-05T14:48:00.000Z",
        step_alarmTTL: 1231231212312
    },
    {
        opType: 'DELETE',
        relatedEntityId: '12123123',
        type: 'VALIDATION',
        id: '123123'
    }
]



describe('repository tests', function() {

    it("test INSERT / DELETE", async () => {

        ddbMock.on(PutCommand).resolves({
            
        });

        ddbMock.on(DeleteCommand).resolves({
            
        });

        const res = await persistEvents(events)

        expect(res.insertions).equal(1)
        expect(res.deletions).equal(1)
    });

    it("test INSERT ERROR", async () => {
        ddbMock.on(PutCommand).rejects(new Error('abc'));
        ddbMock.on(DeleteCommand).resolves({
            
        });
        const res = await persistEvents(events)

        expect(res.insertions).equal(0)
        expect(res.deletions).equal(1)
        expect(res.errors.length).equal(1)       
    });


    it("test DELETE ERROR", async () => {
        ddbMock.on(PutCommand).resolves({
            
        });
        ddbMock.on(DeleteCommand).rejects(new Error('abc'));

        const res = await persistEvents(events)

        expect(res.insertions).equal(1)
        expect(res.deletions).equal(0)
        expect(res.errors.length).equal(1)       
    });

    it("test DELETE ERROR NO error", async () => {
        ddbMock.on(PutCommand).rejects(new Error('abc'));
        ddbMock.on(DeleteCommand).rejects(new Error('abc'));

        const res = await persistEvents(events)

        expect(res.insertions).equal(0)
        expect(res.deletions).equal(0)
        expect(res.errors.length).equal(2)       
    });

});
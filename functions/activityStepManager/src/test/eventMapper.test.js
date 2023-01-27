const { expect } = require('chai');
const { mapEvents } = require('../app/lib/eventMapper');
const fs = require('fs');

describe('event mapper tests', function() {

    it("test VALIDATION", async () => {
        const eventJSON = fs.readFileSync('./src/test/eventMapper.notifications.json')
        const event = JSON.parse(eventJSON)
        const events = [
            event
        ]

        const res = await mapEvents(events)

        expect(res[0].type).equal('VALIDATION')
        expect(res[0].opType).equal('INSERT')
    });

    /*it("test REQUEST ACCEPTED", async () => {
        const eventJSON = fs.readFileSync('./src/test/eventMapper.timeline.json')
        let event = JSON.parse(eventJSON)

        event = setCategory(event, "REQUEST_ACCEPTED")

        const events = [
            event
        ]

        const res = await mapEvents(events)

        expect(res[0].type).equal('VALIDATION')
        expect(res[0].opType).equal('DELETE')

        expect(res[1].type).equal('REFINEMENT')
        expect(res[1].opType).equal('INSERT')
    });

    it("test REQUEST ACCEPTED multiple recipients", async () => {
        const eventJSON = fs.readFileSync('./src/test/eventMapper.timeline.json')
        let event = JSON.parse(eventJSON)

        event = setCategory(event, "REQUEST_ACCEPTED")

        const events = [
            event
        ]

        const res = await mapEvents(events)

        expect(res[0].type).equal('VALIDATION')
        expect(res[0].opType).equal('DELETE')

        expect(res[1].type).equal('REFINEMENT')
        expect(res[1].opType).equal('INSERT')

        expect(res[2].type).equal('REFINEMENT')
        expect(res[2].opType).equal('INSERT')
    });
*/
    it("test REQUEST REFUSED", async () => {
        const eventJSON = fs.readFileSync('./src/test/eventMapper.timeline.json')
        let event = JSON.parse(eventJSON)
        event = setCategory(event, "REQUEST_REFUSED")

        const events = [
            event
        ]

        const res = await mapEvents(events)

        expect(res[0].type).equal('VALIDATION')
        expect(res[0].opType).equal('DELETE')
    });

    it("test REFINEMENT", async () => {
        const eventJSON = fs.readFileSync('./src/test/eventMapper.timeline.json')
        let event = JSON.parse(eventJSON)
        event = setCategory(event, "REFINEMENT")

        const events = [
            event
        ]

        const res = await mapEvents(events)

        expect(res[0].type).equal('REFINEMENT')
        expect(res[0].opType).equal('DELETE')
    });

    it("test NOTIFICATION_VIEWED", async () => {
        const eventJSON = fs.readFileSync('./src/test/eventMapper.timeline.json')
        let event = JSON.parse(eventJSON)
        event = setCategory(event, "NOTIFICATION_VIEWED")

        const events = [
            event
        ]

        const res = await mapEvents(events)

        expect(res[0].type).equal('REFINEMENT')
        expect(res[0].opType).equal('DELETE')
    });

    it("test SEND_DIGITAL_DOMICILE", async () => {
        const eventJSON = fs.readFileSync('./src/test/eventMapper.timeline.json')
        let event = JSON.parse(eventJSON)
        event = setCategory(event, "SEND_DIGITAL_DOMICILE")

        const events = [
            event
        ]

        const res = await mapEvents(events)

        expect(res[0].type).equal('SEND_PEC')
        expect(res[0].opType).equal('INSERT')
    });

    it("test SEND_DIGITAL_FEEDBACK", async () => {
        const eventJSON = fs.readFileSync('./src/test/eventMapper.timeline.json')
        let event = JSON.parse(eventJSON)
        event = setCategory(event, "SEND_DIGITAL_FEEDBACK")

        const events = [
            event
        ]

        const res = await mapEvents(events)

        expect(res[0].type).equal('SEND_PEC')
        expect(res[0].opType).equal('DELETE')
    });

    it("test SEND_ANALOG_DOMICILE", async () => {
        const eventJSON = fs.readFileSync('./src/test/eventMapper.timeline.json')
        let event = JSON.parse(eventJSON)
        event = setCategory(event, "SEND_ANALOG_DOMICILE")

        const events = [
            event
        ]

        const res = await mapEvents(events)

        expect(res[0].type).equal('SEND_PAPER_AR_890')
        expect(res[0].opType).equal('INSERT')
    });

    it("test SEND_SIMPLE_REGISTERED_LETTER", async () => {
        const eventJSON = fs.readFileSync('./src/test/eventMapper.timeline.json')
        let event = JSON.parse(eventJSON)
        event = setCategory(event, "SEND_SIMPLE_REGISTERED_LETTER")

        const events = [
            event
        ]

        const res = await mapEvents(events)

        expect(res[0].type).equal('SEND_PAPER_AR_890')
        expect(res[0].opType).equal('INSERT')
    });

    it("test SEND_ANALOG_FEEDBACK", async () => {
        const eventJSON = fs.readFileSync('./src/test/eventMapper.timeline.json')
        let event = JSON.parse(eventJSON)
        event = setCategory(event, "SEND_ANALOG_FEEDBACK")

        const events = [
            event
        ]

        const res = await mapEvents(events)

        expect(res[0].type).equal('SEND_PAPER_AR_890')
        expect(res[0].opType).equal('DELETE')
    });

    it("test DIGITAL_FAILURE_WORKFLOW", async () => {
        const eventJSON = fs.readFileSync('./src/test/eventMapper.timeline.json')
        let event = JSON.parse(eventJSON)
        event = setCategory(event, "DIGITAL_FAILURE_WORKFLOW")

        event.dynamodb.NewImage.details = {
            "M": {
                recIndex: {
                    "N": 0
                }
            }
        }
        const events = [
            event
        ]

        const res = await mapEvents(events)

        expect(res[0].type).equal('SEND_AMR')
        expect(res[0].opType).equal('INSERT')
    });

    it("test SEND_SIMPLE_REGISTERD_LETTER_PROGRESS", async () => {
        const eventJSON = fs.readFileSync('./src/test/eventMapper.timeline.json')
        let event = JSON.parse(eventJSON)
        event = setCategory(event, "SEND_SIMPLE_REGISTERD_LETTER_PROGRESS")

        event.dynamodb.NewImage.registeredLetterCode = {
            "S": "abcd"
        }

        event.dynamodb.NewImage.details = {
            "M": {
                recIndex: {
                    "N": 0
                }
            }
        }

        const events = [
            event
        ]

        const res = await mapEvents(events)

        expect(res[0].type).equal('SEND_AMR')
        expect(res[0].opType).equal('DELETE')
    });
});

function setCategory(event, category){
    event.dynamodb.NewImage.category = {
        "S": category
    }
    return event;
}
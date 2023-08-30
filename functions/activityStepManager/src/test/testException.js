class ConditionalCheckFailedException extends Error {
    constructor(message) {
        super(message);
        this.name = 'ConditionalCheckFailedException'
    }
}

module.exports = {
    ConditionalCheckFailedException
}
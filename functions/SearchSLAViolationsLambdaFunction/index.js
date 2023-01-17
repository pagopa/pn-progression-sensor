const handler = async (event) => {
    console.log('event', event)
    const payload = {
        date: new Date(),
        message: 'Hello Lambda, function1'
    };
    return JSON.stringify(payload);
};

export { handler };

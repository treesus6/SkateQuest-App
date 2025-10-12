const handler = async (event) => {
    const tricks = {
        kickflip: { difficulty: 'Intermediate' },
        ollie: { difficulty: 'Beginner' },
        "360 flip": { difficulty: 'Advanced' },
        heelflip: { difficulty: 'Intermediate' }
    };

    return {
        statusCode: 200,
        body: JSON.stringify(tricks),
        headers: {
            'Content-Type': 'application/json'
        }
    };
};

export { handler };
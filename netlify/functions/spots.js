// netlify/functions/spots.js
exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify([
      { id: 1, name: 'Skate Park', location: 'Downtown' },
      { id: 2, name: 'Boardwalk', location: 'Beachfront' }
    ]),
  };
};
exports.handler = async () => {
  const appToken = process.env.AKAHU_APP_TOKEN;
  const userToken = process.env.AKAHU_USER_TOKEN;

  try {
    const response = await fetch('https://api.akahu.io/v1/accounts', {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'X-Akahu-ID': appToken,
      }
    });
    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};

exports.handler = async (event) => {
  const appToken = process.env.AKAHU_APP_TOKEN;
  const userToken = process.env.AKAHU_USER_TOKEN;

  const strip = (t) => ({
    id: t._id,
    account: t._account,
    date: t.date.slice(0, 10),
    amount: t.amount,
    merchant: t.merchant?.name || null,
    description: t.description,
    akahuCategory: t.category?.groups?.personal_finance?.name || null,
    type: t.type || null,
  });

  try {
    let allTransactions = [];
    let cursor = event.queryStringParameters?.cursor || null;

    do {
      const url = new URL('https://api.akahu.io/v1/transactions');
      if (cursor) url.searchParams.set('cursor', cursor);

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'X-Akahu-ID': appToken,
        }
      });
      const data = await response.json();

      if (!data.success) {
        return {
          statusCode: 502,
          body: JSON.stringify({ error: 'Akahu API error', detail: data })
        };
      }

      allTransactions = allTransactions.concat((data.items || []).map(strip));
      cursor = data.cursor?.next || null;
    } while (cursor);

    return {
      statusCode: 200,
      body: JSON.stringify({ items: allTransactions })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};

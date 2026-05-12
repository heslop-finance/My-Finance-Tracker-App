exports.handler = async (event) => {
  const appToken = process.env.AKAHU_APP_TOKEN;
  const userToken = process.env.AKAHU_USER_TOKEN;
  const start = event.queryStringParameters?.start || null;

  const fetchPage = async (cursor) => {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    if (start) params.set('start', start);
    const url = `https://api.akahu.io/v1/transactions?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'X-Akahu-ID': appToken,
      }
    });
    return res.json();
  };

  try {
    let allItems = [];
    let cursor = null;
    do {
      const data = await fetchPage(cursor);
      if (!data.success) {
        if (data.status === 429) {
          return {
            statusCode: 429,
            body: JSON.stringify({ error: 'rate_limited', message: data.message || 'Rate limited' })
          };
        }
        throw new Error(data.message || 'Akahu error');
      }
      allItems = allItems.concat(data.items || []);
      cursor = data.cursor?.next || null;
    } while (cursor);

    const stripped = allItems.map(t => ({
      id: t._id,
      account: t._account,
      date: t.date.slice(0, 10),
      amount: t.amount,
      merchant: t.merchant?.name || null,
      description: t.description,
      akahuCategory: t.category?.groups?.personal_finance?.name || null,
      type: t.type || null
    }));

    return { statusCode: 200, body: JSON.stringify({ items: stripped }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
